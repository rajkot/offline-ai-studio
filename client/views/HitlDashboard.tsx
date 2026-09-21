'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileCode,
  Tag,
  Database,
  Cpu,
  ArrowRight,
  Loader2,
  Search,
  Check,
  Copy,
  Terminal,
  Activity,
  Layers,
  Send,
  Zap,
  Info
} from 'lucide-react';

// Dynamic import for Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs gap-2">
      <Loader2 size={16} className="animate-spin text-indigo-500" />
      <span>Loading Monaco Code Editor...</span>
    </div>
  )
});

export interface HitlTask {
  id: string;
  subjectId: string;
  taskTitle: string;
  confidenceScore: number;
  failureReason: string;
  compilerLogs?: string;
  createdAt: string;
  originalOutput: string;
  suggestedPrompt: string;
  language: string;
  status: 'pending' | 'approved' | 'discarded';
  activeFilePath?: string;
}

export interface ActiveLearningStats {
  totalCorrectionsCaptured: number;
  datasetSizeKb: number;
  readinessPercentage: number;
  correctionsNeededNextEpoch: number;
}

interface HitlDashboardProps {
  onApplyCode?: (filename: string, code: string) => void;
  onRerouteToAi?: (prompt: string, correctedCode: string) => void;
  activeFilePath?: string;
}

