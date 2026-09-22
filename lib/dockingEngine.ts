// lib/dockingEngine.ts - Advanced Dockable Workbench & Multi-Pane Layout Manager

export type SplitLayoutType = 'single' | 'split-vertical' | 'split-horizontal' | 'grid-2x2' | '3-column' | 'custom';

export type DockPanelTarget = 'bottom-tray' | 'left-sidebar' | 'right-sidebar' | 'floating-window' | 'hidden';

export interface EditorPane {
  id: string;
  activeFilePath: string;
  openTabs: string[];
  isLocked?: boolean;
  viewMode?: 'code' | 'diff' | 'preview' | 'tool';
  toolId?: string;
  cursorPosition?: { lineNumber: number; column: number };
}

export interface DockablePanelConfig {
  id: string;
  name: string;
  icon: string;
  defaultTarget: DockPanelTarget;
  currentTarget: DockPanelTarget;
  isOpen: boolean;
  height?: number;
  width?: number;
}

export interface WorkbenchLayoutState {
  layoutType: SplitLayoutType;
  activePaneId: string;
  panes: EditorPane[];
  splitRatios: number[]; // relative weights e.g. [50, 50] or [50, 50, 50, 50]
  dockedPanels: Record<string, DockablePanelConfig>;
  floatingWindows: Array<{
    id: string;
    title: string;
    filePath?: string;
    toolId?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isMinimized: boolean;
    isMaximized: boolean;
  }>;
}

const DEFAULT_PANES: EditorPane[] = [
  {
    id: 'pane-1',
    activeFilePath: 'components/Playground.tsx',
    openTabs: ['components/Playground.tsx', 'lib/lspEngine.ts', 'lib/gitEngine.ts']
  }
];

const DEFAULT_DOCKED_PANELS: Record<string, DockablePanelConfig> = {
  'terminal': { id: 'terminal', name: 'Sandbox Terminal', icon: 'Terminal', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: false },
  'wasi': { id: 'wasi', name: 'WASI Runtime', icon: 'Cpu', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: true },
  'dap': { id: 'dap', name: 'DAP Debugger', icon: 'Bug', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: false },
  'opfs': { id: 'opfs', name: 'OPFS Storage', icon: 'HardDrive', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: false },
  'git': { id: 'git', name: 'Git Visualizer', icon: 'GitBranch', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: false },
  'diagnostics': { id: 'diagnostics', name: 'Problems & Diagnostics', icon: 'AlertCircle', defaultTarget: 'bottom-tray', currentTarget: 'bottom-tray', isOpen: false },
  'vectordb': { id: 'vectordb', name: 'Vector DB Indexer', icon: 'Database', defaultTarget: 'right-sidebar', currentTarget: 'right-sidebar', isOpen: false },
  'plugins': { id: 'plugins', name: 'Plugin Marketplace', icon: 'Package', defaultTarget: 'right-sidebar', currentTarget: 'right-sidebar', isOpen: false }
};

const STORAGE_KEY = 'offline_ide_workbench_layout_v1';

