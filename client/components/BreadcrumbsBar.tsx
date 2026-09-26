'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronRight,
  Folder,
  FileCode,
  Code2,
  Layers,
  Compass,
  Zap,
  Box,
  ChevronDown,
  Hash
} from 'lucide-react';
import { lspWorkspace, LSPSymbol } from '@/lib/lspEngine';

interface BreadcrumbsBarProps {
  currentFilePath: string;
  cursorLine: number;
  workspaceFiles: Record<string, string>;
  onSelectFile: (filePath: string) => void;
  onJumpToLine: (line: number, column?: number) => void;
  rightSlot?: React.ReactNode;
}

export default function BreadcrumbsBar({
  currentFilePath,
  cursorLine,
  workspaceFiles,
  onSelectFile,
  onJumpToLine,
  rightSlot
}: BreadcrumbsBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Split path into segments (e.g. ["components", "Playground.tsx"])
  const pathSegments = useMemo(() => {
    if (!currentFilePath || currentFilePath.startsWith('__')) return [];
    const clean = currentFilePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    return clean.split('/');
  }, [currentFilePath]);

  // Compute enclosing symbols for current cursor line
  const enclosingSymbols = useMemo(() => {
    if (!currentFilePath || currentFilePath.startsWith('__')) return [];
    return lspWorkspace.getEnclosingSymbols(currentFilePath, cursorLine);
  }, [currentFilePath, cursorLine]);

  // All symbols in current file for symbol dropdowns
  const fileSymbols = useMemo(() => {
    if (!currentFilePath || currentFilePath.startsWith('__')) return [];
    return lspWorkspace.getSymbolsForFile(currentFilePath);
  }, [currentFilePath]);

  // Helper to get sibling files/folders for a path segment
  const getSiblingsForPath = (depth: number) => {
    const parentDir = pathSegments.slice(0, depth).join('/');
    const allPaths = Object.keys(workspaceFiles);

    const items = new Set<string>();
    allPaths.forEach(p => {
      const clean = p.replace(/^[/\\]+/, '').replace(/\\/g, '/');
      if (parentDir) {
        if (clean.startsWith(parentDir + '/')) {
          const rest = clean.slice(parentDir.length + 1);
          const nextSegment = rest.split('/')[0];
          items.add(nextSegment);
        }
      } else {
        const nextSegment = clean.split('/')[0];
        items.add(nextSegment);
      }
    });

    return Array.from(items).sort();
  };

  const getSymbolIcon = (kind: string) => {
    switch (kind) {
      case 'function':
        return <Code2 size={12} className="text-purple-400 shrink-0" />;
      case 'class':
        return <Layers size={12} className="text-emerald-400 shrink-0" />;
      case 'interface':
        return <Compass size={12} className="text-cyan-400 shrink-0" />;
      case 'method':
        return <Zap size={12} className="text-amber-400 shrink-0" />;
      case 'type':
        return <Hash size={12} className="text-pink-400 shrink-0" />;
      default:
        return <Box size={12} className="text-blue-400 shrink-0" />;
    }
  };

  if (!currentFilePath || currentFilePath.startsWith('__')) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="monaco-breadcrumbs-bar"
      className="h-6.5 min-h-[26px] max-h-[26px] bg-[#111113] border-b border-[#27272a]/70 px-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none z-20 shrink-0"
    >
      <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
        {/* Path Segments */}
        {pathSegments.map((segment, idx) => {
          const isLastSegment = idx === pathSegments.length - 1;
          const dropdownId = `path_${idx}`;
          const isDropdownOpen = activeDropdown === dropdownId;
          const siblings = isDropdownOpen ? getSiblingsForPath(idx) : [];

          return (
            <React.Fragment key={`path_${idx}`}>
              <div className="relative flex items-center">
                <button
                  onClick={() => setActiveDropdown(isDropdownOpen ? null : dropdownId)}
                  className={`flex items-center gap-1 px-1 py-0.5 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer ${
                    isLastSegment ? 'font-semibold text-zinc-200' : 'text-zinc-400'
                  }`}
                  title={`Path segment: ${segment}. Click to view sibling items.`}
                >
                  {isLastSegment ? (
                    <FileCode size={12} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Folder size={12} className="text-amber-400/80 shrink-0" />
                  )}
                  <span>{segment}</span>
                  <ChevronDown size={10} className="text-zinc-500 opacity-60 hover:opacity-100" />
                </button>

                {/* Sibling Path Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 min-w-[180px] max-h-60 overflow-y-auto bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
                      Siblings ({siblings.length})
                    </div>
                    {siblings.map(sib => {
                      const isFile = sib.includes('.');
                      const fullTarget = idx === 0 ? sib : `${pathSegments.slice(0, idx).join('/')}/${sib}`;
                      const isCurrent = sib === segment;

                      return (
                        <button
                          key={sib}
                          onClick={() => {
                            setActiveDropdown(null);
                            if (isFile) {
                              onSelectFile(fullTarget);
                            } else {
                              // Find first file in directory
                              const match = Object.keys(workspaceFiles).find(p => p.startsWith(fullTarget + '/'));
                              if (match) onSelectFile(match);
                            }
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer ${
                            isCurrent ? 'bg-zinc-800 text-indigo-300 font-semibold' : 'text-zinc-300'
                          }`}
                        >
                          {isFile ? (
                            <FileCode size={12} className="text-indigo-400 shrink-0" />
                          ) : (
                            <Folder size={12} className="text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{sib}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <ChevronRight size={11} className="text-zinc-600 shrink-0" />
            </React.Fragment>
          );
        })}

        {/* Symbol Hierarchy Segments */}
        {enclosingSymbols.map((sym, symIdx) => {
          const dropdownId = `sym_${symIdx}`;
          const isDropdownOpen = activeDropdown === dropdownId;
          const isInnermost = symIdx === enclosingSymbols.length - 1;

          return (
            <React.Fragment key={`sym_${sym.name}_${symIdx}`}>
              <div className="relative flex items-center">
                <button
                  onClick={() => setActiveDropdown(isDropdownOpen ? null : dropdownId)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer ${
                    isInnermost ? 'text-amber-300 font-semibold bg-amber-950/30 border border-amber-800/40' : 'text-zinc-300'
                  }`}
                  title={`${sym.kind}: ${sym.name} (Lines ${sym.line}-${sym.endLine}). Click to view siblings.`}
                >
                  {getSymbolIcon(sym.kind)}
                  <span className="truncate max-w-[180px]">{sym.name}()</span>
                  <ChevronDown size={10} className="text-zinc-500 opacity-60 hover:opacity-100" />
                </button>

                {/* Sibling Symbols Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 min-w-[240px] max-h-72 overflow-y-auto bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800 flex items-center justify-between">
                      <span>Symbols in File</span>
                      <span className="text-indigo-400">{fileSymbols.length}</span>
                    </div>
                    {fileSymbols.map(s => {
                      const isCurrent = s.name === sym.name;
                      return (
                        <button
                          key={`${s.kind}_${s.name}_${s.line}`}
                          onClick={() => {
                            setActiveDropdown(null);
                            onJumpToLine(s.line, s.column);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer ${
                            isCurrent ? 'bg-zinc-800 text-amber-300 font-bold' : 'text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {getSymbolIcon(s.kind)}
                            <span className="truncate">{s.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            L{s.line}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isInnermost && <ChevronRight size={11} className="text-zinc-600 shrink-0" />}
            </React.Fragment>
          );
        })}

        {/* If cursor is not inside a specific function but file has symbols, show an all-symbols picker button */}
        {enclosingSymbols.length === 0 && fileSymbols.length > 0 && (
          <div className="relative flex items-center">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'all_syms' ? null : 'all_syms')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer text-[10px]"
              title="Browse symbols in file"
            >
              <span>... ({fileSymbols.length} symbols)</span>
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'all_syms' && (
              <div className="absolute top-full left-0 mt-1 min-w-[240px] max-h-72 overflow-y-auto bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
                  Document Symbols ({fileSymbols.length})
                </div>
                {fileSymbols.map(s => (
                  <button
                    key={`${s.kind}_${s.name}_${s.line}`}
                    onClick={() => {
                      setActiveDropdown(null);
                      onJumpToLine(s.line, s.column);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer text-zinc-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getSymbolIcon(s.kind)}
                      <span className="truncate">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      L{s.line}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {rightSlot && (
        <div className="flex items-center gap-2.5 shrink-0 text-[10px] pl-2 font-sans">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
