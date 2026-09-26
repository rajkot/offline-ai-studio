'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Zap,
  Code2,
  Copy,
  Check,
  FileText,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Folder,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Replace
} from 'lucide-react';
import {
  ripgrepEngine,
  RipgrepMatch,
  RipgrepSearchResult,
  RipgrepReplaceResult
} from '@/lib/ai/ripgrepEngine';

export interface RipgrepStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
  onOpenFile?: (path: string, line?: number) => void;
  onApplyFiles?: (files: Record<string, string>) => void;
}

export default function RipgrepStudioModal({
  isOpen = true,
  onClose,
  workspaceFiles = {},
  activeFile,
  onOpenFile,
  onApplyFiles
}: RipgrepStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'replace' | 'benchmarks' | 'cli'>('search');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Search Controls
  const [query, setQuery] = useState<string>('authenticate');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [includeGlob, setIncludeGlob] = useState<string>('');
  const [excludeGlob, setExcludeGlob] = useState<string>('node_modules, .git');

  // Replace Controls
  const [replaceQuery, setReplaceQuery] = useState<string>('authSession');
  const [replaceTarget, setReplaceTarget] = useState<string>('verifiedAuthSession');
  const [replacePreview, setReplacePreview] = useState<RipgrepReplaceResult | null>(null);
  const [replaceApplied, setReplaceApplied] = useState<boolean>(false);

  // Expanded files in grouped results
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const toggleFileExpanded = (file: string) => {
    setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  // Real-time Search Execution
  const searchResult: RipgrepSearchResult = useMemo(() => {
    return ripgrepEngine.searchWorkspace(workspaceFiles, query, {
      caseSensitive,
      wholeWord,
      isRegex,
      includeGlob,
      excludeGlob,
      contextLines: 1
    });
  }, [workspaceFiles, query, caseSensitive, wholeWord, isRegex, includeGlob, excludeGlob]);

  const handlePreviewReplace = () => {
    const res = ripgrepEngine.replaceInWorkspace(workspaceFiles, replaceQuery, replaceTarget, {
      caseSensitive,
      wholeWord,
      isRegex,
      includeGlob,
      excludeGlob
    });
    setReplacePreview(res);
    setReplaceApplied(false);
  };

  const handleExecuteReplace = () => {
    if (!replacePreview || !onApplyFiles) return;
    onApplyFiles(replacePreview.updatedFiles);
    setReplaceApplied(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1320] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-rose-500/20 to-orange-500/20 border border-rose-500/40 rounded-xl text-rose-400 shadow-inner">
            <Search size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                ripgrep Workspace Search & Replace
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/30">
                BurntSushi · v14.1.1 (Rust)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Zap size={11} />
                Sub-Millisecond Regex Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              The world&apos;s fastest line-oriented regex search engine. Search 100,000+ files with zero latency.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-5 border-b border-slate-800/80 bg-[#0c101c] gap-1 shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'search' as const, label: '⚡ Lightning Search', icon: <Search size={13} /> },
          { id: 'replace' as const, label: '🔁 Batch Find & Replace', icon: <Replace size={13} /> },
          { id: 'benchmarks' as const, label: '📊 Speed Benchmarks', icon: <Zap size={13} /> },
          { id: 'cli' as const, label: '💻 CLI & Flags Guide', icon: <Code2 size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-rose-400 text-rose-300 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Lightning Search */}
        {activeTab === 'search' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Search Input Bar & Modifiers */}
            <div className="bg-[#111728] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 focus-within:border-rose-500 transition-colors">
                <Search size={16} className="text-slate-400 ml-1" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search across entire codebase with ripgrep (regex, literal, or symbol)..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none font-mono"
                />

                {/* Search Modifier Toggles */}
                <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                  <button
                    onClick={() => setCaseSensitive(prev => !prev)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      caseSensitive ? 'bg-rose-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    title="Match Case (Alt+C)"
                  >
                    Aa
                  </button>
                  <button
                    onClick={() => setWholeWord(prev => !prev)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      wholeWord ? 'bg-rose-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    title="Match Whole Word (Alt+W)"
                  >
                    \b
                  </button>
                  <button
                    onClick={() => setIsRegex(prev => !prev)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      isRegex ? 'bg-rose-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    title="Use Regular Expression (Alt+R)"
                  >
                    .*
                  </button>
                </div>
              </div>

              {/* Path Filtering Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <Filter size={13} className="text-slate-400" />
                  <span className="text-slate-400 shrink-0">Files to include:</span>
                  <input
                    type="text"
                    value={includeGlob}
                    onChange={e => setIncludeGlob(e.target.value)}
                    placeholder="e.g. *.tsx, *.ts, src/**"
                    className="flex-1 bg-transparent text-slate-200 outline-none font-mono text-[11px]"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <Filter size={13} className="text-rose-400" />
                  <span className="text-slate-400 shrink-0">Files to exclude:</span>
                  <input
                    type="text"
                    value={excludeGlob}
                    onChange={e => setExcludeGlob(e.target.value)}
                    placeholder="e.g. node_modules, dist, *.min.js"
                    className="flex-1 bg-transparent text-slate-200 outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Status & Timing Metrics Bar */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{searchResult.totalMatches} matches</span>
                  <span>in</span>
                  <span className="font-bold text-rose-300">{searchResult.matchingFilesCount} files</span>
                  <span className="text-slate-500">({searchResult.filesScanned} scanned)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Zap size={13} />
                  <span>{searchResult.durationMs} ms latency</span>
                </div>
              </div>
            </div>

            {/* Grouped Search Results */}
            <div className="space-y-3">
              {Object.keys(searchResult.groupedByFile).length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#111625] rounded-xl border border-slate-800">
                  <Search size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No matches found for &quot;{query}&quot;</p>
                  <p className="text-xs text-slate-600 mt-1">Try adjusting case sensitivity, word boundaries, or file include filters.</p>
                </div>
              ) : (
                Object.entries(searchResult.groupedByFile).map(([filePath, matches]) => {
                  const isExpanded = expandedFiles[filePath] !== false; // Expanded by default
                  return (
                    <div key={filePath} className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
                      {/* File Group Header */}
                      <div
                        onClick={() => toggleFileExpanded(filePath)}
                        className="px-4 py-2.5 bg-[#151c2e] hover:bg-[#182136] border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          <Folder size={14} className="text-amber-400" />
                          <span className="font-mono font-bold text-white hover:underline" onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenFile) onOpenFile(filePath, matches[0]?.lineNumber);
                          }}>
                            {filePath}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                        </span>
                      </div>

                      {/* Matched Lines List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-800/40 bg-slate-950 font-mono text-xs">
                          {matches.map((m, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (onOpenFile) onOpenFile(m.file, m.lineNumber);
                              }}
                              className="px-4 py-2 hover:bg-[#151c2e] cursor-pointer transition-colors flex items-start gap-4 group"
                            >
                              <span className="w-12 text-right text-slate-500 group-hover:text-rose-400 select-none shrink-0 text-[11px]">
                                {m.lineNumber}:{m.column}
                              </span>
                              <div className="flex-1 overflow-x-auto text-slate-300">
                                <span>{m.lineContent.slice(0, m.column - 1)}</span>
                                <span className="bg-rose-500/30 text-rose-200 border-b border-rose-400 font-bold px-0.5 rounded-xs">
                                  {m.matchText}
                                </span>
                                <span>{m.lineContent.slice(m.column - 1 + m.matchText.length)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Batch Find & Replace */}
        {activeTab === 'replace' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Replace size={16} className="text-rose-400" />
                Atomic Search and Replace across All Workspace Files
              </h3>
              <p className="text-xs text-slate-400">
                Safely refactor identifiers, symbol names, and configuration values across thousands of files simultaneously.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">Search Pattern:</span>
                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={e => setReplaceQuery(e.target.value)}
                    className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-white outline-none focus:border-rose-500"
                    placeholder="Pattern to find..."
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">Replace With:</span>
                  <input
                    type="text"
                    value={replaceTarget}
                    onChange={e => setReplaceTarget(e.target.value)}
                    className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500"
                    placeholder="Replacement text..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePreviewReplace}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Search size={13} />
                  <span>Preview Replacements</span>
                </button>

                {replacePreview && replacePreview.totalReplacements > 0 && (
                  <button
                    onClick={handleExecuteReplace}
                    disabled={replaceApplied}
                    className="px-5 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {replaceApplied ? <Check size={14} /> : <Replace size={14} />}
                    <span>{replaceApplied ? 'Applied to Workspace!' : `Apply ${replacePreview.totalReplacements} Replacements`}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Replace Preview Summary */}
            {replacePreview && (
              <div className="bg-[#111625] rounded-xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-400">Replace Execution Plan</span>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                    <span className="text-rose-400 font-bold">{replacePreview.totalReplacements} total replacements</span>
                    <span>across</span>
                    <span className="text-emerald-400 font-bold">{replacePreview.filesAffected.length} files</span>
                    <span className="text-slate-500">({replacePreview.durationMs} ms)</span>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {replacePreview.filesAffected.map(f => (
                    <div key={f} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">{f}</span>
                      <span className="text-emerald-400 text-[11px] font-bold">Ready to apply</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Speed Benchmarks */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={18} className="text-rose-400" />
                ripgrep Architectural Performance Benchmark
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Ripgrep consistently outperforms traditional search utilities by leveraging Rust&apos;s fast regular expression engine, literal optimizations, and SIMD hardware acceleration:
              </p>

              <div className="space-y-3 font-mono text-xs pt-2">
                {[
                  { name: 'ripgrep (rg)', time: '0.12s', speedup: '1.0x (Fastest Baseline)', color: 'bg-rose-500', width: '15%' },
                  { name: 'git grep', time: '0.34s', speedup: '2.8x slower than rg', color: 'bg-amber-500', width: '35%' },
                  { name: 'GNU grep', time: '1.28s', speedup: '10.6x slower than rg', color: 'bg-purple-500', width: '70%' },
                  { name: 'Python script scan', time: '3.45s', speedup: '28.7x slower than rg', color: 'bg-slate-600', width: '100%' }
                ].map((b, i) => (
                  <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-200">
                      <span className="font-bold">{b.name}</span>
                      <span className="text-slate-400">{b.time} &bull; {b.speedup}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className={`h-full ${b.color} rounded-full`} style={{ width: b.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: CLI & Flags Guide */}
        {activeTab === 'cli' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white font-mono">Popular ripgrep CLI Commands</span>
                <button
                  onClick={() => handleCopy(`rg -i 'authenticate' --type ts\nrg -w 'User' src/\nrg -C 2 'error' -g '!node_modules'`, 'cli-copy')}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono cursor-pointer"
                >
                  {isCopied === 'cli-copy' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'cli-copy' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
{`# Search case-insensitively in TypeScript files only
rg -i 'authenticate' --type ts

# Search for exact whole word in src/
rg -w 'User' src/

# Search with 2 lines of surrounding context
rg -C 2 'error' -g '!node_modules'

# Inverted regex search (lines NOT matching pattern)
rg -v '^#' config.yaml

# Replace all occurrences in place
rg 'oldMethod' --replace 'newMethod'`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
