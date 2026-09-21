// lib/pluginSystem.ts - Modular Extension Host & Plugin Architecture

export type PluginType = 'theme' | 'grammar' | 'agent' | 'statusbar' | 'command' | 'tool';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  type: PluginType;
  enabled: boolean;
  isBuiltIn?: boolean;
  downloads?: number;
  rating?: number;
  contributes: {
    themes?: Array<{
      id: string;
      label: string;
      uiTheme: 'vs-dark' | 'vs-light' | 'hc-black';
      colors: Record<string, string>;
      tokenColors?: Array<{
        scope: string | string[];
        settings: { foreground?: string; fontStyle?: string };
      }>;
    }>;
    grammars?: Array<{
      language: string;
      scopeName: string;
      keywords: string[];
      customRegexRules?: Array<{ pattern: string; tokenClass: string }>;
    }>;
    agents?: Array<{
      id: string;
      name: string;
      role: string;
      avatar: string;
      systemPrompt: string;
      capabilities: string[];
    }>;
    statusBarItems?: Array<{
      id: string;
      alignment: 'left' | 'right';
      priority: number;
      text: string;
      tooltip: string;
      command?: string;
    }>;
    commands?: Array<{
      command: string;
      title: string;
      category?: string;
      handlerCode?: string;
    }>;
  };
}

