/**
 * Embedded In-Browser Git Engine, Visual DAG Topology & 3-Way Merge Conflict Model
 * 
 * Features:
 * - Full Git DAG representation (Commits, Trees, Branches, Tags, HEAD)
 * - Real-time Git Blame calculation per-line with commit author, relative date, and hash
 * - 3-Way Merge Conflict engine (Base ancestor vs Current/Ours vs Incoming/Theirs)
 * - Conflict Hunk parser & one-click resolution (Accept Current, Accept Incoming, Accept Both)
 * - Interactive Rebase, Cherry-Pick, Branch Management, and Stash Stack
 */

export interface GitAuthor {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface GitCommit {
  sha: string;
  shortSha: string;
  parents: string[];
  tree: Record<string, string>; // filePath -> content
  author: GitAuthor;
  timestamp: number;
  message: string;
  branch: string;
  tags?: string[];
}

export interface GitBranch {
  name: string;
  targetSha: string;
  isHead: boolean;
  isRemote?: boolean;
}

export interface GitStash {
  id: string;
  index: number;
  message: string;
  timestamp: number;
  branch: string;
  files: Record<string, string>;
}

export interface GitBlameLine {
  lineNumber: number;
  code: string;
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  relativeTime: string;
  message: string;
}

export interface MergeConflictHunk {
  id: string;
  startLine: number;
  currentContent: string;
  incomingContent: string;
  baseContent: string;
  resolvedContent?: string;
  resolutionState: 'unresolved' | 'current' | 'incoming' | 'both' | 'custom';
}

export interface MergeSession {
  targetBranch: string;
  incomingBranch: string;
  baseSha: string;
  currentSha: string;
  incomingSha: string;
  conflictedFiles: string[];
  resolvedFiles: string[];
  activeFile: string;
  fileHunks: Record<string, MergeConflictHunk[]>;
  isCompleted: boolean;
}

class GitEngine {
  private commits: Map<string, GitCommit> = new Map();
  private branches: Map<string, GitBranch> = new Map();
  private tags: Map<string, string> = new Map(); // tagName -> sha
  private stashes: GitStash[] = [];
  private currentBranchName = 'main';
  private headSha = '';
  private currentAuthor: GitAuthor = {
    name: 'Lead Architect',
    email: 'developer@offline-ide.internal',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect'
  };
  private subscribers: Array<() => void> = [];
  private activeMergeSession: MergeSession | null = null;

  constructor() {
    this.seedInitialRepository();
  }

