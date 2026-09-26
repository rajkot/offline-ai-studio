/**
 * Dockview Layout & Multi-Pane Window Management Engine
 *
 * Inspired by mathuo/dockview, bvaughn/react-resizable-panels, and FlexLayout.
 * Manages resizable multi-pane grids, floating detached panels, tab sets,
 * and workspace layout presets with localStorage persistence.
 */

export type DockPanelId =
  | 'editor-primary'
  | 'editor-secondary'
  | 'terminal-tray'
  | 'ai-chat'
  | 'novel-studio'
  | 'live-preview'
  | 'file-explorer'
  | 'git-graph';

export type LayoutPresetId =
  | 'classic-ide'
  | 'creative-studio'
  | 'research-data'
  | 'zen-focus'
  | 'dual-code'
  | 'terminal-grid';

export interface DockPanelConfig {
  id: DockPanelId;
  title: string;
  icon: string;
  defaultVisible: boolean;
  minWidthRatio?: number;
  minHeightRatio?: number;
  canFloat: boolean;
  isFloating?: boolean;
}

export interface WorkspaceLayoutPreset {
  id: LayoutPresetId;
  name: string;
  badge: string;
  description: string;
  icon: string;
  panels: {
    sidebarLeft: boolean;
    sidebarRight: boolean;
    bottomPanel: boolean;
    splitEditor: boolean;
    activePrimary: 'code' | 'novel' | 'research';
    terminalGrid: boolean;
    floatingChat: boolean;
  };
  ratios: {
    leftWidth: number;   // e.g. 240
    rightWidth: number;  // e.g. 380
    bottomHeight: number; // e.g. 260
    splitRatio: number;  // e.g. 0.5
  };
}

export const DOCK_PANELS: Record<DockPanelId, DockPanelConfig> = {
  'editor-primary': {
    id: 'editor-primary',
    title: 'Primary Monaco Editor',
    icon: 'Code2',
    defaultVisible: true,
    canFloat: false
  },
  'editor-secondary': {
    id: 'editor-secondary',
    title: 'Split Secondary Editor',
    icon: 'Columns2',
    defaultVisible: false,
    canFloat: true
  },
  'terminal-tray': {
    id: 'terminal-tray',
    title: 'Terminal & Console Tray',
    icon: 'Terminal',
    defaultVisible: true,
    canFloat: true
  },
  'ai-chat': {
    id: 'ai-chat',
    title: 'AI Assistant & Copilot',
    icon: 'Sparkles',
    defaultVisible: true,
    canFloat: true
  },
  'novel-studio': {
    id: 'novel-studio',
    title: 'Novel Notion/WYSIWYG Studio',
    icon: 'BookOpen',
    defaultVisible: false,
    canFloat: true
  },
  'live-preview': {
    id: 'live-preview',
    title: 'Live Webview Split Pane',
    icon: 'Globe',
    defaultVisible: false,
    canFloat: true
  },
  'file-explorer': {
    id: 'file-explorer',
    title: 'Workspace File Explorer',
    icon: 'Folder',
    defaultVisible: true,
    canFloat: false
  },
  'git-graph': {
    id: 'git-graph',
    title: 'Git DAG Visualizer',
    icon: 'GitBranch',
    defaultVisible: false,
    canFloat: true
  }
};

