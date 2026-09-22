/**
 * Local File Timeline Engine
 * VS Code-style "Timeline" feature — auto-snapshots every file save/modification.
 * Stores up to 50 snapshots per file in localStorage (keyed by file path).
 * Supports querying history, previewing diffs between snapshots, and reverting.
 */

export interface FileSnapshot {
  id: string;
  filePath: string;
  content: string;
  timestamp: number;
  label: string; // "Auto Save", "Manual Save", "AI Edit", etc.
  linesAdded: number;
  linesRemoved: number;
}

const STORAGE_PREFIX = 'offline-ide:timeline:';
const MAX_SNAPSHOTS_PER_FILE = 50;
const MIN_SNAPSHOT_INTERVAL_MS = 3000;

type TimelineSubscriber = (filePath: string, snapshots: FileSnapshot[]) => void;

class FileTimelineEngine {
  private static instance: FileTimelineEngine;
  private subscribers = new Set<TimelineSubscriber>();
  private lastSnapshotTimes = new Map<string, number>();

  public static getInstance(): FileTimelineEngine {
    if (!FileTimelineEngine.instance) {
      FileTimelineEngine.instance = new FileTimelineEngine();
    }
    return FileTimelineEngine.instance;
  }

  public snapshot(filePath: string, content: string, label: string = 'Auto Save'): FileSnapshot | null {
    if (typeof window === 'undefined') return null;
    const lastTime = this.lastSnapshotTimes.get(filePath) || 0;
    const now = Date.now();
    if (now - lastTime < MIN_SNAPSHOT_INTERVAL_MS) return null;
    const existing = this.getHistory(filePath);
    if (existing.length > 0 && existing[0].content === content) return null;
    const prevContent = existing.length > 0 ? existing[0].content : '';
    const { added, removed } = this.computeLineDiff(prevContent, content);
    const snap: FileSnapshot = { id: `${filePath}-${now}`, filePath, content, timestamp: now, label, linesAdded: added, linesRemoved: removed };
    const updated = [snap, ...existing].slice(0, MAX_SNAPSHOTS_PER_FILE);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${filePath}`, JSON.stringify(updated));
    } catch {
      try { localStorage.setItem(`${STORAGE_PREFIX}${filePath}`, JSON.stringify(updated.slice(0, 10))); } catch { return null; }
    }
    this.lastSnapshotTimes.set(filePath, now);
    this.notifySubscribers(filePath, updated);
    return snap;
  }

  public getHistory(filePath: string): FileSnapshot[] {
    if (typeof window === 'undefined') return [];
    try { const raw = localStorage.getItem(`${STORAGE_PREFIX}${filePath}`); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }

  public getSnapshot(filePath: string, snapshotId: string): FileSnapshot | null {
    return this.getHistory(filePath).find(s => s.id === snapshotId) || null;
  }

  public clearHistory(filePath: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${STORAGE_PREFIX}${filePath}`);
    this.notifySubscribers(filePath, []);
  }

  public subscribe(callback: TimelineSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public formatTimestamp(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  public computeLineDiff(oldContent: string, newContent: string): { added: number; removed: number } {
    const oldLines = new Set(oldContent.split('\n'));
    const newLines = new Set(newContent.split('\n'));
    let added = 0, removed = 0;
    newContent.split('\n').forEach(l => { if (!oldLines.has(l)) added++; });
    oldContent.split('\n').forEach(l => { if (!newLines.has(l)) removed++; });
    return { added, removed };
  }

  public generateUnifiedDiff(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const result: string[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === undefined) result.push(`+ ${n}`);
      else if (n === undefined) result.push(`- ${o}`);
      else if (o !== n) { result.push(`- ${o}`); result.push(`+ ${n}`); }
      else result.push(`  ${o}`);
    }
    return result.join('\n');
  }

  private notifySubscribers(filePath: string, snapshots: FileSnapshot[]): void {
    this.subscribers.forEach(fn => { try { fn(filePath, snapshots); } catch {} });
  }
}

export const fileTimelineEngine = FileTimelineEngine.getInstance();