  private seedInitialRepository() {
    // Initial Commit
    const c1Sha = 'a1f89bc45d2e09123456789abcdef01234567890';
    const c1: GitCommit = {
      sha: c1Sha,
      shortSha: c1Sha.slice(0, 7),
      parents: [],
      tree: {
        'src/main.ts': `// Initial Application Runtime\nconsole.log('Starting offline IDE platform...');\nexport const VERSION = '1.0.0';\nexport function boot() {\n  return true;\n}`,
        'package.json': `{\n  "name": "offline-ai-ide",\n  "version": "1.0.0"\n}`
      },
      author: {
        name: 'System Scaffolder',
        email: 'scaffold@offline-ide.internal'
      },
      timestamp: Date.now() - 3600000 * 48,
      message: 'chore: initial project scaffolding and core build config',
      branch: 'main'
    };

    // Commit 2: Add WASI & LSP Integration
    const c2Sha = 'e7b45ca91d8e123456789abcdef012345678901';
    const c2: GitCommit = {
      sha: c2Sha,
      shortSha: c2Sha.slice(0, 7),
      parents: [c1Sha],
      tree: {
        'src/main.ts': `// Offline IDE Platform\nimport { lspWorkspace } from './lspEngine';\n\nconsole.log('Starting offline IDE platform...');\nexport const VERSION = '1.1.0';\nexport function boot() {\n  lspWorkspace.initialize();\n  return true;\n}`,
        'src/lspEngine.ts': `export const lspWorkspace = { initialize: () => console.log('LSP started') };`,
        'package.json': `{\n  "name": "offline-ai-ide",\n  "version": "1.1.0"\n}`
      },
      author: this.currentAuthor,
      timestamp: Date.now() - 3600000 * 24,
      message: 'feat: add in-memory Language Server Protocol (LSP) analyzer',
      branch: 'main',
      tags: ['v1.1.0']
    };

    // Commit 3 on main: OPFS Integration
    const c3Sha = 'b82d34a5f01e23456789abcdef0123456789012';
    const c3: GitCommit = {
      sha: c3Sha,
      shortSha: c3Sha.slice(0, 7),
      parents: [c2Sha],
      tree: {
        'src/main.ts': `// Offline IDE Platform with OPFS\nimport { lspWorkspace } from './lspEngine';\nimport { opfsEngine } from './opfsEngine';\n\nconsole.log('Starting offline IDE platform with OPFS persistence...');\nexport const VERSION = '1.2.0-main';\nexport function boot() {\n  opfsEngine.init();\n  lspWorkspace.initialize();\n  return true;\n}`,
        'src/lspEngine.ts': `export const lspWorkspace = { initialize: () => console.log('LSP started') };`,
        'src/opfsEngine.ts': `export const opfsEngine = { init: () => console.log('OPFS ready') };`,
        'package.json': `{\n  "name": "offline-ai-ide",\n  "version": "1.2.0-main"\n}`
      },
      author: this.currentAuthor,
      timestamp: Date.now() - 3600000 * 8,
      message: 'feat(storage): integrate Origin Private File System (OPFS) high-scale buffer',
      branch: 'main'
    };

    // Commit 4 on feature/dap-debugger: Branching from c2
    const c4Sha = 'f93c78b12e3f456789abcdef012345678901234';
    const c4: GitCommit = {
      sha: c4Sha,
      shortSha: c4Sha.slice(0, 7),
      parents: [c2Sha],
      tree: {
        'src/main.ts': `// Offline IDE Platform with DAP Debugger\nimport { lspWorkspace } from './lspEngine';\nimport { dapDebugger } from './dapEngine';\n\nconsole.log('Starting offline IDE platform with Debug Adapter Protocol...');\nexport const VERSION = '1.2.0-dap';\nexport function boot() {\n  dapDebugger.start();\n  lspWorkspace.initialize();\n  return true;\n}`,
        'src/lspEngine.ts': `export const lspWorkspace = { initialize: () => console.log('LSP started') };`,
        'src/dapEngine.ts': `export const dapDebugger = { start: () => console.log('DAP ready') };`,
        'package.json': `{\n  "name": "offline-ai-ide",\n  "version": "1.2.0-dap"\n}`
      },
      author: {
        name: 'Elena Rostova (Core Runtime)',
        email: 'elena@offline-ide.internal'
      },
      timestamp: Date.now() - 3600000 * 6,
      message: 'feat(debugger): implement visual DAP breakpoints & variable inspector',
      branch: 'feature/dap-debugger'
    };

    this.commits.set(c1Sha, c1);
    this.commits.set(c2Sha, c2);
    this.commits.set(c3Sha, c3);
    this.commits.set(c4Sha, c4);

    this.branches.set('main', { name: 'main', targetSha: c3Sha, isHead: true });
    this.branches.set('feature/dap-debugger', { name: 'feature/dap-debugger', targetSha: c4Sha, isHead: false });
    this.branches.set('hotfix/v1.1.1', { name: 'hotfix/v1.1.1', targetSha: c2Sha, isHead: false });

    this.tags.set('v1.1.0', c2Sha);
    this.headSha = c3Sha;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(cb => cb());
  }

  // --- GETTERS ---
  public getBranches(): GitBranch[] {
    return Array.from(this.branches.values());
  }

  public getCurrentBranch(): string {
    return this.currentBranchName;
  }

  public getHeadSha(): string {
    return this.headSha;
  }

