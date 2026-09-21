'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Sparkles,
  Download,
  CheckCircle2,
  Trash2,
  Settings,
  Search,
  Code2,
  Cpu,
  Moon,
  Zap,
  ShieldCheck,
  Wrench,
  Gauge,
  Sliders,
  Play,
  RotateCcw,
  BookOpen,
  Keyboard,
  Compass,
  AlertCircle
} from 'lucide-react';
import {
  PluginManifest,
  PluginType,
  pluginSystem,
  BUILTIN_PLUGINS
} from '@/lib/pluginSystem';
import {
  KeymapProfile,
  keymapEngine,
  CORE_KEYBINDING_RULES,
  KeybindingRule
} from '@/lib/keymapAndVimEngine';

interface PluginMarketplaceStudioProps {
  onApplyTheme?: (themeId: string) => void;
}

export default function PluginMarketplaceStudio({
  onApplyTheme
}: PluginMarketplaceStudioProps) {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'keymaps' | 'custom-creator' | 'vim-guide'>('marketplace');
  const [plugins, setPlugins] = useState<PluginManifest[]>(pluginSystem.getPlugins());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PluginType | 'all'>('all');
  
  // Keymap State
  const [activeProfile, setActiveProfile] = useState<KeymapProfile>(keymapEngine.getProfile());
  const [keybindingRules, setKeybindingRules] = useState<KeybindingRule[]>(CORE_KEYBINDING_RULES);
  const [recordingRuleId, setRecordingRuleId] = useState<string | null>(null);

  // Custom Extension Sandbox Code
  const [customManifestJson, setCustomManifestJson] = useState<string>(
    JSON.stringify(
      {
        id: 'agent.custom.code-reviewer',
        name: '🤖 AI Architect Code Reviewer',
        version: '1.0.0',
        description: 'Custom AI agent providing architecture recommendations and design pattern checks.',
        author: 'Workspace Developer',
        icon: 'Sparkles',
        type: 'agent',
        enabled: true,
        contributes: {
          agents: [
            {
              id: 'agent-architect',
              name: 'Senior Architect',
              role: 'System Design & Scalability Reviewer',
              avatar: '🏛️',
              systemPrompt: 'You are a staff distributed systems architect auditing database schemas, microservice interfaces, and memory boundaries.',
              capabilities: ['Design Pattern Validator', 'CAP Theorem Analyzer', 'Database Index Audit']
            }
          ]
        }
      },
      null,
      2
    )
  );
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestSuccess, setManifestSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsub = pluginSystem.subscribe(() => {
      setPlugins(pluginSystem.getPlugins());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = keymapEngine.subscribe(() => {
      setActiveProfile(keymapEngine.getProfile());
    });
    return unsub;
  }, []);

  const handleTogglePlugin = (pluginId: string) => {
    pluginSystem.togglePlugin(pluginId);
  };

  const handleUninstall = (pluginId: string) => {
    pluginSystem.uninstallPlugin(pluginId);
  };

  const handleSwitchKeymap = (profile: KeymapProfile) => {
    keymapEngine.setProfile(profile);
  };

  const handleInstallCustomExtension = () => {
    setManifestError(null);
    setManifestSuccess(null);
    try {
      const parsed = JSON.parse(customManifestJson);
      const res = pluginSystem.installCustomPlugin(parsed);
      if (res.success) {
        setManifestSuccess(`Successfully installed and hot-loaded extension '${parsed.name}'!`);
        setActiveTab('installed');
      } else {
        setManifestError(res.error || 'Failed to install extension');
      }
    } catch (e: any) {
      setManifestError(`JSON Parse Error: ${e.message}`);
    }
  };

  const filteredPlugins = plugins.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchType;
  });

  const installedPlugins = plugins.filter(p => p.enabled);

  const getPluginIcon = (iconName: string, type: PluginType) => {
    switch (type) {
      case 'theme':
        return <Moon size={16} className="text-purple-400" />;
      case 'grammar':
        return <Cpu size={16} className="text-cyan-400" />;
      case 'agent':
        return <Sparkles size={16} className="text-amber-400" />;
      case 'statusbar':
        return <Gauge size={16} className="text-emerald-400" />;
      case 'command':
        return <Wrench size={16} className="text-blue-400" />;
      default:
        return <Package size={16} className="text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-4 py-3 bg-[#111217] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-indigo-400" />
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Extension Host & Plugin Marketplace
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full font-mono">
                Extensibility v2.1
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Vim / Neovim modal editing, keymaps, custom TextMate grammars, and AI agent extensions
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center bg-[#181920] border border-[#27272a] rounded-lg p-1 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'marketplace' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🏪 Marketplace ({plugins.length})
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'installed' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⚡ Installed ({installedPlugins.length})
          </button>
          <button
            onClick={() => setActiveTab('keymaps')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'keymaps' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⌨️ Keymaps & Vim ({activeProfile.toUpperCase()})
          </button>
          <button
            onClick={() => setActiveTab('custom-creator')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'custom-creator' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🛠️ Create Extension
          </button>
          <button
            onClick={() => setActiveTab('vim-guide')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'vim-guide' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📖 Modal Vim Cheat Sheet
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
        {/* TAB 1: MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="flex flex-col gap-4">
            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111217] p-3 rounded-xl border border-[#27272a]">
              <div className="flex items-center gap-2 bg-[#181920] px-3 py-1.5 rounded-lg border border-[#27272a] flex-1 max-w-md">
                <Search size={14} className="text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search plugins by name, tag, author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
                />
              </div>

              {/* FILTER PILLS */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {(['all', 'theme', 'grammar', 'agent', 'statusbar', 'command'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                      filterType === t
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-semibold'
                        : 'bg-[#181920] text-zinc-400 hover:text-white border border-[#27272a]'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* PLUGINS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPlugins.map(plugin => (
                <div
                  key={plugin.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    plugin.enabled
                      ? 'bg-[#12131a] border-indigo-500/40 shadow-sm'
                      : 'bg-[#0f1015] border-[#22242c] opacity-85'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#1a1b24] border border-[#2e303d]">
                          {getPluginIcon(plugin.icon, plugin.type)}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                            {plugin.name}
                          </h3>
                          <span className="text-[10px] text-zinc-400">
                            v{plugin.version} • by <strong className="text-zinc-300">{plugin.author}</strong>
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1f212d] text-zinc-300 border border-[#2a2c3a]">
                        {plugin.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {plugin.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#1f212c] pt-2.5 mt-1 text-[11px]">
                    <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px]">
                      <span>⬇️ {(plugin.downloads || 1200).toLocaleString()}</span>
                      <span>⭐ {plugin.rating || 4.8}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePlugin(plugin.id)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          plugin.enabled
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/60'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                        }`}
                      >
                        {plugin.enabled ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <Download size={12} />
                            Install / Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INSTALLED */}
        {activeTab === 'installed' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300">
                Active Extensions in Host ({installedPlugins.length})
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              {installedPlugins.map(plugin => (
                <div
                  key={plugin.id}
                  className="p-3 bg-[#111217] rounded-xl border border-[#27272a] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#181920] border border-[#27272a]">
                      {getPluginIcon(plugin.icon, plugin.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        {plugin.name}
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          Active
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">{plugin.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePlugin(plugin.id)}
                      className="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Disable
                    </button>
                    {!plugin.isBuiltIn && (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        className="p-1.5 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900 border border-rose-800/40 transition-colors"
                        title="Uninstall Custom Extension"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: KEYMAPS & VIM/EMACS */}
        {activeTab === 'keymaps' && (
          <div className="flex flex-col gap-4">
            {/* KEYMAP SELECTOR CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { id: 'vscode', name: 'VS Code', desc: 'Standard Visual Studio Code defaults', badge: 'Default' },
                { id: 'vim', name: 'Vim / Neovim', desc: 'Modal normal/insert/visual + ex commands', badge: 'Modal' },
                { id: 'emacs', name: 'GNU Emacs', desc: 'Ctrl+X chords & kill-ring bindings', badge: 'Chords' },
                { id: 'jetbrains', name: 'JetBrains', desc: 'IntelliJ IDEA & WebStorm standard', badge: 'IDE' },
                { id: 'sublime', name: 'Sublime Text', desc: 'Sublime 4 multi-cursor & jump keys', badge: 'Fast' }
              ].map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleSwitchKeymap(profile.id as KeymapProfile)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    activeProfile === profile.id
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md text-white'
                      : 'bg-[#111217] border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:bg-[#181920]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{profile.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                      {profile.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">{profile.desc}</p>
                </button>
              ))}
            </div>

            {/* KEYBINDING TABLE */}
            <div className="bg-[#111217] rounded-xl border border-[#27272a] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#16171f] border-b border-[#27272a] flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Keyboard size={14} className="text-indigo-400" />
                  Keybinding Mappings for &quot;<span className="text-indigo-300 uppercase">{activeProfile}</span>&quot;
                </span>
                <button
                  onClick={() => keymapEngine.resetCustomBindings()}
                  className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={10} /> Reset All Overrides
                </button>
              </div>

              <div className="divide-y divide-[#1f212c]">
                {keybindingRules.map(rule => {
                  const currentShortcut = keymapEngine.getEffectiveShortcut(rule.id);
                  return (
                    <div key={rule.id} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#14151c]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200">{rule.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{rule.command}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 rounded bg-[#1e202a] border border-[#323546] font-mono text-[11px] text-indigo-300 shadow-sm">
                          {currentShortcut}
                        </kbd>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOM CREATOR */}
        {activeTab === 'custom-creator' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Code2 size={14} className="text-indigo-400" />
                  Custom Extension Manifest Editor
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Write plugin manifests in JSON to register custom AI agents, TextMate grammars, themes, or commands.
                </p>
              </div>

              <button
                onClick={handleInstallCustomExtension}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Play size={12} />
                Install & Hot-Reload Extension
              </button>
            </div>

            {manifestError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{manifestError}</span>
              </div>
            )}

            {manifestSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{manifestSuccess}</span>
              </div>
            )}

            <div className="flex-1 min-h-[260px] bg-[#0d0e12] border border-[#27272a] rounded-xl overflow-hidden p-2">
              <textarea
                value={customManifestJson}
                onChange={(e) => setCustomManifestJson(e.target.value)}
                className="w-full h-full min-h-[260px] bg-transparent text-emerald-400 font-mono text-xs focus:outline-none resize-none p-2"
                placeholder="Enter valid JSON manifest..."
              />
            </div>
          </div>
        )}

        {/* TAB 5: VIM CHEAT SHEET */}
        {activeTab === 'vim-guide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                title: 'Modes & Switching',
                commands: [
                  { key: 'i / I', desc: 'Insert at cursor / Insert at start of line' },
                  { key: 'a / A', desc: 'Append after cursor / Append at line end' },
                  { key: 'v / V', desc: 'Visual character selection / Visual line' },
                  { key: 'Esc', desc: 'Return to NORMAL mode' },
                  { key: ':', desc: 'Enter COMMAND (Ex) mode prompt' }
                ]
              },
              {
                title: 'Motions & Movement',
                commands: [
                  { key: 'h, j, k, l', desc: 'Left, Down, Up, Right' },
                  { key: 'w / b / e', desc: 'Next word / Previous word / End of word' },
                  { key: '0 / $', desc: 'Start of line / End of line' },
                  { key: 'gg / G', desc: 'Top of file / End of file' },
                  { key: '%', desc: 'Jump to matching bracket/brace () [] {}' }
                ]
              },
              {
                title: 'Editing & Operations',
                commands: [
                  { key: 'dd', desc: 'Delete (cut) current line' },
                  { key: 'ciw / diw', desc: 'Change / Delete inner word under cursor' },
                  { key: 'yy / yyp', desc: 'Yank (copy) line / Duplicate line' },
                  { key: 'p / P', desc: 'Paste after / before cursor' },
                  { key: 'u / Ctrl+R', desc: 'Undo / Redo' }
                ]
              },
              {
                title: 'Ex Commands (:) ',
                commands: [
                  { key: ':w', desc: 'Save active buffer to workspace' },
                  { key: ':q', desc: 'Close active buffer or pane' },
                  { key: ':wq / :x', desc: 'Save and quit buffer' },
                  { key: ':vsp / :sp', desc: 'Split pane vertically / horizontally' },
                  { key: ':%s/foo/bar/g', desc: 'Global find & replace regex substitution' }
                ]
              },
              {
                title: 'Emacs Key Combinations',
                commands: [
                  { key: 'Ctrl+X Ctrl+S', desc: 'Save buffer' },
                  { key: 'Ctrl+X Ctrl+F', desc: 'Find / Open file' },
                  { key: 'Ctrl+X 3', desc: 'Split window vertically' },
                  { key: 'Ctrl+X 2', desc: 'Split window horizontally' },
                  { key: 'Alt+X', desc: 'M-x execute extended command' }
                ]
              },
              {
                title: 'Status Indicators',
                commands: [
                  { key: '-- NORMAL --', desc: 'Navigation, motions, and commands' },
                  { key: '-- INSERT --', desc: 'Direct text input' },
                  { key: '-- VISUAL --', desc: 'Highlight selection for y/d/c' },
                  { key: '-- REPLACE --', desc: 'Overwrite characters under cursor' }
                ]
              }
            ].map(sect => (
              <div key={sect.title} className="p-3 bg-[#111217] rounded-xl border border-[#27272a] flex flex-col gap-2">
                <h4 className="text-xs font-bold text-indigo-300 border-b border-[#27272a] pb-1.5 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-indigo-400" />
                  {sect.title}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {sect.commands.map(c => (
                    <div key={c.key} className="flex items-center justify-between text-[11px] gap-2">
                      <kbd className="px-1.5 py-0.5 rounded bg-[#1a1b24] border border-[#2c2e3d] text-indigo-300 font-mono text-[10px]">
                        {c.key}
                      </kbd>
                      <span className="text-zinc-400 text-right truncate">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
