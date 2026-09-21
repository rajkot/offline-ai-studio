// lib/keymapAndVimEngine.ts - Modal Vim/Neovim, Emacs, and Multi-Keymap Engine

export type KeymapProfile = 'vscode' | 'vim' | 'emacs' | 'jetbrains' | 'sublime';

export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL_LINE' | 'COMMAND' | 'REPLACE';

export interface VimState {
  enabled: boolean;
  mode: VimMode;
  commandBuffer: string;
  searchQuery: string;
  registerContent: string;
  lastExCommand: string;
  statusMessage: string;
  statusType: 'info' | 'success' | 'warning' | 'error';
}

export interface KeybindingRule {
  id: string;
  name: string;
  category: string;
  command: string;
  keys: {
    vscode: string;
    vim: string;
    emacs: string;
    jetbrains: string;
    sublime: string;
    custom?: string;
  };
}

export const CORE_KEYBINDING_RULES: KeybindingRule[] = [
  {
    id: 'save-file',
    name: 'Save Active File',
    category: 'File',
    command: 'workbench.action.files.save',
    keys: { vscode: 'Ctrl+S', vim: ':w<CR>', emacs: 'Ctrl+X Ctrl+S', jetbrains: 'Ctrl+S', sublime: 'Ctrl+S' }
  },
  {
    id: 'quick-open',
    name: 'Quick Open / Find File',
    category: 'Navigation',
    command: 'workbench.action.quickOpen',
    keys: { vscode: 'Ctrl+P', vim: ':e<CR>', emacs: 'Ctrl+X Ctrl+F', jetbrains: 'Shift+Shift', sublime: 'Ctrl+P' }
  },
  {
    id: 'command-palette',
    name: 'Show Command Palette',
    category: 'Navigation',
    command: 'workbench.action.showCommands',
    keys: { vscode: 'Ctrl+Shift+P', vim: ':<CR>', emacs: 'Alt+X', jetbrains: 'Ctrl+Shift+A', sublime: 'Ctrl+Shift+P' }
  },
  {
    id: 'split-vertical',
    name: 'Split Editor Vertically',
    category: 'View',
    command: 'workbench.action.splitEditorRight',
    keys: { vscode: 'Ctrl+\\', vim: ':vsp<CR>', emacs: 'Ctrl+X 3', jetbrains: 'Alt+Shift+V', sublime: 'Alt+Shift+2' }
  },
  {
    id: 'split-horizontal',
    name: 'Split Editor Horizontally',
    category: 'View',
    command: 'workbench.action.splitEditorDown',
    keys: { vscode: 'Ctrl+K Ctrl+\\', vim: ':sp<CR>', emacs: 'Ctrl+X 2', jetbrains: 'Alt+Shift+H', sublime: 'Alt+Shift+8' }
  },
  {
    id: 'close-pane',
    name: 'Close Active Editor Pane',
    category: 'View',
    command: 'workbench.action.closeActiveEditor',
    keys: { vscode: 'Ctrl+W', vim: ':q<CR>', emacs: 'Ctrl+X 0', jetbrains: 'Ctrl+F4', sublime: 'Ctrl+W' }
  },
  {
    id: 'toggle-terminal',
    name: 'Toggle Integrated Terminal',
    category: 'Terminal',
    command: 'workbench.action.terminal.toggleTerminal',
    keys: { vscode: 'Ctrl+`', vim: ':term<CR>', emacs: 'Ctrl+X T', jetbrains: 'Alt+F12', sublime: 'Ctrl+`' }
  },
  {
    id: 'find-in-file',
    name: 'Find Text in File',
    category: 'Edit',
    command: 'actions.find',
    keys: { vscode: 'Ctrl+F', vim: '/', emacs: 'Ctrl+S', jetbrains: 'Ctrl+F', sublime: 'Ctrl+F' }
  },
  {
    id: 'replace-in-file',
    name: 'Replace in File',
    category: 'Edit',
    command: 'editor.action.startFindReplaceAction',
    keys: { vscode: 'Ctrl+H', vim: ':%s//g', emacs: 'Alt+%', jetbrains: 'Ctrl+R', sublime: 'Ctrl+H' }
  },
  {
    id: 'format-document',
    name: 'Format Document',
    category: 'Edit',
    command: 'editor.action.formatDocument',
    keys: { vscode: 'Shift+Alt+F', vim: 'gg=G', emacs: 'Alt+Q', jetbrains: 'Ctrl+Alt+L', sublime: 'Ctrl+Shift+H' }
  }
];

