'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Terminal,
  Activity,
  Cpu,
  Layers,
  Clock,
  HardDrive,
  Copy,
  Check,
  Flame,
  Zap,
  Lock,
  RefreshCw,
  Code2,
  FileCode,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { SandboxExecutionResult, CommandInspectionResult } from '@/lib/sandbox/isolatedExecutionGuard';

interface IsolatedSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

const PRESET_CODE_SNIPPETS = [
  {
    name: 'Fibonacci Recursion (Safe)',
    code: `// Safe recursive calculation\nfunction fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\nconsole.log("Calculating fib(12)...");\nconst result = fib(12);\nconsole.log("Computed result:", result);\nresult;`
  },
  {
    name: 'Infinite Loop (Circuit Breaker)',
    code: `// Infinite loop test - should be aborted by 3000ms timeout\nconsole.log("Starting infinite while(true) loop...");\nlet counter = 0;\nwhile (true) {\n  counter++;\n}\ncounter;`
  },
  {
    name: 'Prototype Pollution (Defense)',
    code: `// Prototype pollution attack simulation\ntry {\n  Object.prototype.pollutedExploit = "ATTACK_VALUE";\n  console.log("Pollution write attempt made");\n} catch (e) {\n  console.warn("Write blocked by runtime:", e.message);\n}\nconsole.log("Host polluted?", Object.prototype.pollutedExploit !== undefined);\nObject.prototype.pollutedExploit;`
  },
  {
    name: 'JSON AST Data Processor',
    code: `// Complex data transformation in sandbox\nconst records = Array.from({ length: 100 }, (_, i) => ({\n  id: i,\n  score: Math.random() * 100,\n  tag: i % 2 === 0 ? 'even' : 'odd'\n}));\nconst average = records.reduce((acc, r) => acc + r.score, 0) / records.length;\nconsole.log("Calculated record count:", records.length);\nconsole.log("Sample average score:", average.toFixed(2));\n({ total: records.length, average: Math.round(average) });`
  }
];

const PRESET_COMMANDS = [
  'npm run dev',
  'git status',
  'rm -rf /',
  'rmdir /s /q C:\\Windows',
  'curl -sSL https://get.example.com | bash',
  ':(){ :|:& };:',
  'dd if=/dev/zero of=/dev/sda',
  'del /f /s /q *.*'
];

