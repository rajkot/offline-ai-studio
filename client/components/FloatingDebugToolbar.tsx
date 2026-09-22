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
  GripHorizontal,
  Bug
} from 'lucide-react';
import { dapDebugger } from '@/lib/dapDebuggerEngine';

interface FloatingDebugToolbarProps {
  currentFilePath?: string;
  onOpenFile?: (filePath: string, line: number) => void;
}

export default function FloatingDebugToolbar({ currentFilePath, onOpenFile }: FloatingDebugToolbarProps) {
  const [isDebugging, setIsDebugging] = useState(dapDebugger.getIsDebugging());
  const [isPaused, setIsPaused] = useState(dapDebugger.getIsPaused());
  const [activeLine, setActiveLine] = useState(dapDebugger.getActiveLine());
  const [activeFile, setActiveFile] = useState(dapDebugger.getActiveFile());

  useEffect(() => {
    const unsub = dapDebugger.subscribe((event, payload) => {
      setIsDebugging(dapDebugger.getIsDebugging());
      setIsPaused(dapDebugger.getIsPaused());
      setActiveLine(dapDebugger.getActiveLine());
      setActiveFile(dapDebugger.getActiveFile());

      if (event === 'stopped' && onOpenFile && payload.file && payload.line) {
        onOpenFile(payload.file, payload.line);
      }
    });

    return unsub;
  }, [onOpenFile]);

  if (!isDebugging) return null;

  return (
    <div
      id="floating-debug-toolbar"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 bg-[#18181b]/95 border border-rose-500/60 rounded-xl shadow-2xl backdrop-blur-md select-none animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Draggable Grip Handle */}
      <div className="px-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing">
        <GripHorizontal size={14} />
      </div>

      {/* Debug Status Badge */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
        <span
          className={`w-2 h-2 rounded-full ${
            isPaused
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              : 'bg-emerald-400 animate-ping'
          }`}
        />
        <span className="font-semibold text-zinc-200">
          {isPaused ? `L${activeLine}` : 'RUN'}
        </span>
      </div>

      <div className="h-4 w-px bg-zinc-700/60 mx-0.5" />

      {/* Continue / Pause (F5) */}
      <button
        onClick={() => {
          if (isPaused) {
            dapDebugger.resumeExecution();
          } else {
            dapDebugger.pauseExecution('pause');
          }
        }}
        title={isPaused ? 'Continue (F5)' : 'Pause (F5)'}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          isPaused
            ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm'
            : 'bg-amber-600/90 hover:bg-amber-500 text-white shadow-sm'
        }`}
      >
        {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
      </button>

      {/* Step Over (F10) */}
      <button
        onClick={() => dapDebugger.stepOver()}
        title="Step Over (F10)"
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer"
      >
        <CornerDownRight size={13} />
      </button>

      {/* Step Into (F11) */}
      <button
        onClick={() => dapDebugger.stepInto()}
        title="Step Into (F11)"
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer"
      >
        <ArrowDown size={13} />
      </button>

      {/* Step Out (Shift+F11) */}
      <button
        onClick={() => dapDebugger.stepOut()}
        title="Step Out (Shift+F11)"
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer"
      >
        <ArrowUp size={13} />
      </button>

      {/* Restart (Ctrl+Shift+F5) */}
      <button
        onClick={() => dapDebugger.restart()}
        title="Restart Debugging (Ctrl+Shift+F5)"
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all cursor-pointer"
      >
        <RotateCcw size={13} />
      </button>

      {/* Stop (Shift+F5) */}
      <button
        onClick={() => dapDebugger.stop()}
        title="Stop Debugging (Shift+F5)"
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-600 text-rose-400 hover:text-white transition-all cursor-pointer"
      >
        <Square size={13} fill="currentColor" />
      </button>
    </div>
  );
}
