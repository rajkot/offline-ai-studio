'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Play,
  Square,
  Shield,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  ShieldAlert,
  Code2,
  X,
  RefreshCw
} from 'lucide-react';
import {
  autonomousAgentEngine,
  AutonomousAgentState,
  AgentCheckpoint,
  AgentStepLog,
  AgentPermissionMode
} from '@/lib/ai/autonomousAgentEngine';

interface AutonomousAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: string;
  allFiles: Record<string, string>;
  onApplyFileUpdate?: (path: string, content: string) => Promise<void> | void;
}

export default function AutonomousAgentModal({
  isOpen,
  onClose,
  activeFile,
  allFiles,
  onApplyFileUpdate
}: AutonomousAgentModalProps) {
  const [state, setState] = useState<AutonomousAgentState>(autonomousAgentEngine.getState());
  const [prompt, setPrompt] = useState('');
  const [testCommand, setTestCommand] = useState('npm test');
  const [selectedFile, setSelectedFile] = useState(activeFile);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedFile(activeFile);
  }, [activeFile]);

  useEffect(() => {
    const unsub = autonomousAgentEngine.subscribe((newState) => {
      setState(newState);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.logs.length]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (!prompt.trim()) return;
    autonomousAgentEngine.startSession({
      prompt: prompt.trim(),
      testCommand: testCommand.trim() || 'npm test',
      activeFile: selectedFile || Object.keys(allFiles)[0] || 'index.ts',
      allFiles,
      permissionMode: state.permissionMode,
      maxIterations: 6,
      onApplyFileUpdate
    });
  };

  const handleAbort = () => {
    autonomousAgentEngine.abortSession();
  };

  const handleRollbackSession = () => {
    if (confirm('Revert all files modified during this autonomous agent session back to initial baseline?')) {
      autonomousAgentEngine.rollbackSession();
    }
  };

  const handleRollbackCheckpoint = (cpId: string) => {
    autonomousAgentEngine.rollbackToCheckpoint(cpId);
  };

  const togglePermissionMode = (mode: AgentPermissionMode) => {
    autonomousAgentEngine.setPermissionMode(mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Autonomous Agent Mode
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono">
                  Claude Code / Devin Self-Healing Loop
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Iterative loop: Prompt ➔ Plan ➔ Write Code ➔ Run Test ➔ Catch Error ➔ Auto-Patch ➔ Re-Test
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Permission Mode Selector */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => togglePermissionMode('full_autonomous')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                  state.permissionMode === 'full_autonomous'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Executes shell commands and patches automatically without pausing"
              >
                <Zap size={13} />
                <span>Full Autonomous</span>
              </button>

              <button
                onClick={() => togglePermissionMode('guarded')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                  state.permissionMode === 'guarded'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Prompts for human approval before running terminal commands or modifying files"
              >
                <Shield size={13} />
                <span>Guarded (HITL)</span>
              </button>
            </div>

            {/* 1-Click Session Rollback */}
            {state.checkpoints.length > 1 && (
              <button
                onClick={handleRollbackSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
                title="1-Click Undo: Revert all files back to pre-session state"
              >
                <RotateCcw size={13} />
                <span>Rollback Session</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Guarded Human-in-the-Loop Confirmation Banner */}
        {state.currentPendingPermission && (
          <div className="bg-amber-950/90 border-b border-amber-600/80 p-4 flex items-center justify-between text-amber-100 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Human Confirmation Required
                  </span>
                  <span className="text-[10px] bg-amber-900 px-2 py-0.5 rounded border border-amber-700 font-mono">
                    {state.currentPendingPermission.type === 'terminal_command' ? 'Terminal Command' : 'File Patch'}
                  </span>
                </div>
                <div className="text-sm font-mono text-white mt-0.5">
                  {state.currentPendingPermission.type === 'terminal_command' ? (
                    <code>{state.currentPendingPermission.command}</code>
                  ) : (
                    <span>Patch target: <code>{state.currentPendingPermission.filePath}</code></span>
                  )}
                </div>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  {state.currentPendingPermission.reason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={state.currentPendingPermission.approve}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Approve &amp; Continue</span>
              </button>
              <button
                onClick={state.currentPendingPermission.reject}
                className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg border border-rose-700/50 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <XCircle size={14} />
                <span>Reject</span>
              </button>
              <button
                onClick={() => {
                  togglePermissionMode('full_autonomous');
                  state.currentPendingPermission?.approve();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-600 cursor-pointer"
                title="Approve and switch to Full Autonomous mode for remaining steps"
              >
                <Zap size={13} className="inline mr-1 text-yellow-400" />
                <span>Switch to Full Auto</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Configuration & Checkpoints */}
          <div className="w-80 border-r border-slate-800 p-4 flex flex-col gap-4 bg-slate-950/40">
            {/* Task Prompt Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Objective / Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={state.isActive}
                rows={3}
                placeholder="e.g. Implement input validation on login form, fix TS errors, and ensure tests pass"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Test Command Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Verification Test Command
              </label>
              <input
                type="text"
                value={testCommand}
                onChange={(e) => setTestCommand(e.target.value)}
                disabled={state.isActive}
                placeholder="npm test"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['npm test', 'npx tsc --noEmit', 'node test.js'].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => setTestCommand(cmd)}
                    disabled={state.isActive}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Target File */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Target File
              </label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                disabled={state.isActive}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {Object.keys(allFiles).map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div>
              {!state.isActive ? (
                <button
                  onClick={handleStart}
                  disabled={!prompt.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Launch Self-Healing Agent</span>
                </button>
              ) : (
                <button
                  onClick={handleAbort}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square size={14} fill="currentColor" />
                  <span>Abort Session</span>
                </button>
              )}
            </div>

            {/* Checkpoint Rollback Tree */}
            <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>Checkpoint Tree ({state.checkpoints.length})</span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {state.checkpoints.map((cp, idx) => (
                  <div
                    key={cp.id}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                        {cp.testPassed ? (
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        ) : cp.exitCode !== undefined ? (
                          <XCircle size={12} className="text-rose-400 shrink-0" />
                        ) : (
                          <Sparkles size={12} className="text-indigo-400 shrink-0" />
                        )}
                        <span className="truncate">{cp.label}</span>
                      </span>
                      <button
                        onClick={() => handleRollbackCheckpoint(cp.id)}
                        className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded transition-colors"
                        title="Revert workspace files to this checkpoint"
                      >
                        Revert
                      </button>
                    </div>
                    {cp.commandExecuted && (
                      <span className="font-mono text-[10px] text-slate-500 truncate">
                        {cp.commandExecuted} {cp.exitCode !== undefined ? `(exit ${cp.exitCode})` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Execution Loop & Terminal Logs */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Phase Status Tracker Bar */}
            <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-slate-400">
                  Status:{' '}
                  <span className="font-bold text-white uppercase tracking-wider">
                    {state.phase.replace('_', ' ')}
                  </span>
                </span>
                {state.iteration > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono">
                    Iteration {state.iteration} / {state.maxIterations}
                  </span>
                )}
              </div>

              {state.isActive && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Agent loop active...</span>
                </div>
              )}
            </div>

            {/* Step Logs Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs custom-scrollbar">
              {state.logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                  <Bot size={36} className="mb-3 text-slate-700" />
                  <p className="font-semibold text-slate-400">Autonomous Agent is Idle</p>
                  <p className="text-xs max-w-sm mt-1">
                    Enter your goal and verification command on the left, then click &quot;Launch Self-Healing Agent&quot; to begin.
                  </p>
                </div>
              ) : (
                state.logs.map((log) => {
                  let badgeBg = 'bg-slate-800 text-slate-300';
                  let icon = <Bot size={13} />;

                  if (log.type === 'plan') {
                    badgeBg = 'bg-indigo-950 text-indigo-300 border border-indigo-700/50';
                    icon = <Sparkles size={13} className="text-indigo-400" />;
                  } else if (log.type === 'code') {
                    badgeBg = 'bg-cyan-950 text-cyan-300 border border-cyan-700/50';
                    icon = <Code2 size={13} className="text-cyan-400" />;
                  } else if (log.type === 'command') {
                    badgeBg = 'bg-amber-950 text-amber-300 border border-amber-700/50';
                    icon = <Terminal size={13} className="text-amber-400" />;
                  } else if (log.type === 'error') {
                    badgeBg = 'bg-rose-950 text-rose-300 border border-rose-700/50';
                    icon = <AlertTriangle size={13} className="text-rose-400" />;
                  } else if (log.type === 'success') {
                    badgeBg = 'bg-emerald-950 text-emerald-300 border border-emerald-700/50';
                    icon = <CheckCircle2 size={13} className="text-emerald-400" />;
                  } else if (log.type === 'rollback') {
                    badgeBg = 'bg-purple-950 text-purple-300 border border-purple-700/50';
                    icon = <RotateCcw size={13} className="text-purple-400" />;
                  }

                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${badgeBg}`}>
                            {icon}
                            <span>{log.type}</span>
                          </span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                        <span className="text-[10px] text-slate-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {log.details && (
                        <div>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            <span>{isExpanded ? 'Hide Trace Details' : 'View Trace / Diff'}</span>
                          </button>

                          {isExpanded && (
                            <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {log.details}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
