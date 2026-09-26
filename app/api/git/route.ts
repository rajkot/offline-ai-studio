import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface GitHunk {
  id: string;
  type: 'added' | 'modified' | 'deleted';
  startLine: number;
  endLine: number;
  oldLines: string[];
  newLines: string[];
}

// Ignore lists for recursive file tree extraction
const CLONE_IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', '.turbo', '.cache', '.vscode', '.idea', 'cloned_repos'
]);

const CLONE_IGNORE_EXTS = new Set([
  'exe', 'dll', 'bin', 'iso', 'zip', 'tar', 'gz', '7z', 'apk',
  'mp4', 'mov', 'avi', 'mp3', 'wav', 'sqlite', 'db',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot'
]);

function readClonedDirRecursive(
  dirPath: string,
  rootDir: string,
  result: Record<string, string>,
  maxFiles = 400,
  depth = 0
) {
  if (depth > 12) return;
  if (Object.keys(result).length >= maxFiles) return;
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (Object.keys(result).length >= maxFiles) break;
    if (CLONE_IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      readClonedDirRecursive(fullPath, rootDir, result, maxFiles, depth + 1);
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop()?.toLowerCase() || '';
      if (CLONE_IGNORE_EXTS.has(ext)) continue;

      try {
        const stat = fs.statSync(fullPath);
        // Only read text files under 2MB
        if (stat.size <= 2 * 1024 * 1024) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          result[relPath] = content;
        }
      } catch {}
    }
  }
}

// Parse git log into structured GitCommit array
async function extractGitCommits(targetDir: string, limit = 10) {
  try {
    const cmd = `git -C "${targetDir}" log -n ${limit} --pretty=format:"%H|%h|%an|%ae|%at|%s"`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 5 * 1024 * 1024 });
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const [sha, shortSha, authorName, authorEmail, ts, message] = line.split('|');
      return {
        sha: sha || '',
        shortSha: shortSha || sha?.slice(0, 7) || '',
        author: {
          name: authorName || 'Git User',
          email: authorEmail || 'user@git.local'
        },
        timestamp: ts ? parseInt(ts, 10) * 1000 : Date.now(),
        message: message || 'commit',
        branch: 'main',
        parents: []
      };
    });
  } catch {
    return [];
  }
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

  // ACTION: List Sibling / Local Git Repositories
  if (action === 'local-candidates') {
    try {
      const parentDir = path.dirname(process.cwd());
      const candidates: Array<{ name: string; path: string; hasGit: boolean; description?: string }> = [];

      if (fs.existsSync(parentDir)) {
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

          const candidatePath = path.join(parentDir, entry.name);
          const hasGit = fs.existsSync(path.join(candidatePath, '.git'));
          
          let description = hasGit ? 'Local Git Repository' : 'Directory';
          const readmePath = path.join(candidatePath, 'README.md');
          if (fs.existsSync(readmePath)) {
            try {
              const firstLine = fs.readFileSync(readmePath, 'utf-8').split('\n')[0]?.replace(/^#+\s*/, '').trim();
              if (firstLine) description = firstLine.slice(0, 80);
            } catch {}
          }

          candidates.push({
            name: entry.name,
            path: candidatePath.replace(/\\/g, '/'),
            hasGit,
            description
          });
        }
      }

      return NextResponse.json({ success: true, parentDir: parentDir.replace(/\\/g, '/'), candidates });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed to list candidates' }, { status: 500 });
    }
  }

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

    // ACTION: Clone or Import Git Repository into Workspace
    if (action === 'clone') {
      const { repoUrl, branch, depth = 1, targetName } = body;
      if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
        return NextResponse.json({ success: false, error: 'Repository URL or path is required' }, { status: 400 });
      }

      const rawUrl = repoUrl.trim();
      let repoName = targetName?.trim();
      if (!repoName) {
        // Extract repo name from URL or path
        const cleaned = rawUrl.replace(/\/+$/, '').replace(/\\+$/, '');
        const base = path.basename(cleaned);
        repoName = base.replace(/\.git$/i, '') || 'cloned-project';
      }
      repoName = repoName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Check if rawUrl points to an existing local directory
      const isLocalPath = fs.existsSync(rawUrl) && fs.statSync(rawUrl).isDirectory();

      const files: Record<string, string> = {};
      let resolvedDir = '';
      let branchName = branch?.trim() || 'main';
      let commits: any[] = [];

      if (isLocalPath) {
        resolvedDir = path.resolve(rawUrl);
        // Direct read of local repository
        readClonedDirRecursive(resolvedDir, resolvedDir, files, 400);

        // Get genuine commit history from local git if .git exists
        if (fs.existsSync(path.join(resolvedDir, '.git'))) {
          try {
            const { stdout: bOut } = await execAsync(`git -C "${resolvedDir}" rev-parse --abbrev-ref HEAD`);
            if (bOut.trim()) branchName = bOut.trim();
          } catch {}
          commits = await extractGitCommits(resolvedDir, 10);
        }
      } else {
        // Remote Git repository clone into internal cloned_repos directory
        const cloneRoot = path.join(process.cwd(), 'cloned_repos');
        if (!fs.existsSync(cloneRoot)) {
          fs.mkdirSync(cloneRoot, { recursive: true });
        }

        resolvedDir = path.join(cloneRoot, `${repoName}_${Date.now()}`);

        // Construct git clone command
        const depthFlag = depth ? `--depth ${parseInt(String(depth), 10) || 1}` : '--depth 1';
        const branchFlag = branch ? `-b "${branch}"` : '';
        const cloneCmd = `git clone ${depthFlag} ${branchFlag} "${rawUrl}" "${resolvedDir}"`;

        try {
          await execAsync(cloneCmd, { timeout: 90000, maxBuffer: 15 * 1024 * 1024 });
        } catch (cloneErr: any) {
          return NextResponse.json({
            success: false,
            error: `Git clone failed: ${cloneErr.message || cloneErr.stderr || 'Network or repository error'}`
          }, { status: 500 });
        }

        // Read cloned files
        readClonedDirRecursive(resolvedDir, resolvedDir, files, 400);

        // Read current branch
        try {
          const { stdout: bOut } = await execAsync(`git -C "${resolvedDir}" rev-parse --abbrev-ref HEAD`);
          if (bOut.trim()) branchName = bOut.trim();
        } catch {}

        // Read commit log
        commits = await extractGitCommits(resolvedDir, 10);
      }

      // Pick primary entry point
      const fileKeys = Object.keys(files);
      const primaryFile =
        fileKeys.find(f => f.toLowerCase() === 'readme.md') ||
        fileKeys.find(f => f.toLowerCase() === 'index.html') ||
        fileKeys.find(f => f.toLowerCase() === 'package.json') ||
        fileKeys.find(f => f.toLowerCase() === 'src/app.tsx' || f.toLowerCase() === 'src/main.tsx' || f.toLowerCase() === 'src/main.ts' || f.toLowerCase() === 'main.py') ||
        fileKeys[0] || 'README.md';

      return NextResponse.json({
        success: true,
        repoName,
        targetDir: resolvedDir.replace(/\\/g, '/'),
        branch: branchName,
        fileCount: fileKeys.length,
        primaryFile,
        files,
        commits
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Git operation failed' }, { status: 500 });
  }
}
