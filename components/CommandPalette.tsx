'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  { command: 'wasi-show-info', name: 'Show WASI System Info', description: 'Display micro-kernel diagnostics', category: 'WASI' },
  { command: 'rag-composer', name: 'Multi-File RAG Composer', description: 'Semantic workspace search → cross-file analysis → chunk-level diff review (Ctrl+Shift+C)', category: 'AI' },
  { command: 'docker-sandbox', name: 'Docker Sandbox Studio', description: 'Spawn isolated containers, run builds, copy workspace files into Docker (Ctrl+Shift+K)', category: 'DevOps' },
  { command: 'lan-collab', name: 'LAN Pair Programming (P2P)', description: 'Zero-cloud collaborative editing on same Wi-Fi — shared cursors, live chat (Ctrl+Shift+Y)', category: 'Collaboration' },
  { command: 'semantic-search', name: 'Semantic Codebase Search', description: 'Natural language search across all files using local vector embeddings (Ctrl+Shift+F)', category: 'Search' },
  { command: 'gguf-quantizer', name: 'GGUF Quantization Studio', description: 'Visual llama.cpp quantizer — 1-click Q4/Q5/Q8 with VRAM calculator (Ctrl+Shift+Q)', category: 'Models' },
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

  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
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
      // Only try to execute via extension host if it's not a builtin IDE command 
      // or if we want extensions to be able to override builtins
      await extensionHost.executeCommand(cmd.command);
    } catch (err) {
      // Ignore errors for built-in commands that aren't in extension host
      console.log('Command executed:', cmd.command);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl bg-[#1e1e2e] border border-[#313244] rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center px-4 py-3 border-b border-[#313244] gap-3">
            <Search size={18} className="text-[#a6adc8]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command to run..."
              className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-sm placeholder:text-[#585b70]"
            />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#313244] rounded text-[10px] text-[#bac272] font-mono border border-[#45475a]">
              <Command size={10} />
              <span>P</span>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#313244] scrollbar-track-transparent">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-[#585b70] text-sm">
                No matching commands found
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filtered.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                      idx === selectedIndex ? 'bg-indigo-600 text-white' : 'text-[#cdd6f4] hover:bg-[#313244]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${idx === selectedIndex ? 'bg-indigo-500' : 'bg-[#181825]'}`}>
                        <ChevronRight size={14} className={idx === selectedIndex ? 'text-white' : 'text-[#a6adc8]'} />
                      </div>
                      <div>
                        {cmd.category && (
                          <span className={`text-[10px] uppercase tracking-wider font-bold block mb-0.5 ${idx === selectedIndex ? 'text-indigo-200' : 'text-[#6c7086]'}`}>
                            {cmd.category}
                          </span>
                        )}
                        <span className="font-medium">{cmd.title}</span>
                      </div>
                    </div>
                    {cmd.extensionId.includes('wasi') && (
                      <Sparkles size={14} className={idx === selectedIndex ? 'text-white' : 'text-purple-400'} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 bg-[#181825] border-t border-[#313244] flex items-center justify-between text-[10px] text-[#585b70] font-medium uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[#313244] rounded border border-[#45475a] text-zinc-300">↑↓</kbd> to navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[#313244] rounded border border-[#45475a] text-zinc-300">↵</kbd> to select</span>
            </div>
            <span>{filtered.length} Commands Available</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
