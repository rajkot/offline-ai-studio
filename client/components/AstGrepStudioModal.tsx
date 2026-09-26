'use client';

import React, { useState, useMemo } from 'react';
import {
  Code2,
  Search,
  Replace,
  ShieldAlert,
  BookOpen,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  FileCode,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  FolderTree,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import {
  astGrepEngine,
  AstGrepMatch,
  AstGrepSearchResult,
  AstGrepRewriteResult,
  AstGrepLintResult,
  BUILTIN_AST_RULES,
  AstGrepRule
} from '@/lib/ai/astGrepEngine';

export interface AstGrepStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
  onOpenFile?: (path: string, line?: number) => void;
  onApplyFiles?: (files: Record<string, string>) => void;
}

const SEARCH_PRESETS = [
  { label: 'console.log($$$ARGS)', pattern: 'console.log($$$ARGS)', lang: 'all', desc: 'Find all console debug statements' },
  { label: 'useState($INIT)', pattern: 'const [$STATE, $SET] = useState($INIT)', lang: 'typescript', desc: 'Find React useState hook declarations' },
  { label: 'useEffect(() => { ... })', pattern: 'useEffect(() => { $$$BODY }, [$$$DEPS])', lang: 'typescript', desc: 'Find React useEffect hook calls' },
  { label: 'import { $$$ } from "$SRC"', pattern: 'import { $$$IMPORTS } from "$SRC"', lang: 'all', desc: 'Find named ES6 import declarations' },
  { label: 'var $NAME = $VALUE', pattern: 'var $NAME = $VALUE', lang: 'all', desc: 'Find legacy var keyword declarations' },
  { label: 'catch ($ERR) {}', pattern: 'catch ($ERR) {}', lang: 'all', desc: 'Find empty catch exception blocks' }
];

const REWRITE_PRESETS = [
  {
    name: 'var -> const Modernization',
    pattern: 'var $NAME = $VALUE',
    rewrite: 'const $NAME = $VALUE',
    lang: 'all',
    desc: 'Upgrade legacy function-scoped var to block-scoped const'
  },
  {
    name: 'console.log -> logger.debug',
    pattern: 'console.log($$$ARGS)',
    rewrite: 'logger.debug($$$ARGS)',
    lang: 'all',
    desc: 'Redirect console logging to unified structured logger'
  },
  {
    name: 'Logical OR -> Nullish Coalescing',
    pattern: '$A || $B',
    rewrite: '$A ?? $B',
    lang: 'all',
    desc: 'Preserve falsy values (0, false) with modern ?? operator'
  },
  {
    name: 'NaN === -> Number.isNaN',
    pattern: '$VAL === NaN',
    rewrite: 'Number.isNaN($VAL)',
    lang: 'all',
    desc: 'Fix broken NaN equality comparison logic bug'
  }
];