export const LAYOUT_PRESETS: Record<LayoutPresetId, WorkspaceLayoutPreset> = {
  'classic-ide': {
    id: 'classic-ide',
    name: 'Classic Developer IDE',
    badge: 'VS Code Style',
    description: 'Standard 3-pane workflow: Left Explorer, Centered Monaco Editor, Bottom Shell, Right AI Chat.',
    icon: 'Layout',
    panels: {
      sidebarLeft: true,
      sidebarRight: true,
      bottomPanel: true,
      splitEditor: false,
      activePrimary: 'code',
      terminalGrid: false,
      floatingChat: false
    },
    ratios: {
      leftWidth: 260,
      rightWidth: 380,
      bottomHeight: 240,
      splitRatio: 0.5
    }
  },
  'creative-studio': {
    id: 'creative-studio',
    name: 'Creative Studio & Literature',
    badge: 'Novel / Notion Mode',
    description: 'Maximized visual canvas with Notion-style slash commands, lore bible reference, and distraction-free writing.',
    icon: 'BookOpen',
    panels: {
      sidebarLeft: true,
      sidebarRight: false,
      bottomPanel: false,
      splitEditor: false,
      activePrimary: 'novel',
      terminalGrid: false,
      floatingChat: true
    },
    ratios: {
      leftWidth: 220,
      rightWidth: 0,
      bottomHeight: 0,
      splitRatio: 1.0
    }
  },
  'research-data': {
    id: 'research-data',
    name: 'Academic Research & Data',
    badge: 'LaTeX / Vector RAG',
    description: 'Side-by-side research drafts with real-time LaTeX math rendering and LanceDB citation search.',
    icon: 'Compass',
    panels: {
      sidebarLeft: true,
      sidebarRight: true,
      bottomPanel: false,
      splitEditor: true,
      activePrimary: 'research',
      terminalGrid: false,
      floatingChat: false
    },
    ratios: {
      leftWidth: 240,
      rightWidth: 420,
      bottomHeight: 0,
      splitRatio: 0.5
    }
  },
  'zen-focus': {
    id: 'zen-focus',
    name: 'Zen Maximum Focus',
    badge: 'Zero Distraction',
    description: 'Hides all sidebars, status bars, and trays for 100% full-screen immersive coding or prose writing.',
    icon: 'Maximize2',
    panels: {
      sidebarLeft: false,
      sidebarRight: false,
      bottomPanel: false,
      splitEditor: false,
      activePrimary: 'code',
      terminalGrid: false,
      floatingChat: false
    },
    ratios: {
      leftWidth: 0,
      rightWidth: 0,
      bottomHeight: 0,
      splitRatio: 1.0
    }
  },
  'dual-code': {
    id: 'dual-code',
    name: 'Dual Split-Screen Code',
    badge: 'Side-by-Side 50/50',
    description: 'Split vertical editor for simultaneous polyglot editing, test-driven development, and diff comparison.',
    icon: 'Columns2',
    panels: {
      sidebarLeft: true,
      sidebarRight: false,
      bottomPanel: true,
      splitEditor: true,
      activePrimary: 'code',
      terminalGrid: false,
      floatingChat: false
    },
    ratios: {
      leftWidth: 220,
      rightWidth: 0,
      bottomHeight: 200,
      splitRatio: 0.5
    }
  },
  'terminal-grid': {
    id: 'terminal-grid',
    name: 'DevOps & Terminal Matrix',
    badge: 'Shell Powerhouse',
    description: 'Maximized multi-pane terminal grid with background build task runners and system telemetry.',
    icon: 'Terminal',
    panels: {
      sidebarLeft: false,
      sidebarRight: false,
      bottomPanel: true,
      splitEditor: false,
      activePrimary: 'code',
      terminalGrid: true,
      floatingChat: false
    },
    ratios: {
      leftWidth: 0,
      rightWidth: 0,
      bottomHeight: 460,
      splitRatio: 0.3
    }
  }
};

export class DockviewLayoutEngine {
  private static instance: DockviewLayoutEngine;
  private currentPreset: LayoutPresetId = 'classic-ide';
  private customRatios: { leftWidth: number; rightWidth: number; bottomHeight: number; splitRatio: number } = {
    leftWidth: 260,
    rightWidth: 380,
    bottomHeight: 240,
    splitRatio: 0.5
  };
  private detachedPanels: Set<DockPanelId> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DockviewLayoutEngine {
    if (!DockviewLayoutEngine.instance) {
      DockviewLayoutEngine.instance = new DockviewLayoutEngine();
    }
    return DockviewLayoutEngine.instance;
  }

  public getPresets(): WorkspaceLayoutPreset[] {
    return Object.values(LAYOUT_PRESETS);
  }

  public getCurrentPreset(): WorkspaceLayoutPreset {
    return LAYOUT_PRESETS[this.currentPreset];
  }

  public setPreset(id: LayoutPresetId) {
    if (LAYOUT_PRESETS[id]) {
      this.currentPreset = id;
      this.customRatios = { ...LAYOUT_PRESETS[id].ratios };
      this.saveToStorage();
    }
  }

  public getRatios() {
    return { ...this.customRatios };
  }

  public setRatios(ratios: Partial<typeof this.customRatios>) {
    this.customRatios = { ...this.customRatios, ...ratios };
    this.saveToStorage();
  }

  public toggleDetachPanel(panelId: DockPanelId): boolean {
    if (this.detachedPanels.has(panelId)) {
      this.detachedPanels.delete(panelId);
      return false; // re-docked
    } else {
      this.detachedPanels.add(panelId);
      return true; // detached
    }
  }

  public isPanelDetached(panelId: DockPanelId): boolean {
    return this.detachedPanels.has(panelId);
  }

  public getDetachedPanels(): DockPanelId[] {
    return Array.from(this.detachedPanels);
  }

  private saveToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(
          'offlineAi.dockviewLayout',
          JSON.stringify({
            preset: this.currentPreset,
            ratios: this.customRatios,
            detached: Array.from(this.detachedPanels)
          })
        );
      } catch {
        // ignore
      }
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('offlineAi.dockviewLayout');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.preset && LAYOUT_PRESETS[parsed.preset as LayoutPresetId]) {
            this.currentPreset = parsed.preset as LayoutPresetId;
          }
          if (parsed.ratios) {
            this.customRatios = { ...this.customRatios, ...parsed.ratios };
          }
          if (Array.isArray(parsed.detached)) {
            this.detachedPanels = new Set(parsed.detached);
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

export const dockviewLayoutEngine = DockviewLayoutEngine.getInstance();
