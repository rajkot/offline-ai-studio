/**
 * VS Code Theme & TextMate Grammar Engine
 * Converts VS Code theme JSON files into Monaco Editor themes (`monaco.editor.defineTheme`),
 * maps token colors (comments, keywords, strings, functions, types, variables),
 * and dynamically injects workbench UI CSS variables to theme the entire IDE shell.
 */

export interface VsCodeTokenColorRule {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: 'italic' | 'bold' | 'underline' | '';
  };
}

export interface VsCodeThemeJson {
  name: string;
  type: 'dark' | 'light';
  colors: Record<string, string>;
  tokenColors?: VsCodeTokenColorRule[];
  semanticHighlighting?: boolean;
}

export interface MonacoTokenRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: MonacoTokenRule[];
  colors: Record<string, string>;
}

export interface IdeThemeMeta {
  id: string;
  name: string;
  type: 'dark' | 'light';
  author?: string;
  previewColors: {
    bg: string;
    sidebar: string;
    accent: string;
    text: string;
    keyword: string;
    string: string;
  };
  rawJson?: VsCodeThemeJson;
}

// ---------------------------------------------------------------------------
// Standard TextMate Scope to Monaco Token Mapping
// ---------------------------------------------------------------------------

const TEXTMATE_SCOPE_MAP: Record<string, string> = {
  'comment': 'comment',
  'comment.line': 'comment',
  'comment.block': 'comment',
  'string': 'string',
  'string.quoted': 'string',
  'string.template': 'string',
  'constant.numeric': 'number',
  'constant.language': 'keyword',
  'constant.character': 'string',
  'keyword': 'keyword',
  'keyword.control': 'keyword',
  'keyword.operator': 'delimiter',
  'storage': 'keyword',
  'storage.type': 'type',
  'storage.modifier': 'keyword',
  'entity.name.function': 'entity.name.function',
  'entity.name.type': 'type',
  'entity.name.class': 'type',
  'entity.other.inherited-class': 'type',
  'entity.name.tag': 'tag',
  'entity.other.attribute-name': 'attribute.name',
  'variable': 'variable',
  'variable.parameter': 'variable.parameter',
  'variable.language': 'keyword',
  'support.function': 'entity.name.function',
  'support.class': 'type',
  'support.type': 'type',
  'support.constant': 'constant',
  'punctuation': 'delimiter'
};

// ---------------------------------------------------------------------------
// Built-In Preset VS Code Themes
// ---------------------------------------------------------------------------