export default function AstGrepStudioModal({
  isOpen = true,
  onClose,
  workspaceFiles = {},
  activeFile,
  onOpenFile,
  onApplyFiles
}: AstGrepStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'rewrite' | 'lint' | 'docs'>('search');

  // Search State
  const [searchPattern, setSearchPattern] = useState('console.log($$$ARGS)');
  const [searchLanguage, setSearchLanguage] = useState('all');
  const [searchResult, setSearchResult] = useState<AstGrepSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Rewrite State
  const [rewritePattern, setRewritePattern] = useState('var $NAME = $VALUE');
  const [rewriteTemplate, setRewriteTemplate] = useState('const $NAME = $VALUE');
  const [rewriteLanguage, setRewriteLanguage] = useState('all');
  const [rewritePreview, setRewritePreview] = useState<AstGrepRewriteResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);

  // Lint State
  const [lintResult, setLintResult] = useState<AstGrepLintResult | null>(null);
  const [isLinting, setIsLinting] = useState(false);
  const [lintFilterSeverity, setLintFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [lintAppliedMessage, setLintAppliedMessage] = useState<string | null>(null);

  const filesCount = useMemo(() => Object.keys(workspaceFiles).length, [workspaceFiles]);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles(prev => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  // Perform Search
  const handleExecuteSearch = (patternToUse?: string) => {
    const pat = patternToUse !== undefined ? patternToUse : searchPattern;
    if (!pat.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const result = astGrepEngine.searchPattern(workspaceFiles, pat, searchLanguage);
      setSearchResult(result);
      setIsSearching(false);
    }, 50);
  };

  // Perform Rewrite Preview
  const handleExecuteRewritePreview = () => {
    if (!rewritePattern.trim() || !rewriteTemplate.trim()) return;

    setIsRewriting(true);
    setRewriteApplied(false);
    setTimeout(() => {
      const result = astGrepEngine.rewritePattern(
        workspaceFiles,
        rewritePattern,
        rewriteTemplate,
        rewriteLanguage
      );
      setRewritePreview(result);
      setIsRewriting(false);
    }, 50);
  };

  // Apply Rewrite to Workspace
  const handleApplyRewrite = () => {
    if (!rewritePreview || !onApplyFiles) return;
    onApplyFiles(rewritePreview.updatedFiles);
    setRewriteApplied(true);
  };

  // Perform Lint Scan
  const handleExecuteLint = () => {
    setIsLinting(true);
    setLintAppliedMessage(null);
    setTimeout(() => {
      const result = astGrepEngine.lintWorkspace(workspaceFiles);
      setLintResult(result);
      setIsLinting(false);
    }, 60);
  };

  // Fix Single Lint Violation
  const handleFixViolation = (v: AstGrepMatch) => {
    if (!v.replacementText || !onApplyFiles || !workspaceFiles[v.filePath]) return;

    const currentContent = workspaceFiles[v.filePath];
    const newContent = currentContent.replace(v.matchedText, v.replacementText);

    onApplyFiles({ [v.filePath]: newContent });
    setLintAppliedMessage(`Applied auto-fix to ${v.filePath.split('/').pop()}:${v.line}`);
    setTimeout(() => setLintAppliedMessage(null), 3000);

    // Re-run lint scan
    setTimeout(() => {
      const updatedFiles = { ...workspaceFiles, [v.filePath]: newContent };
      setLintResult(astGrepEngine.lintWorkspace(updatedFiles));
    }, 100);
  };

  // Fix All Auto-Fixable Violations
  const handleFixAllViolations = () => {
    if (!lintResult || !onApplyFiles) return;

    const fixable = lintResult.violations.filter(v => !!v.replacementText);
    if (fixable.length === 0) return;

    const updated = { ...workspaceFiles };
    let fixCount = 0;

    for (const v of fixable) {
      if (updated[v.filePath] && v.replacementText) {
        updated[v.filePath] = updated[v.filePath].replace(v.matchedText, v.replacementText);
        fixCount++;
      }
    }

    onApplyFiles(updated);
    setLintAppliedMessage(`Successfully applied ${fixCount} AST structural auto-fixes!`);
    setTimeout(() => setLintAppliedMessage(null), 4000);

    setTimeout(() => {
      setLintResult(astGrepEngine.lintWorkspace(updated));
    }, 150);
  };

  const filteredViolations = useMemo(() => {
    if (!lintResult) return [];
    if (lintFilterSeverity === 'all') return lintResult.violations;
    return lintResult.violations.filter(v => v.severity === lintFilterSeverity);
  }, [lintResult, lintFilterSeverity]);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1320] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
            <Code2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 tracking-wide">
                ast-grep: AST Structural Search & Rewriter
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                Rust Core
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                Tree-sitter
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Syntax-aware code patterns with meta-variables ($VAR, $$$ARGS) and 0% regex hallucinations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-5 py-2 bg-[#0c101a] border-b border-slate-800/80 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'search'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Search size={14} />
          <span>AST Pattern Search</span>
          {searchResult && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-[10px] text-emerald-300">
              {searchResult.totalMatches}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rewrite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'rewrite'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Replace size={14} />
          <span>Structural Rewriter</span>
          {rewritePreview && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-950/80 text-[10px] text-amber-300">
              {rewritePreview.totalRewrites}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('lint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'lint'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert size={14} />
          <span>Rule-Based Linter</span>
          {lintResult && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-950/80 text-[10px] text-rose-300">
              {lintResult.totalViolations}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'docs'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BookOpen size={14} />
          <span>Meta-Variables Guide</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">
        {/* TAB 1: AST PATTERN SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input Controls */}
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FolderTree size={14} className="text-emerald-400" />
                  AST Structural Search Query
                </span>
                <span className="text-[11px] text-slate-400">
                  {filesCount} workspace files available
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchPattern}
                    onChange={e => setSearchPattern(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleExecuteSearch()}
                    placeholder="e.g. console.log($$$ARGS) or const [$A, $B] = useState($C)"
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <select
                  value={searchLanguage}
                  onChange={e => setSearchLanguage(e.target.value)}
                  className="bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Languages</option>
                  <option value="typescript">TypeScript (.ts, .tsx)</option>
                  <option value="javascript">JavaScript (.js, .jsx)</option>
                  <option value="python">Python (.py)</option>
                  <option value="rust">Rust (.rs)</option>
                  <option value="go">Go (.go)</option>
                </select>

                <button
                  onClick={() => handleExecuteSearch()}
                  disabled={isSearching}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Scan AST</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                {SEARCH_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchPattern(p.pattern);
                      setSearchLanguage(p.lang);
                      handleExecuteSearch(p.pattern);
                    }}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800/60 hover:bg-emerald-950/80 hover:text-emerald-300 hover:border-emerald-700/50 border border-slate-700/50 text-slate-300 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results Summary */}
            {searchResult && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1422] rounded-lg border border-slate-800 text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-slate-300">
                    Matches: <strong className="text-emerald-400">{searchResult.totalMatches}</strong>
                  </span>
                  <span className="text-slate-300">
                    Files with hits: <strong className="text-blue-400">{searchResult.matchedFilesCount}</strong>
                  </span>
                  <span className="text-slate-300">
                    Files scanned: <strong className="text-slate-400">{searchResult.filesScanned}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <Clock size={12} />
                  <span>{searchResult.elapsedMs} ms</span>
                </div>
              </div>
            )}

            {/* Results Tree View */}
            {searchResult && searchResult.totalMatches === 0 && (
              <div className="p-8 text-center rounded-xl bg-[#0d121f] border border-slate-800/80 text-slate-400 text-xs">
                <Search size={28} className="mx-auto mb-2 text-slate-600" />
                No AST matches found for pattern <code className="text-emerald-400 font-mono font-semibold">{searchResult.queryPattern}</code>.
              </div>
            )}

            {searchResult && searchResult.totalMatches > 0 && (
              <div className="space-y-3">
                {Object.entries(searchResult.matchesByFile).map(([filePath, matches]) => {
                  const isCollapsed = !!collapsedFiles[filePath];
                  return (
                    <div
                      key={filePath}
                      className="rounded-xl border border-slate-800 bg-[#0c101c] overflow-hidden"
                    >
                      {/* File Header */}
                      <div
                        onClick={() => toggleFileCollapse(filePath)}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#0f1525] border-b border-slate-800/80 cursor-pointer hover:bg-slate-800/40 select-none"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          <FileCode size={14} className="text-emerald-400" />
                          <span className="font-mono text-slate-200">{filePath}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                          </span>
                          {onOpenFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenFile(filePath, matches[0]?.line);
                              }}
                              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-950/50"
                            >
                              <ExternalLink size={12} />
                              Open
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Matches List */}
                      {!isCollapsed && (
                        <div className="p-3 space-y-2.5">
                          {matches.map((m, idx) => (
                            <div
                              key={idx}
                              onClick={() => onOpenFile && onOpenFile(m.filePath, m.line)}
                              className="p-2.5 rounded-lg bg-[#080b13] border border-slate-800/90 hover:border-emerald-600/50 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                                <span className="text-emerald-400 group-hover:underline">
                                  Line {m.line}:{m.column}
                                </span>
                                {Object.keys(m.metaVariables).length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    {Object.entries(m.metaVariables).map(([k, v]) => (
                                      <span
                                        key={k}
                                        className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-cyan-300"
                                      >
                                        ${k} = {v.length > 20 ? v.substring(0, 20) + '...' : v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <pre className="text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre p-2 bg-[#05070c] rounded border border-slate-900">
                                <code>{m.matchedText}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STRUCTURAL REWRITER */}
        {activeTab === 'rewrite' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Replace size={14} className="text-amber-400" />
                AST Pattern-to-Rewrite Transformation
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Match Pattern (Input)</label>
                  <input
                    type="text"
                    value={rewritePattern}
                    onChange={e => setRewritePattern(e.target.value)}
                    placeholder="e.g. var $NAME = $VALUE"
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Rewrite Template (Output)</label>
                  <input
                    type="text"
                    value={rewriteTemplate}
                    onChange={e => setRewriteTemplate(e.target.value)}
                    placeholder="e.g. const $NAME = $VALUE"
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                {REWRITE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRewritePattern(p.pattern);
                      setRewriteTemplate(p.rewrite);
                      setRewriteLanguage(p.lang);
                    }}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800/60 hover:bg-amber-950/80 hover:text-amber-300 hover:border-amber-700/50 border border-slate-700/50 text-slate-300 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <select
                  value={rewriteLanguage}
                  onChange={e => setRewriteLanguage(e.target.value)}
                  className="bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                >
                  <option value="all">All Languages</option>
                  <option value="typescript">TypeScript (.ts, .tsx)</option>
                  <option value="javascript">JavaScript (.js, .jsx)</option>
                  <option value="python">Python (.py)</option>
                </select>

                <button
                  onClick={handleExecuteRewritePreview}
                  disabled={isRewriting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isRewriting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Generate AST Diff Preview</span>
                </button>
              </div>
            </div>

            {/* Rewrite Preview Output */}
            {rewritePreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-4 py-3 bg-[#0e1422] rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-300">
                      Total Rewrites: <strong className="text-amber-400">{rewritePreview.totalRewrites}</strong>
                    </span>
                    <span className="text-slate-300">
                      Affected Files: <strong className="text-blue-400">{rewritePreview.affectedFilesCount}</strong>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {rewritePreview.elapsedMs} ms
                    </span>
                  </div>

                  {rewritePreview.totalRewrites > 0 && (
                    <button
                      onClick={handleApplyRewrite}
                      disabled={rewriteApplied}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                        rewriteApplied
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {rewriteApplied ? <Check size={14} /> : <Sparkles size={14} />}
                      <span>{rewriteApplied ? 'Applied to Workspace!' : 'Apply Refactoring to Workspace'}</span>
                    </button>
                  )}
                </div>

                {rewritePreview.totalRewrites === 0 && (
                  <div className="p-8 text-center rounded-xl bg-[#0d121f] border border-slate-800/80 text-slate-400 text-xs">
                    No instances of pattern <code className="text-amber-400 font-mono">{rewritePreview.pattern}</code> found to rewrite.
                  </div>
                )}

                {/* Diff Viewer per File */}
                {Object.entries(rewritePreview.diffsByFile).map(([filePath, diff]) => (
                  <div
                    key={filePath}
                    className="rounded-xl border border-slate-800 bg-[#0c101c] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0f1525] border-b border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <FileCode size={14} className="text-amber-400" />
                        <span className="font-mono text-slate-200">{filePath}</span>
                      </div>
                      <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                        Modified
                      </span>
                    </div>

                    <div className="p-3 text-xs font-mono">
                      <div className="text-[11px] text-slate-400 mb-1">Diff Preview:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40">
                          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">
                            Before (Original AST)
                          </span>
                          <pre className="text-[11px] text-rose-200/90 whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {diff.original.substring(0, 600)}...
                          </pre>
                        </div>
                        <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                            After (Rewritten AST)
                          </span>
                          <pre className="text-[11px] text-emerald-200/90 whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {diff.rewritten.substring(0, 600)}...
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RULE-BASED LINTER */}
        {activeTab === 'lint' && (
          <div className="space-y-4">
            {/* Linter Action Bar */}
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    AST Structural Lint Engine
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {BUILTIN_AST_RULES.length} Built-in Rules
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detects antipatterns, security vulnerabilities, and deprecated APIs via syntax tree matching
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecuteLint}
                  disabled={isLinting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isLinting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Run AST Lint Scan</span>
                </button>
              </div>
            </div>

            {lintAppliedMessage && (
              <div className="px-4 py-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{lintAppliedMessage}</span>
              </div>
            )}

            {/* Lint Results View */}
            {lintResult && (
              <div className="space-y-3">
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-3">
                  <div
                    onClick={() => setLintFilterSeverity('all')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      lintFilterSeverity === 'all'
                        ? 'bg-slate-800/80 border-slate-600'
                        : 'bg-[#0c101c] border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-[11px] text-slate-400 block">Total Violations</span>
                    <span className="text-lg font-bold text-slate-100">{lintResult.totalViolations}</span>
                  </div>

                  <div
                    onClick={() => setLintFilterSeverity('error')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      lintFilterSeverity === 'error'
                        ? 'bg-rose-950/60 border-rose-600'
                        : 'bg-[#0c101c] border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-[11px] text-rose-400 block">Errors</span>
                    <span className="text-lg font-bold text-rose-400">{lintResult.violationsBySeverity.error}</span>
                  </div>

                  <div
                    onClick={() => setLintFilterSeverity('warning')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      lintFilterSeverity === 'warning'
                        ? 'bg-amber-950/60 border-amber-600'
                        : 'bg-[#0c101c] border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-[11px] text-amber-400 block">Warnings</span>
                    <span className="text-lg font-bold text-amber-400">{lintResult.violationsBySeverity.warning}</span>
                  </div>

                  <div
                    onClick={() => setLintFilterSeverity('info')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      lintFilterSeverity === 'info'
                        ? 'bg-blue-950/60 border-blue-600'
                        : 'bg-[#0c101c] border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-[11px] text-blue-400 block">Info</span>
                    <span className="text-lg font-bold text-blue-400">{lintResult.violationsBySeverity.info}</span>
                  </div>
                </div>

                {/* Batch Fix Button */}
                {lintResult.violations.some(v => !!v.replacementText) && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs">
                    <span className="text-emerald-300">
                      Auto-fixable violations detected across the workspace.
                    </span>
                    <button
                      onClick={handleFixAllViolations}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-sm"
                    >
                      <Sparkles size={13} />
                      <span>Fix All Auto-Fixable</span>
                    </button>
                  </div>
                )}

                {/* Violations List */}
                {filteredViolations.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#0d121f] border border-slate-800/80 text-emerald-400 text-xs">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
                    Clean bill of health! No AST structural violations found in active filter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredViolations.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#0c101c] border border-slate-800 hover:border-slate-700 transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                v.severity === 'error'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                  : v.severity === 'warning'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              }`}
                            >
                              {v.severity}
                            </span>
                            <span className="font-mono text-slate-200 font-semibold">{v.ruleId}</span>
                            <span className="text-slate-400">({v.filePath}:{v.line}:{v.column})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onOpenFile && (
                              <button
                                onClick={() => onOpenFile(v.filePath, v.line)}
                                className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-950/50"
                              >
                                View File
                              </button>
                            )}
                            {v.replacementText && (
                              <button
                                onClick={() => handleFixViolation(v)}
                                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 flex items-center gap-1"
                              >
                                <Sparkles size={11} />
                                Auto-Fix
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-300 mb-2">{v.message}</p>

                        <div className="p-2 rounded bg-[#070a12] border border-slate-900 font-mono text-[11px] overflow-x-auto text-slate-300">
                          <code>{v.matchedText}</code>
                        </div>

                        {v.replacementText && (
                          <div className="mt-1.5 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                            <ArrowRight size={12} />
                            <span>Fix: <code>{v.replacementText}</code></span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: META-VARIABLES GUIDE */}
        {activeTab === 'docs' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" />
                ast-grep Meta-Variable Syntax Reference
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Traditional regular expressions match characters and strings, causing false positives on comments, strings, or whitespace variations. <strong>ast-grep</strong> compiles code into an Abstract Syntax Tree (AST) using Tree-sitter and matches structural node patterns with meta-variables.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#0a0d16] border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">$VAR (Single Node)</span>
                  <p className="text-slate-400 text-[11px]">
                    Matches exactly one AST node such as an identifier, variable, or literal expression.
                  </p>
                  <code className="text-[10px] text-cyan-300 font-mono block bg-black/40 p-1 rounded">
                    console.log($MESSAGE)
                  </code>
                </div>

                <div className="p-3 rounded-lg bg-[#0a0d16] border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">$$$ARGS (Multi-Node)</span>
                  <p className="text-slate-400 text-[11px]">
                    Matches zero or more comma-separated arguments or parameter nodes.
                  </p>
                  <code className="text-[10px] text-cyan-300 font-mono block bg-black/40 p-1 rounded">
                    fn($$$ARGS)
                  </code>
                </div>

                <div className="p-3 rounded-lg bg-[#0a0d16] border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">$$$BODY (Block Statements)</span>
                  <p className="text-slate-400 text-[11px]">
                    Matches sequence of statements inside curly brace function bodies.
                  </p>
                  <code className="text-[10px] text-cyan-300 font-mono block bg-black/40 p-1 rounded">
                    useEffect(() =&gt; &#123; $$$BODY &#125;, [])
                  </code>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2">
              <h4 className="font-semibold text-slate-200">ast-grep CLI Command Equivalents</h4>
              <p className="text-slate-400">
                You can run native CLI commands directly inside the terminal:
              </p>
              <pre className="p-3 rounded-lg bg-[#070a12] border border-slate-900 font-mono text-[11px] text-emerald-300 space-y-1 overflow-x-auto">
                <code># Search pattern across workspace</code>{'\n'}
                <code>sg -p 'console.log($$$ARGS)'</code>{'\n\n'}
                <code># Structural rewrite across all files</code>{'\n'}
                <code>sg -p 'var $NAME = $VALUE' -r 'const $NAME = $VALUE' --rewrite</code>{'\n\n'}
                <code># Run lint rules</code>{'\n'}
                <code>sg scan</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