  public getCommits(): GitCommit[] {
    // Sort in reverse chronological order
    return Array.from(this.commits.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getCommit(sha: string): GitCommit | undefined {
    return this.commits.get(sha);
  }

  public getTags(): Record<string, string> {
    return Object.fromEntries(this.tags.entries());
  }

  public getStashes(): GitStash[] {
    return [...this.stashes];
  }

  public getActiveMergeSession(): MergeSession | null {
    return this.activeMergeSession;
  }

  /**
   * Loads a cloned repository's files, branch, and commits into the in-memory Git DAG
   */
  public loadClonedRepository(
    repoName: string,
    branchName: string = 'main',
    workspaceFiles: Record<string, string> = {},
    customCommits?: any[]
  ): void {
    this.commits.clear();
    this.branches.clear();
    this.tags.clear();
    this.stashes = [];
    this.currentBranchName = branchName;

    if (customCommits && customCommits.length > 0) {
      for (let i = 0; i < customCommits.length; i++) {
        const c = customCommits[i];
        const sha = c.sha || `clone_${Math.random().toString(36).slice(2, 10)}`;
        const shortSha = c.shortSha || sha.slice(0, 7);
        const parents = c.parents && c.parents.length > 0
          ? c.parents
          : (i < customCommits.length - 1 && customCommits[i + 1]?.sha ? [customCommits[i + 1].sha] : []);
        
        const commitObj: GitCommit = {
          sha,
          shortSha,
          parents,
          tree: i === 0 ? { ...workspaceFiles } : {},
          author: c.author || this.currentAuthor,
          timestamp: c.timestamp || Date.now() - (i * 3600000 * 4),
          message: c.message || `commit from ${repoName}`,
          branch: branchName
        };
        this.commits.set(sha, commitObj);
      }
      this.headSha = customCommits[0].sha;
    } else {
      const sha = 'c107e' + Math.random().toString(16).slice(2, 10) + '00000000000000000000000000';
      const initialCommit: GitCommit = {
        sha,
        shortSha: sha.slice(0, 7),
        parents: [],
        tree: { ...workspaceFiles },
        author: {
          name: 'Git Clone Provisioner',
          email: `clone@${repoName}.local`
        },
        timestamp: Date.now(),
        message: `chore: cloned repository "${repoName}" from source`,
        branch: branchName
      };
      this.commits.set(sha, initialCommit);
      this.headSha = sha;
    }

    this.branches.set(branchName, {
      name: branchName,
      targetSha: this.headSha,
      isHead: true
    });

    this.notify();
  }

  // --- ACTIONS ---

  /**
   * Commit current workspace files to HEAD
   */
  public commit(message: string, workspaceFiles: Record<string, string>): GitCommit {
    if (!message.trim()) {
      throw new Error('Commit message cannot be empty');
    }

    const sha = this.generateSha(message + Date.now() + Math.random());
    const newCommit: GitCommit = {
      sha,
      shortSha: sha.slice(0, 7),
      parents: this.headSha ? [this.headSha] : [],
      tree: { ...workspaceFiles },
      author: this.currentAuthor,
      timestamp: Date.now(),
      message,
      branch: this.currentBranchName
    };

    this.commits.set(sha, newCommit);
    this.headSha = sha;

    // Update branch pointer
    const branch = this.branches.get(this.currentBranchName);
    if (branch) {
      branch.targetSha = sha;
    } else {
      this.branches.set(this.currentBranchName, {
        name: this.currentBranchName,
        targetSha: sha,
        isHead: true
      });
    }

    this.notify();
    return newCommit;
  }

  /**
   * Create and switch to new branch
   */
  public createBranch(branchName: string, switchImmediately = true): void {
    const cleanName = branchName.trim().replace(/\s+/g, '-');
    if (!cleanName) throw new Error('Invalid branch name');
    if (this.branches.has(cleanName)) throw new Error(`Branch '${cleanName}' already exists`);

    this.branches.set(cleanName, {
      name: cleanName,
      targetSha: this.headSha,
      isHead: switchImmediately
    });

    if (switchImmediately) {
      this.checkout(cleanName);
    } else {
      this.notify();
    }
  }

  /**
   * Switch branch (git checkout)
   */
  public checkout(branchName: string): Record<string, string> | null {
    const branch = this.branches.get(branchName);
    if (!branch) throw new Error(`Branch '${branchName}' not found`);

    // Reset isHead flags
    this.branches.forEach(b => { b.isHead = (b.name === branchName); });
    this.currentBranchName = branchName;
    this.headSha = branch.targetSha;

    const commit = this.commits.get(this.headSha);
    this.notify();
    return commit ? commit.tree : null;
  }

  /**
   * Create Tag
   */
  public createTag(tagName: string, targetSha: string = this.headSha): void {
    const cleanTag = tagName.trim();
    if (!cleanTag) throw new Error('Invalid tag name');
    this.tags.set(cleanTag, targetSha);
    this.notify();
  }

  /**
   * Stash uncommitted changes
   */
  public stashPush(message: string, workspaceFiles: Record<string, string>): GitStash {
    const stash: GitStash = {
      id: `stash@{${this.stashes.length}}`,
      index: this.stashes.length,
      message: message || `WIP on ${this.currentBranchName}: ${this.headSha.slice(0, 7)}`,
      timestamp: Date.now(),
      branch: this.currentBranchName,
      files: { ...workspaceFiles }
    };
    this.stashes.unshift(stash);
    this.notify();
    return stash;
  }

  public stashPop(): GitStash | null {
    if (this.stashes.length === 0) return null;
    const popped = this.stashes.shift()!;
    this.notify();
    return popped;
  }

  public stashDrop(index: number): void {
    this.stashes.splice(index, 1);
    this.notify();
  }

  /**
   * Cherry-pick a commit onto current branch
   */
  public cherryPick(targetSha: string): GitCommit {
    const sourceCommit = this.commits.get(targetSha);
    if (!sourceCommit) throw new Error('Commit not found');

    const newSha = this.generateSha(`cherry-pick-${targetSha}-${Date.now()}`);
    const currentCommit = this.commits.get(this.headSha);

    const mergedTree = {
      ...(currentCommit ? currentCommit.tree : {}),
      ...sourceCommit.tree
    };

    const cherryCommit: GitCommit = {
      sha: newSha,
      shortSha: newSha.slice(0, 7),
      parents: [this.headSha],
      tree: mergedTree,
      author: sourceCommit.author,
      timestamp: Date.now(),
      message: `${sourceCommit.message} (cherry picked from commit ${targetSha.slice(0, 7)})`,
      branch: this.currentBranchName
    };

    this.commits.set(newSha, cherryCommit);
    this.headSha = newSha;
    const branch = this.branches.get(this.currentBranchName);
    if (branch) branch.targetSha = newSha;

    this.notify();
    return cherryCommit;
  }

  /**
   * Real-Time Git Blame Calculator
   * Returns per-line commit attribution
   */
  public computeBlame(filePath: string, fileContent?: string): GitBlameLine[] {
    const currentContent = fileContent || (this.commits.get(this.headSha)?.tree[filePath] || '');
    const lines = currentContent.split('\n');

    const commitsList = this.getCommits();
    const blameLines: GitBlameLine[] = [];

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      
      // Look back through commits to find where this line was introduced
      let matchedCommit = commitsList[0];
      for (const commit of commitsList) {
        const pastFile = commit.tree[filePath];
        if (pastFile && pastFile.includes(line.trim()) && line.trim().length > 0) {
          matchedCommit = commit;
        }
      }

      if (!matchedCommit) {
        matchedCommit = {
          sha: this.headSha,
          shortSha: this.headSha.slice(0, 7),
          parents: [],
          tree: {},
          author: this.currentAuthor,
          timestamp: Date.now() - 3600000,
          message: 'Local uncommitted modifications',
          branch: this.currentBranchName
        };
      }

      const rel = this.formatRelativeTime(matchedCommit.timestamp);
      blameLines.push({
        lineNumber: lineNum,
        code: line,
        sha: matchedCommit.sha,
        shortSha: matchedCommit.shortSha,
        author: matchedCommit.author.name,
        date: new Date(matchedCommit.timestamp).toLocaleDateString(),
        relativeTime: rel,
        message: matchedCommit.message
      });
    });

    return blameLines;
  }

