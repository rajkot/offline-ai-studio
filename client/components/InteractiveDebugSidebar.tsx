'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CornerDownRight,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Square,
  Plus,
  Trash2,
  Sliders,
  ChevronRight,
  ChevronDown,
  Bug,
  Terminal,
  Layers,
  Flame,
  MessageSquare
} from 'lucide-react';
import {
  dapDebugger,
  DapBreakpoint,
  DapStackFrame,
  DapVariable,
  DapWatchExpression
} from '@/lib/dapDebuggerEngine';
import DebugConsoleRepl from './DebugConsoleRepl';

interface InteractiveDebugSidebarProps {
  currentFile: string;
  onOpenFile: (filePath: string, line: number) => void;
  onConfigureBreakpoint: (bp: DapBreakpoint) => void;
}

export default function InteractiveDebugSidebar({
  currentFile,
  onOpenFile,
  onConfigureBreakpoint
}: InteractiveDebugSidebarProps) {
  const [isDebugging, setIsDebugging] = useState(dapDebugger.getIsDebugging());
  const [isPaused, setIsPaused] = useState(dapDebugger.getIsPaused());
  const [activeLine, setActiveLine] = useState(dapDebugger.getActiveLine());
  const [breakpoints, setBreakpoints] = useState<DapBreakpoint[]>(dapDebugger.getBreakpoints());
  const [stackFrames, setStackFrames] = useState<DapStackFrame[]>(dapDebugger.getStackFrames());
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [watchExpressions, setWatchExpressions] = useState<DapWatchExpression[]>([]);
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [showRepl, setShowRepl] = useState(false);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    variables: false,
    watch: false,
    stack: false,
    breakpoints: false
  });

  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = dapDebugger.subscribe((event, payload) => {
      setIsDebugging(dapDebugger.getIsDebugging());
      setIsPaused(dapDebugger.getIsPaused());
      setActiveLine(dapDebugger.getActiveLine());
      setBreakpoints(dapDebugger.getBreakpoints());
      setStackFrames(dapDebugger.getStackFrames());

      if (event === 'stopped' && payload.file && payload.line) {
        onOpenFile(payload.file, payload.line);
      }
    });

    return unsub;
  }, [onOpenFile]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleVar = (varName: string) => {
    setExpandedVars(prev => ({ ...prev, [varName]: !prev[varName] }));
  };

  const currentFrame = stackFrames[selectedFrameIndex] || stackFrames[0];

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchInput.trim()) {
      dapDebugger.addWatchExpression(newWatchInput.trim());
      setNewWatchInput('');
      setIsAddingWatch(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs text-zinc-300 font-sans select-none">
      {/* Top Debug Controls Bar */}
      <div className="p-2 bg-[#121214] border-b border-zinc-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-zinc-400">
            <Bug size={13} className="text-rose-400" />
            <span>DAP Runtime</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowRepl(prev => !prev)}
              className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                showRepl ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white bg-zinc-800'
              }`}
              title="Toggle Debug Console (REPL)"
            >
              <Terminal size={11} />
              <span>REPL</span>
            </button>
          </div>
        </div>

        {/* Stepping Controls Toolbar */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 justify-between">
          <button
            onClick={() => {
              if (!isDebugging) {
                dapDebugger.startDebugging(currentFile);
              } else if (isPaused) {
                dapDebugger.resumeExecution();
              } else {
                dapDebugger.pauseExecution('pause');
              }
            }}
            title={!isDebugging ? 'Start Debugging (F5)' : isPaused ? 'Continue (F5)' : 'Pause (F5)'}
            className={`flex-1 py-1 px-2 rounded font-semibold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
              !isDebugging
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {isDebugging && !isPaused ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            <span>{!isDebugging ? 'Start (F5)' : isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={() => dapDebugger.stepOver()}
            disabled={!isDebugging}
            title="Step Over (F10)"
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-indigo-300 hover:text-white cursor-pointer"
          >
            <CornerDownRight size={13} />
          </button>

          <button
            onClick={() => dapDebugger.stepInto()}
            disabled={!isDebugging}
            title="Step Into (F11)"
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-indigo-300 hover:text-white cursor-pointer"
          >
            <ArrowDown size={13} />
          </button>

          <button
            onClick={() => dapDebugger.stepOut()}
            disabled={!isDebugging}
            title="Step Out (Shift+F11)"
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-indigo-300 hover:text-white cursor-pointer"
          >
            <ArrowUp size={13} />
          </button>

          <button
            onClick={() => dapDebugger.restart()}
            disabled={!isDebugging}
            title="Restart (Ctrl+Shift+F5)"
            className="p-1 rounded bg-zinc-800 hover:bg-emerald-700 disabled:opacity-40 text-emerald-400 hover:text-white cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={() => dapDebugger.stop()}
            disabled={!isDebugging}
            title="Stop (Shift+F5)"
            className="p-1 rounded bg-zinc-800 hover:bg-rose-700 disabled:opacity-40 text-rose-400 hover:text-white cursor-pointer"
          >
            <Square size={13} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Main Panes Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
        {/* REPL Area (if toggled) */}
        {showRepl && (
          <div className="h-60 p-1 bg-zinc-950/60">
            <DebugConsoleRepl />
          </div>
        )}

        {/* 1. VARIABLES & SCOPES SECTION */}
        <div>
          <button
            onClick={() => toggleSection('variables')}
            className="w-full text-left px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900/30"
          >
            <div className="flex items-center gap-1">
              {collapsedSections.variables ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>Variables &amp; Scopes</span>
            </div>
            {currentFrame && (
              <span className="text-[9px] font-mono text-indigo-400 lowercase">
                frame: {currentFrame.name.split(' ')[0]}
              </span>
            )}
          </button>

          {!collapsedSections.variables && (
            <div className="p-2 space-y-2 font-mono text-[11px]">
              {!currentFrame ? (
                <div className="text-zinc-500 italic text-[10px] p-2">
                  Not paused. Start debugging (F5) to inspect live scopes.
                </div>
              ) : (
                currentFrame.scopes.map(scope => (
                  <div key={scope.name} className="space-y-1">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      {scope.name} Scope
                    </div>
                    <div className="pl-2 space-y-0.5 border-l border-zinc-800">
                      {scope.variables.map(v => {
                        const hasChildren = v.children && v.children.length > 0;
                        const isExpanded = expandedVars[v.name];

                        return (
                          <div key={v.name} className="space-y-0.5">
                            <div
                              onClick={() => hasChildren && toggleVar(v.name)}
                              className={`flex items-center justify-between py-0.5 px-1 rounded hover:bg-zinc-800/50 ${
                                hasChildren ? 'cursor-pointer' : ''
                              }`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                {hasChildren && (
                                  isExpanded ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />
                                )}
                                <span className="text-purple-300 font-semibold">{v.name}:</span>
                                <span className="text-emerald-300 truncate">{v.value}</span>
                              </div>
                              <span className="text-[9px] text-zinc-600 uppercase">{v.type}</span>
                            </div>

                            {hasChildren && isExpanded && (
                              <div className="pl-4 space-y-0.5 border-l border-zinc-800/80">
                                {v.children!.map(c => (
                                  <div key={c.name} className="flex items-center justify-between py-0.5 px-1 text-[10px]">
                                    <span className="text-zinc-400">{c.name}:</span>
                                    <span className="text-amber-300 font-medium truncate">{c.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. CALL STACK SECTION */}
        <div>
          <button
            onClick={() => toggleSection('stack')}
            className="w-full text-left px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900/30"
          >
            <div className="flex items-center gap-1">
              {collapsedSections.stack ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>Call Stack ({stackFrames.length})</span>
            </div>
          </button>

          {!collapsedSections.stack && (
            <div className="p-1 space-y-0.5 font-mono text-[10.5px]">
              {stackFrames.length === 0 ? (
                <div className="text-zinc-500 italic text-[10px] p-2">
                  No active stack frames.
                </div>
              ) : (
                stackFrames.map((frame, idx) => (
                  <button
                    key={frame.id}
                    onClick={() => {
                      setSelectedFrameIndex(idx);
                      onOpenFile(frame.file, frame.line);
                    }}
                    className={`w-full text-left p-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                      selectedFrameIndex === idx
                        ? 'bg-rose-950/60 border border-rose-800/80 text-rose-200 font-bold'
                        : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="truncate">
                      <div>{frame.name}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{frame.file.split('/').pop()}:{frame.line}</div>
                    </div>
                    {selectedFrameIndex === idx && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. BREAKPOINTS SECTION */}
        <div>
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/30">
            <button
              onClick={() => toggleSection('breakpoints')}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              {collapsedSections.breakpoints ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>Breakpoints ({breakpoints.length})</span>
            </button>

            <button
              onClick={() => dapDebugger.clearAllBreakpoints()}
              className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
              title="Remove All Breakpoints"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {!collapsedSections.breakpoints && (
            <div className="p-1.5 space-y-1 font-mono text-[10.5px]">
              {breakpoints.length === 0 ? (
                <div className="text-zinc-500 italic text-[10px] p-2">
                  Click the Monaco editor margin to add breakpoints.
                </div>
              ) : (
                breakpoints.map(bp => (
                  <div
                    key={bp.id}
                    className="p-1.5 rounded border border-zinc-800 bg-zinc-900/40 flex items-center justify-between hover:bg-zinc-850 transition-colors group"
                  >
                    <div
                      onClick={() => onOpenFile(bp.file, bp.line)}
                      className="flex items-center gap-2 truncate cursor-pointer flex-1"
                    >
                      <input
                        type="checkbox"
                        checked={bp.enabled}
                        onChange={e => {
                          e.stopPropagation();
                          dapDebugger.updateBreakpoint(bp.id, { enabled: !bp.enabled });
                        }}
                        className="rounded cursor-pointer accent-rose-500"
                      />
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 truncate">{bp.file.split('/').pop()}</span>
                        <span className="text-zinc-500 text-[10px] ml-1">:{bp.line}</span>
                        {bp.condition && (
                          <div className="text-[9px] text-amber-400 truncate flex items-center gap-0.5">
                            <span className="font-bold">?</span> {bp.condition}
                          </div>
                        )}
                        {bp.hitCondition && (
                          <div className="text-[9px] text-purple-400 truncate flex items-center gap-0.5">
                            <Flame size={9} /> {bp.hitCondition} (hits: {bp.hitCount})
                          </div>
                        )}
                        {bp.logMessage && (
                          <div className="text-[9px] text-cyan-400 truncate flex items-center gap-0.5">
                            <MessageSquare size={9} /> {bp.logMessage}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => onConfigureBreakpoint(bp)}
                        className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500"
                        title="Edit Conditional Breakpoint / Logpoint"
                      >
                        <Sliders size={11} />
                      </button>
                      <button
                        onClick={() => dapDebugger.removeBreakpoint(bp.id)}
                        className="p-1 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500"
                        title="Remove Breakpoint"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
