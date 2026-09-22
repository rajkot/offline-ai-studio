import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface GitHunk {
  id: string;
  type: 'added' | 'modified' | 'deleted';
  startLine: number;
  endLine: number;
  oldLines: string[];
  newLines: string[];
}

// Executes git CLI command safely inside workspace directory
async function runGit(command: string): Promise<{ stdout: string; stderr: string }> {
  const cwd = process.cwd();
  return execAsync(command, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';
  const filePath = searchParams.get('path');

  // ACTION: Git Repository Status
  if (action === 'status') {
    try {
      // Current branch
      const { stdout: branchOut } = await runGit('git rev-parse --abbrev-ref HEAD');
      const branch = branchOut.trim() || 'main';

      // Remote tracking status (ahead / behind)
      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: countOut } = await runGit('git rev-list --left-right --count HEAD...@{upstream}');
        const parts = countOut.trim().split(/\s+/);
        if (parts.length === 2) {
          ahead = parseInt(parts[0], 10) || 0;
          behind = parseInt(parts[1], 10) || 0;
        }
      } catch {
        // No upstream configured
      }

      // Branch list
      let branches: string[] = [];
      try {
        const { stdout: branchesOut } = await runGit('git branch --format="%(refname:short)"');
        branches = branchesOut.trim().split('\n').map(b => b.trim()).filter(Boolean);
      } catch {
        branches = [branch];
      }

      // Porcelain status
      const { stdout: statusOut } = await runGit('git status --porcelain=v1');
      const stagedFiles: string[] = [];
      const unstagedFiles: string[] = [];
      const untrackedFiles: string[] = [];

      statusOut.split('\n').forEach(line => {
        if (!line.trim()) return;
        const x = line[0];
        const y = line[1];
        const file = line.substring(3).trim();

        if (x !== ' ' && x !== '?') stagedFiles.push(file);
        if (y === 'M' || y === 'D') unstagedFiles.push(file);
        if (x === '?' && y === '?') untrackedFiles.push(file);
      });

      return NextResponse.json({
        success: true,
        branch,
        ahead,
        behind,
        branches,
        stagedFiles,
        unstagedFiles,
        untrackedFiles
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Git status error' }, { status: 500 });
    }
  }

  // ACTION: Compute File-Level Line-by-Line Diff Hunks
  if (action === 'file-diff') {
    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Missing path parameter' }, { status: 400 });
    }

    try {
      // Normalize path
      const cleanPath = filePath.replace(/\\/g, '/');
      let diffOut = '';
      try {
        const res = await runGit(`git diff -U0 HEAD -- "${cleanPath}"`);
        diffOut = res.stdout;
      } catch {
        // If file untracked or error, fallback to empty
        diffOut = '';
      }

      const hunks: GitHunk[] = [];
      const lines = diffOut.split('\n');
      let currentHunk: GitHunk | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        if (line.startsWith('@@')) {
          if (currentHunk) hunks.push(currentHunk);

          const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
          if (match) {
            const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
            const newStart = parseInt(match[3], 10);
            const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1;

            let hunkType: 'added' | 'modified' | 'deleted' = 'modified';
            if (oldCount === 0 && newCount > 0) hunkType = 'added';
            else if (oldCount > 0 && newCount === 0) hunkType = 'deleted';

            const endLine = newCount > 0 ? newStart + newCount - 1 : newStart;

            currentHunk = {
              id: `hunk-${newStart}-${endLine}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: hunkType,
              startLine: newStart,
              endLine: Math.max(newStart, endLine),
              oldLines: [],
              newLines: []
            };
          }
        } else if (currentHunk) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            currentHunk.newLines.push(line.substring(1));
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            currentHunk.oldLines.push(line.substring(1));
          }
        }
      }

      if (currentHunk) hunks.push(currentHunk);

      return NextResponse.json({
        success: true,
        path: cleanPath,
        hunks
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'File diff error' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, path: filePath, branchName, message, hunk } = body;

    // ACTION: Stage a single file
    if (action === 'stage-file') {
      if (!filePath) return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 });
      await runGit(`git add "${filePath.replace(/\\/g, '/')}"`);
      return NextResponse.json({ success: true, message: `Staged ${filePath}` });
    }

    // ACTION: Unstage a single file
    if (action === 'unstage-file') {
      if (!filePath) return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 });
      await runGit(`git restore --staged "${filePath.replace(/\\/g, '/')}"`);
      return NextResponse.json({ success: true, message: `Unstaged ${filePath}` });
    }

    // ACTION: Stage Selected Hunk (git add -p simulation)
    if (action === 'stage-hunk') {
      if (!filePath || !hunk) {
        return NextResponse.json({ success: false, error: 'Missing path or hunk' }, { status: 400 });
      }

      // Format git unified diff patch
      const cleanPath = filePath.replace(/\\/g, '/');
      const oldCount = hunk.oldLines?.length || 0;
      const newCount = hunk.newLines?.length || 0;
      const oldStart = hunk.startLine;
      const newStart = hunk.startLine;

      const patchHeader = [
        `--- a/${cleanPath}`,
        `+++ b/${cleanPath}`,
        `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`
      ];

      const patchLines = [
        ...patchHeader,
        ...(hunk.oldLines?.map((l: string) => `-${l}`) || []),
        ...(hunk.newLines?.map((l: string) => `+${l}`) || [])
      ].join('\n') + '\n';

      try {
        // Apply patch directly to index
        const child = require('child_process').spawn('git', ['apply', '--cached', '--unidiff-zero', '-'], {
          cwd: process.cwd()
        });
        child.stdin.write(patchLines);
        child.stdin.end();

        await new Promise((resolve, reject) => {
          child.on('close', (code: number) => code === 0 ? resolve(null) : reject(new Error(`git apply exited with code ${code}`)));
          child.on('error', reject);
        });

        return NextResponse.json({ success: true, message: 'Hunk staged successfully into git index' });
      } catch {
        // Fallback: stage the whole file if partial hunk patch failed
        await runGit(`git add "${cleanPath}"`);
        return NextResponse.json({ success: true, message: 'File staged' });
      }
    }

    // ACTION: Revert Hunk (restore to HEAD)
    if (action === 'revert-hunk') {
      if (!filePath) return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 });
      // Restore file to HEAD
      await runGit(`git checkout HEAD -- "${filePath.replace(/\\/g, '/')}"`);
      return NextResponse.json({ success: true, message: `Reverted changes in ${filePath}` });
    }

    // ACTION: Switch or Create Branch
    if (action === 'switch-branch') {
      if (!branchName) return NextResponse.json({ success: false, error: 'Missing branchName' }, { status: 400 });
      const create = body.create === true;
      const cmd = create ? `git checkout -b "${branchName}"` : `git checkout "${branchName}"`;
      await runGit(cmd);
      return NextResponse.json({ success: true, message: `Switched to branch ${branchName}` });
    }

    // ACTION: Git Commit
    if (action === 'commit') {
      if (!message) return NextResponse.json({ success: false, error: 'Missing commit message' }, { status: 400 });
      // Ensure at least staged files or stage all if stageAll is true
      if (body.stageAll) {
        await runGit('git add -A');
      }
      const safeMsg = message.replace(/"/g, '\\"');
      const { stdout } = await runGit(`git commit -m "${safeMsg}"`);
      return NextResponse.json({ success: true, message: stdout.trim() });
    }

    // ACTION: Generate AI Commit Message from Staged Diffs
    if (action === 'generate-commit-msg') {
      let diff = '';
      try {
        const { stdout } = await runGit('git diff --cached');
        diff = stdout;
      } catch {}

      if (!diff || diff.trim().length === 0) {
        try {
          const { stdout } = await runGit('git diff HEAD');
          diff = stdout;
        } catch {}
      }

      if (!diff || diff.trim().length === 0) {
        return NextResponse.json({ success: true, commitMessage: 'chore: update workspace files' });
      }

      // Synthesize clean Conventional Commit message
      const snippet = diff.slice(0, 4000);
      let prompt = `Analyze this git diff and write a single, precise, standard Conventional Commit message (e.g. "feat(auth): add OAuth PKCE login" or "fix(editor): resolve cursor jump on undo"). Return ONLY the single commit message, nothing else:\n\n${snippet}`;

      try {
        // Try local Ollama first
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen2.5:1.5b',
            prompt,
            stream: false
          })
        });

        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          const cleanMsg = data.response?.trim().replace(/^["']|["']$/g, '') || 'feat: update codebase';
          return NextResponse.json({ success: true, commitMessage: cleanMsg });
        }
      } catch {
        // Fallback to rule-based heuristic
      }

      // Heuristic fallback
      const linesChanged = snippet.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length;
      return NextResponse.json({
        success: true,
        commitMessage: `feat(editor): optimize workspace functionality (${linesChanged} changes)`
      });
    }

    // ACTION: Git Sync (Push / Pull)
    if (action === 'sync') {
      const direction = body.direction || 'push';
      if (direction === 'pull') {
        const { stdout } = await runGit('git pull --rebase');
        return NextResponse.json({ success: true, message: stdout.trim() });
      } else {
        const { stdout } = await runGit('git push origin HEAD');
        return NextResponse.json({ success: true, message: stdout.trim() });
      }
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Git operation failed' }, { status: 500 });
  }
}
