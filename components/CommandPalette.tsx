'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, ChevronRight, Sparkles } from 'lucide-react';
import { extensionHost } from '@/lib/extensions/ExtensionHost';
import { motion, AnimatePresence } from 'motion/react';

export const COMMAND_METADATA = [
  { command: 'file-new', name: 'New File', description: 'Create a new file in the workspace', category: 'File' },
  { command: 'file-save', name: 'Save File', description: 'Save current active file', category: 'File' },
  { command: 'models-catalog', name: 'Models & GGUF Catalog', description: 'Open Hugging Face & Ollama offline model store', category: 'Models' },
  { command: 'theme-picker', name: 'Color Theme Picker', description: 'Switch editor themes (VS Dark, One Dark, Monokai, Cyberpunk)', category: 'Preferences' },
  { command: 'settings-open', name: 'Open Settings & Keybindings', description: 'Configure IDE settings, security, and shortcuts', category: 'Preferences' },
  { command: 'extensions-studio-open', name: 'Extensions & Plugins Studio', description: 'Manage plugins and custom language extensions', category: 'Extensions' },
  { command: 'view-terminal', name: 'Toggle Terminal', description: 'Show or hide the integrated terminal', category: 'View' },
  { command: 'view-explorer', name: 'Show Explorer', description: 'Toggle file explorer sidebar', category: 'View' },
  { command: 'layout-toggle-left', name: 'Toggle Primary Sidebar', description: 'Show or hide left activity bar pane', category: 'View' },
  { command: 'layout-toggle-right', name: 'Toggle Secondary Sidebar', description: 'Show or hide right AI assistant / tool pane', category: 'View' },
  { command: 'layout-toggle-bottom', name: 'Toggle Bottom Panel', description: 'Show or hide bottom console tray', category: 'View' },
  { command: 'layout-toggle-zen', name: 'Toggle Zen Mode', description: 'Distraction-free fullscreen code editing', category: 'View' },
  { command: 'workbench-palette', name: 'Command Palette', description: 'Open the universal command runner', category: 'Workbench' },
  { command: 'online-ai-hub', name: 'Online AI Hub (Browser Login & API Keys)', description: 'Connect Claude 3.5, GPT-4o, DeepSeek R1, OpenRouter, Gemini', category: 'AI' },
  { command: 'project-ai-scaffold', name: 'AI Project Architect & Generator', description: 'Generate complete multi-file project with online or offline AI', category: 'File' },
  { command: 'autonomous-agent', name: 'Autonomous Agent Mode (Devin / Claude Code)', description: 'Iterative self-healing loop: Plan -> Write -> Test -> Auto-Patch', category: 'AI' },
  { command: 'webgpu-studio', name: 'WebGPU Zero-Install Local Inference', description: 'Run Qwen2.5-Coder & SmolLM2 100% in browser memory without Ollama', category: 'AI' },
  { command: 'voice-to-code', name: 'Local Voice-to-Code Whisper Dictation', description: '100% air-gapped real-time speech transcription to cursor/composer (F8)', category: 'AI' },
  { command: 'database-studio', name: 'Built-in Database Studio (SQLite & PostgreSQL)', description: 'Inspect tables, visualize ER diagrams, and generate AI SQL', category: 'Database' },
  { command: 'live-preview-toggle', name: 'Toggle Live Split-Screen Webview', description: 'Embedded preview dockable next to Monaco with device emulation & DOM inspector', category: 'View' },
  { command: 'extensions-marketplace', name: 'VS Code Extensions Marketplace', description: 'Search & install 45+ extensions from Open VSX or offline catalog (Ctrl+Shift+X)', category: 'Extensions' },
  { command: 'mcp-studio', name: 'Model Context Protocol (MCP) Studio & Hub', description: 'Browse, spawn, and execute 30+ MCP servers & tools (Ctrl+Shift+U)', category: 'MCP' },
  { command: 'inline-ai-transform', name: 'Inline AI Code Transformer (Cursor Ctrl+K)', description: 'Transform selected code with streaming inline diff preview (Ctrl+K)', category: 'AI' },
  { command: 'git-clone', name: 'Git: Clone Repository', description: 'Clone a remote Git or import local repository into the IDE workspace', category: 'Git' },
  { command: 'git-ai-commit', name: 'Git: Synthesize AI Commit & Commit Changes', description: 'Analyze staged diffs and synthesize standard Conventional Commit message', category: 'Git' },
  { command: 'git-stage-file', name: 'Git: Stage Active File', description: 'Stage current open document to Git index', category: 'Git' },
  { command: 'wasi-show-info', name: 'Show WASI System Info', description: 'Display micro-kernel diagnostics', category: 'WASI' },
  { command: 'rag-composer', name: 'Multi-File RAG Composer', description: 'Semantic workspace search → cross-file analysis → chunk-level diff review (Ctrl+Shift+C)', category: 'AI' },
  { command: 'docker-sandbox', name: 'Docker Sandbox Studio', description: 'Spawn isolated containers, run builds, copy workspace files into Docker (Ctrl+Shift+K)', category: 'DevOps' },
  { command: 'lan-collab', name: 'LAN Pair Programming (P2P)', description: 'Zero-cloud collaborative editing on same Wi-Fi — shared cursors, live chat (Ctrl+Shift+Y)', category: 'Collaboration' },
  { command: 'semantic-search', name: 'Semantic Codebase Search', description: 'Natural language search across all files using local vector embeddings (Ctrl+Shift+F)', category: 'Search' },
  { command: 'tasks-build', name: 'Tasks: Run Build Task', description: 'Execute default build task from .vscode/tasks.json or package.json (Ctrl+Shift+B)', category: 'Tasks' },
  { command: 'tasks-run', name: 'Tasks: Run Task...', description: 'Open VS Code Tasks Runner to launch or inspect workspace tasks', category: 'Tasks' },
  { command: 'tooljet-studio', name: 'ToolJet: Visual Low-Code Builder & App Studio', description: 'Visual drag-and-drop internal tools builder connected to Offline AI and DBs (Ctrl+Shift+J)', category: 'Low-Code' },
  { command: 'autogpt-studio', name: 'AutoGPT: Autonomous Cognitive Loop Agent', description: 'Run Significant-Gravitas AutoGPT autonomous loops, tools, and templates (Ctrl+Alt+G)', category: 'AI' },
  { command: 'indicnlp-studio', name: 'IndicNLP: AI4Bharat Corpora & Vectors', description: 'Explore 12 Indian languages, 300D FastText word embeddings, tokenizers and benchmarks (Ctrl+Alt+I)', category: 'NLP' },
  { command: 'chroma-open', name: 'Chroma: AI Vector Database Collections', description: 'Manage Chroma collections, embeddings, distance metrics (Cosine/L2/IP) and metadata filters (Ctrl+Alt+C)', category: 'Database' },
  { command: 'candle-studio', name: 'Candle: Rust ML & WASM Inference', description: 'Zero-Python serverless inference, WebAssembly LLMs, Whisper, and BERT embeddings (Ctrl+Alt+K)', category: 'AI' },
  { command: 'nanogpt-studio', name: 'nanoGPT: Subject AI Model Studio', description: 'Train and configure dedicated Karpathy nanoGPT transformer models for each subject (Ctrl+Alt+N)', category: 'AI' },
  { command: 'aider-studio', name: 'Aider: Autonomous Pair Programmer & Universal Repo Map', description: 'Autonomous multi-file editing with PageRank symbol centrality, SEARCH/REPLACE diff blocks, and Git auto-commit (Ctrl+Alt+P)', category: 'AI' },
  { command: 'transformers-studio', name: 'Transformers.js: WebGPU Client-Side ML Studio', description: 'Zero-Python in-browser ONNX embeddings, text classification, and code summarization (Ctrl+Alt+T)', category: 'AI' },
  { command: 'outlines-studio', name: 'Outlines: FSM Guided Generation & Structured Output', description: 'Finite State Machine guided JSON Schemas, Regex, and Grammar logit masking (Ctrl+Alt+O)', category: 'AI' },
  { command: 'llamacpp-studio', name: 'llama.cpp: Standalone C/C++ Engine & GGUF Fitter', description: 'Ultra-fast native C/C++ GGUF inference, VRAM sizer, and continuous batching (Ctrl+Alt+L)', category: 'AI' },
  { command: 'ripgrep-studio', name: 'ripgrep: High-Performance Code Search & Batch Replacer', description: 'Sub-millisecond workspace regex code search, contextual lines, and batch replacement (Ctrl+Alt+R)', category: 'Search' },
  { command: 'astgrep-studio', name: 'ast-grep: AST Structural Search & Refactor', description: 'Syntax-aware code patterns with meta-variables ($VAR, $$$ARGS), rule linter, and atomic rewrites (Ctrl+Alt+S)', category: 'Search' },
  { command: 'lancedb-studio', name: 'LanceDB: Serverless Embedded Vector Database', description: 'Apache Arrow columnar vector storage, hybrid search (Dense ANN + Sparse BM25), and zero-cloud RAG (Ctrl+Alt+D)', category: 'Database' },
  { command: 'chonkie-studio', name: 'Chonkie: High-Performance AST & Semantic Chunking Engine', description: 'Tree-sitter code chunking, intact AST syntax boundaries, and direct LanceDB ingestion (Ctrl+Alt+H)', category: 'AI' },
  { command: 'tabby-studio', name: 'Tabby: Self-Hosted FIM Code Completion Server', description: 'Sub-50ms Fill-in-the-Middle inline ghost-text autocomplete for Monaco (Ctrl+Alt+Y)', category: 'AI' },
  { command: 'universal-modes-studio', name: 'Universal Field Studio & Multi-Domain Engine', description: 'Transform IDE across 6 sovereign disciplines: Code, Fiction, Poetry, Science, Learning & Legal (Ctrl+Alt+U)', category: 'AI' },
  { command: 'novel-editor-studio', name: 'Novel: Notion-Style WYSIWYG Creative Studio', description: 'Interactive slash commands (/), bubble formatting, and inline AI continuation (Ctrl+Alt+E)', category: 'AI' },
  { command: 'dockview-studio', name: 'Dockview: Workspace Layout & Window Manager', description: 'Multi-pane dock splitting, floating windows, and preset layouts (Ctrl+Alt+W)', category: 'Layout' },
  { command: 'magic-ui-studio', name: 'Magic UI: Luxury Aesthetics & Sonner Effects Studio', description: 'Animated border beams, shimmer buttons, and spring stacked toast notifications (Ctrl+Alt+M)', category: 'Design' },
  { command: 'cursor-ui-studio', name: 'Cursor & v0: Ultra-Modern UI/UX Suite & Settings Importer', description: 'Error Lens, Better Comments, Indent Rainbow, Peacock, Glassit & settings.json (Ctrl+Alt+V)', category: 'Design' },
  { command: 'nano-banana-studio', name: 'Nano Banana Pro: 2,500 AI Prompt Gallery & Studio', description: 'Curated 2,500 AI image generation prompts with live HTML, remixing & IDE injection (Ctrl+Alt+J)', category: 'AI' },
  { command: 'superpowers-studio', name: 'Superpowers: Disciplined Engineering Methodology Studio', description: '7-stage autonomous methodology: Brainstorming, TDD, Subagents, Root-Cause Debugging & Code Reviews (Ctrl+Alt+Z)', category: 'Methodology' },
  { command: 'superpowers-brainstorm', name: 'Superpowers: Brainstorm & Clarify Specification', description: 'Interactive Socratic clarification session before writing code', category: 'Methodology' },
  { command: 'superpowers-tdd', name: 'Superpowers: Test-Driven Development (Red-Green TDD)', description: 'Enforce failing tests first before implementation code', category: 'Methodology' },
  { command: 'superpowers-debug', name: 'Superpowers: Systematic Root-Cause Debugging', description: '4-phase root-cause investigation without trial-and-error edits', category: 'Methodology' },
  { command: 'superpowers-review', name: 'Superpowers: Request Adversarial Code Review', description: 'Automated code review on active file inspecting invariants and security', category: 'Methodology' },
];

