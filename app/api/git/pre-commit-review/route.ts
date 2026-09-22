import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';
import { checkOllamaHealth, generateOllamaText, selectBestOllamaModel, listOllamaModels } from '@/lib/ai/ollamaClient';

const execAsync = promisify(exec);

async function runGit(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch (err: any) {
    return '';
  }
}

export interface PreCommitAuditIssue {
  category: 'security' | 'performance' | 'reliability' | 'style';
  severity: 'critical' | 'warning' | 'info';
  filePath: string;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface PreCommitReviewResponse {
  success: boolean;
  score: number;
  verdict: 'SAFE_TO_COMMIT' | 'NEEDS_ATTENTION' | 'BLOCKED';
  summary: string;
  commitMessage: string;
  issues: PreCommitAuditIssue[];
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  diff: string;
  error?: string;
}

// Fallback deterministic security & performance linter for git diffs
function performLocalStaticAudit(diffText: string): PreCommitAuditIssue[] {
  const issues: PreCommitAuditIssue[] = [];
  const lines = diffText.split('\n');
  let currentFile = 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      if (match) currentFile = match[1];
      continue;
    }

    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    const addedCode = line.substring(1);

    // 1. Security: Hardcoded API keys / tokens / passwords
    if (/(api[_-]?key|secret|token|password|passwd|private_key)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{8,}['"`]/i.test(addedCode)) {
      if (!addedCode.includes('process.env') && !addedCode.includes('NEXT_PUBLIC_')) {
        issues.push({
          category: 'security',
          severity: 'critical',
          filePath: currentFile,
          line: i + 1,
          title: 'Potential Hardcoded Secret / API Key',
          description: 'Hardcoded secret or credential detected in source code diff.',
          suggestion: 'Move sensitive keys to .env.local and reference via process.env.'
        });
      }
    }

    // 2. Security: eval() or Function constructor
    if (/\beval\s*\(|new\s+Function\s*\(/.test(addedCode)) {
      issues.push({
        category: 'security',
        severity: 'critical',
        filePath: currentFile,
        line: i + 1,
        title: 'Dangerous Code Execution (eval / new Function)',
        description: 'Dynamic code execution poses major arbitrary code injection risks.',
        suggestion: 'Use structured parsers or safe AST evaluation instead of eval.'
      });
    }

    // 3. Security: dangerouslySetInnerHTML
    if (/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*[^}]+\}\s*\}/.test(addedCode)) {
      issues.push({
        category: 'security',
        severity: 'warning',
        filePath: currentFile,
        line: i + 1,
        title: 'Unsanitized HTML Injection',
        description: 'dangerouslySetInnerHTML can lead to Cross-Site Scripting (XSS) if input is not sanitized with DOMPurify.',
        suggestion: 'Ensure HTML content is sanitized with DOMPurify before injection.'
      });
    }

    // 4. Performance: Potential Memory Leak (unremoved event listeners or intervals)
    if (/addEventListener\s*\(/.test(addedCode) && !addedCode.includes('removeEventListener')) {
      issues.push({
        category: 'performance',
        severity: 'warning',
        filePath: currentFile,
        line: i + 1,
        title: 'Event Listener Without Cleanup',
        description: 'Adding event listeners without returning cleanup in useEffect can cause memory leaks.',
        suggestion: 'Return a cleanup function in useEffect: () => target.removeEventListener(...).'
      });
    }

    // 5. Reliability: Unhandled Promise Rejection
    if (/\bnew\s+Promise\b/.test(addedCode) && !addedCode.includes('reject') && !addedCode.includes('catch')) {
      issues.push({
        category: 'reliability',
        severity: 'info',
        filePath: currentFile,
        line: i + 1,
        title: 'Promise Rejection Handler Missing',
        description: 'Ensure promise executor accounts for error paths and rejection.',
        suggestion: 'Wrap async operations in try/catch and reject explicitly.'
      });
    }
  }

  return issues;
}