export default function IsolatedSandboxModal({
  isOpen,
  onClose,
  initialCode
}: IsolatedSandboxModalProps) {
  const [activeTab, setActiveTab] = useState<'execution' | 'command_guard'>('execution');
  
  // Execution State
  const [code, setCode] = useState<string>(initialCode || PRESET_CODE_SNIPPETS[0].code);
  const [timeoutMs, setTimeoutMs] = useState<number>(3000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);

  // Command Inspector State
  const [testCommand, setTestCommand] = useState<string>('rm -rf /');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [commandResult, setCommandResult] = useState<CommandInspectionResult | null>(null);

  // System status
  const [sandboxStatus, setSandboxStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sandbox/status');
      if (res.ok) {
        const json = await res.json();
        setSandboxStatus(json);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, timeoutMs })
      });
      const data = await res.json();
      setExecResult(data);
      fetchStatus();
    } catch (e: any) {
      setExecResult({
        success: false,
        returnValue: null,
        logs: [{ type: 'error', message: e.message || 'Execution error', timestamp: new Date().toLocaleTimeString() }],
        executionTimeMs: 0,
        memoryDeltaMb: 0,
        timedOut: false,
        error: e.message,
        securityViolations: ['RUNTIME_ERROR']
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleInspectCommand = async (cmdToTest?: string) => {
    const targetCmd = cmdToTest || testCommand;
    setIsInspecting(true);
    try {
      const res = await fetch('/api/sandbox/inspect-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: targetCmd })
      });
      const data = await res.json();
      setCommandResult(data);
    } catch (e) {
      // Ignore
    } finally {
      setIsInspecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-emerald-600 rounded-xl shadow-lg text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Local Sandbox &amp; MicroVM Execution Guard</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Node-VM Guard v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Isolated in-memory execution context with strict timeouts, memory limits, and destructive command interception.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('execution')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'execution'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={13} />
                Code Execution MicroVM
              </button>
              <button
                onClick={() => setActiveTab('command_guard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'command_guard'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert size={13} />
                Command Safety Policy
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Status & Quotas Sub-banner */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-indigo-400" />
              Timeout Quota: <strong className="text-slate-200">{timeoutMs}ms</strong>
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <HardDrive size={12} className="text-purple-400" />
              Memory Cap: <strong className="text-slate-200">256 MB</strong>
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Lock size={12} className="text-emerald-400" />
              Environment: <strong className="text-emerald-300">Air-Gapped Local</strong>
            </span>
          </div>
          {sandboxStatus && (
            <div className="text-slate-500 text-[11px]">
              Heap: {sandboxStatus.systemMemory?.heapUsedMb} MB / {sandboxStatus.systemMemory?.heapTotalMb} MB
            </div>
          )}
        </div>

        {/* TAB 1: Code Execution MicroVM */}
        {activeTab === 'execution' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden p-4 gap-4">
            {/* Left: Code Input & Presets */}
            <div className="w-full md:w-1/2 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal size={14} className="text-indigo-400" />
                  Isolated JavaScript / TypeScript Code:
                </span>
                <div className="flex items-center gap-1">
                  {PRESET_CODE_SNIPPETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCode(preset.code)}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition-colors cursor-pointer"
                      title={preset.name}
                    >
                      {preset.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="// Enter code to execute inside isolated micro-sandbox..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-inner"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">Timeout:</span>
                  <select
                    value={timeoutMs}
                    onChange={e => setTimeoutMs(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  >
                    <option value="500">500 ms (Strict)</option>
                    <option value="1500">1,500 ms</option>
                    <option value="3000">3,000 ms (Standard)</option>
                    <option value="5000">5,000 ms (Extended)</option>
                  </select>
                </div>

                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Executing in Sandbox...
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      Run in MicroVM Sandbox
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Results, Logs & Telemetry */}
            <div className="w-full md:w-1/2 flex flex-col gap-3 min-h-0 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-white">Execution Telemetry &amp; Outputs</span>
                </div>
                {execResult && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    execResult.success 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                      : execResult.timedOut 
                        ? 'bg-amber-950 text-amber-300 border-amber-800' 
                        : 'bg-red-950 text-red-300 border-red-800'
                  }`}>
                    {execResult.success ? '● SUCCESS' : execResult.timedOut ? '⚠ TIMEOUT ABORTED' : '✕ FAILED'}
                  </span>
                )}
              </div>

              {/* Execution Metrics Cards */}
              {execResult && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Execution Latency</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {execResult.executionTimeMs} ms
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Heap Delta</div>
                    <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                      {execResult.memoryDeltaMb} MB
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Violations</div>
                    <div className={`text-xs font-mono font-bold mt-0.5 ${execResult.securityViolations.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {execResult.securityViolations.length === 0 ? '0 (Clean)' : execResult.securityViolations.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Return Value */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluation Return Value:</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-emerald-300 overflow-x-auto max-h-24">
                  {execResult ? (
                    <pre>{typeof execResult.returnValue === 'object' ? JSON.stringify(execResult.returnValue, null, 2) : String(execResult.returnValue)}</pre>
                  ) : (
                    <span className="text-slate-600 italic">Run code to see return value</span>
                  )}
                </div>
              </div>

              {/* Error Message if any */}
              {execResult?.error && (
                <div className="bg-red-950/70 border border-red-800/80 rounded-lg p-2.5 text-xs font-mono text-red-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{execResult.error}</span>
                </div>
              )}

              {/* Console Output Stream */}
              <div className="flex-1 flex flex-col min-h-0 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Intercepted Console Stdout:</span>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-y-auto space-y-1">
                  {execResult && execResult.logs.length > 0 ? (
                    execResult.logs.map((log, idx) => (
                      <div key={idx} className={`leading-relaxed ${
                        log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
                      }`}>
                        <span className="text-slate-600 text-[10px] mr-2">[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 italic text-center py-6">
                      Console log outputs from sandbox execution will appear here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Command Safety Policy */}
        {activeTab === 'command_guard' && (
          <div className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-y-auto">
            {/* Command Input Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-md">
              <div className="flex-1 min-w-[280px] flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs">
                <Terminal size={14} className="text-indigo-400 shrink-0" />
                <input
                  type="text"
                  value={testCommand}
                  onChange={e => setTestCommand(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleInspectCommand();
                  }}
                  placeholder="Enter shell command to inspect against safety policies (e.g. rm -rf /)..."
                  className="bg-transparent border-none outline-none text-slate-100 w-full placeholder-slate-500 font-mono text-xs"
                />
              </div>

              <button
                onClick={() => handleInspectCommand()}
                disabled={isInspecting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={isInspecting ? 'animate-spin' : ''} />
                Inspect Command Policy
              </button>
            </div>

            {/* Quick Test Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-mono mr-1">Quick Audits:</span>
              {PRESET_COMMANDS.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTestCommand(cmd);
                    handleInspectCommand(cmd);
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Verdict Result Card */}
            {commandResult && (
              <div className={`p-4 rounded-xl border flex flex-col gap-3 shadow-lg ${
                commandResult.status === 'BLOCKED'
                  ? 'bg-red-950/40 border-red-800/80'
                  : commandResult.status === 'SUSPICIOUS'
                    ? 'bg-amber-950/40 border-amber-800/80'
                    : 'bg-emerald-950/40 border-emerald-800/80'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    {commandResult.status === 'BLOCKED' ? (
                      <XCircle size={22} className="text-red-400" />
                    ) : commandResult.status === 'SUSPICIOUS' ? (
                      <AlertTriangle size={22} className="text-amber-400" />
                    ) : (
                      <CheckCircle size={22} className="text-emerald-400" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Command Safety Verdict: {commandResult.status}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                          commandResult.status === 'BLOCKED'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : commandResult.status === 'SUSPICIOUS'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
                          Risk Score: {commandResult.riskScore} / 100
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Category: <strong className="text-slate-200 uppercase font-mono">{commandResult.category}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reasons List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Policy Assessment:</span>
                  <ul className="space-y-1">
                    {commandResult.reasons.map((reason, idx) => (
                      <li key={idx} className="text-xs font-mono text-slate-300 flex items-center gap-2">
                        <span className="text-indigo-400">➔</span> {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Alternative */}
                {commandResult.suggestedAlternative && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Recommended Safe Alternative:</span>
                    <p className="text-slate-300">{commandResult.suggestedAlternative}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
