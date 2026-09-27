/**
 * Void Editor Fast Apply Streaming Diff Engine & Ghost Text Autocomplete
 *
 * Implements:
 * 1. Line-level Myers / LCS Diff Hunk computation
 * 2. High-speed speculative fast-apply with conflict avoidance
 * 3. Standard Git Unified Diff generation
 * 4. Inline predictive Ghost Text extraction & word-by-word acceptance
 */

export interface DiffLine {
  type: 'context' | 'insert' | 'delete';
  text: string;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FastApplyResult {
  updatedContent: string;
  conflicts: string[];
}

export interface GhostTextWordResult {
  acceptedWord: string;
  remainingGhostText: string;
}

export class VoidFastApplyEngine {
  /**
   * Computes minimal diff hunks between oldContent and newContent
   */
  public computeHunks(oldContent: string, newContent: string, contextLines: number = 3): DiffHunk[] {
    const oldLines = oldContent.replace(/\r\n/g, '\n').split('\n');
    const newLines = newContent.replace(/\r\n/g, '\n').split('\n');

    // LCS Table computation
    const n = oldLines.length;
    const m = newLines.length;

    // Build diff sequence using LCS
    const lcsMatrix: number[][] = Array(n + 1)
      .fill(0)
      .map(() => Array(m + 1).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (oldLines[i] === newLines[j]) {
          lcsMatrix[i + 1][j + 1] = lcsMatrix[i][j] + 1;
        } else {
          lcsMatrix[i + 1][j + 1] = Math.max(lcsMatrix[i + 1][j], lcsMatrix[i][j + 1]);
        }
      }
    }

    // Backtrack to find edits
    const diffOps: DiffLine[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        diffOps.unshift({ type: 'context', text: oldLines[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
        diffOps.unshift({ type: 'insert', text: newLines[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || lcsMatrix[i][j - 1] < lcsMatrix[i - 1][j])) {
        diffOps.unshift({ type: 'delete', text: oldLines[i - 1] });
        i--;
      }
    }

    // Group into hunks
    const hunks: DiffHunk[] = [];
    let currentHunkLines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;
    let hunkOldStart = 1;
    let hunkNewStart = 1;
    let hasChangesInCurrent = false;

    let idx = 0;
    while (idx < diffOps.length) {
      const op = diffOps[idx];

      if (op.type !== 'context') {
        if (!hasChangesInCurrent) {
          hasChangesInCurrent = true;
          // Capture leading context
          const startContext = Math.max(0, currentHunkLines.length - contextLines);
          const leading = currentHunkLines.slice(startContext);
          hunkOldStart = oldLineNum - leading.length;
          hunkNewStart = newLineNum - leading.length;
          currentHunkLines = [...leading];
        }
        currentHunkLines.push(op);
        if (op.type === 'delete') oldLineNum++;
        if (op.type === 'insert') newLineNum++;
      } else {
        if (hasChangesInCurrent) {
          currentHunkLines.push(op);
          // Look ahead to check if more changes are coming within 2*contextLines
          let nextChangeDist = -1;
          for (let k = idx + 1; k < Math.min(diffOps.length, idx + 1 + contextLines * 2); k++) {
            if (diffOps[k].type !== 'context') {
              nextChangeDist = k - idx;
              break;
            }
          }

          if (nextChangeDist === -1 || idx - (hunkOldStart + currentHunkLines.length) > contextLines) {
            // Close hunk
            const oldCount = currentHunkLines.filter(l => l.type !== 'insert').length;
            const newCount = currentHunkLines.filter(l => l.type !== 'delete').length;
            hunks.push({
              oldStart: Math.max(1, hunkOldStart),
              oldCount,
              newStart: Math.max(1, hunkNewStart),
              newCount,
              lines: [...currentHunkLines]
            });
            currentHunkLines = [];
            hasChangesInCurrent = false;
          }
        } else {
          currentHunkLines.push(op);
        }
        oldLineNum++;
        newLineNum++;
      }
      idx++;
    }

    if (hasChangesInCurrent && currentHunkLines.length > 0) {
      const oldCount = currentHunkLines.filter(l => l.type !== 'insert').length;
      const newCount = currentHunkLines.filter(l => l.type !== 'delete').length;
      hunks.push({
        oldStart: Math.max(1, hunkOldStart),
        oldCount,
        newStart: Math.max(1, hunkNewStart),
        newCount,
        lines: [...currentHunkLines]
      });
    }

    return hunks;
  }

  /**
   * Fast apply hunks directly to original file content
   */
  public fastApply(originalFileContent: string, hunks: DiffHunk[]): FastApplyResult {
    const conflicts: string[] = [];
    if (!hunks || hunks.length === 0) {
      return { updatedContent: originalFileContent, conflicts };
    }

    let lines = originalFileContent.replace(/\r\n/g, '\n').split('\n');

    // Sort hunks descending by oldStart to preserve indices
    const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

    for (const hunk of sortedHunks) {
      const startIdx = hunk.oldStart - 1;
      const deleteLinesCount = hunk.lines.filter(l => l.type === 'delete').length;
      const replacementLines = hunk.lines
        .filter(l => l.type === 'context' || l.type === 'insert')
        .map(l => l.text);

      // Verify bounds
      if (startIdx < 0 || startIdx > lines.length) {
        conflicts.push(`Hunk start line ${hunk.oldStart} is out of file bounds (total lines: ${lines.length})`);
        continue;
      }

      // Splice in changes
      lines.splice(startIdx, hunk.oldCount, ...replacementLines);
    }

    return {
      updatedContent: lines.join('\n'),
      conflicts
    };
  }

  /**
   * Generates a standard unified diff string
   */
  public generateUnifiedDiff(filePath: string, oldContent: string, newContent: string): string {
    const hunks = this.computeHunks(oldContent, newContent);
    if (hunks.length === 0) return '';

    const header = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`
    ];

    const hunkStrings = hunks.map(hunk => {
      const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
      const lines = hunk.lines.map(line => {
        if (line.type === 'insert') return `+${line.text}`;
        if (line.type === 'delete') return `-${line.text}`;
        return ` ${line.text}`;
      });
      return [hunkHeader, ...lines].join('\n');
    });

    return [...header, ...hunkStrings].join('\n');
  }

  /**
   * Extracts inline predictive ghost text given prefix and candidate full completion
   */
  public extractGhostText(prefix: string, fullCompletion: string): string {
    if (!fullCompletion || !prefix) return fullCompletion || '';

    if (fullCompletion.startsWith(prefix)) {
      return fullCompletion.slice(prefix.length);
    }

    // Fuzzy trimmed fallback
    const trimmedPrefix = prefix.trim();
    const idx = fullCompletion.indexOf(trimmedPrefix);
    if (idx !== -1) {
      return fullCompletion.slice(idx + trimmedPrefix.length);
    }

    return fullCompletion;
  }

  /**
   * Accepts the next single word or token from ghost text for partial inline completion
   */
  public acceptNextWord(ghostText: string): GhostTextWordResult {
    if (!ghostText) {
      return { acceptedWord: '', remainingGhostText: '' };
    }

    // Match leading whitespace + first non-whitespace token
    const match = ghostText.match(/^(\s*\S+)([\s\S]*)$/);
    if (!match) {
      return { acceptedWord: ghostText, remainingGhostText: '' };
    }

    return {
      acceptedWord: match[1],
      remainingGhostText: match[2]
    };
  }
}

export const voidFastApplyEngine = new VoidFastApplyEngine();