export async function POST(req: NextRequest) {
  try {
    let { diff, stageAll = false } = await req.json().catch(() => ({ diff: '' }));

    // If diff is not provided in body, retrieve directly from git
    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      // 1. Try staged diff first
      diff = await runGit('git diff --cached');
      // 2. If staged diff is empty, fall back to working tree diff
      if (!diff || diff.trim().length === 0) {
        diff = await runGit('git diff');
      }
      // 3. If still empty, check last commit diff for inspection
      if (!diff || diff.trim().length === 0) {
        diff = await runGit('git diff HEAD~1 HEAD');
      }
    }

    if (!diff || diff.trim().length === 0) {
      return NextResponse.json({
        success: true,
        score: 100,
        verdict: 'SAFE_TO_COMMIT',
        summary: 'Working tree is clean. No unstaged or staged modifications detected.',
        commitMessage: 'chore: update workspace repository',
        issues: [],
        stats: { filesChanged: 0, additions: 0, deletions: 0 },
        diff: ''
      });
    }

    // Calculate diff stats
    const additions = (diff.match(/^\+[^+]/gm) || []).length;
    const deletions = (diff.match(/^-[^-]/gm) || []).length;
    const fileMatches = diff.match(/diff --git a\/[^\s]+ b\/([^\s]+)/g) || [];
    const filesChanged = Math.max(1, fileMatches.length);

    // Initial static analysis
    const staticIssues = performLocalStaticAudit(diff);

    // Call AI to perform deep security, performance, bug audit and generate commit message
    const apiKey = process.env.GEMINI_API_KEY;
    let aiSummary = '';
    let aiCommitMsg = '';
    let aiIssues: PreCommitAuditIssue[] = [];
    let aiScore = 95;

    const auditPrompt = `You are a Principal Security Engineer and Senior Staff Code Reviewer.
Analyze the following git diff for:
1. Security vulnerabilities & secret leaks (tokens, injection, XSS, eval, unvalidated inputs).
2. Performance bottlenecks & memory leaks (unclosed listeners, large re-renders, quadratic algorithms).
3. Bugs, unhandled edge cases & missing error handlers (nullish values, uncaught promises, missing try/catch).
4. Synthesize a concise, high quality Conventional Commit message (e.g. feat(scope): message, fix(scope): message).

Git Diff:
\`\`\`diff
${diff.slice(0, 10000)}
\`\`\`

CRITICAL: Return ONLY a valid JSON object with this exact schema:
{
  "score": 92,
  "verdict": "SAFE_TO_COMMIT" | "NEEDS_ATTENTION" | "BLOCKED",
  "summary": "1-2 sentence executive assessment of the changes",
  "commitMessage": "feat(scope): concise description of changes",
  "issues": [
    {
      "category": "security" | "performance" | "reliability" | "style",
      "severity": "critical" | "warning" | "info",
      "filePath": "path/to/file.ts",
      "title": "Short title",
      "description": "What the issue is",
      "suggestion": "How to fix it"
    }
  ]
}`;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ text: auditPrompt }]
        });
        const text = response.text || '';
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        aiScore = typeof parsed.score === 'number' ? parsed.score : 90;
        aiSummary = parsed.summary || 'Code diff reviewed successfully.';
        aiCommitMsg = parsed.commitMessage || 'feat: update workspace components';
        if (Array.isArray(parsed.issues)) {
          aiIssues = parsed.issues;
        }
      } catch (err: any) {
        console.warn('Gemini pre-commit review failed:', err.message);
      }
    } else {
      // Try local Ollama if available
      try {
        const isHealthy = await checkOllamaHealth();
        if (isHealthy) {
          const models = await listOllamaModels();
          const model = selectBestOllamaModel(models);
          const raw = await generateOllamaText({ model, prompt: auditPrompt });
          const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
          const parsed = JSON.parse(cleaned);
          aiScore = typeof parsed.score === 'number' ? parsed.score : 90;
          aiSummary = parsed.summary || 'Reviewed via local Ollama.';
          aiCommitMsg = parsed.commitMessage || 'feat: update workspace files';
          if (Array.isArray(parsed.issues)) aiIssues = parsed.issues;
        }
      } catch (err: any) {
        console.warn('Ollama pre-commit review failed:', err.message);
      }
    }

    // Combine static and AI issues (avoiding duplicates)
    const combinedIssues = [...staticIssues];
    aiIssues.forEach(aiIssue => {
      const exists = combinedIssues.some(ci => ci.title === aiIssue.title && ci.filePath === aiIssue.filePath);
      if (!exists) combinedIssues.push(aiIssue);
    });

    // Compute final safety score based on issues
    const criticalCount = combinedIssues.filter(i => i.severity === 'critical').length;
    const warningCount = combinedIssues.filter(i => i.severity === 'warning').length;
    let finalScore = Math.max(20, Math.min(100, aiScore - (criticalCount * 25) - (warningCount * 8)));

    let finalVerdict: 'SAFE_TO_COMMIT' | 'NEEDS_ATTENTION' | 'BLOCKED' = 'SAFE_TO_COMMIT';
    if (criticalCount > 0) {
      finalVerdict = 'BLOCKED';
    } else if (warningCount > 1 || finalScore < 80) {
      finalVerdict = 'NEEDS_ATTENTION';
    }

    if (!aiSummary) {
      aiSummary = finalVerdict === 'SAFE_TO_COMMIT'
        ? `Clean pre-commit audit! ${filesChanged} file(s) inspected, +${additions}/-${deletions} lines.`
        : `${criticalCount} critical and ${warningCount} warning issues detected in staged diff.`;
    }

    if (!aiCommitMsg) {
      const primaryFile = fileMatches[0]?.split('b/')?.[1] || 'workspace';
      const baseName = primaryFile.split('/').pop()?.split('.')[0] || 'core';
      aiCommitMsg = `feat(${baseName}): enhance functionality and update components`;
    }

    const result: PreCommitReviewResponse = {
      success: true,
      score: finalScore,
      verdict: finalVerdict,
      summary: aiSummary,
      commitMessage: aiCommitMsg,
      issues: combinedIssues,
      stats: {
        filesChanged,
        additions,
        deletions
      },
      diff
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        score: 0,
        verdict: 'BLOCKED',
        summary: 'Failed to complete pre-commit review: ' + error.message,
        commitMessage: '',
        issues: [],
        stats: { filesChanged: 0, additions: 0, deletions: 0 },
        diff: '',
        error: error.message
      },
      { status: 500 }
    );
  }
}
