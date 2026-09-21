'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  FilePlus,
  Save,
  ShieldCheck,
  FlaskConical,
  Gauge,
  Languages,
  DollarSign,
  Activity,
  Layers,
  Eye,
  Brain,
  Settings,
  Sparkles,
  Command,
  X,
  CheckCircle2,
  Package,
  GitBranch,
  Zap,
  Bug,
  HardDrive,
  Database,
  Split,
  Puzzle
} from 'lucide-react';
import { extensionHost } from '@/lib/extensions/ExtensionHost';

export interface CommandItem {
  id: string;
  name: string;
  category: 'File' | 'Security' | 'Testing' | 'VRAM' | 'Translate' | 'Navigation' | 'Settings';
  description: string;
  defaultShortcut: string;
  activeShortcut: string;
  icon: React.ReactNode;
  action: () => void;
}

export const DEFAULT_KEYBINDINGS: Record<string, string> = {
  'file-new': 'Ctrl+N',
  'file-save': 'Ctrl+S',
  'security-scan': 'Ctrl+Shift+U',
  'test-run': 'Ctrl+Shift+T',
  'vram-flush': 'Ctrl+Shift+F',
  'translate-toggle': 'Ctrl+Shift+L',
  'desktop-build': 'Ctrl+Shift+D',
  'diagnostics-open': 'Ctrl+Shift+H',
  'finops-open': 'Ctrl+Shift+B',
  'perf-open': 'Ctrl+Shift+M',
  'scaffolder-open': 'Ctrl+Shift+A',
  'vision-open': 'Ctrl+Shift+I',
  'rag-open': 'Ctrl+Shift+R',
  'git-open': 'Ctrl+Shift+G',
  'wasi-open': 'Ctrl+Shift+W',
  'dap-open': 'Ctrl+Shift+E',
  'opfs-open': 'Ctrl+Shift+O',
  'composer-open': 'Ctrl+Shift+K',
  'vectordb-open': 'Ctrl+Shift+V',
  'plugins-open': 'Ctrl+Shift+P',
  'finetuning-open': 'Ctrl+Shift+J',
  'hitl-open': 'Ctrl+Shift+Q',
  'swarm-open': 'Ctrl+Shift+S',
  'graph-open': 'Ctrl+Shift+Y',
  'diff-open': 'Ctrl+Shift+X',
  'format-document': 'Shift+Alt+F',
  'eslint-fix-all': 'Ctrl+.',
  'extensions-studio-open': 'Ctrl+Shift+X',
  'theme-picker': 'Ctrl+K Ctrl+T',
  'settings-open': 'Ctrl+,'
};

