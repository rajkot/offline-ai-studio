'use client';

import React, { useState, useEffect } from 'react';
import {
  Hammer,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronRight,
  Settings
} from 'lucide-react';
import { taskRunnerEngine, VsCodeTask, TaskRunResult } from '@/lib/tasks/taskRunnerEngine';

interface TasksLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceFiles: Record<string, string>;
  onOpenFile?: (filePath: string, line?: number) => void;
  onOpenProblemsTab?: () => void;
}

export default function TasksLauncherModal({
  isOpen,
  onClose,
  workspaceFiles,
  onOpenFile,
  onOpenProblemsTab
}: TasksLauncherModalProps) {
  const [tasks, setTasks] = useState<VsCodeTask[]>([]);
  const [runningTask, setRunningTask] = useState<VsCodeTask | null>(null);
  const [lastResult, setLastResult] = useState<TaskRunResult | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'output' | 'config'>('list');

  useEffect(() => {
    taskRunnerEngine.loadFromWorkspace(workspaceFiles);
    setTasks(taskRunnerEngine.getTasks());

    const unsub = taskRunnerEngine.subscribe((event, data) => {
      if (event === 'started') {
        setRunningTask(data.task);
        setActiveView('output');
      } else if (event === 'completed') {
        setRunningTask(null);
        setLastResult(data);
        setActiveView('output');
      }
    });

    return unsub;
  }, [workspaceFiles]);

  if (!isOpen) return null;

  const defaultBuildTask = taskRunnerEngine.getDefaultBuildTask();

  const handleRunTask = async (task: VsCodeTask) => {
    setActiveView('output');
    setLastResult(null);
    await taskRunnerEngine.runTask(task);
  };

  const handleRunBuild = async () => {
    setActiveView('output');
    setLastResult(null);
    await taskRunnerEngine.runBuildTask();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f1117] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161922] border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Hammer size={16} className="text-amber-400" />
            <span className="font-semibold text-sm text-slate-100 font-mono">VS Code Tasks Runner</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">.vscode/tasks.json</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveView('list')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'list' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setActiveView('output')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'output' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                Output {lastResult && (lastResult.success ? '✓' : '✗')}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Default Build Task Quick Action Pill */}
        {defaultBuildTask && (
          <div className="px-4 py-2.5 bg-amber-950/20 border-b border-amber-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-200 font-mono font-semibold">Default Build Task:</span>
              <span className="text-slate-300 font-mono">{defaultBuildTask.command}</span>
            </div>
            <button
              onClick={handleRunBuild}
              disabled={!!runningTask}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded font-medium text-xs shadow transition-all cursor-pointer"
            >
              {runningTask?.command === defaultBuildTask.command ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>Run Build (Ctrl+Shift+B)</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[500px]">
          {activeView === 'list' && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Configured & Detected Workspace Tasks
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No tasks defined in .vscode/tasks.json or package.json
                </div>
              ) : (
                tasks.map((task) => {
                  const isBuild =
                    (typeof task.group === 'object' && task.group?.kind === 'build') || task.group === 'build';
                  const isTest =
                    (typeof task.group === 'object' && task.group?.kind === 'test') || task.group === 'test';
                  const isDefault = typeof task.group === 'object' && task.group?.isDefault;
                  const isRunning = runningTask?.label === task.label;

                  return (
                    <div
                      key={task.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 font-mono">{task.label}</span>
                          {isBuild && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                              build
                            </span>
                          )}
                          {isTest && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                              test
                            </span>
                          )}
                          {isDefault && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                              default
                            </span>
                          )}
                          {task.problemMatcher && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                              {Array.isArray(task.problemMatcher) ? task.problemMatcher.join(', ') : task.problemMatcher}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">$ {task.command}</div>
                      </div>

                      <button
                        onClick={() => handleRunTask(task)}
                        disabled={!!runningTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-md text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isRunning ? <RefreshCw size={12} className="animate-spin text-indigo-400" /> : <Play size={12} />}
                        <span>{isRunning ? 'Running...' : 'Run'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeView === 'output' && (
            <div className="flex flex-col h-full space-y-3">
              {runningTask && (
                <div className="flex items-center gap-2 p-2.5 bg-indigo-950/40 border border-indigo-500/40 rounded-lg text-xs font-mono text-indigo-200">
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                  <span>Executing task: <strong>{runningTask.label}</strong> ({runningTask.command})...</span>
                </div>
              )}

              {lastResult && (
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-mono ${
                    lastResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {lastResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-rose-400" />
                    )}
                    <span>
                      Task <strong>{lastResult.task.label}</strong> exited with code {lastResult.exitCode} in{' '}
                      {lastResult.durationMs}ms
                    </span>
                  </div>

                  {lastResult.problems && lastResult.problems.length > 0 && (
                    <button
                      onClick={() => {
                        if (onOpenProblemsTab) onOpenProblemsTab();
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle size={12} />
                      <span>{lastResult.problems.length} Problems Found</span>
                    </button>
                  )}
                </div>
              )}

              {/* Terminal Logs Output View */}
              <div className="flex-1 bg-black/80 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-y-auto max-h-[350px] whitespace-pre-wrap select-text">
                {lastResult ? (
                  <>
                    <div className="text-slate-500 mb-2">&gt; {lastResult.task.command}</div>
                    {lastResult.stdout && <div>{lastResult.stdout}</div>}
                    {lastResult.stderr && <div className="text-rose-400 mt-2">{lastResult.stderr}</div>}
                  </>
                ) : runningTask ? (
                  <div className="text-slate-400 flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin text-indigo-400" /> Streaming task output...
                  </div>
                ) : (
                  <div className="text-slate-600 text-center py-8">Select a task above to execute</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#12141c] border-t border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">Ctrl+Shift+B</kbd> to run default build</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