export const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    id: 'theme.dracula.pro',
    name: '🧛 Dracula Pro Dark Theme',
    version: '2.4.0',
    description: 'The legendary vampire dark theme with vibrant neon syntax highlights and deep purple contrast.',
    author: 'Dracula Community',
    icon: 'Moon',
    type: 'theme',
    enabled: true,
    isBuiltIn: true,
    downloads: 48200,
    rating: 4.9,
    contributes: {
      themes: [
        {
          id: 'dracula-pro',
          label: 'Dracula Pro Dark',
          uiTheme: 'vs-dark',
          colors: {
            'editor.background': '#282a36',
            'editor.foreground': '#f8f8f2',
            'editorCursor.foreground': '#ae81ff',
            'editor.lineHighlightBackground': '#44475a50',
            'editor.selectionBackground': '#44475a',
            'editorLineNumber.foreground': '#6272a4',
            'editorLineNumber.activeForeground': '#f1fa8c'
          }
        }
      ]
    }
  },
  {
    id: 'theme.nord.aurora',
    name: '❄️ Nord Aurora Polar Theme',
    version: '1.8.2',
    description: 'Arctic, north-bluish clean palette engineered for effortless readability and minimal eye strain.',
    author: 'Arctic Ice Studio',
    icon: 'Sparkles',
    type: 'theme',
    enabled: false,
    isBuiltIn: true,
    downloads: 32100,
    rating: 4.8,
    contributes: {
      themes: [
        {
          id: 'nord-aurora',
          label: 'Nord Aurora',
          uiTheme: 'vs-dark',
          colors: {
            'editor.background': '#2e3440',
            'editor.foreground': '#d8dee9',
            'editorCursor.foreground': '#88c0d0',
            'editor.lineHighlightBackground': '#3b4252',
            'editor.selectionBackground': '#434c5e',
            'editorLineNumber.foreground': '#4c566a',
            'editorLineNumber.activeForeground': '#88c0d0'
          }
        }
      ]
    }
  },
  {
    id: 'theme.synthwave.84',
    name: '🌆 Synthwave \'84 Neon Glow',
    version: '3.1.0',
    description: 'Outrun retro aesthetics with glowing magenta text, cyan keywords, and deep twilight background.',
    author: 'RobbOwen Studio',
    icon: 'Zap',
    type: 'theme',
    enabled: false,
    isBuiltIn: true,
    downloads: 41500,
    rating: 4.9,
    contributes: {
      themes: [
        {
          id: 'synthwave-84',
          label: 'Synthwave 84',
          uiTheme: 'vs-dark',
          colors: {
            'editor.background': '#241b2f',
            'editor.foreground': '#f92aad',
            'editorCursor.foreground': '#03edf9',
            'editor.lineHighlightBackground': '#2a2139',
            'editor.selectionBackground': '#614d85',
            'editorLineNumber.foreground': '#495495',
            'editorLineNumber.activeForeground': '#fe4450'
          }
        }
      ]
    }
  },
  {
    id: 'grammar.rust.zig.extended',
    name: '🦀 Rust & Zig Enhanced Grammar Host',
    version: '1.5.0',
    description: 'Extended TextMate tokens for lifetime specifiers, comptime expressions, unsafe blocks, and SIMD pragmas.',
    author: 'Systems Toolchain Group',
    icon: 'Cpu',
    type: 'grammar',
    enabled: true,
    isBuiltIn: true,
    downloads: 19800,
    rating: 4.9,
    contributes: {
      grammars: [
        {
          language: 'rust',
          scopeName: 'source.rust',
          keywords: ['async', 'await', 'dyn', 'impl', 'trait', 'where', 'unsafe', 'mut', 'pub', 'crate', 'macro_rules!'],
          customRegexRules: [
            { pattern: "'[a-zA-Z_][a-zA-Z0-9_]*", tokenClass: 'storage.type.lifetime.rust' },
            { pattern: "#\\[.*?\\]", tokenClass: 'meta.attribute.rust' }
          ]
        },
        {
          language: 'zig',
          scopeName: 'source.zig',
          keywords: ['const', 'var', 'fn', 'pub', 'comptime', 'inline', 'noinline', 'extern', 'export', 'struct', 'enum', 'union', 'error', 'defer', 'errdefer'],
          customRegexRules: [
            { pattern: "@[a-zA-Z0-9_]+", tokenClass: 'support.function.builtin.zig' }
          ]
        }
      ]
    }
  },
  {
    id: 'agent.security.pentester',
    name: '🛡️ Cyber Sentinel AI Agent',
    version: '2.0.4',
    description: 'Autonomous security reviewer specializing in OWASP Top 10, ReDoS, memory leaks, and SSRF threat modeling.',
    author: 'Security Guild',
    icon: 'ShieldCheck',
    type: 'agent',
    enabled: true,
    isBuiltIn: true,
    downloads: 28400,
    rating: 4.9,
    contributes: {
      agents: [
        {
          id: 'agent-sentinel',
          name: 'Cyber Sentinel',
          role: 'AppSec & Red Team Auditor',
          avatar: '🛡️',
          systemPrompt: 'You are an elite AppSec engineer auditing TypeScript, WASM, and backend API routes for zero-day vulnerabilities, prototype pollution, unsafe deserialization, and crypto weaknesses.',
          capabilities: ['AST Vulnerability Scanner', 'Regex ReDoS Analyzer', 'Memory Bounds Checker']
        }
      ]
    }
  },
  {
    id: 'agent.quantum.refactor',
    name: '⚡ Quantum Code Refactor Agent',
    version: '1.2.1',
    description: 'Ultra-fast algorithmic optimization agent targeting O(n) algorithmic complexity reduction and cache locality.',
    author: 'High Performance Lab',
    icon: 'Zap',
    type: 'agent',
    enabled: true,
    isBuiltIn: true,
    downloads: 15300,
    rating: 4.7,
    contributes: {
      agents: [
        {
          id: 'agent-quantum',
          name: 'Quantum Optimizer',
          role: 'Algorithms & VRAM Optimization Specialist',
          avatar: '⚡',
          systemPrompt: 'You specialize in optimizing hot code paths, avoiding unnecessary allocations, converting recursive algorithms to iterative tail-calls, and SIMD parallelization.',
          capabilities: ['Big-O Analysis', 'Zero-Copy Struct Optimization', 'Hot-Loop Unrolling']
        }
      ]
    }
  },
  {
    id: 'tool.prettier.autoformatter',
    name: '✨ Prettier & Biome Code Styler',
    version: '3.0.0',
    description: 'Universal formatter for TypeScript, TSX, JSON, CSS, and Markdown with AST-based formatting rules.',
    author: 'Tooling Foundation',
    icon: 'Wrench',
    type: 'command',
    enabled: true,
    isBuiltIn: true,
    downloads: 51200,
    rating: 5.0,
    contributes: {
      commands: [
        {
          command: 'plugin.formatDocument',
          title: 'Format Active Document (Prettier Standard)',
          category: 'Formatting'
        }
      ]
    }
  },
  {
    id: 'statusbar.vram.monitor',
    name: '📊 VRAM & Engine Telemetry Status',
    version: '1.1.0',
    description: 'Live status bar widget displaying active KV-cache allocation, WASI memory pages, and OPFS read/write latency.',
    author: 'Core Platform',
    icon: 'Gauge',
    type: 'statusbar',
    enabled: true,
    isBuiltIn: true,
    downloads: 22100,
    rating: 4.8,
    contributes: {
      statusBarItems: [
        {
          id: 'status-vram',
          alignment: 'right',
          priority: 100,
          text: '⚡ VRAM: 4.2/16 GB',
          tooltip: 'Active Model KV-Cache and Model Weight Allocation'
        },
        {
          id: 'status-opfs',
          alignment: 'right',
          priority: 90,
          text: '💾 OPFS: Synced (0.4ms)',
          tooltip: 'Origin Private File System Zero-Copy Engine'
        }
      ]
    }
  }
];

