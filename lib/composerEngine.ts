// lib/composerEngine.ts - Agentic Multi-File Composer Engine with Checkpoint History & Chunk Acceptance

export interface DiffHunkChunk {
  id: string;
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  originalLines: { lineNum: number; text: string }[];
  proposedLines: { lineNum: number; text: string }[];
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ComposerFileEdit {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  originalContent: string;
  proposedContent: string;
  description: string;
  hunks: DiffHunkChunk[];
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
}

export interface ComposerCheckpoint {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  files: Record<string, string>;
  changedFilesCount: number;
  source: 'composer' | 'manual' | 'rollback';
}

export interface ComposerPlan {
  id: string;
  userPrompt: string;
  summary: string;
  targetArchitecture: string;
  createdAt: number;
  files: ComposerFileEdit[];
  totalHunks: number;
  acceptedHunks: number;
  rejectedHunks: number;
  status: 'generating' | 'reviewing' | 'completed' | 'discarded';
}

// Compute diff hunks between original and proposed text using LCS algorithm
export function computeComposerDiffHunks(original: string, proposed: string): DiffHunkChunk[] {
  const origLines = (original || '').split('\n');
  const propLines = (proposed || '').split('\n');
  
  const n = origLines.length;
  const m = propLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origLines[i - 1] === propLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  interface RawOp {
    type: 'same' | 'delete' | 'add';
    origNum?: number;
    propNum?: number;
    text: string;
  }

  const ops: RawOp[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === propLines[j - 1]) {
      ops.unshift({
        type: 'same',
        origNum: i,
        propNum: j,
        text: origLines[i - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({
        type: 'add',
        propNum: j,
        text: propLines[j - 1]
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.unshift({
        type: 'delete',
        origNum: i,
        text: origLines[i - 1]
      });
      i--;
    }
  }

  // Aggregate into actionable hunks
  const hunks: DiffHunkChunk[] = [];
  let currentGroup: {
    type: 'add' | 'delete' | 'modify' | 'unchanged';
    orig: { lineNum: number; text: string }[];
    prop: { lineNum: number; text: string }[];
  } | null = null;

  for (const op of ops) {
    if (op.type === 'same') {
      if (currentGroup) {
        hunks.push({
          id: `hunk-${hunks.length + 1}-${Date.now().toString(36)}`,
          type: currentGroup.type,
          originalLines: currentGroup.orig,
          proposedLines: currentGroup.prop,
          status: 'pending'
        });
        currentGroup = null;
      }
    } else {
      const opKind = op.type === 'add' ? 'add' : 'delete';
      if (!currentGroup) {
        currentGroup = {
          type: opKind,
          orig: op.origNum !== undefined ? [{ lineNum: op.origNum, text: op.text }] : [],
          prop: op.propNum !== undefined ? [{ lineNum: op.propNum, text: op.text }] : []
        };
      } else {
        if (currentGroup.type !== opKind) {
          currentGroup.type = 'modify';
        }
        if (op.origNum !== undefined) {
          currentGroup.orig.push({ lineNum: op.origNum, text: op.text });
        }
        if (op.propNum !== undefined) {
          currentGroup.prop.push({ lineNum: op.propNum, text: op.text });
        }
      }
    }
  }

  if (currentGroup) {
    hunks.push({
      id: `hunk-${hunks.length + 1}-${Date.now().toString(36)}`,
      type: currentGroup.type,
      originalLines: currentGroup.orig,
      proposedLines: currentGroup.prop,
      status: 'pending'
    });
  }

  return hunks;
}

// Generate reconstructed merged content based on hunk accept/reject decisions
export function reconstructMergedFile(fileEdit: ComposerFileEdit): string {
  if (fileEdit.status === 'accepted') return fileEdit.proposedContent;
  if (fileEdit.status === 'rejected') return fileEdit.originalContent;

  const hunks = fileEdit.hunks;
  if (hunks.length === 0) return fileEdit.proposedContent;

  // Build line-by-line reconstruction
  const origLines = (fileEdit.originalContent || '').split('\n');
  const resultLines: string[] = [];
  let origCursor = 0;

  for (const hunk of hunks) {
    // Collect original lines prior to this hunk
    if (hunk.originalLines.length > 0) {
      const hunkStartOrig = hunk.originalLines[0].lineNum - 1;
      while (origCursor < hunkStartOrig && origCursor < origLines.length) {
        resultLines.push(origLines[origCursor]);
        origCursor++;
      }
    }

    if (hunk.status === 'accepted') {
      // Include proposed lines
      for (const pl of hunk.proposedLines) {
        resultLines.push(pl.text);
      }
      if (hunk.originalLines.length > 0) {
        origCursor = hunk.originalLines[hunk.originalLines.length - 1].lineNum;
      }
    } else if (hunk.status === 'rejected') {
      // Keep original lines
      for (const ol of hunk.originalLines) {
        resultLines.push(ol.text);
      }
      if (hunk.originalLines.length > 0) {
        origCursor = hunk.originalLines[hunk.originalLines.length - 1].lineNum;
      }
    } else {
      // Pending default: show proposed in review
      for (const pl of hunk.proposedLines) {
        resultLines.push(pl.text);
      }
      if (hunk.originalLines.length > 0) {
        origCursor = hunk.originalLines[hunk.originalLines.length - 1].lineNum;
      }
    }
  }

  // Append remaining original lines
  while (origCursor < origLines.length) {
    resultLines.push(origLines[origCursor]);
    origCursor++;
  }

  return resultLines.join('\n');
}

export class MultiFileComposerManager {
  private checkpoints: ComposerCheckpoint[] = [];
  private activePlan: ComposerPlan | null = null;

  constructor() {}

  public getCheckpoints(): ComposerCheckpoint[] {
    return [...this.checkpoints].reverse();
  }

  public getActivePlan(): ComposerPlan | null {
    return this.activePlan;
  }

  public createCheckpoint(name: string, description: string, files: Record<string, string>, source: 'composer' | 'manual' | 'rollback' = 'composer'): ComposerCheckpoint {
    const cp: ComposerCheckpoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      timestamp: Date.now(),
      files: { ...files },
      changedFilesCount: Object.keys(files).length,
      source
    };
    this.checkpoints.push(cp);
    // Keep max 25 checkpoints in memory
    if (this.checkpoints.length > 25) {
      this.checkpoints.shift();
    }
    return cp;
  }

  public rollbackToCheckpoint(checkpointId: string): Record<string, string> | null {
    const cp = this.checkpoints.find(c => c.id === checkpointId);
    if (!cp) return null;
    return { ...cp.files };
  }

  public setPlan(plan: ComposerPlan) {
    this.activePlan = plan;
  }

  public acceptAll(): { updatedFiles: Record<string, string>; completed: boolean } {
    if (!this.activePlan) return { updatedFiles: {}, completed: false };

    const updatedFiles: Record<string, string> = {};

    for (const file of this.activePlan.files) {
      file.status = 'accepted';
      for (const hunk of file.hunks) {
        hunk.status = 'accepted';
      }
      updatedFiles[file.filePath] = file.proposedContent;
    }

    this.activePlan.acceptedHunks = this.activePlan.totalHunks;
    this.activePlan.rejectedHunks = 0;
    this.activePlan.status = 'completed';

    return { updatedFiles, completed: true };
  }

  public rejectAll(): { completed: boolean } {
    if (!this.activePlan) return { completed: false };

    for (const file of this.activePlan.files) {
      file.status = 'rejected';
      for (const hunk of file.hunks) {
        hunk.status = 'rejected';
      }
    }

    this.activePlan.rejectedHunks = this.activePlan.totalHunks;
    this.activePlan.status = 'discarded';

    return { completed: true };
  }

  public acceptFile(filePath: string): { mergedContent: string; allDecided: boolean } {
    if (!this.activePlan) return { mergedContent: '', allDecided: false };
    const file = this.activePlan.files.find(f => f.filePath === filePath);
    if (!file) return { mergedContent: '', allDecided: false };

    file.status = 'accepted';
    for (const hunk of file.hunks) {
      hunk.status = 'accepted';
    }

    this.recalcPlanMetrics();
    return {
      mergedContent: file.proposedContent,
      allDecided: this.activePlan.status === 'completed'
    };
  }

  public rejectFile(filePath: string): { originalContent: string; allDecided: boolean } {
    if (!this.activePlan) return { originalContent: '', allDecided: false };
    const file = this.activePlan.files.find(f => f.filePath === filePath);
    if (!file) return { originalContent: '', allDecided: false };

    file.status = 'rejected';
    for (const hunk of file.hunks) {
      hunk.status = 'rejected';
    }

    this.recalcPlanMetrics();
    return {
      originalContent: file.originalContent,
      allDecided: this.activePlan.status === 'completed' || this.activePlan.status === 'discarded'
    };
  }

  public setHunkStatus(filePath: string, hunkId: string, status: 'accepted' | 'rejected'): { mergedContent: string } {
    if (!this.activePlan) return { mergedContent: '' };
    const file = this.activePlan.files.find(f => f.filePath === filePath);
    if (!file) return { mergedContent: '' };

    const hunk = file.hunks.find(h => h.id === hunkId);
    if (hunk) {
      hunk.status = status;
    }

    // Check file status
    const allAccepted = file.hunks.every(h => h.status === 'accepted');
    const allRejected = file.hunks.every(h => h.status === 'rejected');
    if (allAccepted) file.status = 'accepted';
    else if (allRejected) file.status = 'rejected';
    else file.status = 'partial';

    this.recalcPlanMetrics();
    return { mergedContent: reconstructMergedFile(file) };
  }

  private recalcPlanMetrics() {
    if (!this.activePlan) return;
    let accepted = 0;
    let rejected = 0;
    let pending = 0;

    for (const f of this.activePlan.files) {
      for (const h of f.hunks) {
        if (h.status === 'accepted') accepted++;
        else if (h.status === 'rejected') rejected++;
        else pending++;
      }
    }

    this.activePlan.acceptedHunks = accepted;
    this.activePlan.rejectedHunks = rejected;
    if (pending === 0) {
      this.activePlan.status = accepted > 0 ? 'completed' : 'discarded';
    }
  }
}

export const composerWorkspace = new MultiFileComposerManager();
