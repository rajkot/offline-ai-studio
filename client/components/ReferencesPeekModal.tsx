'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, FileCode, ChevronRight, ChevronDown, Compass, ExternalLink } from 'lucide-react';
import { ReferencesPeekData } from '@/lib/lsp/crossFileLspManager';

interface ReferencesPeekModalProps {
  data: ReferencesPeekData | null;
  onClose: () => void;
  onJumpToLocation: (filePath: string, line: number, column?: number) => void;
}

export default function ReferencesPeekModal({
  data,
  onClose,
  onJumpToLocation
}: ReferencesPeekModalProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  // Group references by file path
  const groupedReferences = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, typeof data.references> = {};

    data.references.forEach(r => {
      if (!groups[r.filePath]) {
        groups[r.filePath] = [];
      }
      groups[r.filePath].push(r);
    });

    return groups;
  }, [data]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!filterQuery.trim()) return groupedReferences;
    const q = filterQuery.toLowerCase();
    const result: typeof groupedReferences = {};

    Object.entries(groupedReferences).forEach(([filePath, refs]) => {
      const matchingRefs = refs.filter(
        r => r.filePath.toLowerCase().includes(q) || r.lineContent.toLowerCase().includes(q)
      );
      if (matchingRefs.length > 0) {
        result[filePath] = matchingRefs;
      }
    });

    return result;
  }, [groupedReferences, filterQuery]);

  if (!data) return null;

  const totalCount = Object.values(filteredGroups).reduce((acc, list) => acc + list.length, 0);
  const fileCount = Object.keys(filteredGroups).length;

  const toggleFile = (filePath: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [filePath]: prev[filePath] === false ? true : false
    }));
  };

  return (
    <div className="fixed inset-x-4 bottom-8 max-w-4xl mx-auto z-50 bg-[#121214]/98 border border-indigo-500/50 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col max-h-[480px] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150">
      {/* Header */}
      <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-700/50">
            <Compass size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span>References to</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono font-bold text-[11px]">
                {data.symbolName}
              </span>
              <span className="text-zinc-500 text-[11px]">
                ({totalCount} in {fileCount} file{fileCount !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search filter input */}
          <div className="relative flex items-center">
            <Search size={11} className="absolute left-2.5 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter references..."
              className="pl-7 pr-2 py-1 bg-zinc-950 border border-zinc-700/80 rounded text-xs text-zinc-200 outline-none w-48 focus:border-indigo-500 font-mono"
            />
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Peek (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* References List */}
      <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-850">
        {fileCount === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            No matching references found.
          </div>
        ) : (
          Object.entries(filteredGroups).map(([filePath, refs]) => {
            const isExpanded = expandedFiles[filePath] !== false;
            return (
              <div key={filePath} className="py-1">
                {/* File Group Header */}
                <button
                  onClick={() => toggleFile(filePath)}
                  className="w-full text-left px-2 py-1.5 flex items-center justify-between rounded hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs font-semibold text-zinc-200"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown size={13} className="text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight size={13} className="text-zinc-500 shrink-0" />
                    )}
                    <FileCode size={13} className="text-indigo-400 shrink-0" />
                    <span className="truncate font-mono">{filePath}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                    {refs.length}
                  </span>
                </button>

                {/* References in this file */}
                {isExpanded && (
                  <div className="pl-6 pr-2 py-1 space-y-1">
                    {refs.map((r, idx) => (
                      <button
                        key={`${r.line}_${r.column}_${idx}`}
                        onClick={() => {
                          onJumpToLocation(r.filePath, r.line, r.column);
                          onClose();
                        }}
                        className="w-full text-left p-1.5 rounded bg-zinc-900/40 hover:bg-indigo-950/60 border border-zinc-800/80 hover:border-indigo-600/60 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                          <span className="text-indigo-400 font-semibold shrink-0">
                            {r.line}:
                          </span>
                          <span className="text-zinc-300 truncate group-hover:text-white">
                            {r.lineContent}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 text-indigo-400 text-[10px] shrink-0 font-medium">
                          <span>Jump</span>
                          <ExternalLink size={10} />
                        </div>
                      </button>
                    ))}
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