const STORAGE_KEY = 'offline_ide_installed_plugins_v1';

export class PluginSystem {
  private plugins: PluginManifest[] = [];
  private activeThemeId: string = 'dracula-pro';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadPlugins();
  }

  private loadPlugins() {
    if (typeof window === 'undefined') {
      this.plugins = [...BUILTIN_PLUGINS];
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: PluginManifest[] = JSON.parse(saved);
        // Merge with built-ins
        const merged = [...BUILTIN_PLUGINS];
        parsed.forEach(p => {
          const idx = merged.findIndex(m => m.id === p.id);
          if (idx >= 0) {
            merged[idx].enabled = p.enabled;
          } else {
            merged.push(p);
          }
        });
        this.plugins = merged;
        return;
      }
    } catch {
      // ignore
    }
    this.plugins = [...BUILTIN_PLUGINS];
  }

  private savePlugins() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.plugins));
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getPlugins(): PluginManifest[] {
    return [...this.plugins];
  }

  public getEnabledPlugins(): PluginManifest[] {
    return this.plugins.filter(p => p.enabled);
  }

  public togglePlugin(pluginId: string, enabled?: boolean) {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.enabled = enabled !== undefined ? enabled : !plugin.enabled;
      this.savePlugins();
    }
  }

  public installCustomPlugin(manifest: PluginManifest): { success: boolean; error?: string } {
    if (!manifest.id || !manifest.name) {
      return { success: false, error: 'Plugin requires a unique ID and Name' };
    }
    const idx = this.plugins.findIndex(p => p.id === manifest.id);
    if (idx >= 0) {
      this.plugins[idx] = { ...manifest, enabled: true };
    } else {
      this.plugins.push({ ...manifest, enabled: true, isBuiltIn: false });
    }
    this.savePlugins();
    return { success: true };
  }

  public uninstallPlugin(pluginId: string): boolean {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (plugin && !plugin.isBuiltIn) {
      this.plugins = this.plugins.filter(p => p.id !== pluginId);
      this.savePlugins();
      return true;
    }
    return false;
  }

  public getActiveAgents(): Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    systemPrompt: string;
    capabilities: string[];
    pluginName: string;
  }> {
    const list: any[] = [];
    this.getEnabledPlugins().forEach(p => {
      if (p.contributes.agents) {
        p.contributes.agents.forEach(a => {
          list.push({ ...a, pluginName: p.name });
        });
      }
    });
    return list;
  }

  public getActiveStatusBarItems(): Array<{
    id: string;
    alignment: 'left' | 'right';
    priority: number;
    text: string;
    tooltip: string;
    command?: string;
  }> {
    const list: any[] = [];
    this.getEnabledPlugins().forEach(p => {
      if (p.contributes.statusBarItems) {
        list.push(...p.contributes.statusBarItems);
      }
    });
    return list.sort((a, b) => b.priority - a.priority);
  }

  public getAvailableThemes(): Array<{
    id: string;
    label: string;
    pluginId: string;
    colors: Record<string, string>;
  }> {
    const themes: any[] = [];
    this.getEnabledPlugins().forEach(p => {
      if (p.contributes.themes) {
        p.contributes.themes.forEach(t => {
          themes.push({ ...t, pluginId: p.id });
        });
      }
    });
    return themes;
  }

  public getActiveThemeId(): string {
    return this.activeThemeId;
  }

  public setActiveThemeId(themeId: string) {
    this.activeThemeId = themeId;
    this.notify();
  }
}

export const pluginSystem = new PluginSystem();