const STORAGE_PROFILE_KEY = 'offline_ide_keymap_profile_v1';
const STORAGE_CUSTOM_KEYS = 'offline_ide_custom_keybindings_v1';

export class KeymapAndVimEngine {
  private activeProfile: KeymapProfile = 'vscode';
  private customBindings: Record<string, string> = {};
  private vimState: VimState = {
    enabled: false,
    mode: 'NORMAL',
    commandBuffer: '',
    searchQuery: '',
    registerContent: '',
    lastExCommand: '',
    statusMessage: '-- NORMAL --',
    statusType: 'info'
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedProfile = localStorage.getItem(STORAGE_PROFILE_KEY) as KeymapProfile;
      if (savedProfile) {
        this.activeProfile = savedProfile;
        if (savedProfile === 'vim') {
          this.vimState.enabled = true;
          this.vimState.mode = 'NORMAL';
        }
      }
      const savedCustom = localStorage.getItem(STORAGE_CUSTOM_KEYS);
      if (savedCustom) {
        this.customBindings = JSON.parse(savedCustom);
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getProfile(): KeymapProfile {
    return this.activeProfile;
  }

  public setProfile(profile: KeymapProfile) {
    this.activeProfile = profile;
    if (profile === 'vim') {
      this.vimState.enabled = true;
      this.vimState.mode = 'NORMAL';
      this.vimState.statusMessage = '-- NORMAL --';
      this.vimState.statusType = 'info';
    } else {
      this.vimState.enabled = false;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PROFILE_KEY, profile);
    }
    this.notify();
  }

  public getVimState(): VimState {
    return { ...this.vimState };
  }

  public setVimMode(mode: VimMode, message?: string) {
    this.vimState.mode = mode;
    if (message) {
      this.vimState.statusMessage = message;
    } else {
      switch (mode) {
        case 'NORMAL':
          this.vimState.statusMessage = '-- NORMAL --';
          this.vimState.statusType = 'info';
          break;
        case 'INSERT':
          this.vimState.statusMessage = '-- INSERT --';
          this.vimState.statusType = 'success';
          break;
        case 'VISUAL':
          this.vimState.statusMessage = '-- VISUAL --';
          this.vimState.statusType = 'warning';
          break;
        case 'VISUAL_LINE':
          this.vimState.statusMessage = '-- VISUAL LINE --';
          this.vimState.statusType = 'warning';
          break;
        case 'COMMAND':
          this.vimState.statusMessage = `:${this.vimState.commandBuffer}`;
          this.vimState.statusType = 'info';
          break;
        case 'REPLACE':
          this.vimState.statusMessage = '-- REPLACE --';
          this.vimState.statusType = 'error';
          break;
      }
    }
    this.notify();
  }

  public setVimCommandBuffer(buf: string) {
    this.vimState.commandBuffer = buf;
    if (this.vimState.mode === 'COMMAND') {
      this.vimState.statusMessage = `:${buf}`;
    }
    this.notify();
  }

  public setStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.vimState.statusMessage = message;
    this.vimState.statusType = type;
    this.notify();
  }