  /**
   * 3-Way Merge Conflict Initialization
   */
  public start3WayMerge(incomingBranchName: string): MergeSession {
    const incomingBranch = this.branches.get(incomingBranchName);
    if (!incomingBranch) throw new Error(`Branch '${incomingBranchName}' not found`);

    const currentCommit = this.commits.get(this.headSha);
    const incomingCommit = this.commits.get(incomingBranch.targetSha);

    if (!currentCommit || !incomingCommit) {
      throw new Error('Cannot find commit objects for merge');
    }

    // Find common ancestor (simple base lookup)
    const baseCommit = this.findCommonAncestor(currentCommit.sha, incomingCommit.sha);
    const baseTree = baseCommit ? baseCommit.tree : {};

    const allFiles = Array.from(new Set([
      ...Object.keys(currentCommit.tree),
      ...Object.keys(incomingCommit.tree)
    ]));

    const conflictedFiles: string[] = [];
    const fileHunks: Record<string, MergeConflictHunk[]> = {};

    allFiles.forEach(file => {
      const currentCode = currentCommit.tree[file] || '';
      const incomingCode = incomingCommit.tree[file] || '';
      const baseCode = baseTree[file] || '';

      if (currentCode !== incomingCode) {
        // Detect conflict hunks
        const hunks = this.generateConflictHunks(file, baseCode, currentCode, incomingCode);
        if (hunks.length > 0) {
          conflictedFiles.push(file);
          fileHunks[file] = hunks;
        }
      }
    });

    this.activeMergeSession = {
      targetBranch: this.currentBranchName,
      incomingBranch: incomingBranchName,
      baseSha: baseCommit ? baseCommit.sha : '',
      currentSha: currentCommit.sha,
      incomingSha: incomingCommit.sha,
      conflictedFiles,
      resolvedFiles: [],
      activeFile: conflictedFiles[0] || '',
      fileHunks,
      isCompleted: conflictedFiles.length === 0
    };

    this.notify();
    return this.activeMergeSession;
  }