export const PRESET_VSCODE_THEMES: VsCodeThemeJson[] = [
  {
    name: 'One Dark Pro',
    type: 'dark',
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'activityBar.background': '#21252b',
      'activityBar.foreground': '#d7dae0',
      'activityBarBadge.background': '#4d78cc',
      'sideBar.background': '#21252b',
      'sideBar.foreground': '#abb2bf',
      'sideBar.border': '#181a1f',
      'statusBar.background': '#21252b',
      'statusBar.foreground': '#9da5b4',
      'tab.activeBackground': '#282c34',
      'tab.inactiveBackground': '#21252b',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#abb2bf',
      'editor.selectionBackground': '#3e4451'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#5c6370', fontStyle: 'italic' } },
      { scope: ['keyword', 'storage', 'storage.type'], settings: { foreground: '#c678dd' } },
      { scope: ['string'], settings: { foreground: '#98c379' } },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#61afef' } },
      { scope: ['entity.name.type', 'support.type', 'support.class'], settings: { foreground: '#e5c07b' } },
      { scope: ['variable', 'variable.other'], settings: { foreground: '#e06c75' } },
      { scope: ['constant.numeric'], settings: { foreground: '#d19a66' } }
    ]
  },
  {
    name: 'Dracula Official',
    type: 'dark',
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'activityBar.background': '#1e1f29',
      'activityBar.foreground': '#f8f8f2',
      'activityBarBadge.background': '#bd93f9',
      'sideBar.background': '#21222c',
      'sideBar.foreground': '#f8f8f2',
      'sideBar.border': '#191a21',
      'statusBar.background': '#191a21',
      'statusBar.foreground': '#f8f8f2',
      'tab.activeBackground': '#282a36',
      'tab.inactiveBackground': '#21222c',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.selectionBackground': '#44475a'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#6272a4', fontStyle: 'italic' } },
      { scope: ['keyword', 'storage'], settings: { foreground: '#ff79c6' } },
      { scope: ['string'], settings: { foreground: '#f1fa8c' } },
      { scope: ['entity.name.function'], settings: { foreground: '#50fa7b' } },
      { scope: ['entity.name.type', 'support.type'], settings: { foreground: '#8be9fd', fontStyle: 'italic' } },
      { scope: ['variable'], settings: { foreground: '#f8f8f2' } },
      { scope: ['constant.numeric'], settings: { foreground: '#bd93f9' } }
    ]
  },
  {
    name: 'Tokyo Night',
    type: 'dark',
    colors: {
      'editor.background': '#1a1b26',
      'editor.foreground': '#a9b1d6',
      'activityBar.background': '#16161e',
      'activityBar.foreground': '#787c99',
      'activityBarBadge.background': '#7aa2f7',
      'sideBar.background': '#16161e',
      'sideBar.foreground': '#787c99',
      'sideBar.border': '#101014',
      'statusBar.background': '#16161e',
      'statusBar.foreground': '#787c99',
      'tab.activeBackground': '#1a1b26',
      'tab.inactiveBackground': '#16161e',
      'editorLineNumber.foreground': '#363b54',
      'editorLineNumber.activeForeground': '#7aa2f7',
      'editor.selectionBackground': '#283457'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#565f89', fontStyle: 'italic' } },
      { scope: ['keyword'], settings: { foreground: '#9d7cd8' } },
      { scope: ['string'], settings: { foreground: '#9ece6a' } },
      { scope: ['entity.name.function'], settings: { foreground: '#7aa2f7' } },
      { scope: ['entity.name.type'], settings: { foreground: '#2ac3de' } },
      { scope: ['variable'], settings: { foreground: '#c0caf5' } },
      { scope: ['constant.numeric'], settings: { foreground: '#ff9e64' } }
    ]
  },
  {
    name: 'GitHub Dark Default',
    type: 'dark',
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'activityBar.background': '#010409',
      'activityBar.foreground': '#c9d1d9',
      'activityBarBadge.background': '#1f6feb',
      'sideBar.background': '#010409',
      'sideBar.foreground': '#8b949e',
      'sideBar.border': '#30363d',
      'statusBar.background': '#0d1117',
      'statusBar.foreground': '#8b949e',
      'tab.activeBackground': '#0d1117',
      'tab.inactiveBackground': '#010409',
      'editorLineNumber.foreground': '#6e7681',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.selectionBackground': '#1f6feb40'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#8b949e', fontStyle: 'italic' } },
      { scope: ['keyword', 'storage'], settings: { foreground: '#ff7b72' } },
      { scope: ['string'], settings: { foreground: '#a5d6ff' } },
      { scope: ['entity.name.function'], settings: { foreground: '#d2a8ff' } },
      { scope: ['entity.name.type'], settings: { foreground: '#ffa657' } },
      { scope: ['variable'], settings: { foreground: '#c9d1d9' } },
      { scope: ['constant.numeric'], settings: { foreground: '#79c0ff' } }
    ]
  },
  {
    name: 'GitHub Light',
    type: 'light',
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'activityBar.background': '#f6f8fa',
      'activityBar.foreground': '#24292f',
      'activityBarBadge.background': '#0969da',
      'sideBar.background': '#f6f8fa',
      'sideBar.foreground': '#57606a',
      'sideBar.border': '#d0d7de',
      'statusBar.background': '#f6f8fa',
      'statusBar.foreground': '#57606a',
      'tab.activeBackground': '#ffffff',
      'tab.inactiveBackground': '#f6f8fa',
      'editorLineNumber.foreground': '#8c959f',
      'editorLineNumber.activeForeground': '#24292f',
      'editor.selectionBackground': '#0969da20'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#6e7781', fontStyle: 'italic' } },
      { scope: ['keyword', 'storage'], settings: { foreground: '#cf222e' } },
      { scope: ['string'], settings: { foreground: '#0a3069' } },
      { scope: ['entity.name.function'], settings: { foreground: '#8250df' } },
      { scope: ['entity.name.type'], settings: { foreground: '#953800' } },
      { scope: ['variable'], settings: { foreground: '#24292f' } },
      { scope: ['constant.numeric'], settings: { foreground: '#0550ae' } }
    ]
  },
  {
    name: 'Catppuccin Mocha',
    type: 'dark',
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'activityBar.background': '#181825',
      'activityBar.foreground': '#cdd6f4',
      'activityBarBadge.background': '#cba6f7',
      'sideBar.background': '#181825',
      'sideBar.foreground': '#a6adc8',
      'sideBar.border': '#11111b',
      'statusBar.background': '#11111b',
      'statusBar.foreground': '#cdd6f4',
      'tab.activeBackground': '#1e1e2e',
      'tab.inactiveBackground': '#181825',
      'editorLineNumber.foreground': '#585b70',
      'editorLineNumber.activeForeground': '#cdd6f4',
      'editor.selectionBackground': '#45475a'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#6c7086', fontStyle: 'italic' } },
      { scope: ['keyword'], settings: { foreground: '#cba6f7' } },
      { scope: ['string'], settings: { foreground: '#a6e3a1' } },
      { scope: ['entity.name.function'], settings: { foreground: '#89b4fa' } },
      { scope: ['entity.name.type'], settings: { foreground: '#f9e2af' } },
      { scope: ['variable'], settings: { foreground: '#cdd6f4' } },
      { scope: ['constant.numeric'], settings: { foreground: '#fab387' } }
    ]
  },
  {
    name: 'Nord Frost',
    type: 'dark',
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'activityBar.background': '#242933',
      'activityBar.foreground': '#d8dee9',
      'activityBarBadge.background': '#88c0d0',
      'sideBar.background': '#242933',
      'sideBar.foreground': '#d8dee9',
      'sideBar.border': '#1e222a',
      'statusBar.background': '#242933',
      'statusBar.foreground': '#d8dee9',
      'tab.activeBackground': '#2e3440',
      'tab.inactiveBackground': '#242933',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'editor.selectionBackground': '#434c5e'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#616e88', fontStyle: 'italic' } },
      { scope: ['keyword'], settings: { foreground: '#81a1c1' } },
      { scope: ['string'], settings: { foreground: '#a3be8c' } },
      { scope: ['entity.name.function'], settings: { foreground: '#88c0d0' } },
      { scope: ['entity.name.type'], settings: { foreground: '#8fbcbb' } },
      { scope: ['variable'], settings: { foreground: '#d8dee9' } },
      { scope: ['constant.numeric'], settings: { foreground: '#b48ead' } }
    ]
  },
  {
    name: 'Monokai Pro',
    type: 'dark',
    colors: {
      'editor.background': '#2d2a2e',
      'editor.foreground': '#fcfcfa',
      'activityBar.background': '#19181a',
      'activityBar.foreground': '#fcfcfa',
      'activityBarBadge.background': '#ffd866',
      'sideBar.background': '#221f22',
      'sideBar.foreground': '#939293',
      'sideBar.border': '#19181a',
      'statusBar.background': '#19181a',
      'statusBar.foreground': '#939293',
      'tab.activeBackground': '#2d2a2e',
      'tab.inactiveBackground': '#221f22',
      'editorLineNumber.foreground': '#5b595c',
      'editorLineNumber.activeForeground': '#fcfcfa',
      'editor.selectionBackground': '#403e41'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#727072', fontStyle: 'italic' } },
      { scope: ['keyword'], settings: { foreground: '#ff6188' } },
      { scope: ['string'], settings: { foreground: '#ffd866' } },
      { scope: ['entity.name.function'], settings: { foreground: '#a9dc76' } },
      { scope: ['entity.name.type'], settings: { foreground: '#78dce8' } },
      { scope: ['variable'], settings: { foreground: '#fcfcfa' } },
      { scope: ['constant.numeric'], settings: { foreground: '#ab9df2' } }
    ]
  },
  {
    name: 'Cyberpunk Neon',
    type: 'dark',
    colors: {
      'editor.background': '#120422',
      'editor.foreground': '#f2e5ff',
      'activityBar.background': '#0a0114',
      'activityBar.foreground': '#00ffc8',
      'activityBarBadge.background': '#ff007f',
      'sideBar.background': '#0d021a',
      'sideBar.foreground': '#a78bfa',
      'sideBar.border': '#3b0764',
      'statusBar.background': '#0a0114',
      'statusBar.foreground': '#00ffc8',
      'tab.activeBackground': '#120422',
      'tab.inactiveBackground': '#0d021a',
      'editorLineNumber.foreground': '#581c87',
      'editorLineNumber.activeForeground': '#ff007f',
      'editor.selectionBackground': '#ff007f33'
    },
    tokenColors: [
      { scope: ['comment'], settings: { foreground: '#6b21a8', fontStyle: 'italic' } },
      { scope: ['keyword'], settings: { foreground: '#ff007f' } },
      { scope: ['string'], settings: { foreground: '#00ffc8' } },
      { scope: ['entity.name.function'], settings: { foreground: '#ffe600' } },
      { scope: ['entity.name.type'], settings: { foreground: '#38bdf8' } },
      { scope: ['variable'], settings: { foreground: '#f3e8ff' } },
      { scope: ['constant.numeric'], settings: { foreground: '#ff7700' } }
    ]
  }
];

