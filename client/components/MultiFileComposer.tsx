'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  GitMerge, 
  Check, 
  X, 
  RotateCcw, 
  CheckCheck, 
  XCircle, 
  FileCode, 
  Plus, 
  Edit3, 
  Trash2, 
  History, 
  Zap, 
  ChevronRight, 
  Columns, 
  AlignJustify, 
  Layers, 
  Keyboard,
  ArrowRight,
  ShieldCheck,
  Code2,
  FolderOpen
} from 'lucide-react';
import { 
  composerWorkspace, 
  ComposerPlan, 
  ComposerFileEdit, 
  ComposerCheckpoint, 
  computeComposerDiffHunks, 
  reconstructMergedFile,
  DiffHunkChunk
} from '@/lib/composerEngine';

interface MultiFileComposerProps {
  workspaceFiles: Record<string, string>;
  onApplyFiles: (updatedFiles: Record<string, string>) => void;
  onOpenFile: (filePath: string, line?: number) => void;
}

export default function MultiFileComposer({
  workspaceFiles,
  onApplyFiles,
  onOpenFile
}: MultiFileComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<ComposerPlan | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [selectedHunkIdx, setSelectedHunkIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [checkpoints, setCheckpoints] = useState<ComposerCheckpoint[]>([]);
  const [activeTab, setActiveTab] = useState<'composer' | 'checkpoints'>('composer');
  const hasInitializedCheckpointRef = useRef(false);

  // Initialize Checkpoint on mount
  useEffect(() => {
    if (!hasInitializedCheckpointRef.current && Object.keys(workspaceFiles).length > 0) {
      hasInitializedCheckpointRef.current = true;
      composerWorkspace.createCheckpoint(
        'Workspace Baseline',
        'Initial baseline snapshot before composer runs',
        workspaceFiles,
        'manual'
      );
      setCheckpoints(composerWorkspace.getCheckpoints());
    }
  }, [workspaceFiles]);

  // Handle Multi-File Plan Generation
  const handleGeneratePlan = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);

    try {
      // Create snapshot before generation
      composerWorkspace.createCheckpoint(
        `Pre-Composer: ${userPrompt.slice(0, 24)}...`,
        `Snapshot before applying multi-file cascade for "${userPrompt}"`,
        workspaceFiles,
        'composer'
      );
      setCheckpoints(composerWorkspace.getCheckpoints());

      const res = await fetch('/api/composer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userPrompt, 
          files: workspaceFiles,
          model: typeof window !== 'undefined' ? localStorage.getItem('offlineAi.ollamaModel') || undefined : undefined
        })
      });

      if (!res.ok) throw new Error('Failed to generate multi-file plan');
      const data = await res.json();

      const rawFiles: Array<{
        filePath: string;
        action: 'create' | 'modify' | 'delete';
        description: string;
        proposedContent: string;
      }> = data.files || [];

      let totalHunks = 0;
      const fileEdits: ComposerFileEdit[] = rawFiles.map(rf => {
        const originalContent = workspaceFiles[rf.filePath] || '';
        const hunks = computeComposerDiffHunks(originalContent, rf.proposedContent);
        totalHunks += hunks.length;
        return {
          filePath: rf.filePath,
          action: rf.action,
          originalContent,
          proposedContent: rf.proposedContent,
          description: rf.description,
          hunks,
          status: 'pending'
        };
      });

      const newPlan: ComposerPlan = {
        id: `plan-${Date.now()}`,
        userPrompt,
        summary: data.summary || `Generated ${fileEdits.length} file updates`,
        targetArchitecture: data.targetArchitecture || 'Multi-tier modular workspace structure',
        createdAt: Date.now(),
        files: fileEdits,
        totalHunks,
        acceptedHunks: 0,
        rejectedHunks: 0,
        status: 'reviewing'
      };

      composerWorkspace.setPlan(newPlan);
      setPlan(newPlan);
      setSelectedFileIdx(0);
      setSelectedHunkIdx(0);

    } catch (err: any) {
      console.error('Composer generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard Shortcuts (Cmd+Shift+Y, Cmd+Y, Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!plan || plan.status !== 'reviewing') return;
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+Shift+Y: Accept All
      if (isMeta && e.shiftKey && (e.key === 'Y' || e.key === 'y')) {
        e.preventDefault();
        handleAcceptAll();
        return;
      }

      // Cmd+Y: Accept Current Hunk
      if (isMeta && !e.shiftKey && (e.key === 'Y' || e.key === 'y')) {
        e.preventDefault();
        handleAcceptCurrentHunk();
        return;
      }

      // Cmd+N: Reject Current Hunk
      if (isMeta && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        handleRejectCurrentHunk();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plan, selectedFileIdx, selectedHunkIdx]);

  const currentFile = plan?.files[selectedFileIdx] || null;

  // Accept All Files
  const handleAcceptAll = () => {
    if (!plan) return;
    const { updatedFiles } = composerWorkspace.acceptAll();
    
    // Save checkpoint after accept
    composerWorkspace.createCheckpoint(
      `Applied: ${plan.userPrompt.slice(0, 24)}`,
      `All ${plan.files.length} files accepted from Composer plan`,
      { ...workspaceFiles, ...updatedFiles },
      'composer'
    );
    setCheckpoints(composerWorkspace.getCheckpoints());

    onApplyFiles(updatedFiles);
    setPlan({ ...plan, status: 'completed' });
  };

  // Reject All Files
  const handleRejectAll = () => {
    if (!plan) return;
    composerWorkspace.rejectAll();
    setPlan({ ...plan, status: 'discarded' });
  };

  // Accept Single File
  const handleAcceptFile = (filePath: string) => {
    if (!plan) return;
    const { mergedContent } = composerWorkspace.acceptFile(filePath);
    onApplyFiles({ [filePath]: mergedContent });
    setPlan({ ...plan });
  };

  // Reject Single File
  const handleRejectFile = (filePath: string) => {
    if (!plan) return;
    composerWorkspace.rejectFile(filePath);
    setPlan({ ...plan });
  };

  // Accept Current Hunk
  const handleAcceptCurrentHunk = () => {
    if (!plan || !currentFile) return;
    const hunk = currentFile.hunks[selectedHunkIdx];
    if (!hunk) return;

    const { mergedContent } = composerWorkspace.setHunkStatus(currentFile.filePath, hunk.id, 'accepted');
    onApplyFiles({ [currentFile.filePath]: mergedContent });

    // Move to next hunk
    if (selectedHunkIdx < currentFile.hunks.length - 1) {
      setSelectedHunkIdx(prev => prev + 1);
    }
    setPlan({ ...plan });
  };

  // Reject Current Hunk
  const handleRejectCurrentHunk = () => {
    if (!plan || !currentFile) return;
    const hunk = currentFile.hunks[selectedHunkIdx];
    if (!hunk) return;

    const { mergedContent } = composerWorkspace.setHunkStatus(currentFile.filePath, hunk.id, 'rejected');
    onApplyFiles({ [currentFile.filePath]: mergedContent });

    // Move to next hunk
    if (selectedHunkIdx < currentFile.hunks.length - 1) {
      setSelectedHunkIdx(prev => prev + 1);
    }
    setPlan({ ...plan });
  };

  // Rollback to Snapshot
  const handleRollback = (checkpoint: ComposerCheckpoint) => {
    const files = composerWorkspace.rollbackToCheckpoint(checkpoint.id);
    if (files) {
      onApplyFiles(files);
      composerWorkspace.createCheckpoint(
        `Rollback to: ${checkpoint.name}`,
        `Restored workspace state from checkpoint at ${new Date(checkpoint.timestamp).toLocaleTimeString()}`,
        files,
        'rollback'
      );
      setCheckpoints(composerWorkspace.getCheckpoints());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0e12] text-zinc-200 text-xs overflow-hidden font-sans border-r border-[#27272a]">
      {/* Header Bar */}
      <div className="p-3 border-b border-[#27272a] bg-[#121318] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-sm">
            <Sparkles size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-xs">Multi-File Agentic Composer</span>
              <span className="bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.2 rounded text-[10px] font-mono">
                Cascade Engine
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Simultaneous Multi-File Generation & Interactive Diff Review</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
          <button
            onClick={() => setActiveTab('composer')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'composer' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Composer
          </button>
          <button
            onClick={() => setActiveTab('checkpoints')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'checkpoints' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={10} />
            <span>Checkpoints ({checkpoints.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'composer' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Prompt Box */}
          <div className="p-3 border-b border-[#27272a] bg-[#14151b] shrink-0 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGeneratePlan(prompt);
                  }
                }}
                placeholder="Ask Composer to implement across 5-15 files (e.g. 'Build Auth & RBAC module', 'Add Telemetry Tracker')..."
                className="flex-1 px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleGeneratePlan(prompt)}
                disabled={isGenerating || !prompt.trim()}
                className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} />
                <span>{isGenerating ? 'Composing...' : 'Compose'}</span>
              </button>
            </div>

            {/* Quick Prompt Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500">Presets:</span>
              {[
                'Add User Authentication & RBAC',
                'Implement Performance & Telemetry Tracker',
                'Build Multi-Tier CRUD & REST API'
              ].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPrompt(p);
                    handleGeneratePlan(p);
                  }}
                  className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-[10px] text-zinc-300 rounded transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Plan & Multi-File Diff Reviewer */}
          {plan ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Plan Summary Bar */}
              <div className="p-2.5 bg-indigo-950/40 border-b border-indigo-900/50 flex items-center justify-between shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-300 text-xs truncate">{plan.summary}</span>
                    <span className="bg-indigo-900/60 text-indigo-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
                      {plan.files.length} files affected
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{plan.targetArchitecture}</p>
                </div>

                {/* Global Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleAcceptAll}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded font-semibold text-[11px] shadow-sm transition-colors cursor-pointer"
                    title="Accept all proposed files across workspace (Cmd+Shift+Y)"
                  >
                    <CheckCheck size={12} />
                    <span>Accept All</span>
                    <kbd className="bg-emerald-800 px-1 py-0.2 rounded text-[9px] font-mono ml-0.5">⌘⇧Y</kbd>
                  </button>

                  <button
                    onClick={handleRejectAll}
                    className="flex items-center gap-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1.5 rounded font-medium text-[11px] transition-colors cursor-pointer"
                    title="Discard all changes"
                  >
                    <XCircle size={12} />
                    <span>Discard</span>
                  </button>
                </div>
              </div>

              {/* Multi-File Split Workspace */}
              <div className="flex-1 flex overflow-hidden">
                {/* File Tree Left Rail */}
                <div className="w-56 border-r border-[#27272a] bg-[#111217] flex flex-col shrink-0 overflow-y-auto">
                  <div className="p-2 border-b border-[#27272a] text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Changed Files ({plan.files.length})</span>
                    <span className="text-zinc-500">{plan.totalHunks} hunks</span>
                  </div>

                  <div className="p-1 space-y-1">
                    {plan.files.map((file, idx) => (
                      <div
                        key={file.filePath}
                        onClick={() => {
                          setSelectedFileIdx(idx);
                          setSelectedHunkIdx(0);
                        }}
                        className={`p-2 rounded cursor-pointer transition-all border ${
                          selectedFileIdx === idx
                            ? 'bg-indigo-950/70 border-indigo-700/80 text-white'
                            : 'bg-zinc-900/50 hover:bg-zinc-800/60 border-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            file.action === 'create' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            file.action === 'delete' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {file.action}
                          </span>

                          <span className={`text-[9px] font-mono ${
                            file.status === 'accepted' ? 'text-emerald-400 font-bold' :
                            file.status === 'rejected' ? 'text-rose-400' :
                            'text-zinc-500'
                          }`}>
                            {file.status}
                          </span>
                        </div>

                        <div className="font-mono text-[11px] truncate font-medium">
                          {file.filePath}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {file.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diff Viewer Main Area */}
                {currentFile ? (
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0e12]">
                    {/* Current File Header */}
                    <div className="p-2.5 border-b border-[#27272a] bg-[#14151b] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode size={13} className="text-indigo-400" />
                        <span className="font-mono font-bold text-zinc-100 text-xs truncate">
                          {currentFile.filePath}
                        </span>
                        <span className="text-zinc-500 text-[10px]">
                          ({currentFile.hunks.length} hunks)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Hunk Keyboard Controls */}
                        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800 text-[10px]">
                          <button
                            onClick={handleAcceptCurrentHunk}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium flex items-center gap-1 cursor-pointer"
                            title="Accept selected hunk (Cmd+Y)"
                          >
                            <Check size={10} />
                            <span>Accept Hunk</span>
                            <kbd className="bg-emerald-900 px-1 py-0.2 rounded text-[8px] font-mono">⌘Y</kbd>
                          </button>
                          <button
                            onClick={handleRejectCurrentHunk}
                            className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded font-medium flex items-center gap-1 cursor-pointer"
                            title="Reject selected hunk (Cmd+N)"
                          >
                            <X size={10} />
                            <span>Reject Hunk</span>
                            <kbd className="bg-rose-950 px-1 py-0.2 rounded text-[8px] font-mono">⌘N</kbd>
                          </button>
                        </div>

                        {/* File Level Decisions */}
                        <button
                          onClick={() => handleAcceptFile(currentFile.filePath)}
                          className="px-2 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded text-[10px] cursor-pointer"
                        >
                          Accept File
                        </button>
                        <button
                          onClick={() => handleRejectFile(currentFile.filePath)}
                          className="px-2 py-1 bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 rounded text-[10px] cursor-pointer"
                        >
                          Reject File
                        </button>
                      </div>
                    </div>

                    {/* Diff Lines Box */}
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-3">
                      {currentFile.hunks.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 bg-zinc-900/30 rounded border border-zinc-800">
                          New file will be created with proposed contents.
                          <div className="mt-2 bg-black/60 p-2 rounded text-left max-h-60 overflow-y-auto text-emerald-300">
                            <pre>{currentFile.proposedContent}</pre>
                          </div>
                        </div>
                      ) : (
                        currentFile.hunks.map((hunk, hIdx) => (
                          <div
                            key={hunk.id}
                            onClick={() => setSelectedHunkIdx(hIdx)}
                            className={`rounded border transition-all cursor-pointer ${
                              selectedHunkIdx === hIdx
                                ? 'border-indigo-500 ring-1 ring-indigo-500 bg-zinc-900/80'
                                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                            }`}
                          >
                            {/* Hunk Header */}
                            <div className="px-2 py-1 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-bold">
                                Hunk #{hIdx + 1} ({hunk.type})
                              </span>
                              <span className={`px-1.5 py-0.2 rounded font-mono ${
                                hunk.status === 'accepted' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                hunk.status === 'rejected' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {hunk.status}
                              </span>
                            </div>

                            {/* Diff Content */}
                            <div className="p-2 space-y-0.5">
                              {/* Deleted / Original Lines */}
                              {hunk.originalLines.map(l => (
                                <div key={`orig-${l.lineNum}`} className="flex items-start bg-rose-950/40 text-rose-300 px-1.5 py-0.5 rounded">
                                  <span className="w-8 text-zinc-500 select-none text-[10px] shrink-0">-{l.lineNum}</span>
                                  <pre className="whitespace-pre-wrap flex-1">{l.text}</pre>
                                </div>
                              ))}

                              {/* Added / Proposed Lines */}
                              {hunk.proposedLines.map(l => (
                                <div key={`prop-${l.lineNum}`} className="flex items-start bg-emerald-950/40 text-emerald-300 px-1.5 py-0.5 rounded">
                                  <span className="w-8 text-zinc-500 select-none text-[10px] shrink-0">+{l.lineNum}</span>
                                  <pre className="whitespace-pre-wrap flex-1">{l.text}</pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <Sparkles size={24} />
              </div>
              <div className="max-w-md">
                <h3 className="text-zinc-200 font-semibold text-sm">Composer Ready</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Type a prompt above to orchestrate simultaneous edits across 5–15 files. Review red/green diff hunks with keyboard shortcuts and atomic rollback checkpoints.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Checkpoints Snapshot View */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300 font-semibold">
              <History size={13} />
              <span>Atomic Checkpoint History</span>
            </div>
            <span className="text-[10px] text-zinc-400">1-Click State Rollback</span>
          </div>

          <div className="space-y-2">
            {checkpoints.map((cp, idx) => (
              <div
                key={cp.id}
                className="p-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded flex items-center justify-between hover:bg-zinc-850 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 text-xs truncate">{cp.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                      cp.source === 'composer' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      cp.source === 'rollback' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-zinc-800 text-zinc-300'
                    }`}>
                      {cp.source}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{cp.description}</p>
                  <span className="text-[9px] font-mono text-zinc-500 mt-1 block">
                    {new Date(cp.timestamp).toLocaleTimeString()} · {cp.changedFilesCount} files snapshot
                  </span>
                </div>

                <button
                  onClick={() => handleRollback(cp)}
                  className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-sm"
                >
                  <RotateCcw size={11} />
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
