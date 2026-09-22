// Smart Terminal AI Auto-Patcher Engine ("Fix with AI")
'use client';

export interface TerminalErrorContext {
  command?: string;
  targetFile: string;
  line: number;
  column?: number;
  errorMessage: string;
  stackSnippet: string;
  fullErrorOutput: string;
  timestamp: number;
}

export interface PatchProposal {
  targetFile: string;
  originalCode: string;
  patchedCode: string;
  summary: string;
  lineStart: number;
  lineEnd: number;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export class TerminalAutoPatcher {
  private static instance: TerminalAutoPatcher;

  public static getInstance(): TerminalAutoPatcher {
    if (!TerminalAutoPatcher.instance) {
      TerminalAutoPatcher.instance = new TerminalAutoPatcher();
    }
    return TerminalAutoPatcher.instance;
  }

  /**
   * Detects if terminal output contains a failure or compiler crash
   */
  public hasFailure(terminalOutput: string): boolean {
    const clean = stripAnsi(terminalOutput);
    return (
      clean.includes('[Process exited with code') ||
      clean.includes('npm ERR!') ||
      clean.includes('error TS') ||
      clean.includes('SyntaxError:') ||
      clean.includes('TypeError:') ||
      clean.includes('ReferenceError:') ||
      clean.includes('Traceback (most recent call last):') ||
      clean.includes('FAIL ') ||
      clean.includes('AssertionError:') ||
      clean.includes('exit status 1') ||
      clean.includes('panic: ') ||
      clean.includes('Compilation failed')
    );
  }

  /**
   * Inspects recent terminal buffer and matches against known workspace files
   */
  public extractErrorContext(
    terminalOutput: string,
    workspaceFiles: Record<string, string>,
    recentCommand?: string
  ): TerminalErrorContext | null {
    const clean = stripAnsi(terminalOutput);
    const lines = clean.split(/\r?\n/);
    const knownFiles = Object.keys(workspaceFiles);

    let targetFile = '';
    let line = 1;
    let column = 1;
    let errorMessage = '';
    const relevantStackLines: string[] = [];

    // Scan backwards from bottom of terminal output to find the most recent error
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineStr = lines[i].trim();
      if (!lineStr) continue;

      // 1. TypeScript pattern: components/Playground.tsx:142:5 - error TS2322: ...
      const tsMatch = lineStr.match(/^([a-zA-Z0-9_./\\-]+):(\d+):(\d+)\s*-\s*(error\s*TS\d+:\s*.+)$/);
      if (tsMatch) {
        const candidate = this.normalizeFilePath(tsMatch[1]);
        if (this.matchesWorkspaceFile(candidate, knownFiles)) {
          targetFile = this.resolveWorkspaceFile(candidate, knownFiles);
          line = parseInt(tsMatch[2], 10);
          column = parseInt(tsMatch[3], 10);
          errorMessage = tsMatch[4];
          relevantStackLines.push(lineStr);
          break;
        }
      }

      // 2. TypeScript parenthesized: components/Playground.tsx(142,5): error TS2322: ...
      const tsParenMatch = lineStr.match(/^([a-zA-Z0-9_./\\-]+)\((\d+),(\d+)\):\s*(error\s*TS\d+:\s*.+)$/);
      if (tsParenMatch) {
        const candidate = this.normalizeFilePath(tsParenMatch[1]);
        if (this.matchesWorkspaceFile(candidate, knownFiles)) {
          targetFile = this.resolveWorkspaceFile(candidate, knownFiles);
          line = parseInt(tsParenMatch[2], 10);
          column = parseInt(tsParenMatch[3], 10);
          errorMessage = tsParenMatch[4];
          relevantStackLines.push(lineStr);
          break;
        }
      }

      // 3. Node/Webpack stack trace: at Component (file:///path/to/file.tsx:142:5) or at file.tsx:142:5
      const nodeMatch = lineStr.match(/at\s+(?:.*?\()?([a-zA-Z0-9_./\\-]+\.[a-zA-Z]{2,4}):(\d+):(\d+)\)?/);
      if (nodeMatch) {
        const candidate = this.normalizeFilePath(nodeMatch[1]);
        if (this.matchesWorkspaceFile(candidate, knownFiles)) {
          targetFile = this.resolveWorkspaceFile(candidate, knownFiles);
          line = parseInt(nodeMatch[2], 10);
          column = parseInt(nodeMatch[3], 10);
          relevantStackLines.push(lineStr);
          // Look up 1-3 lines for error message
          for (let j = Math.max(0, i - 4); j <= i; j++) {
            if (lines[j].includes('Error:') || lines[j].includes('Exception:')) {
              errorMessage = lines[j].trim();
              break;
            }
          }
          break;
        }
      }

      // 4. Python trace: File "app.py", line 42, in <module>
      const pyMatch = lineStr.match(/File\s+"([^"]+)",\s*line\s*(\d+)/);
      if (pyMatch) {
        const candidate = this.normalizeFilePath(pyMatch[1]);
        if (this.matchesWorkspaceFile(candidate, knownFiles)) {
          targetFile = this.resolveWorkspaceFile(candidate, knownFiles);
          line = parseInt(pyMatch[2], 10);
          relevantStackLines.push(lineStr);
          if (i + 1 < lines.length && (lines[i + 1].includes('Error:') || lines[i + 1].includes('Exception:'))) {
            errorMessage = lines[i + 1].trim();
          }
          break;
        }
      }
    }