// ---------------------------------------------------------------------------
// Theme Parser & Monaco Converter
// ---------------------------------------------------------------------------

export function convertVsCodeToMonacoTheme(theme: VsCodeThemeJson): MonacoThemeData {
  const base: 'vs' | 'vs-dark' | 'hc-black' = theme.type === 'light' ? 'vs' : 'vs-dark';
  const rules: MonacoTokenRule[] = [];

  if (theme.tokenColors && Array.isArray(theme.tokenColors)) {
    theme.tokenColors.forEach(tc => {
      const scopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
      const fg = tc.settings.foreground ? tc.settings.foreground.replace(/^#/, '') : undefined;
      const bg = tc.settings.background ? tc.settings.background.replace(/^#/, '') : undefined;
      const fontStyle = tc.settings.fontStyle;

      scopes.forEach(scope => {
        if (!scope) return;
        const mappedToken = TEXTMATE_SCOPE_MAP[scope] || scope;
        rules.push({
          token: mappedToken,
          foreground: fg,
          background: bg,
          fontStyle
        });
      });
    });
  }

  // Ensure baseline fallback rules
  const colors = theme.colors || {};
  const monacoColors: Record<string, string> = {
    'editor.background': colors['editor.background'] || (theme.type === 'light' ? '#ffffff' : '#1e1e1e'),
    'editor.foreground': colors['editor.foreground'] || (theme.type === 'light' ? '#000000' : '#d4d4d4'),
    'editorLineNumber.foreground': colors['editorLineNumber.foreground'] || '#858585',
    'editorLineNumber.activeForeground': colors['editorLineNumber.activeForeground'] || '#c6c6c6',
    'editorCursor.foreground': colors['editorCursor.foreground'] || colors['editor.foreground'] || '#aeafad',
    'editor.selectionBackground': colors['editor.selectionBackground'] || '#264f78',
    'editor.inactiveSelectionBackground': colors['editor.inactiveSelectionBackground'] || '#3a3d41'
  };

  return {
    base,
    inherit: true,
    rules,
    colors: monacoColors
  };
}

// ---------------------------------------------------------------------------
// CSS Workbench Variable Injector
// ---------------------------------------------------------------------------

export function applyThemeToDom(theme: VsCodeThemeJson): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const colors = theme.colors || {};

  const editorBg = colors['editor.background'] || (theme.type === 'light' ? '#ffffff' : '#1e1e1e');
  const sidebarBg = colors['sideBar.background'] || colors['editor.background'] || '#181825';
  const activityBg = colors['activityBar.background'] || '#11111b';
  const statusBg = colors['statusBar.background'] || '#11111b';
  const border = colors['sideBar.border'] || '#27273a';
  const fg = colors['editor.foreground'] || (theme.type === 'light' ? '#24292f' : '#cdd6f4');
  const accent = colors['activityBarBadge.background'] || '#6366f1';
  const tabActive = colors['tab.activeBackground'] || editorBg;
  const tabInactive = colors['tab.inactiveBackground'] || sidebarBg;

  root.style.setProperty('--ide-editor-bg', editorBg);
  root.style.setProperty('--ide-sidebar-bg', sidebarBg);
  root.style.setProperty('--ide-activity-bg', activityBg);
  root.style.setProperty('--ide-statusbar-bg', statusBg);
  root.style.setProperty('--ide-border', border);
  root.style.setProperty('--ide-fg', fg);
  root.style.setProperty('--ide-accent', accent);
  root.style.setProperty('--ide-tab-active', tabActive);
  root.style.setProperty('--ide-tab-inactive', tabInactive);

  // Sync Tailwind dark class
  if (theme.type === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ---------------------------------------------------------------------------
// Theme Manager Engine Singleton
// ---------------------------------------------------------------------------

export class ThemeEngine {
  private static instance: ThemeEngine;
  private themes: Map<string, VsCodeThemeJson> = new Map();
  private activeThemeId = 'one-dark-pro';
  private previewThemeId: string | null = null;
  private listeners: Array<(activeTheme: VsCodeThemeJson, allThemes: IdeThemeMeta[]) => void> = [];
  private monacoInstance: any = null;

  private constructor() {
    this.registerPresets();
    this.loadSavedTheme();
  }

  public setMonacoInstance(monaco: any): void {
    this.monacoInstance = monaco;
    if (monaco?.editor) {
      this.registerAllMonacoThemes(monaco);
    }
  }

  public static getInstance(): ThemeEngine {
    if (!ThemeEngine.instance) {
      ThemeEngine.instance = new ThemeEngine();
    }
    return ThemeEngine.instance;
  }

  private registerPresets(): void {
    PRESET_VSCODE_THEMES.forEach(t => {
      const id = this.slugify(t.name);
      this.themes.set(id, t);
    });
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private loadSavedTheme(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_ide_theme_id');
      if (saved && this.themes.has(saved)) {
        this.activeThemeId = saved;
      }
      const active = this.getActiveTheme();
      applyThemeToDom(active);
    }
  }

  public getActiveTheme(): VsCodeThemeJson {
    const id = this.previewThemeId || this.activeThemeId;
    return this.themes.get(id) || this.themes.get('one-dark-pro') || PRESET_VSCODE_THEMES[0];
  }

  public getActiveThemeId(): string {
    return this.previewThemeId || this.activeThemeId;
  }

  public getAllThemes(): IdeThemeMeta[] {
    return Array.from(this.themes.entries()).map(([id, t]) => {
      const colors = t.colors || {};
      return {
        id,
        name: t.name,
        type: t.type,
        previewColors: {
          bg: colors['editor.background'] || '#1e1e1e',
          sidebar: colors['sideBar.background'] || '#181825',
          accent: colors['activityBarBadge.background'] || '#6366f1',
          text: colors['editor.foreground'] || '#cdd6f4',
          keyword: t.tokenColors?.find(r => String(r.scope).includes('keyword'))?.settings.foreground || '#c678dd',
          string: t.tokenColors?.find(r => String(r.scope).includes('string'))?.settings.foreground || '#98c379'
        },
        rawJson: t
      };
    });
  }

  public setTheme(id: string): void {
    if (this.themes.has(id)) {
      this.activeThemeId = id;
      this.previewThemeId = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_ide_theme_id', id);
      }
      const theme = this.getActiveTheme();
      applyThemeToDom(theme);
      if (this.monacoInstance?.editor) {
        this.registerMonacoTheme(this.monacoInstance, id);
      }
      this.notify();
    }
  }

  public previewTheme(id: string | null): void {
    if (this.previewThemeId === id) return;
    this.previewThemeId = id;
    const theme = this.getActiveTheme();
    applyThemeToDom(theme);
    if (this.monacoInstance?.editor) {
      this.monacoInstance.editor.setTheme(this.getActiveThemeId());
    }
    this.notify();
  }

  public importCustomVsCodeTheme(jsonString: string): { success: boolean; themeId?: string; error?: string } {
    try {
      const parsed: VsCodeThemeJson = JSON.parse(jsonString);
      if (!parsed.name || typeof parsed.colors !== 'object') {
        return { success: false, error: 'Invalid VS Code theme JSON: Missing name or colors object.' };
      }
      const id = this.slugify(parsed.name);
      this.themes.set(id, parsed);
      this.setTheme(id);
      return { success: true, themeId: id };
    } catch (err: any) {
      return { success: false, error: err.message || 'JSON Parse error' };
    }
  }

  public registerTheme(theme: VsCodeThemeJson): string {
    const id = this.slugify(theme.name);
    this.themes.set(id, theme);
    if (this.monacoInstance?.editor) {
      this.registerMonacoTheme(this.monacoInstance, id);
    }
    this.notify();
    return id;
  }

  public registerMonacoTheme(monacoInstance: any, themeId?: string): void {
    if (!monacoInstance || !monacoInstance.editor) return;
    const id = themeId || this.activeThemeId;
    const theme = this.themes.get(id);
    if (!theme) return;

    const monacoThemeData = convertVsCodeToMonacoTheme(theme);
    monacoInstance.editor.defineTheme(id, monacoThemeData);
    monacoInstance.editor.setTheme(id);
  }

  public registerAllMonacoThemes(monacoInstance: any): void {
    if (!monacoInstance || !monacoInstance.editor) return;
    this.themes.forEach((theme, id) => {
      const monacoThemeData = convertVsCodeToMonacoTheme(theme);
      monacoInstance.editor.defineTheme(id, monacoThemeData);
    });
    monacoInstance.editor.setTheme(this.getActiveThemeId());
  }

  public subscribe(cb: (activeTheme: VsCodeThemeJson, allThemes: IdeThemeMeta[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getActiveTheme(), this.getAllThemes());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    const active = this.getActiveTheme();
    const all = this.getAllThemes();
    this.listeners.forEach(cb => cb(active, all));
  }
}

export const themeEngine = ThemeEngine.getInstance();
