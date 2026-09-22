'use client';

import React, { useState } from 'react';
import { GitBranch, RotateCcw, Check, X, RefreshCw, Layers } from 'lucide-react';
import { GutterClickEvent, gitGutterEngine } from '@/lib/git/gitGutterEngine';

interface GitHunkPopoverProps {
  event: GutterClickEvent | null;
  onClose: () => void;
  onRefreshFile?: (filePath: string) => void;
}

export default function GitHunkPopover({ event, onClose, onRefreshFile }: GitHunkPopoverProps) {
  const [isStaging, setIsStaging] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!event) return null;

  const { hunk, filePath, screenX, screenY } = event;

  // Stage Hunk (git add -p equivalent)
  const handleStageHunk = async () => {
    setIsStaging(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stage-hunk',
          path: filePath,
          hunk
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('✓ Hunk staged!');
        gitGutterEngine.refreshDiff();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFeedback(`Error: ${data.error || 'Failed to stage'}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsStaging(false);
    }
  };

  // Revert Hunk (git checkout HEAD -- line range)
  const handleRevertHunk = async () => {
    setIsReverting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert-hunk',
          path: filePath,
          hunk
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('✓ Hunk reverted!');
        gitGutterEngine.refreshDiff();
        if (onRefreshFile) onRefreshFile(filePath);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFeedback(`Error: ${data.error || 'Failed to revert'}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsReverting(false);
    }
  };

  // Constrain position on screen
  const left = Math.min(screenX + 15, typeof window !== 'undefined' ? window.innerWidth - 440 : 400);
  const top = Math.min(screenY - 20, typeof window !== 'undefined' ? window.innerHeight - 320 : 300);

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-[9999] w-[420px] max-w-[90vw] bg-[#14151b] border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-zinc-100 font-sans animate-in fade-in zoom-in-95 duration-100"
    >
      {/* HEADER */}
      <div className="px-3.5 py-2.5 bg-[#1b1c24] border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            hunk.type === 'added' ? 'bg-emerald-400' :
            hunk.type === 'deleted' ? 'bg-red-400' : 'bg-blue-400'
          }`} />
          <span className="text-xs font-bold text-white capitalize">
            {hunk.type} Hunk (Lines {hunk.startLine}-{hunk.endLine})
          </span>
          <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[140px]">
            {filePath.split('/').pop()}
          </span>
        </div>

        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* DIFF SNIPPET */}
      <div className="p-3 bg-[#0a0b0e] max-h-52 overflow-y-auto font-mono text-[11px] leading-relaxed border-b border-zinc-800/80 scrollbar-thin">
        {hunk.oldLines?.map((line, idx) => (
          <div key={`del-${idx}`} className="bg-red-950/40 text-red-300 px-2 py-0.5 rounded-sm flex items-start gap-2">
            <span className="text-red-500 select-none">-</span>
            <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
          </div>
        ))}
        {hunk.newLines?.map((line, idx) => (
          <div key={`add-${idx}`} className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded-sm flex items-start gap-2">
            <span className="text-emerald-500 select-none">+</span>
            <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-2.5 bg-[#14151b] flex items-center justify-between gap-2">
        {feedback ? (
          <span className="text-xs text-emerald-400 font-medium px-2">{feedback}</span>
        ) : (
          <span className="text-[10px] text-zinc-500 font-mono">VS Code Range Staging</span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleRevertHunk}
            disabled={isReverting || isStaging}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isReverting ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Revert Hunk
          </button>

          <button
            onClick={handleStageHunk}
            disabled={isStaging || isReverting}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-900/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isStaging ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
            Stage Hunk
          </button>
        </div>
      </div>
    </div>
  );
}