export const DEFAULT_KEYBINDINGS: Record<string, string> = {
  'file-new': 'Ctrl+N',
  'file-save': 'Ctrl+S',
  'view-terminal': 'Ctrl+`',
  'view-explorer': 'Ctrl+Shift+E',
  'workbench-palette': 'Ctrl+Shift+P',
  'models-catalog': 'Ctrl+Shift+M',
  'online-ai-hub': 'Ctrl+Shift+O',
  'project-ai-scaffold': 'Ctrl+Shift+A',
  'autonomous-agent': 'Ctrl+Shift+L',
  'webgpu-studio': 'Ctrl+Shift+W',
  'voice-to-code': 'F8',
  'database-studio': 'Ctrl+Shift+D',
  'live-preview-toggle': 'Ctrl+Shift+V',
  'extensions-marketplace': 'Ctrl+Shift+X',
  'mcp-studio': 'Ctrl+Shift+U',
  'inline-ai-transform': 'Ctrl+K',
  'git-clone': 'Ctrl+Shift+G L',
  'git-ai-commit': 'Ctrl+Shift+G C',
  'git-stage-file': 'Ctrl+Shift+G S',
  'rag-composer': 'Ctrl+Shift+C',
  'docker-sandbox': 'Ctrl+Shift+K',
  'lan-collab': 'Ctrl+Shift+Y',
  'semantic-search': 'Ctrl+Shift+F',
  'gguf-quantizer': 'Ctrl+Shift+Q',
  'theme-picker': 'Ctrl+K Ctrl+T',
  'layout-toggle-left': 'Ctrl+B',
  'layout-toggle-right': 'Ctrl+Alt+B',
  'layout-toggle-bottom': 'Ctrl+J',
  'layout-toggle-zen': 'Ctrl+K Z',
  'tasks-build': 'Ctrl+Shift+B',
  'tooljet-studio': 'Ctrl+Shift+J',
  'autogpt-studio': 'Ctrl+Alt+G',
  'indicnlp-studio': 'Ctrl+Alt+I',
  'chroma-open': 'Ctrl+Alt+C',
  'candle-studio': 'Ctrl+Alt+K',
  'nanogpt-studio': 'Ctrl+Alt+N',
  'aider-studio': 'Ctrl+Alt+P',
  'transformers-studio': 'Ctrl+Alt+T',
  'outlines-studio': 'Ctrl+Alt+O',
  'llamacpp-studio': 'Ctrl+Alt+L',
  'ripgrep-studio': 'Ctrl+Alt+R',
  'astgrep-studio': 'Ctrl+Alt+S',
  'lancedb-studio': 'Ctrl+Alt+D',
  'chonkie-studio': 'Ctrl+Alt+H',
  'tabby-studio': 'Ctrl+Alt+Y',
  'universal-modes-studio': 'Ctrl+Alt+U',
  'novel-editor-studio': 'Ctrl+Alt+E',
  'dockview-studio': 'Ctrl+Alt+W',
  'magic-ui-studio': 'Ctrl+Alt+M',
  'cursor-ui-studio': 'Ctrl+Alt+V',
  'nano-banana-studio': 'Ctrl+Alt+J',
  'superpowers-studio': 'Ctrl+Alt+Z',
};

