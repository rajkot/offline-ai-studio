'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Columns,
  Square,
  Zap,
  Play,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronDown,
  RefreshCw,
  Sparkles,
  GitBranch,
  Cpu,
  Split,
  ChevronRight
} from 'lucide-react';
import {
  terminalMultiSessionEngine,
  TerminalGridState,
  TerminalSessionItem,
  ShellTypeId,
  AVAILABLE_SHELLS
} from '@/lib/terminal/terminalMultiSessionEngine';
import RealPtyTerminal from './RealPtyTerminal';
import WasiRuntimeStudio from './WasiRuntimeStudio';
import SandboxConsole from '@/components/SandboxConsole';

interface MultiTerminalGridProps {
  className?: string;
  workspaceFiles?: Record<string, string>;
  onOpenFile?: (path: string, line?: number, column?: number) => void;
  onBatchApplyFiles?: (files: Record<string, string>) => void;
  sandboxConsoleNode?: React.ReactNode;
}

export default function MultiTerminalGrid({
  className = '',
  workspaceFiles,
  onOpenFile,
  onBatchApplyFiles,
  sandboxConsoleNode
}: MultiTerminalGridProps) {
  const [gridState, setGridState] = useState<TerminalGridState>(() => terminalMultiSessionEngine.getState());
  const [isShellDropdownOpen, setIsShellDropdownOpen] = useState(false);
  const [activePaneFocus, setActivePaneFocus] = useState<'primary' | 'secondary'>('primary');
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to Terminal Multi-Session Engine
  useEffect(() => {
    return terminalMultiSessionEngine.subscribe(setGridState);
  }, []);

  // Close shell dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsShellDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut Ctrl+Shift+5 for Split Terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '5' || e.code === 'Digit5')) {
        e.preventDefault();
        e.stopPropagation();
        terminalMultiSessionEngine.splitTerminal('split-vertical');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Split Drag Resizing Handler
  const handleStartSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEv: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = moveEv.clientX - rect.left;
      const newRatio = relativeX / rect.width;
      terminalMultiSessionEngine.setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCreateNewShell = (shellType: ShellTypeId = 'powershell') => {
    terminalMultiSessionEngine.createSession(shellType);
    setIsShellDropdownOpen(false);
  };

  const primarySession = gridState.sessions.find(s => s.id === gridState.primarySessionId) || gridState.sessions[0];
  const secondarySession = gridState.sessions.find(s => s.id === gridState.secondarySessionId) || null;

  // Render content of a single session pane
  const renderSessionPane = (session: TerminalSessionItem, isSecondary: boolean = false) => {
    if (!session) return null;

    if (session.shellType === 'wasi') {
      return (
        <div className="w-full h-full flex flex-col bg-[#030712] overflow-hidden">
          <WasiRuntimeStudio
            workspaceFiles={workspaceFiles}
            onOpenFile={onOpenFile}
          />
        </div>
      );
    }

    if (session.shellType === 'sandbox') {
      return (
        <div className="w-full h-full flex flex-col bg-[#030712] overflow-hidden p-2">
          {sandboxConsoleNode || (
            <SandboxConsole
              onRunTask={() => console.log('Running test task...')}
              onAutoFixTriggered={(err) => console.log('Auto fix triggered:', err)}
            />
          )}
        </div>
      );
    }

    // Default: Real PTY Terminal (PowerShell, CMD, Git Bash, WSL2)
    return (
      <RealPtyTerminal
        key={session.id}
        className="w-full h-full"
        shellType={session.shellCommand}
        sessionId={session.id}
        workspaceFiles={workspaceFiles}
        onBatchApplyFiles={onBatchApplyFiles}
        onOpenFile={onOpenFile}
        hideHeaderBar={true}
      />
    );
  };

  const getShellIcon = (type: ShellTypeId) => {
    switch (type) {
      case 'bash': return <GitBranch size={11} className="text-emerald-400" />;
      case 'wsl': return <Cpu size={11} className="text-cyan-400" />;
      case 'wasi': return <Zap size={11} className="text-amber-400" />;
      case 'sandbox': return <Play size={11} className="text-purple-400" />;
      case 'cmd': return <Square size={11} className="text-slate-400" />;
      case 'powershell':
      default:
        return <TerminalIcon size={11} className="text-indigo-400" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#030712] text-slate-200 select-none overflow-hidden ${className}`}>
      {/* 1. Terminal Top Tab Bar */}
      <div className="h-8 bg-[#0b0f19] border-b border-slate-800 flex items-center justify-between px-2 text-xs shrink-0 z-10">
        {/* Left: Terminal Session Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full py-0.5">
          {gridState.sessions.map((session) => {
            const isPrimary = session.id === gridState.primarySessionId;
            const isSecondary = session.id === gridState.secondarySessionId;
            const isFocused = (activePaneFocus === 'primary' && isPrimary) || (activePaneFocus === 'secondary' && isSecondary);

            return (
              <div
                key={session.id}
                onClick={() => {
                  if (gridState.layout !== 'single' && activePaneFocus === 'secondary') {
                    terminalMultiSessionEngine.selectSecondarySession(session.id);
                  } else {
                    terminalMultiSessionEngine.selectPrimarySession(session.id);
                    setActivePaneFocus('primary');
                  }
                }}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer transition-all border ${
                  isPrimary || isSecondary
                    ? isFocused
                      ? 'bg-slate-800 text-white border-indigo-500/80 shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
                }`}
                title={`Switch to ${session.title}`}
              >
                {getShellIcon(session.shellType)}
                <span className="truncate max-w-[120px]">{session.title}</span>

                {/* Split Pane Indicator Badge */}
                {gridState.layout !== 'single' && (
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans font-bold ${
                    isPrimary ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60' : isSecondary ? 'bg-purple-950 text-purple-300 border border-purple-700/60' : 'hidden'
                  }`}>
                    {isPrimary ? 'L' : 'R'}
                  </span>
                )}

                {/* Close Session Button */}
                {gridState.sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      terminalMultiSessionEngine.closeSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-slate-700 p-0.5 rounded text-slate-400 hover:text-white transition-opacity"
                    title="Kill Terminal Session"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Plus New Terminal Button & Shell Dropdown Trigger */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <div className="flex items-center rounded bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white">
              <button
                onClick={() => handleCreateNewShell('powershell')}
                title="New Terminal Session"
                className="px-1.5 py-1 hover:bg-slate-800 rounded-l text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} className="text-indigo-400" />
              </button>
              <button
                onClick={() => setIsShellDropdownOpen(prev => !prev)}
                title="Select Shell Type"
                className="px-1 py-1 hover:bg-slate-800 rounded-r border-l border-slate-800 text-[10px] cursor-pointer"
              >
                <ChevronDown size={10} />
              </button>
            </div>

            {/* Shell Selector Dropdown Menu */}
            {isShellDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#111827] border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Terminal Shell
                </div>
                {AVAILABLE_SHELLS.map((shell) => (
                  <button
                    key={shell.id}
                    onClick={() => handleCreateNewShell(shell.id)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2.5 text-slate-200 cursor-pointer group"
                  >
                    <div className="p-1 rounded bg-slate-800/80 text-slate-300 group-hover:bg-indigo-700 group-hover:text-white">
                      {getShellIcon(shell.id)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[11.5px] truncate">{shell.name}</span>
                      <span className="text-[9.5px] text-slate-400 group-hover:text-indigo-200 truncate">{shell.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active Shell Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{primarySession?.shellType.toUpperCase()}</span>
          </div>

          {/* Split Terminal Button (Ctrl+Shift+5) */}
          <button
            onClick={() => terminalMultiSessionEngine.splitTerminal('split-vertical')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
              gridState.layout !== 'single'
                ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
            }`}
            title="Split Terminal Side-by-Side (Ctrl+Shift+5)"
          >
            <Columns size={12} className={gridState.layout !== 'single' ? 'text-indigo-400' : 'text-slate-400'} />
            <span className="hidden md:inline">Split</span>
            <kbd className="text-[9px] bg-black/40 px-1 rounded font-sans hidden lg:inline">Ctrl+Shift+5</kbd>
          </button>

          {/* Unsplit button if currently split */}
          {gridState.layout !== 'single' && (
            <button
              onClick={() => terminalMultiSessionEngine.closeSplit()}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close Split View"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Terminal Workspace Body (Single or Split Grid) */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-0 flex relative overflow-hidden">
        {gridState.layout === 'single' ? (
          /* Single Pane Mode */
          <div className="w-full h-full min-h-0 flex flex-col">
            {renderSessionPane(primarySession, false)}
          </div>
        ) : (
          /* Split Grid Mode (Side-by-Side Panes with Draggable Divider) */
          <>
            {/* Primary Split Pane (Left) */}
            <div
              style={{ width: `${gridState.splitRatio * 100}%` }}
              onClick={() => setActivePaneFocus('primary')}
              className={`h-full min-h-0 flex flex-col relative transition-all ${
                activePaneFocus === 'primary' ? 'ring-1 ring-indigo-500/40' : ''
              }`}
            >
              {renderSessionPane(primarySession, false)}
            </div>

            {/* Draggable Vertical Splitter Bar */}
            <div
              onMouseDown={handleStartSplitDrag}
              className={`w-1.5 h-full cursor-col-resize hover:bg-indigo-500 transition-colors shrink-0 z-20 flex items-center justify-center ${
                isDraggingSplit ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-800'
              }`}
            >
              <div className="w-0.5 h-6 bg-slate-600 rounded-full" />
            </div>

            {/* Secondary Split Pane (Right) */}
            <div
              style={{ width: `${(1 - gridState.splitRatio) * 100}%` }}
              onClick={() => setActivePaneFocus('secondary')}
              className={`h-full min-h-0 flex flex-col relative transition-all ${
                activePaneFocus === 'secondary' ? 'ring-1 ring-purple-500/40' : ''
              }`}
            >
              {secondarySession ? (
                renderSessionPane(secondarySession, true)
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>No session active in split pane</span>
                  <button
                    onClick={() => handleCreateNewShell('powershell')}
                    className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px]"
                  >
                    Open Shell
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