  public executeExCommand(
    rawCommand: string,
    callbacks: {
      onSave?: () => void;
      onClose?: () => void;
      onSplitVertical?: () => void;
      onSplitHorizontal?: () => void;
      onSubstitute?: (find: string, replace: string, flags: string) => void;
      onOpenPlugins?: () => void;
      onClearHighlights?: () => void;
      onShowHelp?: () => void;
    }
  ): { success: boolean; output: string } {
    const cmd = rawCommand.trim().replace(/^:/, '');
    this.vimState.lastExCommand = cmd;
    this.vimState.commandBuffer = '';
    this.setVimMode('NORMAL');

    if (!cmd) return { success: true, output: '' };

    if (cmd === 'w') {
      if (callbacks.onSave) callbacks.onSave();
      this.setStatus('💾 [Vim Ex] Written to workspace buffer', 'success');
      return { success: true, output: 'File written successfully' };
    }

    if (cmd === 'q') {
      if (callbacks.onClose) callbacks.onClose();
      this.setStatus('🚪 [Vim Ex] Buffer closed', 'info');
      return { success: true, output: 'Buffer closed' };
    }

    if (cmd === 'wq' || cmd === 'x') {
      if (callbacks.onSave) callbacks.onSave();
      if (callbacks.onClose) callbacks.onClose();
      this.setStatus('💾 [Vim Ex] Saved and closed', 'success');
      return { success: true, output: 'Saved & closed' };
    }

    if (cmd === 'vsp' || cmd === 'vsplit') {
      if (callbacks.onSplitVertical) callbacks.onSplitVertical();
      this.setStatus('📐 [Vim Ex] Vertically split pane', 'info');
      return { success: true, output: 'Split vertical' };
    }

    if (cmd === 'sp' || cmd === 'split') {
      if (callbacks.onSplitHorizontal) callbacks.onSplitHorizontal();
      this.setStatus('📐 [Vim Ex] Horizontally split pane', 'info');
      return { success: true, output: 'Split horizontal' };
    }

    if (cmd === 'noh' || cmd === 'nohlsearch') {
      if (callbacks.onClearHighlights) callbacks.onClearHighlights();
      this.setStatus('🧹 [Vim Ex] Search highlight cleared', 'info');
      return { success: true, output: 'Highlights cleared' };
    }

    if (cmd === 'plugins' || cmd === 'marketplace') {
      if (callbacks.onOpenPlugins) callbacks.onOpenPlugins();
      this.setStatus('📦 [Vim Ex] Opened Extension Marketplace', 'info');
      return { success: true, output: 'Plugins opened' };
    }

    if (cmd === 'help' || cmd === 'h') {
      if (callbacks.onShowHelp) callbacks.onShowHelp();
      this.setStatus('📖 [Vim Ex] Vim Mode: i=insert, v=visual, :w=save, :q=close, :vsp=split, dd=del line, yyp=dup, u=undo', 'info');
      return { success: true, output: 'Help displayed' };
    }

    // Regex Substitution %s/find/replace/g
    const subMatch = cmd.match(/^%?s\/([^/]+)\/([^/]*)\/([gimuy]*)$/);
    if (subMatch) {
      const [, findStr, replaceStr, flags] = subMatch;
      if (callbacks.onSubstitute) {
        callbacks.onSubstitute(findStr, replaceStr, flags);
      }
      this.setStatus(`🔄 [Vim Ex] Replaced '${findStr}' with '${replaceStr}'`, 'success');
      return { success: true, output: `Substituted '${findStr}' -> '${replaceStr}'` };
    }

    this.setStatus(`❓ [Vim Ex] Unknown ex command: :${cmd}`, 'error');
    return { success: false, output: `Unknown command: ${cmd}` };
  }

  public getEffectiveShortcut(ruleId: string): string {
    if (this.customBindings[ruleId]) return this.customBindings[ruleId];
    const rule = CORE_KEYBINDING_RULES.find(r => r.id === ruleId);
    if (!rule) return '';
    return rule.keys[this.activeProfile] || rule.keys.vscode;
  }

  public setCustomBinding(ruleId: string, shortcut: string) {
    this.customBindings[ruleId] = shortcut;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CUSTOM_KEYS, JSON.stringify(this.customBindings));
    }
    this.notify();
  }

  public resetCustomBindings() {
    this.customBindings = {};
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CUSTOM_KEYS);
    }
    this.notify();
  }
}

export const keymapEngine = new KeymapAndVimEngine();