export class DockingEngine {
  private state: WorkbenchLayoutState;
  private listeners: Set<(state: WorkbenchLayoutState) => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): WorkbenchLayoutState {
    if (typeof window === 'undefined') {
      return {
        layoutType: 'single',
        activePaneId: 'pane-1',
        panes: DEFAULT_PANES,
        splitRatios: [100],
        dockedPanels: DEFAULT_DOCKED_PANELS,
        floatingWindows: []
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          dockedPanels: { ...DEFAULT_DOCKED_PANELS, ...parsed.dockedPanels }
        };
      }
    } catch {
      // ignore
    }
    return {
      layoutType: 'single',
      activePaneId: 'pane-1',
      panes: DEFAULT_PANES,
      splitRatios: [100],
      dockedPanels: DEFAULT_DOCKED_PANELS,
      floatingWindows: []
    };
  }

  public saveState() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  public getState(): WorkbenchLayoutState {
    return { ...this.state };
  }

  public subscribe(listener: (state: WorkbenchLayoutState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  public setLayoutType(layoutType: SplitLayoutType, defaultFile: string = 'components/Playground.tsx') {
    let newPanes = [...this.state.panes];
    let ratios: number[] = [100];

    if (layoutType === 'single') {
      newPanes = [newPanes[0] || { id: 'pane-1', activeFilePath: defaultFile, openTabs: [defaultFile] }];
      ratios = [100];
    } else if (layoutType === 'split-vertical' || layoutType === 'split-horizontal') {
      if (newPanes.length < 2) {
        newPanes.push({
          id: `pane-${Date.now()}`,
          activeFilePath: defaultFile,
          openTabs: [defaultFile]
        });
      } else if (newPanes.length > 2) {
        newPanes = newPanes.slice(0, 2);
      }
      ratios = [50, 50];
    } else if (layoutType === '3-column') {
      while (newPanes.length < 3) {
        newPanes.push({
          id: `pane-${Date.now()}-${newPanes.length}`,
          activeFilePath: defaultFile,
          openTabs: [defaultFile]
        });
      }
      if (newPanes.length > 3) newPanes = newPanes.slice(0, 3);
      ratios = [33.3, 33.3, 33.4];
    } else if (layoutType === 'grid-2x2') {
      while (newPanes.length < 4) {
        newPanes.push({
          id: `pane-${Date.now()}-${newPanes.length}`,
          activeFilePath: defaultFile,
          openTabs: [defaultFile]
        });
      }
      if (newPanes.length > 4) newPanes = newPanes.slice(0, 4);
      ratios = [50, 50, 50, 50];
    }

    this.state.layoutType = layoutType;
    this.state.panes = newPanes;
    this.state.splitRatios = ratios;
    if (!newPanes.find(p => p.id === this.state.activePaneId)) {
      this.state.activePaneId = newPanes[0].id;
    }
    this.saveState();
  }

  public setActivePane(paneId: string) {
    this.state.activePaneId = paneId;
    this.saveState();
  }

  public openFileInPane(paneId: string, filePath: string) {
    const pane = this.state.panes.find(p => p.id === paneId);
    if (pane) {
      pane.activeFilePath = filePath;
      if (!pane.openTabs.includes(filePath)) {
        pane.openTabs.push(filePath);
      }
      this.state.activePaneId = paneId;
      this.saveState();
    }
  }

  public closeTabInPane(paneId: string, filePath: string) {
    const pane = this.state.panes.find(p => p.id === paneId);
    if (pane) {
      pane.openTabs = pane.openTabs.filter(t => t !== filePath);
      if (pane.activeFilePath === filePath) {
        pane.activeFilePath = pane.openTabs[pane.openTabs.length - 1] || '';
      }
      this.saveState();
    }
  }

  public moveTab(fromPaneId: string, toPaneId: string, filePath: string) {
    if (fromPaneId === toPaneId) return;
    const fromPane = this.state.panes.find(p => p.id === fromPaneId);
    const toPane = this.state.panes.find(p => p.id === toPaneId);
    if (!fromPane || !toPane) return;

    // Remove from source pane
    fromPane.openTabs = fromPane.openTabs.filter(t => t !== filePath);
    if (fromPane.activeFilePath === filePath) {
      fromPane.activeFilePath = fromPane.openTabs[fromPane.openTabs.length - 1] || '';
    }

    // Add to target pane
    if (!toPane.openTabs.includes(filePath)) {
      toPane.openTabs.push(filePath);
    }
    toPane.activeFilePath = filePath;
    this.state.activePaneId = toPaneId;
    this.saveState();
  }

  public splitActivePane(direction: 'vertical' | 'horizontal', filePath?: string) {
    const targetFile = filePath || (this.state.panes.find(p => p.id === this.state.activePaneId)?.activeFilePath || 'components/Playground.tsx');
    if (this.state.panes.length === 1) {
      this.setLayoutType(direction === 'vertical' ? 'split-vertical' : 'split-horizontal', targetFile);
    } else if (this.state.panes.length === 2 && this.state.layoutType.includes('split')) {
      this.setLayoutType('grid-2x2', targetFile);
    }
  }

  public closePane(paneId: string) {
    if (this.state.panes.length <= 1) return;
    this.state.panes = this.state.panes.filter(p => p.id !== paneId);
    if (this.state.panes.length === 1) {
      this.state.layoutType = 'single';
      this.state.splitRatios = [100];
    } else if (this.state.panes.length === 2) {
      this.state.layoutType = 'split-vertical';
      this.state.splitRatios = [50, 50];
    } else if (this.state.panes.length === 3) {
      this.state.layoutType = '3-column';
      this.state.splitRatios = [33.3, 33.3, 33.4];
    }
    this.state.activePaneId = this.state.panes[0].id;
    this.saveState();
  }

  // Floating Window Detaching Management
  public detachTabToWindow(filePath: string, toolId?: string) {
    const windowId = `float-${Date.now()}`;
    const newWindow = {
      id: windowId,
      title: toolId ? `🔧 ${toolId.toUpperCase()}` : `📄 ${filePath.split('/').pop()}`,
      filePath,
      toolId,
      x: 100 + (this.state.floatingWindows.length * 30),
      y: 80 + (this.state.floatingWindows.length * 30),
      width: 720,
      height: 520,
      isMinimized: false,
      isMaximized: false
    };
    this.state.floatingWindows.push(newWindow);
    this.saveState();
    return windowId;
  }

  public closeFloatingWindow(windowId: string) {
    this.state.floatingWindows = this.state.floatingWindows.filter(w => w.id !== windowId);
    this.saveState();
  }

  public updateFloatingWindow(windowId: string, updates: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    isMinimized: boolean;
    isMaximized: boolean;
  }>) {
    const target = this.state.floatingWindows.find(w => w.id === windowId);
    if (target) {
      Object.assign(target, updates);
      this.saveState();
    }
  }

  // Panel Docking Reconfiguration
  public setPanelTarget(panelId: string, target: DockPanelTarget) {
    if (this.state.dockedPanels[panelId]) {
      this.state.dockedPanels[panelId].currentTarget = target;
      if (target === 'floating-window') {
        this.detachTabToWindow('', panelId);
      }
      this.saveState();
    }
  }

  public togglePanelOpen(panelId: string, forceOpen?: boolean) {
    if (this.state.dockedPanels[panelId]) {
      this.state.dockedPanels[panelId].isOpen = forceOpen !== undefined ? forceOpen : !this.state.dockedPanels[panelId].isOpen;
      this.saveState();
    }
  }
}

export const dockingEngine = new DockingEngine();