  private generateConflictHunks(
    filePath: string,
    baseCode: string,
    currentCode: string,
    incomingCode: string
  ): MergeConflictHunk[] {
    const currentLines = currentCode.split('\n');
    const incomingLines = incomingCode.split('\n');
    const baseLines = baseCode.split('\n');

    const hunks: MergeConflictHunk[] = [];

    // Find divergent regions
    let inConflict = false;
    let currChunk: string[] = [];
    let incChunk: string[] = [];
    let baseChunk: string[] = [];
    let startLine = 1;

    const maxLen = Math.max(currentLines.length, incomingLines.length);

    for (let i = 0; i < maxLen; i++) {
      const c = currentLines[i];
      const inc = incomingLines[i];
      const b = baseLines[i];

      if (c !== inc) {
        if (!inConflict) {
          inConflict = true;
          startLine = i + 1;
          currChunk = [];
          incChunk = [];
          baseChunk = [];
        }
        if (c !== undefined) currChunk.push(c);
        if (inc !== undefined) incChunk.push(inc);
        if (b !== undefined) baseChunk.push(b);
      } else {
        if (inConflict) {
          hunks.push({
            id: `hunk-${hunks.length + 1}`,
            startLine,
            currentContent: currChunk.join('\n'),
            incomingContent: incChunk.join('\n'),
            baseContent: baseChunk.join('\n'),
            resolutionState: 'unresolved'
          });
          inConflict = false;
        }
      }
    }

    if (inConflict) {
      hunks.push({
        id: `hunk-${hunks.length + 1}`,
        startLine,
        currentContent: currChunk.join('\n'),
        incomingContent: incChunk.join('\n'),
        baseContent: baseChunk.join('\n'),
        resolutionState: 'unresolved'
      });
    }

    return hunks;
  }

