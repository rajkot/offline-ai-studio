'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileCode,
  Folder,
  Code2,
  GitBranch,
  Terminal,
  AlertTriangle,
  BookOpen,
  X,
  Search,
  Plus,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { lspWorkspace, LSPSymbol } from '@/lib/lspEngine';

export type ContextChipType = 'file' | 'folder' | 'symbol' | 'git' | 'terminal' | 'problems' | 'docs';

export interface ContextChipItem {
  id: string;
  type: ContextChipType;
  label: string;
  detail?: string;
  tokenCount: number;
  data: {
    filePath?: string;
    folderPath?: string;
    symbolName?: string;
    symbolKind?: string;
    content?: string;
    lines?: number;
  };
}

interface ContextChipsBarProps {
  chips: ContextChipItem[];
  onAddChip: (chip: ContextChipItem) => void;
  onRemoveChip: (chipId: string) => void;
  onClearAllChips: () => void;
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSelectOption: () => void;
  workspaceFiles: Record<string, string>;
  recentTerminalLogs?: string;
  gitStatusSummary?: string;
  problemsCount?: number;
}

export default function ContextChipsBar({
  chips,
  onAddChip,
  onRemoveChip,
  onClearAllChips,
  isOpen,
  onClose,
  searchQuery,
  onSelectOption,
  workspaceFiles,
  recentTerminalLogs = '',
  gitStatusSummary = '',
  problemsCount = 0,
}: ContextChipsBarProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'files' | 'symbols' | 'system'>('all');
  const [internalSearch, setInternalSearch] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal search with parent search query if provided
  useEffect(() => {
    if (searchQuery !== undefined) {
      setInternalSearch(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click outside to close popup
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Extract all unique folders from workspace files
  const folders = useMemo(() => {
    const set = new Set<string>();
    Object.keys(workspaceFiles).forEach((fp) => {
      const parts = fp.split('/');
      if (parts.length > 1) {
        set.add(parts.slice(0, -1).join('/') + '/');
      }
    });
    return Array.from(set).sort();
  }, [workspaceFiles]);

  // Extract all symbols from LSP
  const allSymbols = useMemo(() => {
    try {
      return lspWorkspace.getAllSymbols();
    } catch {
      return [];
    }
  }, [workspaceFiles]);

  // Generate selectable options filtered by category and search
  const options = useMemo(() => {
    const q = internalSearch.toLowerCase().trim();
    const result: Array<{
      type: ContextChipType;
      label: string;
      detail: string;
      category: 'files' | 'symbols' | 'system';
      tokenCount: number;
      data: any;
    }> = [];

    // 1. System / Environment Contexts
    if (activeCategory === 'all' || activeCategory === 'system') {
      if (!q || 'git status diff changes'.includes(q)) {
        result.push({
          type: 'git',
          label: '@git',
          detail: gitStatusSummary || 'Current uncommitted diff & branch status',
          category: 'system',
          tokenCount: 450,
          data: { content: gitStatusSummary || 'Branch: main • Clean working tree' },
        });
      }

      if (!q || 'terminal console output logs errors'.includes(q)) {
        result.push({
          type: 'terminal',
          label: '@terminal',
          detail: 'Last 50 lines of integrated terminal output',
          category: 'system',
          tokenCount: 600,
          data: { content: recentTerminalLogs || 'Terminal session active' },
        });
      }

      if (!q || 'problems diagnostics errors lsp eslint warnings'.includes(q)) {
        result.push({
          type: 'problems',
          label: '@problems',
          detail: `${problemsCount} active TypeScript & ESLint diagnostic warnings`,
          category: 'system',
          tokenCount: 300,
          data: { content: `Active problems: ${problemsCount}` },
        });
      }

      if (!q || 'docs documentation cheat-sheet api'.includes(q)) {
        result.push({
          type: 'docs',
          label: '@docs',
          detail: 'Offline React, Next.js & WebGPU cheat-sheets',
          category: 'system',
          tokenCount: 500,
          data: { content: 'Next.js App Router & React 19 Client/Server Cheat-Sheet' },
        });
      }
    }

    // 2. Files
    if (activeCategory === 'all' || activeCategory === 'files') {
      Object.entries(workspaceFiles).forEach(([fp, content]) => {
        if (!q || fp.toLowerCase().includes(q)) {
          const lines = content.split('\n').length;
          const tokens = Math.round(content.length / 3.8);
          result.push({
            type: 'file',
            label: `@file:${fp}`,
            detail: `${lines} lines • ~${tokens} tokens`,
            category: 'files',
            tokenCount: tokens,
            data: { filePath: fp, content, lines },
          });
        }
      });

      // Folders
      folders.forEach((f) => {
        if (!q || f.toLowerCase().includes(q)) {
          const count = Object.keys(workspaceFiles).filter((k) => k.startsWith(f)).length;
          result.push({
            type: 'folder',
            label: `@folder:${f}`,
            detail: `${count} files in folder`,
            category: 'files',
            tokenCount: 350,
            data: { folderPath: f },
          });
        }
      });
    }

    // 3. Symbols
    if (activeCategory === 'all' || activeCategory === 'symbols') {
      allSymbols.forEach((sym) => {
        const full = `${sym.name} ${sym.kind} ${sym.filePath}`.toLowerCase();
        if (!q || full.includes(q)) {
          result.push({
            type: 'symbol',
            label: `@symbol:${sym.name}`,
            detail: `${sym.kind} in ${sym.filePath}:${sym.line}`,
            category: 'symbols',
            tokenCount: 150,
            data: {
              symbolName: sym.name,
              symbolKind: sym.kind,
              filePath: sym.filePath,
              lines: sym.endLine - sym.line + 1,
            },
          });
        }
      });
    }

    return result.slice(0, 30); // Cap at 30 items for ultra-fast rendering
  }, [
    internalSearch,
    activeCategory,
    workspaceFiles,
    folders,
    allSymbols,
    gitStatusSummary,
    recentTerminalLogs,
    problemsCount,
  ]);

  const handleSelectOption = (opt: typeof options[0]) => {
    const chip: ContextChipItem = {
      id: `${opt.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: opt.type,
      label: opt.label.replace(/^@/, ''),
      detail: opt.detail,
      tokenCount: opt.tokenCount,
      data: opt.data,
    };
    onAddChip(chip);
    onSelectOption();
    onClose();
  };

  const totalTokens = useMemo(() => {
    return chips.reduce((acc, c) => acc + (c.tokenCount || 0), 0);
  }, [chips]);

  const renderIcon = (type: ContextChipType, size = 12) => {
    switch (type) {
      case 'file':
        return <FileCode size={size} className="text-blue-400 shrink-0" />;
      case 'folder':
        return <Folder size={size} className="text-amber-400 shrink-0" />;
      case 'symbol':
        return <Code2 size={size} className="text-purple-400 shrink-0" />;
      case 'git':
        return <GitBranch size={size} className="text-emerald-400 shrink-0" />;
      case 'terminal':
        return <Terminal size={size} className="text-zinc-300 shrink-0" />;
      case 'problems':
        return <AlertTriangle size={size} className="text-rose-400 shrink-0" />;
      case 'docs':
        return <BookOpen size={size} className="text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full select-none">
      {/* ATTACHED CHIPS STRIP */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-2 py-1.5 bg-zinc-950/90 rounded-xl border border-zinc-800/80 max-h-24 overflow-y-auto custom-scrollbar shadow-inner">
          <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1 px-1 shrink-0">
            <Sparkles size={11} className="text-amber-400" /> Context:
          </span>

          {chips.map((chip) => (
            <div
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-[11px] font-mono text-zinc-200 shadow-sm hover:border-indigo-500/60 transition-all group"
            >
              {renderIcon(chip.type, 12)}
              <span className="max-w-[160px] truncate font-medium">{chip.label}</span>
              <span className="text-[9px] text-zinc-400 font-sans">~{chip.tokenCount}t</span>
              <button
                type="button"
                onClick={() => onRemoveChip(chip.id)}
                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                title="Remove context chip"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2 px-1 text-[10px] text-zinc-400 font-mono">
            <span>~{totalTokens.toLocaleString()} tokens</span>
            {chips.length > 1 && (
              <button
                type="button"
                onClick={onClearAllChips}
                className="text-zinc-400 hover:text-rose-400 hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUICK-PICK CONTEXT POPUP DIALOG */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-16 left-3 right-3 bg-[#121318] border border-indigo-500/70 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden z-[100] flex flex-col font-sans animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          {/* POPUP HEADER & SEARCH */}
          <div className="p-3 bg-[#181920] border-b border-zinc-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Sparkles size={14} className="text-indigo-400" />
                <span>Attach Context to AI Prompt (@)</span>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="flex items-center gap-2 bg-[#0d0e12] px-3 py-2 rounded-xl border border-zinc-700/80 focus-within:border-indigo-500">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                placeholder="Search files, symbols, git status, terminal..."
                className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none flex-1 font-mono"
              />
              {internalSearch && (
                <button
                  onClick={() => setInternalSearch('')}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* CATEGORY TABS */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              {(['all', 'files', 'symbols', 'system'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white font-semibold shadow'
                      : 'hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* OPTIONS LIST */}
          <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-zinc-800/40 custom-scrollbar font-mono text-xs">
            {options.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-sans">
                No matching context found for "{internalSearch}".
              </div>
            ) : (
              options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/25 hover:border-indigo-500/40 rounded-xl transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderIcon(opt.type, 14)}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-100 group-hover:text-indigo-200 truncate">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans truncate">
                        {opt.detail}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 group-hover:text-indigo-300">
                    +{opt.tokenCount}t
                  </span>
                </button>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="p-2.5 bg-[#181920] border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-sans">
            <span>Tip: Type @ anywhere in the prompt to invoke</span>
            <span>Press Esc to dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
}