    if (!targetFile && knownFiles.length > 0) {
      // Fallback: search for any known file mentioned in recent 30 lines
      const recentChunk = lines.slice(-30).join('\n');
      for (const file of knownFiles) {
        const base = file.split('/').pop() || file;
        if (base.length > 4 && recentChunk.includes(base)) {
          targetFile = file;
          line = 1;
          break;
        }
      }
    }

    if (!targetFile) return null;

    if (!errorMessage) {
      // Extract first error-looking line from bottom 10 lines
      const errorCandidate = lines
        .slice(-15)
        .reverse()
        .find(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('failed') || l.toLowerCase().includes('exception'));
      errorMessage = errorCandidate ? errorCandidate.trim() : 'Command exited with error';
    }

    return {
      command: recentCommand || 'Terminal command',
      targetFile,
      line,
      column,
      errorMessage,
      stackSnippet: relevantStackLines.join('\n') || errorMessage,
      fullErrorOutput: clean.slice(-1500),
      timestamp: Date.now()
    };
  }

  /**
   * Calls AI to generate an automatic code fix patch for the failing file
   */
  public async generateAutoFix(
    context: TerminalErrorContext,
    originalCode: string
  ): Promise<PatchProposal> {
    const lines = originalCode.split('\n');
    const startLine = Math.max(1, context.line - 15);
    const endLine = Math.min(lines.length, context.line + 15);
    const contextSnippet = lines.slice(startLine - 1, endLine).join('\n');

    const prompt = `You are a Principal Software Engineer performing an automated compiler/runtime bug fix.
TARGET FILE: ${context.targetFile}
ERROR LOCATION: Line ${context.line}
FAILING COMMAND: ${context.command}
ERROR MESSAGE: ${context.errorMessage}

ERROR STACK TRACE:
\`\`\`
${context.stackSnippet}
\`\`\`

RELEVANT CODE SNIPPET (Lines ${startLine} - ${endLine}):
\`\`\`
${contextSnippet}
\`\`\`

COMPLETE SOURCE FILE:
\`\`\`
${originalCode}
\`\`\`

TASK:
Analyze the error trace and fix the exact bug in the target file.
Return the COMPLETE, CORRECTED file contents.
Do not omit lines. Do not use placeholders like "// rest of code remains the same".
Return ONLY the full updated code. Wrap your code inside a single \`\`\` code block.`;

    const res = await fetch('/api/ollama/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:1.5b',
        prompt
      })
    });

    if (!res.ok) {
      throw new Error(`AI model returned error: ${res.statusText}`);
    }

    const data = await res.json();
    let text = (data.response || '').trim();

    // Extract code from markdown fences if present
    const codeMatch = text.match(/```(?:[a-z]*)\n([\s\S]*?)```/i);
    if (codeMatch) {
      text = codeMatch[1].trim();
    }

    if (!text || text.length < 10) {
      throw new Error('AI produced empty fix');
    }

    return {
      targetFile: context.targetFile,
      originalCode,
      patchedCode: text,
      summary: `Fixed ${context.errorMessage.slice(0, 75)} at line ${context.line}`,
      lineStart: startLine,
      lineEnd: endLine
    };
  }

  private normalizeFilePath(p: string): string {
    let normalized = p.replace(/\\/g, '/');
    if (normalized.startsWith('./')) normalized = normalized.substring(2);
    return normalized;
  }

  private matchesWorkspaceFile(candidate: string, knownFiles: string[]): boolean {
    return knownFiles.some(f => f === candidate || f.endsWith(`/${candidate}`) || candidate.endsWith(`/${f}`));
  }

  private resolveWorkspaceFile(candidate: string, knownFiles: string[]): string {
    const exact = knownFiles.find(f => f === candidate);
    if (exact) return exact;
    const endsWith = knownFiles.find(f => f.endsWith(`/${candidate}`) || candidate.endsWith(`/${f}`));
    return endsWith || candidate;
  }
}

export const terminalAutoPatcher = TerminalAutoPatcher.getInstance();
