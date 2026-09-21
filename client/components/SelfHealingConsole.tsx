'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wrench,
  RotateCw,
  Check,
  AlertTriangle,
  Play,
  Terminal as TerminalIcon,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Bug,
  GitMerge,
  Code2,
  Copy,
  ChevronDown,
  ChevronUp,
  Activity,
  FileCheck
} from 'lucide-react';

export interface SelfHealingConsoleProps {
  errorLog?: string;
  filePath?: string;
  onHealed?: (patchCode: string) => void;
  onAcceptMerge?: (patchCode: string) => void;
  onCancel?: () => void;
  autoTrigger?: boolean;
}

interface StreamEventLog {
  id: string;
  timestamp: string;
  phase: number;
  message: string;
  type: 'info' | 'agent' | 'patch' | 'test' | 'success' | 'warn';
}

export default function SelfHealingConsole({
  errorLog = "FAIL  src/__tests__/sandbox-runtime.spec.ts\nTypeError: Cannot read properties of undefined (reading 'executeAsyncWorker')\n    at SandboxCoordinator.invoke (/app/runtime/sandbox.ts:42:18)\n    at Object.test (/app/src/__tests__/sandbox-runtime.spec.ts:15:23)\nnpm ERR! Test failed. See above for more details. exit status 1",
  filePath = "app/runtime/sandbox.ts",
  onHealed,
  onAcceptMerge,
  onCancel,
  autoTrigger = true
}: SelfHealingConsoleProps) {
  const [isActive, setIsActive] = useState(autoTrigger);
  const [attempt, setAttempt] = useState(1);
  const [phase, setPhase] = useState<number>(0); // 0 to 4
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isMergeAccepted, setIsMergeAccepted] = useState(false);
  const [showPatchDiff, setShowPatchDiff] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [streamLogs, setStreamLogs] = useState<StreamEventLog[]>([]);
  const streamEndRef = useRef<HTMLDivElement>(null);

  const mockResolvedPatch = useMemo(() => {
    return `// [AI SELF-HEAL HOT PATCH APPLIED - Invariant Safe]\n// Fixed: TypeError: Cannot read properties of undefined (reading 'executeAsyncWorker')\n// File: ${filePath}\n\nexport class SandboxCoordinator {\n  private defaultWorker = {\n    executeAsyncWorker: async () => ({\n      status: 'success',\n      exitCode: 0,\n      durationMs: 18\n    })\n  };\n\n  public async invoke(worker?: { executeAsyncWorker?: () => Promise<any> }) {\n    // Guard against undefined worker instance\n    const activeWorker = worker && typeof worker.executeAsyncWorker === 'function'\n      ? worker\n      : this.defaultWorker;\n\n    try {\n      return await activeWorker.executeAsyncWorker();\n    } catch (err) {\n      console.warn('[SandboxCoordinator] Fallback to safe execution buffer:', err);\n      return this.defaultWorker.executeAsyncWorker();\n    }\n  }\n}`;
  }, [filePath]);

  // Parse terminal logs with high-contrast formatting
  const processedErrorLogs = useMemo(() => {
    const lines = errorLog.split('\n');
    return lines.map((line, idx) => {
      let colorClass = 'text-zinc-300';
      let bgClass = '';

      if (
        line.includes('FAIL') ||
        line.includes('TypeError') ||
        line.includes('ERR!') ||
        line.includes('failed') ||
        line.includes('Error:')
      ) {
        colorClass = 'text-rose-400 font-semibold';
        bgClass = 'bg-rose-950/30 px-1.5 rounded';
      } else if (
        line.includes('PASS') ||
        line.includes('success') ||
        line.includes('passed') ||
        line.includes('✓')
      ) {
        colorClass = 'text-emerald-400 font-semibold';
        bgClass = 'bg-emerald-950/30 px-1.5 rounded';
      } else if (line.includes('warning') || line.includes('WARN') || line.includes('Pending')) {
        colorClass = 'text-amber-400 font-semibold';
        bgClass = 'bg-amber-950/30 px-1.5 rounded';
      } else if (line.includes('at ')) {
        colorClass = 'text-rose-300/80 italic pl-4';
      }

      return { text: line, colorClass, bgClass, id: idx };
    });
  }, [errorLog]);

  // Auto-scroll stream logs
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamLogs]);

  // Progress Streaming & Multi-Phase Autonomous Self-Healing Pipeline
  useEffect(() => {
    if (!isActive || isCompleted) return;

    // Reset stream logs for new attempt
    const initialTime = new Date().toLocaleTimeString();
    setStreamLogs([
      {
        id: 'evt-0',
        timestamp: initialTime,
        phase: 0,
        message: `Analyzing stack trace frame in ${filePath}...`,
        type: 'info'
      }
    ]);
    setProgressPercent(8);

    const timer1 = setTimeout(() => {
      setPhase(1);
      setProgressPercent(28);
      setStreamLogs((prev) => [
        ...prev,
        {
          id: `evt-1-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 1,
          message:
            "Detected Uncaught TypeError: Cannot read properties of undefined (reading 'executeAsyncWorker')",
          type: 'warn'
        },
        {
          id: `evt-2-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 1,
          message: 'Dispatching AST frame to Triad Consensus (Generator -> Reviewer -> Auditor)...',
          type: 'agent'
        }
      ]);
    }, 1100);

    const timer2 = setTimeout(() => {
      setPhase(2);
      setProgressPercent(55);
      setStreamLogs((prev) => [
        ...prev,
        {
          id: `evt-3-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 2,
          message:
            'Synthesizing defensive null-safe fallback handler in SandboxCoordinator.invoke()',
          type: 'patch'
        },
        {
          id: `evt-4-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 2,
          message: 'Code Reviewer: Invariant validated (100% pure typed AST generated).',
          type: 'agent'
        }
      ]);
    }, 2400);

    const timer3 = setTimeout(() => {
      setPhase(3);
      setProgressPercent(82);
      setStreamLogs((prev) => [
        ...prev,
        {
          id: `evt-5-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 3,
          message: 'Applying hot-patch to sandbox container virtual mount point...',
          type: 'info'
        },
        {
          id: `evt-6-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 3,
          message: 'Executing sandbox test suite: vitest run src/__tests__/sandbox-runtime.spec.ts',
          type: 'test'
        }
      ]);
    }, 3800);

    const timer4 = setTimeout(() => {
      setPhase(4);
      setProgressPercent(100);
      setIsCompleted(true);
      setIsSuccessful(true);
      setStreamLogs((prev) => [
        ...prev,
        {
          id: `evt-7-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 4,
          message: 'PASS: 6 of 6 sandbox assertions validated. Zero runtime errors detected.',
          type: 'success'
        },
        {
          id: `evt-8-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          phase: 4,
          message: '🛠️ Self-Healing verification concluded successfully.',
          type: 'success'
        }
      ]);

      if (onHealed) {
        onHealed(mockResolvedPatch);
      }
    }, 5100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isActive, isCompleted, filePath, mockResolvedPatch, onHealed]);

  const handleAcceptMergeClick = () => {
    setIsMergeAccepted(true);
    if (onAcceptMerge) {
      onAcceptMerge(mockResolvedPatch);
    } else if (onHealed) {
      onHealed(mockResolvedPatch);
    }
  };

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(mockResolvedPatch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const triggerRetry = () => {
    if (attempt < 3) {
      setAttempt((prev) => prev + 1);
      setPhase(0);
      setProgressPercent(5);
      setIsCompleted(false);
      setIsSuccessful(false);
      setIsMergeAccepted(false);
      setIsActive(true);
    }
  };

  const steps = [
    { label: 'Extracting error stack trace & AST frame...', id: 'extract' },
    { label: 'Routing logs to 3-Agent Verifier Triad...', id: 'route' },
    { label: 'Synthesizing defensive null-safe patch...', id: 'generate' },
    { label: 'Running regression tests in sandbox...', id: 'verify' }
  ];

  return (
    <div
      className="bg-[#09090c] border border-zinc-800 rounded-2xl overflow-hidden font-sans shadow-2xl relative max-w-5xl mx-auto w-full text-zinc-100 flex flex-col"
      id="self-healing-console"
    >
      {/* Top Console Header */}
      <div className="bg-[#111115] border-b border-zinc-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-700/80 rounded-xl text-indigo-400 shadow-sm">
            <Wrench size={18} className={isActive && !isCompleted ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                🛠️ Autonomous Self-Healing Resolver
              </span>
              <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-[10px] font-mono font-bold">
                Attempt {attempt} of 3
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                  isCompleted && isSuccessful
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : isActive
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCompleted && isSuccessful
                      ? 'bg-emerald-400'
                      : isActive
                      ? 'bg-cyan-400 animate-ping'
                      : 'bg-zinc-500'
                  }`}
                />
                {isCompleted && isSuccessful ? 'RESOLVED' : isActive ? 'STREAMING FIX' : 'IDLE'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              Target File:{' '}
              <span className="font-mono text-zinc-200 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                {filePath}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isActive && !isCompleted && (
            <button
              onClick={() => setIsActive(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Play size={12} fill="currentColor" /> Start Self-Healing
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Real-time Progress Streaming Header Bar */}
      <div className="bg-[#131318] border-b border-zinc-800/80 px-5 py-3 shrink-0">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-400 animate-pulse" />
            <span className="font-bold text-zinc-300">Live Progress Stream</span>
            <span className="text-[11px] text-zinc-500">
              (Phase {Math.min(phase + 1, 4)} of 4: {steps[Math.min(phase, 3)]?.label})
            </span>
          </div>
          <span className="text-xs font-black text-cyan-400 font-mono">
            {progressPercent}%
          </span>
        </div>

        {/* Streaming Progress Bar */}
        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850 relative">
          <div
            className={`h-full transition-all duration-500 ${
              isCompleted && isSuccessful
                ? 'bg-linear-to-r from-emerald-500 to-teal-400'
                : 'bg-linear-to-r from-indigo-500 via-cyan-400 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* PROMINENT SUCCESS NOTIFICATION BANNER (When background fix resolves compile error) */}
      {isCompleted && isSuccessful && (
        <div
          id="self-healed-success-banner"
          className="bg-emerald-950/80 border-b border-emerald-700/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200 font-sans shadow-lg animate-in fade-in slide-in-from-top-2 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/90 border border-emerald-600 rounded-xl text-emerald-300 shrink-0">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-black text-emerald-200 tracking-tight flex items-center gap-2">
                <span>🛠️ Code Self-Healed Successfully in Sandbox!</span>
              </div>
              <p className="text-[11px] text-emerald-300/90 mt-0.5">
                AST null-check assertion applied to <span className="font-mono font-bold text-white bg-emerald-900/60 px-1 py-0.5 rounded">{filePath}</span>. All 6 sandbox regression test suites passing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-accept-code-merge"
              onClick={handleAcceptMergeClick}
              disabled={isMergeAccepted}
              className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                isMergeAccepted
                  ? 'bg-emerald-500 text-black border border-emerald-300 font-black cursor-default'
                  : 'bg-white hover:bg-zinc-100 text-black border border-white hover:border-zinc-200'
              }`}
            >
              {isMergeAccepted ? (
                <>
                  <Check size={14} strokeWidth={3} />
                  <span>✅ Code Merged into Workspace</span>
                </>
              ) : (
                <>
                  <GitMerge size={14} />
                  <span>[Accept Code Merge]</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPatchDiff(!showPatchDiff)}
              className="px-3 py-2 bg-emerald-900/70 hover:bg-emerald-800/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code2 size={13} />
              <span>{showPatchDiff ? 'Hide Patch Diff' : 'View Patch Diff'}</span>
              {showPatchDiff ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Main Console Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 flex-1 overflow-hidden">
        {/* Left Side: Step Checklist & Progress Stream Logs */}
        <div className="lg:col-span-5 p-4 bg-[#0c0c0f] flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
          {/* Step Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                Autonomous Healing Pipeline
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Phase {Math.min(phase + 1, 4)} / 4
              </span>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => {
                const isPast = phase > idx;
                const isCurrent = phase === idx;

                return (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all duration-300 ${
                      isPast
                        ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                        : isCurrent
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500'
                    }`}
                  >
                    {isPast ? (
                      <div className="p-0.5 bg-emerald-500/20 rounded-full text-emerald-400 shrink-0">
                        <Check size={13} strokeWidth={3} />
                      </div>
                    ) : isCurrent ? (
                      <div className="p-0.5 bg-indigo-500/20 rounded-full text-indigo-400 animate-spin shrink-0">
                        <RotateCw size={13} />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-700 shrink-0" />
                    )}

                    <span className={`text-xs font-mono ${isCurrent ? 'font-bold text-white' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Streamed Event Log */}
          <div className="flex-1 flex flex-col min-h-[180px] space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <TerminalIcon size={12} className="text-purple-400" />
              Streamed Event Stream
            </span>

            <div className="flex-1 bg-black/70 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] space-y-1.5 overflow-y-auto custom-scrollbar max-h-[220px]">
              {streamLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-zinc-600 text-[10px] select-none shrink-0 pt-0.5">
                    {log.timestamp}
                  </span>
                  <span
                    className={`select-none font-bold shrink-0 ${
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'agent'
                        ? 'text-purple-400'
                        : log.type === 'patch'
                        ? 'text-cyan-400'
                        : 'text-indigo-400'
                    }`}
                  >
                    ›
                  </span>
                  <span
                    className={`break-words ${
                      log.type === 'success'
                        ? 'text-emerald-300 font-bold'
                        : log.type === 'warn'
                        ? 'text-amber-300 font-semibold'
                        : log.type === 'agent'
                        ? 'text-purple-300'
                        : log.type === 'patch'
                        ? 'text-cyan-200'
                        : 'text-zinc-300'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={streamEndRef} />
            </div>
          </div>
        </div>

        {/* Right Side: Stack Frame Trace & Interactive Hot-Patch Diff */}
        <div className="lg:col-span-7 p-4 flex flex-col space-y-4 overflow-y-auto custom-scrollbar bg-[#09090c]">
          {/* Top Half: Original Error Stack Trace (stderr) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5">
                <Bug size={12} className="text-rose-400" />
                Raw Error Stack Capture
              </span>
              <span className="text-rose-400 font-bold">exit status 1</span>
            </div>

            <div className="bg-black border border-zinc-800 rounded-xl p-3 font-mono text-xs overflow-x-auto max-h-[140px] custom-scrollbar">
              {processedErrorLogs.map((log) => (
                <div key={log.id} className={`${log.bgClass} flex items-start gap-2 py-0.5`}>
                  <span className="text-zinc-700 text-[10px] select-none min-w-[18px] text-right">
                    {log.id + 1}
                  </span>
                  <pre className={`whitespace-pre-wrap break-all ${log.colorClass} font-mono flex-1 text-[11px]`}>
                    {log.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Half: Generated Hot-Patch Diff Preview */}
          {showPatchDiff && (
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck size={12} />
                  Resolved AST Hot-Patch Preview
                </span>
                <button
                  onClick={handleCopyPatch}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 transition-colors cursor-pointer"
                >
                  {copiedPatch ? <Check size={10} /> : <Copy size={10} />}
                  <span>{copiedPatch ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed max-h-[220px] custom-scrollbar">
                <pre>
                  <code>{mockResolvedPatch}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Fallback Failure Retry Option */}
          {isCompleted && !isSuccessful && attempt < 3 && (
            <div className="p-3 bg-rose-950/30 border border-rose-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-rose-300">
                <XCircle size={15} />
                <span>Healing attempt {attempt} did not converge.</span>
              </div>
              <button
                onClick={triggerRetry}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw size={12} /> Retry Next Attempt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
