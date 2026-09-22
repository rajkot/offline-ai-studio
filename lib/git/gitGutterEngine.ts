/**
 * Real-Time Git Editor Gutters Engine
 * Decorates Monaco Editor line margin with VS Code-style color bars:
 * - Green stripe: newly added line
 * - Blue stripe: modified line
 * - Red triangle: deleted line
 * Listens for glyph margin clicks to trigger floating Hunk mini-diff actions.
 */

import { GitHunk } from '@/app/api/git/route';

export interface GutterClickEvent {
  hunk: GitHunk;
  lineNumber: number;
  screenX: number;
  screenY: number;
  filePath: string;
}

export class GitGutterEngine {
  private static instance: GitGutterEngine;
  private currentDecorations: string[] = [];
  private activeHunks: GitHunk[] = [];
  private activeFilePath: string | null = null;
  private editorInstance: any = null;
  private monacoInstance: any = null;
  private clickListeners: Set<(event: GutterClickEvent) => void> = new Set();
  private pollInterval: any = null;

  private constructor() {
    this.injectGutterCss();
  }

  public static getInstance(): GitGutterEngine {
    if (!GitGutterEngine.instance) {
      GitGutterEngine.instance = new GitGutterEngine();
    }
    return GitGutterEngine.instance;
  }

  public onGutterClick(callback: (event: GutterClickEvent) => void): () => void {
    this.clickListeners.add(callback);
    return () => this.clickListeners.delete(callback);
  }

  private emitGutterClick(event: GutterClickEvent) {
    this.clickListeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error(e); }
    });
  }

  /**
   * Injects CSS classes for Monaco gutter margin color bars
   */
  private injectGutterCss() {
    if (typeof document === 'undefined') return;
    const styleId = 'monaco-git-gutter-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* Git Gutter Margins in Monaco */
      .git-gutter-added {
        background: #10b981 !important;
        width: 3px !important;
        margin-left: 2px !important;
        border-radius: 1px !important;
      }
      .git-gutter-modified {
        background: #3b82f6 !important;
        width: 3px !important;
        margin-left: 2px !important;
        border-radius: 1px !important;
      }
      .git-gutter-deleted {
        border-left: 5px solid #ef4444 !important;
        border-top: 4px solid transparent !important;
        border-bottom: 4px solid transparent !important;
        width: 0 !important;
        height: 0 !important;
        margin-left: 2px !important;
        margin-top: 4px !important;
      }
      .git-gutter-overview-added {
        background: #10b981 !important;
      }
      .git-gutter-overview-modified {
        background: #3b82f6 !important;
      }
      .git-gutter-overview-deleted {
        background: #ef4444 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attaches Monaco Editor and begins diff tracking
   */
  public attachEditor(editor: any, monaco: any, filePath: string) {
    this.editorInstance = editor;
    this.monacoInstance = monaco;
    this.activeFilePath = filePath;

    // Listen to margin mouse clicks
    editor.onMouseDown((e: any) => {
      if (!this.monacoInstance) return;
      const target = e.target;
      if (
        target?.type === this.monacoInstance.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
        target?.type === this.monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        target?.type === this.monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const lineNum = target.position?.lineNumber;
        if (!lineNum) return;

        // Check if clicked line falls within any active hunk
        const hunk = this.activeHunks.find(h => lineNum >= h.startLine && lineNum <= h.endLine);
        if (hunk && this.activeFilePath) {
          const mouseEvent = e.event?.browserEvent || e.event;
          this.emitGutterClick({
            hunk,
            lineNumber: lineNum,
            screenX: mouseEvent?.clientX || 120,
            screenY: mouseEvent?.clientY || 200,
            filePath: this.activeFilePath
          });
        }
      }
    });

    // Refresh immediately and set up interval
    this.refreshDiff();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.refreshDiff(), 2500);
  }

  public setFilePath(filePath: string) {
    this.activeFilePath = filePath;
    this.refreshDiff();
  }

  public refreshFile(filePath?: string, editor?: any) {
    if (editor) this.editorInstance = editor;
    if (filePath) this.activeFilePath = filePath;
    return this.refreshDiff();
  }

  /**
   * Fetches latest diff hunks from /api/git?action=file-diff and updates Monaco decorations
   */
  public async refreshDiff(): Promise<void> {
    if (!this.editorInstance || !this.monacoInstance || !this.activeFilePath) return;

    try {
      const url = `/api/git?action=file-diff&path=${encodeURIComponent(this.activeFilePath)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && Array.isArray(data.hunks)) {
        this.activeHunks = data.hunks;
        this.applyDecorations(data.hunks);
      } else {
        this.clearDecorations();
      }
    } catch {
      // Offline / error
    }
  }

  private applyDecorations(hunks: GitHunk[]) {
    if (!this.editorInstance || !this.monacoInstance) return;
    const monaco = this.monacoInstance;
    const newDecorations: any[] = [];

    hunks.forEach(hunk => {
      let className = 'git-gutter-modified';
      let overviewColor = 'git-gutter-overview-modified';

      if (hunk.type === 'added') {
        className = 'git-gutter-added';
        overviewColor = 'git-gutter-overview-added';
      } else if (hunk.type === 'deleted') {
        className = 'git-gutter-deleted';
        overviewColor = 'git-gutter-overview-deleted';
      }

      newDecorations.push({
        range: new monaco.Range(hunk.startLine, 1, hunk.endLine, 1),
        options: {
          isWholeLine: false,
          linesDecorationsClassName: className,
          overviewRuler: {
            color: overviewColor,
            position: monaco.editor.OverviewRulerLane.Left
          }
        }
      });
    });

    this.currentDecorations = this.editorInstance.deltaDecorations(
      this.currentDecorations,
      newDecorations
    );
  }

  public clearDecorations() {
    if (this.editorInstance && this.currentDecorations.length > 0) {
      this.currentDecorations = this.editorInstance.deltaDecorations(this.currentDecorations, []);
      this.activeHunks = [];
    }
  }

  public dispose() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.clearDecorations();
    this.clickListeners.clear();
  }
}

export const gitGutterEngine = GitGutterEngine.getInstance();