export default function HitlDashboard({
  onApplyCode,
  onRerouteToAi,
  activeFilePath = 'components/App.tsx'
}: HitlDashboardProps) {
  const [tasks, setTasks] = useState<HitlTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  // Active Learning Stats
  const [stats, setStats] = useState<ActiveLearningStats>({
    totalCorrectionsCaptured: 148,
    datasetSizeKb: 2420,
    readinessPercentage: 84,
    correctionsNeededNextEpoch: 16
  });

  const loadHitlQueue = async () => {
    setIsLoading(true);
    try {
      // Try /api/hitl/queue first, fallback to /api/hitl
      let res = await fetch('/api/hitl/queue');
      if (!res.ok) {
        res = await fetch('/api/hitl');
      }
      if (res.ok) {
        const data = await res.json();
        const items: HitlTask[] = data.tasks || [];
        setTasks(items);
        if (data.stats) {
          setStats(data.stats);
        }
        if (items.length > 0) {
          setSelectedTaskId(items[0].id);
          setEditedContent(items[0].originalOutput);
        }
      }
    } catch (err) {
      console.error('Failed to load HITL queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHitlQueue();
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleSelectTask = (task: HitlTask) => {
    setSelectedTaskId(task.id);
    setEditedContent(task.originalOutput);
    setActionNotice(null);
  };

  // ✅ Approve & Apply
  const handleApproveAndApply = async () => {
    if (!selectedTask) return;
    setIsProcessing(true);
    try {
      let res = await fetch('/api/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          taskId: selectedTask.id,
          subjectId: selectedTask.subjectId,
          originalOutput: selectedTask.originalOutput,
          correctedOutput: editedContent,
          filePath: selectedTask.activeFilePath || activeFilePath
        })
      });

      if (!res.ok) {
        res = await fetch('/api/hitl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            taskId: selectedTask.id,
            subjectId: selectedTask.subjectId,
            originalOutput: selectedTask.originalOutput,
            correctedOutput: editedContent
          })
        });
      }

      const targetPath = selectedTask.activeFilePath || activeFilePath || 'components/App.tsx';

      if (onApplyCode) {
        onApplyCode(targetPath, editedContent);
      }

      // Update stats
      setStats(prev => ({
        ...prev,
        totalCorrectionsCaptured: prev.totalCorrectionsCaptured + 1,
        datasetSizeKb: prev.datasetSizeKb + Math.round(editedContent.length / 1024 + 1),
        readinessPercentage: Math.min(100, prev.readinessPercentage + 1),
        correctionsNeededNextEpoch: Math.max(0, prev.correctionsNeededNextEpoch - 1)
      }));

      setActionNotice({
        type: 'success',
        message: `✅ Task ${selectedTask.subjectId} approved! Applied to ${targetPath} and synchronized into Active Learning Golden Dataset.`
      });

      // Remove from queue
      const remaining = tasks.filter(t => t.id !== selectedTask.id);
      setTasks(remaining);
      if (remaining.length > 0) {
        setSelectedTaskId(remaining[0].id);
        setEditedContent(remaining[0].originalOutput);
      } else {
        setSelectedTaskId(null);
        setEditedContent('');
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Failed to approve task. Please check server connection.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔄 Re-route to AI with My Edit
  const handleRerouteToAi = async () => {
    if (!selectedTask) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reroute',
          taskId: selectedTask.id,
          correctedOutput: editedContent,
          feedback: feedbackNotes || 'Refactored code snippet based on human feedback'
        })
      });

      if (onRerouteToAi) {
        onRerouteToAi(selectedTask.suggestedPrompt, editedContent);
      }

      setActionNotice({
        type: 'info',
        message: `🔄 Task ${selectedTask.subjectId} re-routed back to model with human-guided edits.`
      });

      setShowFeedbackModal(false);
      setFeedbackNotes('');

      // Remove or update
      const remaining = tasks.filter(t => t.id !== selectedTask.id);
      setTasks(remaining);
      if (remaining.length > 0) {
        setSelectedTaskId(remaining[0].id);
        setEditedContent(remaining[0].originalOutput);
      } else {
        setSelectedTaskId(null);
        setEditedContent('');
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Failed to re-route task to AI.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 🗑️ Dismiss Job
  const handleDismissJob = async () => {
    if (!selectedTask) return;
    setIsProcessing(true);
    try {
      await fetch('/api/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard', taskId: selectedTask.id })
      });

      setActionNotice({
        type: 'info',
        message: `🗑️ Job ${selectedTask.subjectId} discarded from queue.`
      });

      const remaining = tasks.filter(t => t.id !== selectedTask.id);
      setTasks(remaining);
      if (remaining.length > 0) {
        setSelectedTaskId(remaining[0].id);
        setEditedContent(remaining[0].originalOutput);
      } else {
        setSelectedTaskId(null);
        setEditedContent('');
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Failed to dismiss task.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const filteredTasks = tasks.filter(t =>
    t.subjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.failureReason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Active Learning Database Monitor Scorecard */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 shadow-sm shadow-indigo-950">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">👥 HITL Review & Active Learning Studio</h2>
              <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 font-medium rounded-full border border-indigo-500/30">
                {tasks.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review ungrounded AI drafts, perform manual Monaco edits, and feed golden samples into the active learning dataset.
            </p>
          </div>
        </div>

        {/* Scorecard Metrics */}
        <div className="flex items-center gap-4 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
          {/* Total Corrections */}
          <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <Activity size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Corrections Captured</div>
              <div className="text-sm font-bold text-emerald-300 font-mono">{stats.totalCorrectionsCaptured} samples</div>
            </div>
          </div>

          {/* Dataset Size */}
          <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <Database size={16} className="text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Dataset Size (KB)</div>
              <div className="text-sm font-bold text-cyan-300 font-mono">{stats.datasetSizeKb.toLocaleString()} KB</div>
            </div>
          </div>

          {/* Fine-Tuning Readiness */}
          <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 min-w-[210px]">
            <Cpu size={16} className="text-indigo-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                <span>Fine-Tuning Readiness</span>
                <span className="text-indigo-300 font-mono">{stats.readinessPercentage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.readinessPercentage}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                {stats.correctionsNeededNextEpoch} more corrections to trigger next epoch
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Banner Notification */}
      {actionNotice && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between border-b transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : actionNotice.type === 'info'
              ? 'bg-indigo-950/90 border-indigo-800 text-indigo-200'
              : 'bg-rose-950/90 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={15} className="text-amber-400" />
            )}
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-100 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Main Review Queue Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Queue Selector Sidebar */}
        <div className="w-72 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} /> Review Queue ({filteredTasks.length})
            </span>
            <button
              onClick={loadHitlQueue}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Refresh Queue"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="p-2 border-b border-slate-800/80">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter queue tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
                <span className="text-xs">Fetching review queue...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-emerald-500 opacity-80" />
                <p className="text-xs font-semibold text-slate-300">All Jobs Reviewed!</p>
                <p className="text-[11px] text-slate-500">No low-confidence tasks currently awaiting human review.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = task.id === selectedTaskId;
                return (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                        <Tag size={10} /> {task.subjectId}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          task.confidenceScore < 50
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {task.confidenceScore}% Conf
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-200 line-clamp-1">{task.taskTitle}</div>
                    <div className="text-[10px] text-rose-300/80 bg-rose-950/30 border border-rose-900/40 p-1 rounded line-clamp-2">
                      {task.failureReason}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Split Screen Pending Jobs Viewer */}
        {selectedTask ? (
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Split Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-800 overflow-hidden">
              {/* Left Panel: Prompt, Failed Draft & Compiler Error Logs */}
              <div className="bg-slate-900 flex flex-col overflow-y-auto p-4 gap-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded">
                      {selectedTask.subjectId}
                    </span>
                    <h3 className="text-sm font-bold text-slate-200">{selectedTask.taskTitle}</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Path: {selectedTask.activeFilePath || activeFilePath}
                  </span>
                </div>

                {/* 1. Original User Prompt */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} /> Original User Prompt
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedTask.suggestedPrompt)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                    >
                      {copiedPrompt ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      {copiedPrompt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/80 p-2.5 rounded-lg border border-slate-850">
                    &quot;{selectedTask.suggestedPrompt}&quot;
                  </p>
                </div>

                {/* 2. AI Failed Draft Code */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 flex-1 min-h-[160px]">
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                    <span className="flex items-center gap-1.5">
                      <FileCode size={13} className="text-rose-400" /> AI Unverified Draft Code
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900">
                      Confidence: {selectedTask.confidenceScore}%
                    </span>
                  </div>
                  <pre className="flex-1 overflow-x-auto p-3 bg-rose-950/10 border border-rose-900/30 rounded-lg text-xs font-mono text-rose-200/90 leading-relaxed select-text">
                    {selectedTask.originalOutput}
                  </pre>
                </div>

                {/* 3. Compiler & Validation Error Logs with Red Warnings */}
                <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/60 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                    <span>Compiler &amp; Validation Error Log (Red Warnings)</span>
                  </div>
                  <div className="text-xs text-rose-200 bg-rose-950/60 p-2.5 rounded-lg border border-rose-900/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    <strong className="text-rose-400 block mb-1">Reason: {selectedTask.failureReason}</strong>
                    {selectedTask.compilerLogs || 'TS2339: Property missing on input payload; ungrounded type contract.'}
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Monaco Code Editor Loading Failed Draft */}
              <div className="bg-slate-950 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <FileCode size={15} />
                    <span>Interactive Monaco Editor (Manual Correction)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Language: {selectedTask.language}
                  </span>
                </div>

                {/* Monaco Instance */}
                <div className="flex-1 relative bg-slate-950">
                  <MonacoEditor
                    height="100%"
                    language={selectedTask.language || 'typescript'}
                    theme="vs-dark"
                    value={editedContent}
                    onChange={val => setEditedContent(val || '')}
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      padding: { top: 12, bottom: 12 }
                    }}
                  />
                </div>

                {/* Toolbar below Manual Editor */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={handleDismissJob}
                    disabled={isProcessing}
                    className="px-3 py-2 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <XCircle size={14} /> 🗑️ Dismiss Job
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFeedbackModal(true)}
                      disabled={isProcessing}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <RotateCcw size={14} /> 🔄 Re-route to AI with My Edit
                    </button>

                    <button
                      onClick={handleApproveAndApply}
                      disabled={isProcessing}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      ✅ Approve &amp; Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-slate-950">
            <Users size={48} className="text-slate-800 mb-3" />
            <h3 className="text-base font-bold text-slate-300">No Review Task Selected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Choose a pending low-confidence task from the queue sidebar to inspect compiler logs and perform manual Monaco code corrections.
            </p>
          </div>
        )}
      </div>

      {/* Feedback Modal for Re-routing */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <RotateCcw size={16} className="text-indigo-400" /> Re-route Code to AI
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Provide feedback instructions to send along with your Monaco edits so the AI model can learn from your correction pattern:
            </p>
            <textarea
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              placeholder="e.g. 'Ensure JWT expiry uses seconds conversion and wrap in try/catch'..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-lg focus:outline-none focus:border-indigo-500 resize-none font-sans"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRerouteToAi}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5"
              >
                <Send size={13} /> Send Feedback &amp; Re-generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
