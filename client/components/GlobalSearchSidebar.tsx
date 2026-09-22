'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  CaseUpper,
  WholeWord,
  Regex,
  FileText,
  CheckSquare,
  Square,
  SlidersHorizontal,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { SearchEngine, FileSearchResult } from '@/lib/searchEngine';

interface GlobalSearchSidebarProps {
  workspaceFiles: Record<string, string>;
  onSelectFile: (filePath: string) => void;
  onJumpToLocation: (filePath: string, line: number, column?: number) => void;
  onBatchApplyFiles: (files: Record<string, string>, message?: string) => void;
}

export default function GlobalSearchSidebar({
  workspaceFiles,
  onSelectFile,
  onJumpToLocation,
  onBatchApplyFiles
}: GlobalSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Search options
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);

  // Include / Exclude glob filters
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules, .next, dist');

  // Selected match IDs for selective batch replace
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Compute search results
  const searchResults: FileSearchResult[] = useMemo(() => {
    if (!query.trim()) return [];

    const includePatterns = includePattern
      ? includePattern.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    const excludePatterns = excludePattern
      ? excludePattern.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    return SearchEngine.search(query, workspaceFiles, {
      isCaseSensitive,
      isWholeWord,
      isRegex,
      includePatterns,
      excludePatterns
    });
  }, [query, workspaceFiles, isCaseSensitive, isWholeWord, isRegex, includePattern, excludePattern]);

  // When search results change, default all matches to checked
  useEffect(() => {
    const allIds = new Set<string>();
    searchResults.forEach(r => {
      r.matches.forEach(m => allIds.add(m.id));
    });
    setSelectedMatchIds(allIds);
  }, [searchResults]);

  const totalMatchesCount = useMemo(() => {
    return searchResults.reduce((acc, r) => acc + r.matches.length, 0);
  }, [searchResults]);

  // Toggle single match checkbox
  const toggleMatchCheckbox = (matchId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  // Toggle file group checkbox
  const toggleFileCheckbox = (fileResult: FileSearchResult) => {
    const allFileMatchIds = fileResult.matches.map(m => m.id);
    const areAllChecked = allFileMatchIds.every(id => selectedMatchIds.has(id));

    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (areAllChecked) {
        allFileMatchIds.forEach(id => next.delete(id));
      } else {
        allFileMatchIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Toggle file collapse
  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };

  // Select all or Deselect all
  const handleToggleSelectAll = () => {
    if (selectedMatchIds.size === totalMatchesCount) {
      setSelectedMatchIds(new Set());
    } else {
      const allIds = new Set<string>();
      searchResults.forEach(r => r.matches.forEach(m => allIds.add(m.id)));
      setSelectedMatchIds(allIds);
    }
  };

  // Replace All
  const handleReplaceAll = () => {
    if (!query) return;
    const includePatterns = includePattern
      ? includePattern.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    const excludePatterns = excludePattern
      ? excludePattern.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const updates = SearchEngine.replace(query, replaceText, workspaceFiles, {
      isCaseSensitive,
      isWholeWord,
      isRegex,
      includePatterns,
      excludePatterns
    });

    const fileCount = Object.keys(updates).length;
    if (fileCount > 0) {
      onBatchApplyFiles(updates, `Replaced '${query}' -> '${replaceText}' in ${fileCount} files`);
    }
  };

  // Replace Selected
  const handleReplaceSelected = () => {
    if (!query || selectedMatchIds.size === 0) return;

    const updates = SearchEngine.replaceSelective(
      query,
      replaceText,
      workspaceFiles,
      selectedMatchIds,
      {
        isCaseSensitive,
        isWholeWord,
        isRegex
      }
    );

    const fileCount = Object.keys(updates).length;
    if (fileCount > 0) {
      onBatchApplyFiles(
        updates,
        `Replaced ${selectedMatchIds.size} checked matches across ${fileCount} files`
      );
    }
  };

  // Keyboard shortcut Ctrl+Alt+Enter for replace all
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.altKey) {
      e.preventDefault();
      handleReplaceAll();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs text-zinc-300 font-sans select-none" onKeyDown={handleKeyDown}>
      {/* Search Input Box */}
      <div className="p-2 space-y-2 shrink-0 border-b border-zinc-800/80 bg-[#121214]">
        <div className="relative flex items-center">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search files (Ctrl+Shift+F)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-7 bg-[#18181b] border border-zinc-700/80 focus:border-indigo-500 rounded pl-2.5 pr-20 text-xs text-zinc-100 placeholder-zinc-500 outline-none font-mono transition-all"
          />

          {/* Search Toggle Pills */}
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              onClick={() => setIsCaseSensitive(prev => !prev)}
              title="Match Case (Aa)"
              className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                isCaseSensitive
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <CaseUpper size={11} />
            </button>
            <button
              onClick={() => setIsWholeWord(prev => !prev)}
              title="Match Whole Word (\b)"
              className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                isWholeWord
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <WholeWord size={11} />
            </button>
            <button
              onClick={() => setIsRegex(prev => !prev)}
              title="Use Regular Expression (.*)"
              className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                isRegex
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Regex size={11} />
            </button>
          </div>
        </div>

        {/* Replace Bar Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsReplaceOpen(prev => !prev)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer font-medium"
          >
            <ChevronRight
              size={12}
              className={`transition-transform duration-150 ${isReplaceOpen ? 'rotate-90 text-indigo-400' : ''}`}
            />
            <span>Replace</span>
          </button>

          <button
            onClick={() => setIsFiltersOpen(prev => !prev)}
            className={`flex items-center gap-1 text-[10px] transition-colors cursor-pointer ${
              isFiltersOpen ? 'text-indigo-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Include/Exclude filters"
          >
            <SlidersHorizontal size={11} />
            <span>Filters</span>
          </button>
        </div>

        {/* Replace Input Box */}
        {isReplaceOpen && (
          <div className="space-y-1.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Replace with ($1, $2 for capture groups)..."
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                className="w-full h-7 bg-[#18181b] border border-zinc-700/80 focus:border-emerald-500 rounded px-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={handleReplaceSelected}
                disabled={!query || selectedMatchIds.size === 0}
                className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Replace only the checked matches"
              >
                <span>Replace Checked ({selectedMatchIds.size})</span>
              </button>

              <button
                onClick={handleReplaceAll}
                disabled={!query || totalMatchesCount === 0}
                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-[10px] font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                title="Replace All across workspace (Ctrl+Alt+Enter)"
              >
                Replace All
              </button>
            </div>
          </div>
        )}

        {/* Include / Exclude Glob Filter Inputs */}
        {isFiltersOpen && (
          <div className="p-2 rounded bg-[#18181b] border border-zinc-800 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 font-mono text-[10px]">
            <div>
              <label className="text-zinc-500 block mb-0.5 uppercase tracking-wider text-[9px] font-bold">
                files to include:
              </label>
              <input
                type="text"
                value={includePattern}
                onChange={e => setIncludePattern(e.target.value)}
                placeholder="e.g. src/**/*.tsx, components/*.tsx"
                className="w-full h-6 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded px-2 text-zinc-200 outline-none text-[10px]"
              />
            </div>
            <div>
              <label className="text-zinc-500 block mb-0.5 uppercase tracking-wider text-[9px] font-bold">
                files to exclude:
              </label>
              <input
                type="text"
                value={excludePattern}
                onChange={e => setExcludePattern(e.target.value)}
                placeholder="e.g. node_modules, .next, dist"
                className="w-full h-6 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded px-2 text-zinc-200 outline-none text-[10px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Header Summary Bar */}
      {query.trim() && (
        <div className="px-3 py-1.5 bg-[#141416] border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="text-zinc-500 hover:text-white cursor-pointer"
              title={selectedMatchIds.size === totalMatchesCount ? 'Deselect All' : 'Select All'}
            >
              {selectedMatchIds.size === totalMatchesCount && totalMatchesCount > 0 ? (
                <CheckSquare size={13} className="text-indigo-400" />
              ) : (
                <Square size={13} />
              )}
            </button>
            <span className="font-semibold text-zinc-300">
              {totalMatchesCount} result{totalMatchesCount !== 1 ? 's' : ''} in {searchResults.length} file{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>

          <span className="text-[10px] text-zinc-500 font-mono">
            {selectedMatchIds.size} selected
          </span>
        </div>
      )}

      {/* Results Tree View */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
        {searchResults.length === 0 ? (
          query.trim() ? (
            <div className="p-6 text-center text-zinc-500 text-xs font-mono">
              No matching occurrences found.
            </div>
          ) : (
            <div className="p-6 text-center text-zinc-500 text-xs font-mono">
              Type in the box above to search across all workspace files.
            </div>
          )
        ) : (
          searchResults.map(fileResult => {
            const isCollapsed = collapsedFiles[fileResult.filePath] === true;
            const allFileMatchIds = fileResult.matches.map(m => m.id);
            const areAllChecked = allFileMatchIds.every(id => selectedMatchIds.has(id));
            const someChecked = allFileMatchIds.some(id => selectedMatchIds.has(id));

            return (
              <div key={fileResult.filePath} className="rounded border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                {/* File Header */}
                <div className="flex items-center justify-between px-2 py-1 bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    {/* File Checkbox */}
                    <button
                      onClick={() => toggleFileCheckbox(fileResult)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                      title="Select/Deselect all matches in this file"
                    >
                      {areAllChecked ? (
                        <CheckSquare size={12} className="text-emerald-400" />
                      ) : someChecked ? (
                        <div className="w-3 h-3 rounded-xs border border-indigo-400 bg-indigo-600/50 flex items-center justify-center">
                          <div className="w-1.5 h-0.5 bg-white" />
                        </div>
                      ) : (
                        <Square size={12} className="text-zinc-500" />
                      )}
                    </button>

                    {/* Collapse Button */}
                    <button
                      onClick={() => toggleFileCollapse(fileResult.filePath)}
                      className="flex items-center gap-1 text-zinc-300 font-mono text-[11px] font-semibold truncate cursor-pointer hover:text-white"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={11} className="text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronDown size={11} className="text-zinc-500 shrink-0" />
                      )}
                      <FileText size={11} className="text-indigo-400 shrink-0" />
                      <span className="truncate">{fileResult.filePath}</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0 ml-1">
                    {fileResult.matches.length}
                  </span>
                </div>

                {/* Match Line Items */}
                {!isCollapsed && (
                  <div className="divide-y divide-zinc-800/40">
                    {fileResult.matches.map(m => {
                      const isChecked = selectedMatchIds.has(m.id);

                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-indigo-950/30 transition-colors group cursor-pointer"
                          onClick={() => onJumpToLocation(fileResult.filePath, m.line, m.startColumn)}
                        >
                          {/* Line Checkbox */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleMatchCheckbox(m.id);
                            }}
                            className="text-zinc-500 hover:text-white cursor-pointer shrink-0"
                            title="Include match in replacement"
                          >
                            {isChecked ? (
                              <CheckSquare size={11} className="text-emerald-400" />
                            ) : (
                              <Square size={11} className="text-zinc-600" />
                            )}
                          </button>

                          {/* Line Number */}
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {m.line}:
                          </span>

                          {/* Preview with Highlight */}
                          <span className="truncate font-mono text-[10.5px] text-zinc-300 group-hover:text-white">
                            {m.preview}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