export const getActiveKeybindings = () => {
  if (typeof window === 'undefined') return DEFAULT_KEYBINDINGS;
  const saved = localStorage.getItem('offlineAi.keybindings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return DEFAULT_KEYBINDINGS;
    }
  }
  return DEFAULT_KEYBINDINGS;
};

interface CommandItem {
  command: string;
  title: string;
  category?: string;
  extensionId: string;
}

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  onExecuteCommand 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onExecuteCommand?: (commandId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const all = extensionHost.getContributedCommands();
      // Merge with built-in commands
      const merged: CommandItem[] = [
        ...COMMAND_METADATA.map(m => ({
          command: m.command,
          title: m.name,
          category: m.category,
          extensionId: 'builtin'
        })),
        ...all
      ];
      setCommands(merged);
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const keybindings = useMemo(() => getActiveKeybindings(), [isOpen]);

  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        execute(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const execute = async (cmd: CommandItem) => {
    onClose();
    try {
      if (onExecuteCommand) {
        onExecuteCommand(cmd.command);
      }
      await extensionHost.executeCommand(cmd.command);
    } catch (err) {
      console.log('Command executed:', cmd.command);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-[#121215]/98 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/80 gap-3 bg-zinc-900/40">
            <Search size={18} className="text-indigo-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search actions..."
              className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-sm placeholder:text-zinc-500 font-sans"
            />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 rounded-md text-[10px] text-zinc-400 font-mono border border-zinc-700/60 shadow-xs">
              <Command size={10} />
              <span>ESC</span>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No matching commands found
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filtered.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  const shortcut = keybindings[cmd.command];
                  return (
                    <button
                      key={cmd.command}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                          : 'text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800/80 text-zinc-400'}`}>
                          <ChevronRight size={14} />
                        </div>
                        <div className="min-w-0">
                          {cmd.category && (
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border inline-block mb-1 ${
                              isSelected 
                                ? 'bg-indigo-500/40 text-indigo-100 border-indigo-400/40' 
                                : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/60'
                            }`}>
                              {cmd.category}
                            </span>
                          )}
                          <span className="font-medium block truncate">{cmd.title}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.extensionId.includes('wasi') && (
                          <Sparkles size={13} className={isSelected ? 'text-amber-200' : 'text-purple-400'} />
                        )}
                        {shortcut && (
                          <kbd className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium shadow-xs transition-colors ${
                            isSelected 
                              ? 'bg-indigo-700/90 border border-indigo-400/40 text-white' 
                              : 'bg-zinc-800/90 border border-zinc-700/60 text-zinc-400'
                          }`}>
                            {shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-zinc-800/90 rounded border border-zinc-700/60 text-zinc-300 font-mono">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-zinc-800/90 rounded border border-zinc-700/60 text-zinc-300 font-mono">↵</kbd> execute</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-zinc-800/90 rounded border border-zinc-700/60 text-zinc-300 font-mono">esc</kbd> close</span>
            </div>
            <span className="text-zinc-500 font-mono">{filtered.length} actions</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