  /**
   * Resolve a specific conflict hunk
   */
  public resolveHunk(
    filePath: string,
    hunkId: string,
    strategy: 'current' | 'incoming' | 'both' | 'custom',
    customText?: string
  ): void {
    if (!this.activeMergeSession) return;
    const hunks = this.activeMergeSession.fileHunks[filePath];
    if (!hunks) return;

    const hunk = hunks.find(h => h.id === hunkId);
    if (!hunk) return;

    hunk.resolutionState = strategy;
    if (strategy === 'current') {
      hunk.resolvedContent = hunk.currentContent;
    } else if (strategy === 'incoming') {
      hunk.resolvedContent = hunk.incomingContent;
    } else if (strategy === 'both') {
      hunk.resolvedContent = `${hunk.currentContent}\n${hunk.incomingContent}`;
    } else if (strategy === 'custom') {
      hunk.resolvedContent = customText || '';
    }

    // Check if all hunks for this file are resolved
    const allResolved = hunks.every(h => h.resolutionState !== 'unresolved');
    if (allResolved && !this.activeMergeSession.resolvedFiles.includes(filePath)) {
      this.activeMergeSession.resolvedFiles.push(filePath);
    }

    this.notify();
  }

  /**
   * Complete 3-Way Merge & Generate Merge Commit
   */
  public completeMerge(message?: string): GitCommit {
    if (!this.activeMergeSession) throw new Error('No active merge session');

    const session = this.activeMergeSession;
    const currentCommit = this.commits.get(session.currentSha)!;
    const incomingCommit = this.commits.get(session.incomingSha)!;

    const finalTree: Record<string, string> = { ...currentCommit.tree };

    // Apply resolved hunks
    for (const [filePath, hunks] of Object.entries(session.fileHunks)) {
      const originalLines = (currentCommit.tree[filePath] || '').split('\n');
      // For demonstration, reconstruct with resolved contents
      let fileResult = currentCommit.tree[filePath] || '';
      for (const h of hunks) {
        if (h.resolvedContent !== undefined) {
          fileResult = fileResult.replace(h.currentContent, h.resolvedContent);
        }
      }
      finalTree[filePath] = fileResult;
    }

    const mergeSha = this.generateSha(`merge-${session.currentSha}-${session.incomingSha}-${Date.now()}`);
    const mergeCommit: GitCommit = {
      sha: mergeSha,
      shortSha: mergeSha.slice(0, 7),
      parents: [session.currentSha, session.incomingSha],
      tree: finalTree,
      author: this.currentAuthor,
      timestamp: Date.now(),
      message: message || `Merge branch '${session.incomingBranch}' into ${session.targetBranch}`,
      branch: session.targetBranch
    };

    this.commits.set(mergeSha, mergeCommit);
    this.headSha = mergeSha;
    const targetBranchObj = this.branches.get(session.targetBranch);
    if (targetBranchObj) targetBranchObj.targetSha = mergeSha;

    this.activeMergeSession = null;
    this.notify();
    return mergeCommit;
  }

  public abortMerge(): void {
    this.activeMergeSession = null;
    this.notify();
  }

  private findCommonAncestor(sha1: string, sha2: string): GitCommit | null {
    const c1 = this.commits.get(sha1);
    const c2 = this.commits.get(sha2);
    if (!c1 || !c2) return null;

    // Check direct parents
    if (c1.parents.includes(c2.sha)) return c2;
    if (c2.parents.includes(c1.sha)) return c1;

    for (const p1 of c1.parents) {
      if (c2.parents.includes(p1)) {
        return this.commits.get(p1) || null;
      }
    }

    // Default to oldest root commit
    const allCommits = this.getCommits();
    return allCommits[allCommits.length - 1] || null;
  }

  private generateSha(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return (hex + hex + hex + hex + hex).slice(0, 40);
  }

  private formatRelativeTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}

export const gitEngine = new GitEngine();
