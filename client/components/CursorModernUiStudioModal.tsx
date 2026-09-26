'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Sliders,
  Check,
  RotateCcw,
  Copy,
  Layers,
  FileCode,
  Zap,
  Code2,
  Folder,
  X
} from 'lucide-react';
import {
  cursorModernUiEngine,
  DEFAULT_SETTINGS_JSON,
  PEACOCK_PALETTES,
  BETTER_COMMENTS_RULES,
  INDENT_RAINBOW_PALETTE,
  CursorExtensionState
} from '@/lib/ui/cursorModernUiEngine';

export interface CursorModernUiStudioModalProps {
  onApplySettings?: (settings: any) => void;
  onClose?: () => void;
}

export default function CursorModernUiStudioModal({
  onApplySettings,
  onClose
}: CursorModernUiStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'extensions' | 'preview' | 'settingsJson' | 'peacock'>('extensions');
  const [extensionState, setExtensionState] = useState<CursorExtensionState>(cursorModernUiEngine.getExtensionState());
  const [settingsJsonText, setSettingsJsonText] = useState<string>(
    JSON.stringify(DEFAULT_SETTINGS_JSON, null, 2)
  );
  const [activePeacock, setActivePeacock] = useState(cursorModernUiEngine.getActivePeacock());
  const [glassOpacity, setGlassOpacity] = useState<number>(cursorModernUiEngine.getGlassOpacity());
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    try {
      setExtensionState(cursorModernUiEngine.getExtensionState());
      setSettingsJsonText(JSON.stringify(cursorModernUiEngine.getSettings(), null, 2));
      setActivePeacock(cursorModernUiEngine.getActivePeacock());
      setGlassOpacity(cursorModernUiEngine.getGlassOpacity());
    } catch {
      // fallback
    }
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = (key: keyof CursorExtensionState) => {
    cursorModernUiEngine.toggleExtension(key);
    const updated = cursorModernUiEngine.getExtensionState();
    setExtensionState(updated);
    showNotification(`Toggled ${key}: ${updated[key] ? 'Enabled' : 'Disabled'}`);
  };

  const handleApplySettingsJson = () => {
    const res = cursorModernUiEngine.applySettingsJson(settingsJsonText);
    if (res.success) {
      if (onApplySettings) {
        onApplySettings(cursorModernUiEngine.getSettings());
      }
      showNotification('✅ Applied settings.json to IDE successfully');
    } else {
      showNotification(`❌ ${res.message}`);
    }
  };

  const handleSelectPeacock = (id: string) => {
    cursorModernUiEngine.setPeacock(id);
    setActivePeacock(cursorModernUiEngine.getActivePeacock());
    showNotification(`Applied Peacock project tint: ${id}`);
  };

  const extensionCards = [
    {
      key: 'errorLens' as const,
      name: 'Error Lens',
      badge: 'Inline Diagnostics',
      desc: 'Highlights bugs and syntax errors inline directly on the code line with glowing colored badges.',
      color: '#ef4444'
    },
    {
      key: 'betterComments' as const,
      name: 'Better Comments',
      badge: 'Syntax Highlighting',
      desc: 'Color-coded highlights for // TODO: (amber), // FIXME: (red), // ! (alert), // ? (query), // * (highlight).',
      color: '#f59e0b'
    },
    {
      key: 'indentRainbow' as const,
      name: 'Indent Rainbow',
      badge: '4-Color Guides',
      desc: 'Alternating soft pastel vertical column lines making deeply nested blocks effortless to read.',
      color: '#10b981'
    },
    {
      key: 'peacock' as const,
      name: 'Peacock Project Tinting',
      badge: 'Border & Status Tint',
      desc: 'Automatically tints editor borders and status bar to visually identify different projects.',
      color: '#06b6d4'
    },
    {
      key: 'glassDarkTheme' as const,
      name: 'Glass-Dark Obsidian Theme',
      badge: '#09090b Deep Dark',
      desc: 'Tokyo Night & Vesper glass-dark aesthetic, easy on the eyes with high contrast text.',
      color: '#6366f1'
    },
    {
      key: 'materialIcons' as const,
      name: 'Material Icon Theme',
      badge: '60+ Crisp Icons',
      desc: 'Vibrant, tailored file and folder icons for .ts, .py, .rs, .json, .md, .css and more.',
      color: '#ec4899'
    },
    {
      key: 'glassitVibrancy' as const,
      name: 'Glassit / Vibrancy Effect',
      badge: 'Translucent Blur',
      desc: 'Acrylic glassmorphic background translucency with configurable opacity slider.',
      color: '#8b5cf6'
    },
    {
      key: 'apcCustomizeUi' as const,
      name: 'APC Customize UI Plus',
      badge: 'Minimal Layout',
      desc: 'Sleek custom header bar, hidden titlebars, and keyboard-first clutter-free workspace.',
      color: '#14b8a6'
    },
    {
      key: 'fluentIcons' as const,
      name: 'Fluent Icons',
      badge: 'Modern Toolbar',
      desc: 'Replaces generic browser icons with Microsoft Fluent-inspired crisp vector iconography.',
      color: '#3b82f6'
    },
    {
      key: 'projectManager' as const,
      name: 'Project Manager',
      badge: 'Single-Click Switch',
      desc: 'Fast workspace and project switcher modal with recent folder history and shortcuts.',
      color: '#eab308'
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#0c101a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-purple-500/30">
            <Palette size={18} className="text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-white">
                Cursor & v0 Ultra-Modern UI/UX Suite
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                10 Pro Extensions & Settings.json
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Error Lens • Better Comments • Indent Rainbow • Peacock • Glassit • Material Icons
            </p>
          </div>
        </div>

        {notification && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fadeIn">
            <CheckCircle2 size={13} />
            <span>{notification}</span>
          </div>
        )}

        <div className="text-[11px] text-zinc-500 font-mono">
          Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-zinc-300 border border-slate-700">Ctrl+Alt+V</kbd>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="px-5 py-2 border-b border-slate-800/80 bg-[#0a0d14] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('extensions')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'extensions'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            10 Extensions Matrix
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Live Code Preview
          </button>
          <button
            onClick={() => setActiveTab('settingsJson')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'settingsJson'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            settings.json Importer
          </button>
          <button
            onClick={() => setActiveTab('peacock')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'peacock'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Peacock & Glassit
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#080b11]">
        {/* Tab 1: 10 Extensions Matrix */}
        {activeTab === 'extensions' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">The 10 World-Class UI/UX Extensions</h2>
              <p className="text-xs text-zinc-400">
                Native offline integrations of the top VS Code and Cursor design modifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {extensionCards.map((ext) => {
                const isEnabled = extensionState[ext.key];
                return (
                  <div
                    key={ext.key}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isEnabled
                        ? 'border-purple-500/40 bg-purple-950/15 shadow-sm'
                        : 'border-slate-800 bg-[#0d121e] opacity-75'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{ext.name}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-mono font-medium"
                          style={{
                            backgroundColor: `${ext.color}20`,
                            color: ext.color,
                            border: `1px solid ${ext.color}40`
                          }}
                        >
                          {ext.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{ext.desc}</p>
                    </div>

                    <button
                      onClick={() => handleToggle(ext.key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-purple-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Live Code Preview */}
        {activeTab === 'preview' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Live Code Simulation: Error Lens, Better Comments & Indent Rainbow</h2>
              <p className="text-xs text-zinc-400">
                Visual demonstration of how lines render inside the Monaco Editor.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#09090b] font-mono text-xs leading-relaxed overflow-x-auto shadow-2xl">
              <div className="text-[10px] text-zinc-500 pb-3 border-b border-slate-800 mb-3 flex items-center justify-between">
                <span>📁 src/engine/sovereignAi.ts (Simulated Monaco View)</span>
                <span className="text-purple-400 font-mono">Font Ligatures: ON (=&gt;, ===, !==)</span>
              </div>

              {/* Line 1 */}
              <div className="flex items-center gap-3 py-0.5 hover:bg-slate-900/50">
                <span className="text-zinc-600 select-none w-6 text-right">1</span>
                <span className="text-purple-400">export class</span>
                <span className="text-amber-300">SovereignAiEngine</span>
                <span className="text-zinc-400">&#123;</span>
              </div>

              {/* Line 2: Indent Level 1 */}
              <div className="flex items-center gap-3 py-0.5 hover:bg-slate-900/50 relative">
                <span className="text-zinc-600 select-none w-6 text-right">2</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-zinc-400 pl-1">private isRunning: boolean = true;</span>
              </div>

              {/* Line 3: Better Comments // TODO */}
              <div className="flex items-center gap-3 py-0.5 bg-amber-500/10 rounded">
                <span className="text-zinc-600 select-none w-6 text-right">3</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-amber-400 font-semibold pl-1">// TODO: Integrate zero-cloud offline telemetry with local Ollama daemon</span>
              </div>

              {/* Line 4: Better Comments // FIXME */}
              <div className="flex items-center gap-3 py-0.5 bg-red-500/10 rounded">
                <span className="text-zinc-600 select-none w-6 text-right">4</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-red-400 font-semibold pl-1">// FIXME: Prevent VRAM allocation spike on large batch prompts</span>
              </div>

              {/* Line 5: Better Comments // ! */}
              <div className="flex items-center gap-3 py-0.5 bg-rose-500/10 rounded">
                <span className="text-zinc-600 select-none w-6 text-right">5</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-rose-400 font-semibold pl-1">// ! Critical Security Rule: Zero telemetry transmitted to public clouds</span>
              </div>

              {/* Line 6: Better Comments // ? */}
              <div className="flex items-center gap-3 py-0.5 bg-sky-500/10 rounded">
                <span className="text-zinc-600 select-none w-6 text-right">6</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-sky-400 font-semibold pl-1">// ? Should we evaluate AST before emitting conventional commit diff?</span>
              </div>

              {/* Line 7: Better Comments // * */}
              <div className="flex items-center gap-3 py-0.5 bg-emerald-500/10 rounded">
                <span className="text-zinc-600 select-none w-6 text-right">7</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-emerald-400 font-semibold pl-1">// * Benchmark Fact: Tree-sitter preserves 100% syntax integrity on chunking</span>
              </div>

              {/* Line 8: Nested Indent Level 2 with Indent Rainbow */}
              <div className="flex items-center gap-3 py-0.5 hover:bg-slate-900/50">
                <span className="text-zinc-600 select-none w-6 text-right">8</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-cyan-300 pl-1">public async executeLoop(): Promise&lt;void&gt; &#123;</span>
              </div>

              {/* Line 9: Error Lens Demonstration */}
              <div className="flex items-center gap-3 py-0.5 bg-red-950/40 border border-red-500/40 rounded px-1 my-1">
                <span className="text-red-400 font-bold select-none w-6 text-right">9</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="w-3 border-r border-emerald-400/40 h-full" />
                <span className="text-zinc-300 pl-1">const buffer = await readFile(path</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-mono border border-red-500/40 flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>Error Lens: Expected &apos;)&apos; and &apos;;&apos; to close call expression</span>
                </span>
              </div>

              {/* Line 10 */}
              <div className="flex items-center gap-3 py-0.5 hover:bg-slate-900/50">
                <span className="text-zinc-600 select-none w-6 text-right">10</span>
                <span className="w-3 border-r border-amber-400/40 h-full" />
                <span className="text-zinc-400 pl-1">&#125;</span>
              </div>

              {/* Line 11 */}
              <div className="flex items-center gap-3 py-0.5 hover:bg-slate-900/50">
                <span className="text-zinc-600 select-none w-6 text-right">11</span>
                <span className="text-zinc-400">&#125;</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: settings.json Importer */}
        {activeTab === 'settingsJson' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">VS Code User settings.json Importer</h2>
                <p className="text-xs text-zinc-400">
                  Inject and synchronize your exact VS Code user configuration into the IDE.
                </p>
              </div>

              <button
                onClick={handleApplySettingsJson}
                className="py-1.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Check size={12} />
                <span>Apply to IDE Workspace</span>
              </button>
            </div>

            <textarea
              value={settingsJsonText}
              onChange={(e) => setSettingsJsonText(e.target.value)}
              className="w-full h-96 p-4 rounded-xl bg-[#09090b] border border-slate-800 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-purple-500/60 selection:bg-purple-600/40 selection:text-white resize-none"
              spellCheck={false}
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Tokyo Night • Material Icons • JetBrains Mono Ligatures • ErrorLens • Obsidian #09090b</span>
              <button
                onClick={() => {
                  setSettingsJsonText(JSON.stringify(DEFAULT_SETTINGS_JSON, null, 2));
                  showNotification('Reset to recommended settings.json prompt');
                }}
                className="hover:text-zinc-300 underline"
              >
                Reset to Prompt Defaults
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Peacock & Glassit */}
        {activeTab === 'peacock' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Peacock Project Tinting & Glassit Vibrancy</h2>
              <p className="text-xs text-zinc-400">
                Customize project status bar colors, border highlights, and window glassmorphism.
              </p>
            </div>

            {/* Peacock Palettes */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0d121e] space-y-3">
              <span className="text-xs font-semibold text-zinc-200">Select Project Peacock Accent:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PEACOCK_PALETTES.map((p) => {
                  const isSelected = activePeacock.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPeacock(p.id)}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/20'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-medium text-white">{p.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{p.borderColor}</div>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: p.borderColor }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glassit Opacity Slider */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0d121e] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Glassit Acrylic Window Translucency:</span>
                <span className="font-mono text-purple-400">{Math.round(glassOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                value={Math.round(glassOpacity * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  setGlassOpacity(val);
                  cursorModernUiEngine.setGlassOpacity(val);
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500">
                Lower values introduce subtle desktop background translucency and frosted blur under macOS and Windows acrylic frames.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
