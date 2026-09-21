'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  GitMerge, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Split, 
  Layers, 
  FileCode, 
  X, 
  Save, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  FileCheck
} from 'lucide-react';
import { gitEngine, MergeSession, MergeConflictHunk } from '@/lib/gitEngine';

interface MergeConflictResolverProps {
  onMergeComplete?: (mergedFiles: Record<string, string>) => void;
  onAbort?: () => void;
}

export default function MergeConflictResolver({
  onMergeComplete,
  onAbort
}: MergeConflictResolverProps) {
  const [session, setSession] = useState<MergeSession | null>(null);
  const [activeFile, setActiveFile] = useState<string>('');
  const [activeHunkIndex, setActiveHunkIndex] = useState<number>(0);
  const [customResolutions, setCustomResolutions] = useState<Record<string, string>>({});
  const [activeViewMode, setActiveViewMode] = useState<'3way' | 'unified' | 'preview'>('3way');
  const [commitMessage, setCommitMessage] = useState('');

  const activeFileRef = useRef(activeFile);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    const update = () => {
      const active = gitEngine.getActiveMergeSession();
      setSession(active);
      if (active && !activeFileRef.current && active.conflictedFiles.length > 0) {
        setActiveFile(active.conflictedFiles[0]);
      }
    };

    update();
    const unsubscribe = gitEngine.subscribe(update);
    return () => unsubscribe();
  }, []);

  // If no active merge session, offer to simulate one
  const handleStartDemoConflict = () => {
    gitEngine.start3WayMerge('feature/dap-debugger');
  };

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0d0e12] text-zinc-300">
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-600/60 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
          <GitMerge size={28} />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">3-Way Visual Merge Conflict Resolver</h2>
        <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
          No active merge conflicts detected. Select two divergent Git branches to simulate or resolve 3-way conflicts with one-click resolution.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartDemoConflict}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <GitMerge size={14} />
            Simulate 3-Way Merge (main ← feature/dap-debugger)
          </button>
        </div>
      </div>
    );
  }

  const hunks: MergeConflictHunk[] = (session.fileHunks[activeFile] || []);
  const activeHunk = hunks[activeHunkIndex] || hunks[0];
  const unresolvedCount = hunks.filter(h => h.resolutionState === 'unresolved').length;
  const totalHunks = hunks.length;

  const handleResolve = (strategy: 'current' | 'incoming' | 'both' | 'custom') => {
    if (!activeHunk) return;
    gitEngine.resolveHunk(activeFile, activeHunk.id, strategy, customResolutions[activeHunk.id]);
    
    // Auto advance to next unresolved hunk
    const nextIdx = hunks.findIndex((h, idx) => idx > activeHunkIndex && h.resolutionState === 'unresolved');
    if (nextIdx !== -1) {
      setActiveHunkIndex(nextIdx);
    }
  };

  const handleCompleteMerge = () => {
    try {
      const commit = gitEngine.completeMerge(commitMessage || `Merge branch '${session.incomingBranch}' into ${session.targetBranch}`);
      if (onMergeComplete) {
        onMergeComplete(commit.tree);
      }
    } catch (err: any) {
      alert(`Error completing merge: ${err.message}`);
    }
  };

  const handleAbort = () => {
    gitEngine.abortMerge();
    if (onAbort) onAbort();
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c10] text-zinc-200 select-none overflow-hidden font-sans border border-[#1f2028]">
      {/* Header */}
      <div className="p-3 bg-[#121319] border-b border-[#242531] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-600/60 flex items-center justify-center text-indigo-400">
            <GitMerge size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">3-Way Merge Conflict Resolver</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-700/60 text-purple-200 font-mono">
                {session.targetBranch} ← {session.incomingBranch}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {unresolvedCount === 0 ? 'All conflicts resolved!' : `${unresolvedCount} of ${totalHunks} conflict(s) remaining`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#181922] p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveViewMode('3way')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
                activeViewMode === '3way' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              3-Way Split
            </button>
            <button
              onClick={() => setActiveViewMode('unified')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
                activeViewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Unified Diff
            </button>
          </div>

          <button
            onClick={handleAbort}
            className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
          >
            Abort Merge
          </button>

          <button
            onClick={handleCompleteMerge}
            disabled={unresolvedCount > 0}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
              unresolvedCount === 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={13} />
            Complete Merge & Commit
          </button>
        </div>
      </div>

      {/* File & Hunk Navigation Bar */}
      <div className="px-3 py-2 bg-[#090a0e] border-b border-[#1f2028] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Conflicted Files:</span>
          {session.conflictedFiles.map(file => (
            <button
              key={file}
              onClick={() => {
                setActiveFile(file);
                setActiveHunkIndex(0);
              }}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeFile === file 
                  ? 'bg-indigo-950 border border-indigo-600 text-indigo-200 font-bold' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode size={12} />
              {file}
              {session.resolvedFiles.includes(file) && (
                <Check size={11} className="text-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {totalHunks > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              Conflict Hunk {activeHunkIndex + 1} of {totalHunks}
            </span>
            <button
              onClick={() => setActiveHunkIndex(Math.max(0, activeHunkIndex - 1))}
              disabled={activeHunkIndex === 0}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setActiveHunkIndex(Math.min(totalHunks - 1, activeHunkIndex + 1))}
              disabled={activeHunkIndex === totalHunks - 1}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 3-Way Quick Action Resolution Panel */}
      {activeHunk && (
        <div className="p-3 bg-[#101117] border-b border-[#242531] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300">Hunk #{activeHunkIndex + 1} (Line {activeHunk.startLine}):</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              activeHunk.resolutionState === 'unresolved' 
                ? 'bg-amber-950 border border-amber-700 text-amber-300'
                : 'bg-emerald-950 border border-emerald-700 text-emerald-300'
            }`}>
              {activeHunk.resolutionState.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleResolve('current')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeHunk.resolutionState === 'current'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-200'
              }`}
            >
              <Check size={12} /> Accept Current (Ours / HEAD)
            </button>

            <button
              onClick={() => handleResolve('incoming')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeHunk.resolutionState === 'incoming'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200'
              }`}
            >
              <Check size={12} /> Accept Incoming (Theirs / {session.incomingBranch})
            </button>

            <button
              onClick={() => handleResolve('both')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeHunk.resolutionState === 'both'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200'
              }`}
            >
              <Layers size={12} /> Accept Both Changes
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Way Split Comparison Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Current / HEAD (Ours) */}
        <div className="w-1/3 border-r border-[#1f2028] flex flex-col bg-[#090a0e]">
          <div className="p-2 bg-emerald-950/60 border-b border-emerald-800/60 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <GitBranch size={13} /> Current Change (HEAD: {session.targetBranch})
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">OURS</span>
          </div>

          <div className="flex-1 overflow-auto p-3 font-mono text-xs text-zinc-300 leading-relaxed">
            {activeHunk ? (
              <pre className="text-emerald-300 bg-emerald-950/30 p-2.5 rounded border border-emerald-800/40 whitespace-pre-wrap">
                {activeHunk.currentContent || '// (Empty or deleted in HEAD)'}
              </pre>
            ) : (
              <p className="text-zinc-500">No active conflict hunk</p>
            )}
          </div>
        </div>

        {/* Column 2: Result / Base */}
        <div className="w-1/3 border-r border-[#1f2028] flex flex-col bg-[#0e0f15]">
          <div className="p-2 bg-indigo-950/60 border-b border-indigo-800/60 flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles size={13} /> Merged Output Result
            </span>
            <span className="text-[10px] text-indigo-400/80 font-mono">LIVE PREVIEW</span>
          </div>

          <div className="flex-1 overflow-auto p-3 font-mono text-xs text-zinc-200 leading-relaxed">
            {activeHunk ? (
              <div className="flex flex-col h-full gap-2">
                <textarea
                  value={activeHunk.resolvedContent !== undefined ? activeHunk.resolvedContent : activeHunk.currentContent}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCustomResolutions(prev => ({ ...prev, [activeHunk.id]: text }));
                    handleResolve('custom');
                  }}
                  className="flex-1 bg-black/60 text-emerald-300 p-2.5 rounded border border-indigo-700/60 outline-none resize-none font-mono text-xs leading-relaxed focus:border-indigo-400"
                  placeholder="Custom merged code snippet..."
                />
              </div>
            ) : (
              <p className="text-zinc-500">No active conflict hunk</p>
            )}
          </div>
        </div>

        {/* Column 3: Incoming (Theirs) */}
        <div className="w-1/3 flex flex-col bg-[#090a0e]">
          <div className="p-2 bg-cyan-950/60 border-b border-cyan-800/60 flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <GitBranch size={13} /> Incoming Change ({session.incomingBranch})
            </span>
            <span className="text-[10px] text-cyan-400/80 font-mono">THEIRS</span>
          </div>

          <div className="flex-1 overflow-auto p-3 font-mono text-xs text-zinc-300 leading-relaxed">
            {activeHunk ? (
              <pre className="text-cyan-300 bg-cyan-950/30 p-2.5 rounded border border-cyan-800/40 whitespace-pre-wrap">
                {activeHunk.incomingContent || '// (Empty or deleted in incoming)'}
              </pre>
            ) : (
              <p className="text-zinc-500">No active conflict hunk</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