export const COMMAND_METADATA: {
  id: string;
  name: string;
  category: 'File' | 'Security' | 'Testing' | 'VRAM' | 'Translate' | 'Navigation' | 'Settings';
  description: string;
  iconName: string;
}[] = [
  {
    id: 'format-document',
    name: '✨ Format Document (Prettier)',
    category: 'File',
    description: 'Format active document using in-browser Prettier standalone engine',
    iconName: 'Sparkles'
  },
  {
    id: 'eslint-fix-all',
    name: '🛡️ ESLint: Fix All Auto-Fixable Problems',
    category: 'Security',
    description: 'Resolve and autofix all ESLint syntax and code quality markers',
    iconName: 'ShieldCheck'
  },
  {
    id: 'extensions-studio-open',
    name: '📦 Extensions & MCP Studio: Open Manager',
    category: 'Navigation',
    description: 'Manage marketplace extensions, Prettier/ESLint configs, and MCP servers',
    iconName: 'Package'
  },
  {
    id: 'theme-picker',
    name: '🎨 Preferences: Color Theme',
    category: 'Settings',
    description: 'Switch VS Code / TextMate color theme with live preview',
    iconName: 'Sparkles'
  },
  {
    id: 'file-new',
    name: '📁 File: Create New File',
    category: 'File',
    description: 'Create a new source file or component in the active workspace',
    iconName: 'FilePlus'
  },
  {
    id: 'file-save',
    name: '💾 File: Save Active File',
    category: 'File',
    description: 'Save changes in the active Monaco editor tab to workspace memory',
    iconName: 'Save'
  },
  {
    id: 'security-scan',
    name: '🛡️ Security: Run Vulnerability Scan',
    category: 'Security',
    description: 'Execute AST compliance check & prompt injection security scan',
    iconName: 'ShieldCheck'
  },
  {
    id: 'test-run',
    name: '🧪 Testing: Run Automated TDD Suite',
    category: 'Testing',
    description: 'Trigger automated test runner & assertion suite in TDD Studio',
    iconName: 'FlaskConical'
  },
  {
    id: 'vram-flush',
    name: '🧹 VRAM: Flush Unused Models',
    category: 'VRAM',
    description: 'Purge idle KV-caches and unallocated weights from VRAM',
    iconName: 'Gauge'
  },
  {
    id: 'translate-toggle',
    name: '🌐 Translate: Toggle Response Language',
    category: 'Translate',
    description: 'Switch IDE localization or generate translated inline comments',
    iconName: 'Languages'
  },
  {
    id: 'finops-open',
    name: '📊 FinOps: Token & Budget Control',
    category: 'Navigation',
    description: 'View real-time token spend, INR rates, and Ollama failover policies',
    iconName: 'DollarSign'
  },
  {
    id: 'perf-open',
    name: '📊 Performance: Profiler & Flamegraph',
    category: 'Navigation',
    description: 'Inspect live CPU, VRAM heap metrics, and interactive flamegraphs',
    iconName: 'Activity'
  },
  {
    id: 'scaffolder-open',
    name: '🏗️ Scaffolder: Project Generator',
    category: 'Navigation',
    description: 'Generate full-stack application blueprints and architecture plans',
    iconName: 'Layers'
  },
  {
    id: 'vision-open',
    name: '👁️ Vision Studio: Multimodal AI',
    category: 'Navigation',
    description: 'Convert UI screenshots, wireframes, or diagrams into code',
    iconName: 'Eye'
  },
  {
    id: 'rag-open',
    name: '🧠 RAG: Indexer & Hybrid Search',
    category: 'Navigation',
    description: 'Inspect semantic vector embeddings and reciprocal rank fusion scores',
    iconName: 'Brain'
  },
  {
    id: 'desktop-build',
    name: '📦 Desktop: Release Builder Wizard',
    category: 'Navigation',
    description: 'Package full-stack AI IDE into Windows .exe, macOS .dmg, or Linux .AppImage',
    iconName: 'Package'
  },
  {
    id: 'diagnostics-open',
    name: '🎓 Diagnostics & Walkthrough Onboarding',
    category: 'Navigation',
    description: 'System health scorecard, gamified 4-step walkthrough & Markdown report exporter',
    iconName: 'Activity'
  },
  {
    id: 'git-open',
    name: '🌿 Git: Visual DAG & Commit Branches',
    category: 'Navigation',
    description: 'Explore visual commit topology, interactive rebase, blame, and stashes',
    iconName: 'GitBranch'
  },
  {
    id: 'wasi-open',
    name: '⚡ WASI: WebAssembly Micro-VM Container',
    category: 'Navigation',
    description: 'Execute sandboxed WebAssembly binaries with virtual terminal stdio',
    iconName: 'Zap'
  },
  {
    id: 'dap-open',
    name: '🐛 Debugger: Interactive DAP Protocol Panel',
    category: 'Navigation',
    description: 'Step-through debugging, call stacks, variable watch, and conditional breakpoints',
    iconName: 'Bug'
  },
  {
    id: 'opfs-open',
    name: '💾 OPFS: Virtual File System & Local Drive',
    category: 'Navigation',
    description: 'Inspect Origin Private File System quotas, snapshots, and binary chunks',
    iconName: 'HardDrive'
  },
  {
    id: 'composer-open',
    name: '🪄 Composer: Multi-File Agent Generator',
    category: 'Navigation',
    description: 'Generate and orchestrate cross-file changes with unified diff previews',
    iconName: 'Sparkles'
  },
  {
    id: 'vectordb-open',
    name: '🗄️ Vector DB: Local Embedding Explorer',
    category: 'Navigation',
    description: 'Browse semantic chunks, cosine similarity rankings, and quantized vector indices',
    iconName: 'Database'
  },
  {
    id: 'plugins-open',
    name: '🧩 Plugins: Extension Store & Custom Hooks',
    category: 'Navigation',
    description: 'Install and configure community plugins, linter rules, and theme packs',
    iconName: 'Package'
  },
  {
    id: 'finetuning-open',
    name: '🔬 AI Training: LoRA Fine-Tuning & Distillation',
    category: 'Navigation',
    description: 'Train local LoRA adapters, inspect PEFT loss curves, and export ShareGPT JSONL',
    iconName: 'Brain'
  },
  {
    id: 'hitl-open',
    name: '🛡️ HITL: Guardrails & Review Queue',
    category: 'Navigation',
    description: 'Audit AI proposed changes, enforce AST guardrails, and approve high-risk diffs',
    iconName: 'ShieldCheck'
  },
  {
    id: 'swarm-open',
    name: '🤖 Swarm: Multi-Agent Consensus Visualizer',
    category: 'Navigation',
    description: 'Real-time multi-agent debate, code arbitration, and consensus apply',
    iconName: 'Layers'
  },
  {
    id: 'graph-open',
    name: '🧠 GraphRAG: Semantic AST & Knowledge Graph',
    category: 'Navigation',
    description: 'Interactive D3 knowledge graph of symbols, imports, and cross-file dependencies',
    iconName: 'Brain'
  },
  {
    id: 'diff-open',
    name: '⚖️ Diff: Side-by-Side Unified Code Inspector',
    category: 'Navigation',
    description: 'Compare active workspace against proposed changes with hunk-level controls',
    iconName: 'Split'
  },
  {
    id: 'subject-open',
    name: '🧬 Subject Creator: AI Personality & Agent Forge',
    category: 'Navigation',
    description: 'Design specialized agent personas with custom tools and knowledge vaults',
    iconName: 'Brain'
  },
  {
    id: 'release-open',
    name: '🚀 Release Hub: Multi-Platform Binary Exporter',
    category: 'Navigation',
    description: 'Bundle offline desktop binaries and self-extracting installers',
    iconName: 'Package'
  },
  {
    id: 'prompt-open',
    name: '🧪 Prompt Lab: System Persona & Evaluation Matrix',
    category: 'Navigation',
    description: 'Compare system prompt variations across benchmark suites with pass/fail metrics',
    iconName: 'FlaskConical'
  },
  {
    id: 'grid-open',
    name: '🪟 Grid: Multi-Pane Split Editor Layout',
    category: 'Navigation',
    description: 'Multi-window tiling grid for simultaneous side-by-side file editing',
    iconName: 'Layers'
  },
  {
    id: 'models-catalog',
    name: '🛍️ Models: Local GGUF Storefront & Catalog',
    category: 'Navigation',
    description: 'Browse local quantized weights, HuggingFace GGUF models, and VRAM requirements',
    iconName: 'Settings'
  },
  {
    id: 'settings-open',
    name: '⚙️ Settings: IDE Configuration',
    category: 'Settings',
    description: 'Open general settings, security shields, desktop release builder, and keybindings matrix',
    iconName: 'Settings'
  }
];

