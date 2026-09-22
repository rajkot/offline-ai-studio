'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, ChevronRight, RotateCcw, Eye, Trash2, GitCommit, Plus, Minus } from 'lucide-react';
import { fileTimelineEngine, FileSnapshot } from '@/lib/fileTimelineEngine';

interface FileTimelineAccordionProps {
  selectedFile: string | null;
  onRevertToSnapshot: (filePath: string, content: string) => void;
}

export default function FileTimelineAccordion({ selectedFile, onRevertToSnapshot }: FileTimelineAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<FileSnapshot[]>([]);
  const [previewSnap, setPreviewSnap] = useState<FileSnapshot | null>(null);
  const [diffSnap, setDiffSnap] = useState<FileSnapshot | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);

  const loadHistory = useCallback(() => {
    if (!selectedFile) { setSnapshots([]); return; }
    setSnapshots(fileTimelineEngine.getHistory(selectedFile));
  }, [selectedFile]);

  useEffect(() => {
    loadHistory();
    const unsub = fileTimelineEngine.subscribe((fp, snaps) => {
      if (fp === selectedFile) setSnapshots(snaps);
    });
    return unsub;
  }, [selectedFile, loadHistory]);

  const handleRevert = useCallback((snap: FileSnapshot) => {
    if (!selectedFile) return;
    onRevertToSnapshot(selectedFile, snap.content);
    setConfirmRevertId(null);
    // Snapshot the revert itself so it appears in timeline
    setTimeout(() => fileTimelineEngine.snapshot(selectedFile, snap.content, 'Reverted'), 100);
  }, [selectedFile, onRevertToSnapshot]);

  const handleClearHistory = useCallback(() => {
    if (!selectedFile) return;
    if (confirm(`Clear all ${snapshots.length} snapshots for ${selectedFile.split('/').pop()}?`)) {
      fileTimelineEngine.clearHistory(selectedFile);
      setSnapshots([]);
      setPreviewSnap(null);
      setDiffSnap(null);
    }
  }, [selectedFile, snapshots.length]);

  const getDiffLines = useCallback((snap: FileSnapshot): { type: 'add' | 'del' | 'ctx'; text: string }[] => {
    const history = fileTimelineEngine.getHistory(selectedFile || '');
    const idx = history.findIndex(s => s.id === snap.id);
    const prevSnap = history[idx + 1];
    const oldContent = prevSnap ? prevSnap.content : '';
    const newContent = snap.content;
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const result: { type: 'add' | 'del' | 'ctx'; text: string }[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    let ctxCount = 0;
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === undefined) { result.push({ type: 'add', text: n }); ctxCount = 0; }
      else if (n === undefined) { result.push({ type: 'del', text: o }); ctxCount = 0; }
      else if (o !== n) { result.push({ type: 'del', text: o }); result.push({ type: 'add', text: n }); ctxCount = 0; }
      else if (ctxCount < 2) { result.push({ type: 'ctx', text: o }); ctxCount++; }
    }
    return result.slice(0, 80); // Cap at 80 lines for display
  }, [selectedFile]);

  if (!selectedFile || selectedFile.startsWith('__')) return null;

  const fileName = selectedFile.split('/').pop() || selectedFile;

  return (
    <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/20 p-1.5 space-y-1">
      {/* ACCORDION HEADER */}
      <div
        onClick={() => setIsOpen(p => !p)}
        className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider px-1 py-0.5 flex items-center justify-between cursor-pointer hover:text-zinc-200 select-none"
      >
        <div className="flex items-center gap-1.5">
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <Clock size={10} />
          <span>Timeline</span>
        </div>
        <div className="flex items-center gap-1.5">
          {snapshots.length > 0 && (
            <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-full text-[8px] font-mono">
              {snapshots.length}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="space-y-1 pt-0.5">
          {/* File name + clear button */}
          <div className="flex items-center justify-between px-1 pb-0.5">
            <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[160px]">{fileName}</span>
            {snapshots.length > 0 && (
              <button
                onClick={handleClearHistory}
                title="Clear timeline history"
                className="text-zinc-600 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>

          {snapshots.length === 0 ? (
            <div className="text-center py-4">
              <Clock size={18} className="text-zinc-700 mx-auto mb-1" />
              <p className="text-[9.5px] text-zinc-600">No history yet.</p>
              <p className="text-[9px] text-zinc-700 mt-0.5">Saves will appear here.</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700/50">
              {snapshots.map((snap, idx) => {
                const isExpanded = expandedId === snap.id;
                const isLatest = idx === 0;
                const diffLines = isExpanded ? getDiffLines(snap) : [];

                return (
                  <div
                    key={snap.id}
                    className={`rounded-md border transition-all ${
                      isExpanded
                        ? 'border-indigo-500/30 bg-indigo-950/10'
                        : 'border-transparent hover:border-zinc-700/50 hover:bg-zinc-800/20'
                    }`}
                  >
                    {/* Snapshot row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                      className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
                    >
                      {/* Icon */}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        isLatest ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        <GitCommit size={8} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Label + relative time */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-medium truncate ${
                            isLatest ? 'text-indigo-300' : 'text-zinc-400'
                          }`}>
                            {snap.label}
                            {isLatest && <span className="ml-1 text-[8px] bg-indigo-500/20 text-indigo-400 px-1 rounded">LATEST</span>}
                          </span>
                          <span className="text-[9px] text-zinc-600 shrink-0 font-mono">
                            {fileTimelineEngine.formatTimestamp(snap.timestamp)}
                          </span>
                        </div>

                        {/* +/- counters */}
                        {(snap.linesAdded > 0 || snap.linesRemoved > 0) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {snap.linesAdded > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px] text-emerald-400">
                                <Plus size={8} />
                                {snap.linesAdded}
                              </span>
                            )}
                            {snap.linesRemoved > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px] text-red-400">
                                <Minus size={8} />
                                {snap.linesRemoved}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded: diff view + actions */}
                    {isExpanded && (
                      <div className="px-2 pb-2 space-y-1.5">
                        {/* Diff preview */}
                        {diffLines.length > 0 ? (
                          <div className="bg-[#0a0b0e] rounded border border-zinc-800 max-h-44 overflow-y-auto font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {diffLines.map((dl, i) => (
                              <div
                                key={i}
                                className={`px-2 py-0.5 ${
                                  dl.type === 'add' ? 'bg-emerald-950/30 text-emerald-300' :
                                  dl.type === 'del' ? 'bg-red-950/30 text-red-300' :
                                  'text-zinc-600'
                                }`}
                              >
                                <span className="select-none mr-1.5">
                                  {dl.type === 'add' ? '+' : dl.type === 'del' ? '-' : ' '}
                                </span>
                                <span className="whitespace-pre-wrap break-all">{dl.text || ' '}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9.5px] text-zinc-600 text-center py-1">First snapshot — no diff available</div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {confirmRevertId === snap.id ? (
                            <>
                              <span className="text-[9px] text-amber-400 flex-1">Revert to this version?</span>
                              <button
                                onClick={() => handleRevert(snap)}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white text-[9.5px] font-semibold rounded cursor-pointer transition-colors"
                              >
                                Yes, Revert
                              </button>
                              <button
                                onClick={() => setConfirmRevertId(null)}
                                className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[9.5px] rounded cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setConfirmRevertId(snap.id)}
                                title="Revert file to this snapshot"
                                className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-amber-900/40 hover:text-amber-300 text-zinc-400 text-[9.5px] rounded border border-zinc-700 hover:border-amber-700/50 transition-all cursor-pointer"
                              >
                                <RotateCcw size={9} />
                                Revert
                              </button>
                              <span className="text-[8.5px] text-zinc-700 font-mono ml-auto">
                                {new Date(snap.timestamp).toLocaleTimeString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
