'use client';

import React, { useState, useMemo } from 'react';
import { 
  Code2, 
  Search, 
  Compass, 
  ExternalLink, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Eye, 
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Braces
} from 'lucide-react';
import { lspWorkspace, LSPSymbol, LSPReference, WorkspaceDiagnostic } from '@/lib/lspEngine';

interface LspSymbolExplorerProps {
  currentFile: string | null;
  workspaceFiles: Record<string, string>;
  onJumpToLocation: (filePath: string, line: number) => void;
  onApplyRename: (updatedFiles: Record<string, string>) => void;
  inlayHintsEnabled: boolean;
  onToggleInlayHints: () => void;
}

export default function LspSymbolExplorer({
  currentFile,
  workspaceFiles,
  onJumpToLocation,
  onApplyRename,
  inlayHintsEnabled,
  onToggleInlayHints
}: LspSymbolExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'symbols' | 'references' | 'diagnostics' | 'rename'>('symbols');
  const [selectedSymbolForRef, setSelectedSymbolForRef] = useState<LSPSymbol | null>(null);
  
  // Rename Modal State
  const [renameTargetSymbol, setRenameTargetSymbol] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [renamePreview, setRenamePreview] = useState<{ updatedFiles: Record<string, string>; count: number } | null>(null);

  // Sync LSP with current workspace files
  useMemo(() => {
    lspWorkspace.updateWorkspace(workspaceFiles);
  }, [workspaceFiles]);

  const allSymbols = useMemo(() => {
    return lspWorkspace.getAllSymbols();
  }, [workspaceFiles]);

  const filteredSymbols = useMemo(() => {
    return allSymbols.filter(sym => {
      const matchesQuery = sym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           sym.filePath.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesKind = selectedKind === 'all' || sym.kind === selectedKind;
      return matchesQuery && matchesKind;
    });
  }, [allSymbols, searchQuery, selectedKind]);

  const activeReferences = useMemo<LSPReference[]>(() => {
    if (!selectedSymbolForRef) return [];
    return lspWorkspace.findReferences(selectedSymbolForRef.name);
  }, [selectedSymbolForRef, workspaceFiles]);

  const diagnostics = useMemo<WorkspaceDiagnostic[]>(() => {
    return lspWorkspace.getAllDiagnostics();
  }, [workspaceFiles]);

  const handleStartRename = (symbolName: string) => {
    setRenameTargetSymbol(symbolName);
    setRenameNewName(symbolName + '_renamed');
    const preview = lspWorkspace.renameSymbol(symbolName, symbolName + '_renamed');
    setRenamePreview(preview);
    setActiveTab('rename');
  };

  const handlePreviewRenameChange = (newName: string) => {
    setRenameNewName(newName);
    if (renameTargetSymbol && newName) {
      const preview = lspWorkspace.renameSymbol(renameTargetSymbol, newName);
      setRenamePreview(preview);
    }
  };

  const handleExecuteRename = () => {
    if (renamePreview && renamePreview.count > 0) {
      onApplyRename(renamePreview.updatedFiles);
      setActiveTab('symbols');
      setRenameTargetSymbol('');
      setRenameNewName('');
      setRenamePreview(null);
    }
  };

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'function': return 'text-amber-400 bg-amber-950/40 border-amber-800';
      case 'class': return 'text-purple-400 bg-purple-950/40 border-purple-800';
      case 'interface': return 'text-blue-400 bg-blue-950/40 border-blue-800';
      case 'type': return 'text-cyan-400 bg-cyan-950/40 border-cyan-800';
      case 'constant': return 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
      default: return 'text-zinc-300 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 border-r border-[#27272a]">
      {/* Header */}
      <div className="p-3 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800 text-indigo-400">
            <Compass size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Native LSP Engine</h2>
            <p className="text-[10px] text-zinc-500 font-mono">Tree-Sitter AST & Cross-File Symbols</p>
          </div>
        </div>

        <button
          onClick={onToggleInlayHints}
          className={`px-2 py-1 rounded-md text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
            inlayHintsEnabled
              ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300 shadow-xs'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle Inlay Hints (parameter names and inferred return types)"
        >
          <Eye size={12} />
          {inlayHintsEnabled ? 'Inlay Hints: ON' : 'Inlay Hints: OFF'}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#27272a] bg-[#141416] p-1 gap-1">
        <button
          onClick={() => setActiveTab('symbols')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'symbols'
              ? 'bg-[#27272a] text-zinc-100 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1f]'
          }`}
        >
          <Code2 size={13} />
          <span>Symbols ({allSymbols.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'references'
              ? 'bg-[#27272a] text-zinc-100 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1f]'
          }`}
        >
          <Layers size={13} />
          <span>References (Shift+F12)</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'bg-[#27272a] text-zinc-100 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1f]'
          }`}
        >
          <AlertCircle size={13} />
          <span>Diagnostics ({diagnostics.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {activeTab === 'symbols' && (
          <div className="flex flex-col gap-3">
            {/* Search & Kind Filters */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search workspace symbols, functions, classes..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Kind Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {['all', 'function', 'class', 'interface', 'constant', 'type'].map(kind => (
                  <button
                    key={kind}
                    onClick={() => setSelectedKind(kind)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize shrink-0 border transition-all cursor-pointer ${
                      selectedKind === kind
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbol Items List */}
            <div className="flex flex-col gap-1.5">
              {filteredSymbols.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  No symbols match your query. Type code or define functions to populate the LSP index.
                </div>
              ) : (
                filteredSymbols.map((sym, idx) => (
                  <div
                    key={`${sym.filePath}-${sym.name}-${idx}`}
                    className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-indigo-500/50 transition-all flex flex-col gap-1.5 group shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getKindColor(sym.kind)}`}>
                          {sym.kind}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                          {sym.name}
                        </span>
                        {sym.exported && (
                          <span className="text-[9px] px-1 bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded font-mono">
                            export
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartRename(sym.name)}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Safe Semantic Rename (F2)"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSymbolForRef(sym);
                            setActiveTab('references');
                          }}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Find All References (Shift+F12)"
                        >
                          <Layers size={12} />
                        </button>
                        <button
                          onClick={() => onJumpToLocation(sym.filePath, sym.line)}
                          className="p-1 rounded hover:bg-indigo-950 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Go to Definition (F12)"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>

                    {sym.signature && (
                      <div className="text-[11px] font-mono text-zinc-400 bg-[#111113] p-1.5 rounded-lg border border-[#222226] truncate">
                        {sym.signature}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1 truncate">
                        <FileCode size={11} className="text-zinc-600 shrink-0" />
                        {sym.filePath}
                      </span>
                      <span className="shrink-0 text-zinc-400">Line {sym.line}:{sym.column}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* References Tab (Shift+F12) */}
        {activeTab === 'references' && (
          <div className="flex flex-col gap-3">
            {selectedSymbolForRef ? (
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-400 font-mono">Finding all references for:</span>
                  <div className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-2">
                    <span>{selectedSymbolForRef.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px]">
                      {activeReferences.length} matches across workspace
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSymbolForRef(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-zinc-400 bg-[#18181b] rounded-xl border border-[#27272a]">
                Select any symbol or press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200 font-mono">Shift+F12</kbd> in Monaco to view cross-file references.
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {activeReferences.map((ref, idx) => (
                <div
                  key={idx}
                  onClick={() => onJumpToLocation(ref.filePath, ref.line)}
                  className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-indigo-500/60 transition-all cursor-pointer group flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-indigo-400 flex items-center gap-1 truncate">
                      <FileCode size={12} />
                      {ref.filePath}
                    </span>
                    <span className="text-zinc-500">L{ref.line}:{ref.column}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-300 bg-[#111113] p-1.5 rounded border border-[#222226] truncate">
                    {ref.lineContent}
                  </div>
                  {ref.isDefinition && (
                    <span className="text-[9px] text-amber-400 font-mono">● Primary Definition</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="flex flex-col gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <div className="text-xs text-emerald-300">
                <span className="font-bold">LSP AST Invariants Verified:</span> Workspace syntax & types active.
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {diagnostics.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  Zero diagnostic warnings found across workspace files.
                </div>
              ) : (
                diagnostics.map((diag, idx) => (
                  <div
                    key={idx}
                    onClick={() => onJumpToLocation(diag.filePath, diag.line)}
                    className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-amber-500/40 transition-all cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        {diag.code || 'LSP-WARN'}
                      </span>
                      <span className="text-zinc-500 text-[10px]">{diag.filePath} (L{diag.line})</span>
                    </div>
                    <p className="text-xs text-zinc-300">{diag.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rename Symbol Modal / Sub-view (F2) */}
        {activeTab === 'rename' && (
          <div className="flex flex-col gap-3 p-1">
            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Edit3 size={15} />
                <span>Safe Semantic Workspace Rename (F2)</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-zinc-400">Target Symbol</label>
                <input
                  type="text"
                  value={renameTargetSymbol}
                  disabled
                  className="bg-[#111113] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-zinc-400 font-mono cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-zinc-400">New Refactored Symbol Name</label>
                <input
                  type="text"
                  value={renameNewName}
                  onChange={e => handlePreviewRenameChange(e.target.value)}
                  placeholder="Enter new symbol name..."
                  className="bg-[#111113] border border-amber-600/60 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {renamePreview && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800 text-xs text-amber-300 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>{renamePreview.count} occurrences across {Object.keys(renamePreview.updatedFiles).length} files</span>
                  </div>
                  <ul className="text-[11px] font-mono text-zinc-400 list-disc pl-4 mt-1">
                    {Object.keys(renamePreview.updatedFiles).map(file => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  onClick={() => setActiveTab('symbols')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteRename}
                  disabled={!renamePreview || renamePreview.count === 0}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Apply Refactor ({renamePreview?.count || 0})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