export function getActiveKeybindings(): Record<string, string> {
  if (typeof window === 'undefined') return DEFAULT_KEYBINDINGS;
  try {
    const saved = localStorage.getItem('offlineAi.keybindings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_KEYBINDINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse offlineAi.keybindings from localStorage', err);
  }
  return DEFAULT_KEYBINDINGS;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (commandId: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onExecuteCommand }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [keybindings, setKeybindings] = useState<Record<string, string>>(DEFAULT_KEYBINDINGS);
  const [extensionCommands, setExtensionCommands] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync Extension Commands
  useEffect(() => {
    const updateExtensionCommands = () => {
      const contributed = extensionHost.getContributedCommands();
      setExtensionCommands(contributed.map(c => ({
        id: c.command,
        name: c.title,
        category: c.category || 'Extension',
        description: `Command contributed by ${c.extensionId}`,
        iconName: 'Puzzle'
      })));
    };

    updateExtensionCommands();
    return extensionHost.subscribe(updateExtensionCommands);
  }, []);

  // Sync Keybindings from localStorage
  const reloadKeybindings = useCallback(() => {
    setKeybindings(getActiveKeybindings());
  }, []);

  useEffect(() => {
    reloadKeybindings();
    const handleStorageChange = () => reloadKeybindings();
    window.addEventListener('keybindings-updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('keybindings-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [reloadKeybindings]);

  // Focus input on mount / open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Map icons
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FilePlus': return <FilePlus size={16} className="text-cyan-400" />;
      case 'Save': return <Save size={16} className="text-emerald-400" />;
      case 'ShieldCheck': return <ShieldCheck size={16} className="text-indigo-400" />;
      case 'FlaskConical': return <FlaskConical size={16} className="text-amber-400" />;
      case 'Gauge': return <Gauge size={16} className="text-purple-400" />;
      case 'Languages': return <Languages size={16} className="text-blue-400" />;
      case 'DollarSign': return <DollarSign size={16} className="text-emerald-400" />;
      case 'Activity': return <Activity size={16} className="text-indigo-400" />;
      case 'Layers': return <Layers size={16} className="text-purple-400" />;
      case 'Eye': return <Eye size={16} className="text-cyan-400" />;
      case 'Brain': return <Brain size={16} className="text-indigo-400" />;
      case 'Package': return <Package size={16} className="text-cyan-400" />;
      case 'GitBranch': return <GitBranch size={16} className="text-emerald-400" />;
      case 'Zap': return <Zap size={16} className="text-amber-400" />;
      case 'Bug': return <Bug size={16} className="text-rose-400" />;
      case 'HardDrive': return <HardDrive size={16} className="text-teal-400" />;
      case 'Database': return <Database size={16} className="text-blue-400" />;
      case 'Split': return <Split size={16} className="text-purple-400" />;
      case 'Puzzle': return <Puzzle size={16} className="text-indigo-400" />;
      case 'Settings': return <Settings size={16} className="text-slate-400" />;
      default: return <Sparkles size={16} className="text-indigo-400" />;
    }
  };

  // Build items with active shortcuts
  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    const allMetadata = [...COMMAND_METADATA, ...extensionCommands];
    
    return allMetadata.map(meta => ({
      ...meta,
      activeShortcut: keybindings[meta.id] || '',
      defaultShortcut: DEFAULT_KEYBINDINGS[meta.id] || ''
    })).filter(cmd => {
      if (!q) return true;
      return (
        cmd.name.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.activeShortcut.toLowerCase().includes(q)
      );
    });
  }, [query, keybindings]);

  // Reset selected index if list shrinks
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle Command Execution
  const triggerExecute = useCallback((cmd: (typeof COMMAND_METADATA)[0]) => {
    onClose();
    onExecuteCommand(cmd.id);

    // Show floating toast message
    setToastMessage(`🚀 Command Executed Successfully: ${cmd.name}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, [onClose, onExecuteCommand]);

  // Keyboard navigation within the command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        triggerExecute(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen && !toastMessage) return null;

  return (
    <>
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-emerald-500/80 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold font-mono animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Command Palette Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 md:pt-20 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
          onClick={onClose}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all slide-in-from-top-4 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/80">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command to execute... (e.g. File, Save, Security, VRAM)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
                  ESC
                </span>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Command List Container */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => triggerExecute(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-950/90 to-purple-950/70 border-indigo-500/80 shadow-md'
                          : 'bg-slate-900/40 border-transparent hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
                          {getIcon(cmd.iconName)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{cmd.name}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 rounded">
                              {cmd.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{cmd.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-1 text-[10px] font-mono font-bold text-indigo-300 bg-slate-950 border border-slate-800 rounded-md shadow-inner">
                          {cmd.activeShortcut}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  No matching commands found for &quot;{query}&quot;.
                </div>
              )}
            </div>

            {/* Footer Guidance */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">↑</span>
                  <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">↵</span> Select
                </span>
              </div>
              <div className="flex items-center gap-1 text-indigo-400 font-bold">
                <Command size={12} />
                <span>Command Palette (Ctrl+Shift+P)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
