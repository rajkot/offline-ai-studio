'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  GitMerge, 
  Check, 
  X, 
  RotateCcw, 
  CheckCheck, 
  XCircle, 
  Save, 
  Columns, 
  AlignJustify, 
  Eye, 
  Code2, 
  FileCode,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export interface DiffHunk {
  id: string;
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  originalLines: { lineNum: number; text: string }[];
  proposedLines: { lineNum: number; text: string }[];
  status: 'pending' | 'accepted' | 'rejected';
}

export interface InteractiveDiffViewerProps {
  filePath?: string;
  fileName?: string;
  originalCode: string;
  proposedCode: string;
  onApplyAndSave?: (mergedCode: string) => void;
  onApply?: (mergedCode: string) => void;
  onDiscard?: () => void;
  onClose?: () => void;
}

// Compute diff hunks between original and proposed text
function computeDiffHunks(original: string, proposed: string): DiffHunk[] {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  
  // LCS Table
  const n = origLines.length;
  const m = propLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origLines[i - 1] === propLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build raw operations
  interface DiffOp {
    type: 'same' | 'delete' | 'add';
    origLineNum?: number;
    propLineNum?: number;
    text: string;
  }

  const ops: DiffOp[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === propLines[j - 1]) {
      ops.unshift({
        type: 'same',
        origLineNum: i,
        propLineNum: j,
        text: origLines[i - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({
        type: 'add',
        propLineNum: j,
        text: propLines[j - 1]
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.unshift({
        type: 'delete',
        origLineNum: i,
        text: origLines[i - 1]
      });
      i--;
    }
  }

  // Group continuous ops into hunks
  const hunks: DiffHunk[] = [];
  let currentHunk: {
    type: 'add' | 'delete' | 'modify' | 'unchanged';
    originalLines: { lineNum: number; text: string }[];
    proposedLines: { lineNum: number; text: string }[];
  } | null = null;

  let hunkIndex = 0;

  for (const op of ops) {
    if (op.type === 'same') {
      if (currentHunk) {
        hunks.push({
          id: `hunk-${hunkIndex++}`,
          ...currentHunk,
          status: 'pending'
        });
        currentHunk = null;
      }
      hunks.push({
        id: `hunk-${hunkIndex++}`,
        type: 'unchanged',
        originalLines: [{ lineNum: op.origLineNum!, text: op.text }],
        proposedLines: [{ lineNum: op.propLineNum!, text: op.text }],
        status: 'accepted'
      });
    } else if (op.type === 'delete') {
      if (!currentHunk) {
        currentHunk = {
          type: 'delete',
          originalLines: [{ lineNum: op.origLineNum!, text: op.text }],
          proposedLines: []
        };
      } else {
        currentHunk.originalLines.push({ lineNum: op.origLineNum!, text: op.text });
        if (currentHunk.proposedLines.length > 0) {
          currentHunk.type = 'modify';
        }
      }
    } else if (op.type === 'add') {
      if (!currentHunk) {
        currentHunk = {
          type: 'add',
          originalLines: [],
          proposedLines: [{ lineNum: op.propLineNum!, text: op.text }]
        };
      } else {
        currentHunk.proposedLines.push({ lineNum: op.propLineNum!, text: op.text });
        if (currentHunk.originalLines.length > 0) {
          currentHunk.type = 'modify';
        }
      }
    }
  }

  if (currentHunk) {
    hunks.push({
      id: `hunk-${hunkIndex++}`,
      ...currentHunk,
      status: 'pending'
    });
  }

  return hunks;
}

export default function InteractiveDiffViewer({
  filePath,
  fileName,
  originalCode,
  proposedCode,
  onApplyAndSave,
  onApply,
  onDiscard,
  onClose
}: InteractiveDiffViewerProps) {
  const effectivePath = filePath || fileName || 'components/Playground.tsx';
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [activeTab, setActiveTab] = useState<'diff' | 'preview'>('diff');
  const [saveToast, setSaveToast] = useState(false);
  const [hunkStatusMap, setHunkStatusMap] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>({});

  // Scrolling sync references
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const activeScrollSourceRef = useRef<'left' | 'right' | null>(null);

  // Synchronized scrolling handlers
  const handleLeftScroll = () => {
    if (activeScrollSourceRef.current === 'left' && leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
      rightPaneRef.current.scrollLeft = leftPaneRef.current.scrollLeft;
    }
  };

  const handleRightScroll = () => {
    if (activeScrollSourceRef.current === 'right' && leftPaneRef.current && rightPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
      leftPaneRef.current.scrollLeft = rightPaneRef.current.scrollLeft;
    }
  };

  // Compute base diff hunks
  const baseHunks = useMemo(() => computeDiffHunks(originalCode, proposedCode), [originalCode, proposedCode]);

  // Derive active hunks with transactional status applied
  const hunks = useMemo(() => {
    return baseHunks.map(h => ({
      ...h,
      status: hunkStatusMap[h.id] ?? 'pending'
    }));
  }, [baseHunks, hunkStatusMap]);

  // Handle individual hunk state change
  const setHunkStatus = (hunkId: string, status: 'accepted' | 'rejected' | 'pending') => {
    setHunkStatusMap(prev => ({ ...prev, [hunkId]: status }));
  };

  // Bulk actions
  const handleAcceptAll = () => {
    const nextMap: Record<string, 'accepted' | 'rejected' | 'pending'> = {};
    for (const h of baseHunks) {
      if (h.type !== 'unchanged') {
        nextMap[h.id] = 'accepted';
      }
    }
    setHunkStatusMap(nextMap);
  };

  const handleDiscardAll = () => {
    const nextMap: Record<string, 'accepted' | 'rejected' | 'pending'> = {};
    for (const h of baseHunks) {
      if (h.type !== 'unchanged') {
        nextMap[h.id] = 'rejected';
      }
    }
    setHunkStatusMap(nextMap);
  };

  const handleResetAll = () => {
    setHunkStatusMap({});
  };

  // Compile final merged code based on accepted / rejected status
  const compiledMergedCode = useMemo(() => {
    const resultLines: string[] = [];

    for (const hunk of hunks) {
      if (hunk.type === 'unchanged') {
        resultLines.push(...hunk.originalLines.map(l => l.text));
      } else if (hunk.status === 'accepted') {
        resultLines.push(...hunk.proposedLines.map(l => l.text));
      } else {
        resultLines.push(...hunk.originalLines.map(l => l.text));
      }
    }

    return resultLines.join('\n');
  }, [hunks]);

  // Stats calculation
  const changeHunks = useMemo(() => hunks.filter(h => h.type !== 'unchanged'), [hunks]);
  const totalChanges = changeHunks.length;
  const acceptedChanges = changeHunks.filter(h => h.status === 'accepted').length;
  const rejectedChanges = changeHunks.filter(h => h.status === 'rejected').length;
  const pendingChanges = changeHunks.filter(h => h.status === 'pending').length;

  const handleSaveToWorkspace = () => {
    const applyHandler = onApplyAndSave || onApply;
    if (applyHandler) {
      applyHandler(compiledMergedCode);
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  // Aligns original and proposed lines to ensure synchronized visual rows
  const getAlignedLines = useCallback((hunk: DiffHunk) => {
    const maxLines = Math.max(hunk.originalLines.length, hunk.proposedLines.length);
    const leftSide: { lineNum?: number; text?: string; isPlaceholder: boolean }[] = [];
    const rightSide: { lineNum?: number; text?: string; isPlaceholder: boolean }[] = [];

    for (let i = 0; i < maxLines; i++) {
      const orig = hunk.originalLines[i];
      const prop = hunk.proposedLines[i];

      if (hunk.type === 'unchanged') {
        leftSide.push({ lineNum: orig?.lineNum, text: orig?.text, isPlaceholder: false });
        rightSide.push({ lineNum: prop?.lineNum, text: prop?.text, isPlaceholder: false });
      } else if (hunk.type === 'delete') {
        leftSide.push({ lineNum: orig?.lineNum, text: orig?.text, isPlaceholder: false });
        rightSide.push({ isPlaceholder: true });
      } else if (hunk.type === 'add') {
        leftSide.push({ isPlaceholder: true });
        rightSide.push({ lineNum: prop?.lineNum, text: prop?.text, isPlaceholder: false });
      } else {
        // modify
        if (orig) {
          leftSide.push({ lineNum: orig.lineNum, text: orig.text, isPlaceholder: false });
        } else {
          leftSide.push({ isPlaceholder: true });
        }

        if (prop) {
          rightSide.push({ lineNum: prop.lineNum, text: prop.text, isPlaceholder: false });
        } else {
          rightSide.push({ isPlaceholder: true });
        }
      }
    }

    return { leftSide, rightSide };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-[#f4f4f5] font-sans select-none overflow-hidden border border-[#27272a] rounded-xl">
      {/* Top Main Toolbar */}
      <div className="p-3 bg-[#18181b] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <GitMerge size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <FileCode size={14} className="text-indigo-400" />
                {effectivePath}
              </h3>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                {totalChanges} proposed diff {totalChanges === 1 ? 'block' : 'blocks'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">Review original and proposed AI changes side-by-side.</p>
          </div>
        </div>

        {/* View Mode & Tabs Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#09090b] p-1 rounded-lg border border-[#27272a] text-xs">
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'diff' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 size={13} /> Diff Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye size={13} /> Result Preview
            </button>
          </div>

          {activeTab === 'diff' && (
            <div className="flex items-center bg-[#09090b] p-1 rounded-lg border border-[#27272a] text-xs">
              <button
                onClick={() => setViewMode('split')}
                title="Split side-by-side view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Columns size={14} />
              </button>
              <button
                onClick={() => setViewMode('unified')}
                title="Unified inline view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'unified' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <AlignJustify size={14} />
              </button>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              ✕ Close Diff
            </button>
          )}
        </div>
      </div>

      {/* Top Status Bar: "X of Y changes accepted. [Apply All Changes] [Reset]" */}
      <div className="px-4 py-2 bg-[#141416] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 font-sans shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-semibold text-zinc-200">
            {acceptedChanges} of {totalChanges} changes accepted
          </span>
          <span className="text-zinc-600 font-bold select-none">•</span>
          <span className="text-emerald-400 font-semibold">+{acceptedChanges} Accepted</span>
          <span className="text-zinc-600 select-none">•</span>
          <span className="text-rose-400 font-semibold">-{rejectedChanges} Rejected</span>
          <span className="text-zinc-600 select-none">•</span>
          <span className="text-zinc-400 font-medium">{pendingChanges} Pending</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAcceptAll}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
          >
            Apply All Changes
          </button>
          <button
            onClick={handleResetAll}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px] rounded-lg border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Diff Render Canvas */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {activeTab === 'preview' ? (
          <div className="flex-1 flex flex-col p-4 bg-[#09090b] overflow-hidden">
            <div className="flex-1 flex flex-col bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden shadow-inner">
              <div className="px-4 py-2 bg-[#1c1c1f] border-b border-[#27272a] flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <ShieldCheck size={14} className="text-emerald-400" /> Compiled Output Buffer ({compiledMergedCode.split('\n').length} lines)
                </span>
                <span className="text-[11px] text-indigo-400 font-bold">Synchronized Workspace Payload</span>
              </div>
              <textarea
                readOnly
                value={compiledMergedCode}
                className="flex-1 w-full bg-[#111113] text-zinc-300 p-4 font-mono text-xs resize-none focus:outline-none leading-relaxed overflow-y-auto"
              />
            </div>
          </div>
        ) : viewMode === 'split' ? (
          /* Split-Pane Code Comparison with Sync Scroll */
          <div className="flex-1 grid grid-cols-2 min-h-0 bg-[#09090b]">
            
            {/* Left Pane: Original active code */}
            <div
              ref={leftPaneRef}
              onScroll={handleLeftScroll}
              onMouseEnter={() => { activeScrollSourceRef.current = 'left'; }}
              onMouseLeave={() => { if (activeScrollSourceRef.current === 'left') activeScrollSourceRef.current = null; }}
              className="overflow-y-auto overflow-x-auto border-r border-[#27272a] select-text scrollbar-none bg-[#09090b]/80 relative"
            >
              <div className="sticky top-0 bg-[#18181b] border-b border-[#27272a] py-2 px-4 text-[10px] font-bold text-red-400 uppercase tracking-wider z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Original Active Code (Left Pane)
              </div>
              <div className="py-2">
                {hunks.map((hunk) => {
                  const isUnchanged = hunk.type === 'unchanged';
                  const { leftSide } = getAlignedLines(hunk);
                  return (
                    <div key={`left-hunk-${hunk.id}`} className="relative">
                      {leftSide.map((line, idx) => (
                        <div
                          key={`left-line-${hunk.id}-${idx}`}
                          className={`h-6 px-4 flex items-center text-xs font-mono leading-none border-b border-transparent ${
                            line.isPlaceholder
                              ? 'bg-[#121214]/40 opacity-20 select-none'
                              : isUnchanged
                              ? 'text-zinc-500 hover:bg-zinc-800/20'
                              : 'bg-red-950/20 text-red-200 hover:bg-red-950/30 border-l-2 border-red-500'
                          }`}
                        >
                          {!line.isPlaceholder && (
                            <>
                              <span className="w-10 text-right text-zinc-600 select-none pr-3 font-mono text-[10px]">
                                {line.lineNum}
                              </span>
                              <span className="w-4 text-red-500 font-bold select-none">-</span>
                              <pre className="flex-1 whitespace-pre overflow-x-auto scrollbar-none font-mono text-xs font-medium">
                                {line.text}
                              </pre>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: AI proposed code with Gutter Controls */}
            <div
              ref={rightPaneRef}
              onScroll={handleRightScroll}
              onMouseEnter={() => { activeScrollSourceRef.current = 'right'; }}
              onMouseLeave={() => { if (activeScrollSourceRef.current === 'right') activeScrollSourceRef.current = null; }}
              className="overflow-y-auto overflow-x-auto select-text scrollbar-none bg-[#09090b]/40 relative"
            >
              <div className="sticky top-0 bg-[#18181b] border-b border-[#27272a] py-2 px-4 text-[10px] font-bold text-emerald-400 uppercase tracking-wider z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                AI Proposed Code (Right Pane)
              </div>
              <div className="py-2">
                {hunks.map((hunk) => {
                  const isUnchanged = hunk.type === 'unchanged';
                  const { rightSide } = getAlignedLines(hunk);
                  return (
                    <div key={`right-hunk-${hunk.id}`} className="relative group/hunk">
                      {rightSide.map((line, idx) => (
                        <div
                          key={`right-line-${hunk.id}-${idx}`}
                          className={`h-6 px-4 flex items-center text-xs font-mono leading-none border-b border-transparent ${
                            line.isPlaceholder
                              ? 'bg-[#121214]/40 opacity-20 select-none'
                              : isUnchanged
                              ? 'text-zinc-500 hover:bg-zinc-800/20'
                              : hunk.status === 'accepted'
                              ? 'bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/45 border-l-2 border-emerald-500'
                              : hunk.status === 'rejected'
                              ? 'bg-zinc-900/30 text-zinc-500 line-through hover:bg-zinc-900/40 border-l-2 border-zinc-700'
                              : 'bg-emerald-950/10 text-emerald-300 hover:bg-emerald-950/20 border-l-2 border-indigo-500'
                          }`}
                        >
                          {!line.isPlaceholder && (
                            <>
                              <span className="w-10 text-right text-zinc-600 select-none pr-3 font-mono text-[10px]">
                                {line.lineNum}
                              </span>
                              <span className="w-4 text-emerald-400 font-bold select-none">+</span>
                              <pre className="flex-1 whitespace-pre overflow-x-auto scrollbar-none font-mono text-xs font-medium font-normal">
                                {line.text}
                              </pre>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Interactive Gutter Buttons on hover of changed blocks */}
                      {!isUnchanged && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#18181b]/95 border border-[#27272a] p-1 rounded-lg shadow-2xl z-20 opacity-0 group-hover/hunk:opacity-100 transition-all duration-200 hover:scale-105">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            hunk.status === 'accepted'
                              ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800'
                              : hunk.status === 'rejected'
                              ? 'text-rose-400 bg-rose-950/80 border border-rose-800'
                              : 'text-zinc-400 bg-zinc-800'
                          }`}>
                            {hunk.status}
                          </span>
                          
                          <button
                            onClick={() => setHunkStatus(hunk.id, 'accepted')}
                            title="Accept this block change"
                            className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center transition-all cursor-pointer whitespace-nowrap ${
                              hunk.status === 'accepted'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-800 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            ➕ Accept Block
                          </button>

                          <button
                            onClick={() => setHunkStatus(hunk.id, 'rejected')}
                            title="Discard this block change"
                            className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center transition-all cursor-pointer whitespace-nowrap ${
                              hunk.status === 'rejected'
                                ? 'bg-rose-600 text-white'
                                : 'bg-zinc-800 text-rose-400 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            ❌ Discard Block
                          </button>

                          {hunk.status !== 'pending' && (
                            <button
                              onClick={() => setHunkStatus(hunk.id, 'pending')}
                              title="Reset state to pending"
                              className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded-md cursor-pointer"
                            >
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          /* Unified Inline Diff Stream */
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#09090b]">
            <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#141416] shadow-md divide-y divide-[#27272a]/50">
              <div className="bg-[#18181b] px-4 py-2 border-b border-[#27272a] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Unified Diff Stream View
              </div>
              {hunks.map((hunk) => {
                const isUnchanged = hunk.type === 'unchanged';
                return (
                  <div 
                    key={`unified-hunk-${hunk.id}`}
                    className={`p-3 relative group transition-colors ${
                      isUnchanged
                        ? 'hover:bg-zinc-800/10'
                        : hunk.status === 'accepted'
                        ? 'bg-emerald-950/10 border-l-2 border-emerald-500'
                        : hunk.status === 'rejected'
                        ? 'bg-rose-950/10 border-l-2 border-rose-500'
                        : 'bg-indigo-950/10 border-l-2 border-indigo-500'
                    }`}
                  >
                    {!isUnchanged && (
                      <div className="mb-2 flex items-center justify-between bg-[#1c1c1f]/80 border border-[#27272a] p-1.5 rounded-lg z-10">
                        <span className="text-[10px] font-semibold text-zinc-300 flex items-center gap-1.5 font-sans">
                          <span className="font-bold text-indigo-300 capitalize">{hunk.type} Block</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            hunk.status === 'accepted' ? 'text-emerald-400 bg-emerald-950' : hunk.status === 'rejected' ? 'text-rose-400 bg-rose-950' : 'text-zinc-400 bg-zinc-800'
                          }`}>
                            {hunk.status}
                          </span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setHunkStatus(hunk.id, 'accepted')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            ➕ Accept Block
                          </button>
                          <button
                            onClick={() => setHunkStatus(hunk.id, 'rejected')}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            ❌ Discard Block
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {hunk.originalLines.map((l, idx) => (
                        <div 
                          key={`unified-orig-${idx}`}
                          className={`flex items-start gap-2 ${
                            isUnchanged ? 'text-zinc-500' : 'bg-red-950/20 text-red-200 px-2 py-0.5 rounded'
                          }`}
                        >
                          <span className="w-8 text-right text-zinc-600 select-none text-[10px]">{l.lineNum}</span>
                          <span className="w-3 text-red-500 font-bold select-none">{isUnchanged ? ' ' : '-'}</span>
                          <pre className="font-mono whitespace-pre overflow-x-auto scrollbar-none text-xs">{l.text}</pre>
                        </div>
                      ))}

                      {!isUnchanged && hunk.proposedLines.map((l, idx) => (
                        <div 
                          key={`unified-prop-${idx}`}
                          className="flex items-start gap-2 bg-emerald-950/20 text-emerald-200 px-2 py-0.5 rounded"
                        >
                          <span className="w-8 text-right text-zinc-600 select-none text-[10px]">{l.lineNum}</span>
                          <span className="w-3 text-emerald-400 font-bold select-none">+</span>
                          <pre className="font-mono whitespace-pre overflow-x-auto scrollbar-none text-xs">{l.text}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Sync Button Bar */}
      <div className="p-3 bg-[#18181b] border-t border-[#27272a] flex flex-wrap items-center justify-end gap-3 shrink-0 shadow-2xl">
        <button
          onClick={handleSaveToWorkspace}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg cursor-pointer active:scale-95"
        >
          <Save size={14} /> Sync and Merge to Workspace
        </button>
      </div>

      {/* Sync Toast Overlay */}
      {saveToast && (
        <div className="absolute bottom-4 right-4 bg-emerald-600 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 font-sans border border-emerald-500">
          <Check size={16} />
          <span className="font-bold">Workspace successfully integrated! Merged buffers synchronized to Monaco.</span>
        </div>
      )}
    </div>
  );
}
