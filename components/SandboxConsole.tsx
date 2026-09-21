'use client';

import React, { useState, useEffect, useRef } from 'react';
import SelfHealingConsole from '@/client/components/SelfHealingConsole';
import { 
  Play, 
  Square, 
  Trash2, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw, 
  Sparkles, 
  Wrench, 
  Cpu, 
  Check, 
  ChevronRight, 
  ShieldAlert,
  Zap,
  Flame,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface TerminalLogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'command' | 'success';
  text: string;
  timestamp: string;
}

interface SandboxConsoleProps {
  onRunTask?: () => void;
  onKillProcess?: () => void;
  onClearOutput?: () => void;
  onAutoFixTriggered?: (errorText: string) => void;
}

export default function SandboxConsole({
  onRunTask,
  onKillProcess,
  onClearOutput,
  onAutoFixTriggered
}: SandboxConsoleProps) {
  const [logs, setLogs] = useState<TerminalLogEntry[]>([
    { id: '1', type: 'system', text: '⚡ Node.js sandbox runner initialized (v20.12.0 LTS). Ready for test tasks.', timestamp: '10:14:02' },
    { id: '2', type: 'command', text: '$ npm run test:pipeline', timestamp: '10:14:03' },
    { id: '3', type: 'stdout', text: ' PASS  src/__tests__/pipeline.spec.ts', timestamp: '10:14:04' },
    { id: '4', type: 'stdout', text: '  ✓ AST Tokenizer properly emits semantic token stream (14ms)', timestamp: '10:14:04' },
    { id: '5', type: 'stdout', text: '  ✓ Reciprocal Rank Fusion computes BM25 + Vector ranking (22ms)', timestamp: '10:14:05' },
    { id: '6', type: 'stderr', text: ' FAIL  src/__tests__/sandbox-runtime.spec.ts', timestamp: '10:14:06' },
    { id: '7', type: 'stderr', text: '● Sandbox Runtime Execution › Uncaught TypeError: Cannot read properties of undefined (reading \'executeAsyncWorker\')', timestamp: '10:14:06' },
    { id: '8', type: 'stderr', text: '    at SandboxCoordinator.invoke (/app/runtime/sandbox.ts:42:18)', timestamp: '10:14:06' },
    { id: '9', type: 'stderr', text: '    at Object.test (/app/src/__tests__/sandbox-runtime.spec.ts:15:23)', timestamp: '10:14:06' },
    { id: '10', type: 'stderr', text: 'npm ERR! Test failed. See above for more details. exit status 1', timestamp: '10:14:06' }
  ]);

  const [inputCommand, setInputCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSelfHealing, setIsSelfHealing] = useState(false);
  const [healingAttempt, setHealingAttempt] = useState(1);
  const [healingStep, setHealingStep] = useState<number>(0);
  const [isHealedSuccess, setIsHealedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'healing'>('terminal');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isSelfHealing]);

  // Handle Run Task
  const handleRunTask = () => {
    setIsRunning(true);
    setIsHealedSuccess(false);
    const newLogId = Date.now().toString();
    const timeStr = new Date().toLocaleTimeString();

    setLogs(prev => [
      ...prev,
      { id: `${newLogId}-cmd`, type: 'command', text: '$ npm test', timestamp: timeStr },
      { id: `${newLogId}-1`, type: 'stdout', text: '> offline-ai-ide@0.1.0 test', timestamp: timeStr },
      { id: `${newLogId}-2`, type: 'stdout', text: '> vitest run --reporter=verbose', timestamp: timeStr }
    ]);

    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        { id: `${Date.now()}-3`, type: 'stdout', text: ' ✓ components/GraphRagVisualizer.test.ts (2 tests) 34ms', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-4`, type: 'stdout', text: ' ✓ lib/swarm-consensus.test.ts (4 tests) 58ms', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-5`, type: 'stderr', text: ' ✗ app/api/pipeline/stream/route.test.ts > TypeError: Unexpected token in JSON at position 18', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-6`, type: 'stderr', text: '    at JSON.parse (<anonymous>)\n    at POST (/app/api/pipeline/stream/route.ts:42:15)', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-7`, type: 'stderr', text: 'Tests: 2 failed, 6 passed, 8 total', timestamp: new Date().toLocaleTimeString() }
      ]);
      setIsRunning(false);
    }, 1200);

    if (onRunTask) onRunTask();
  };

  // Handle Kill Process
  const handleKillProcess = () => {
    setIsRunning(false);
    setIsSelfHealing(false);
    setLogs(prev => [
      ...prev,
      { id: Date.now().toString(), type: 'system', text: '🛑 Process terminated via SIGKILL signal from user console.', timestamp: new Date().toLocaleTimeString() }
    ]);
    if (onKillProcess) onKillProcess();
  };

  // Handle Clear
  const handleClear = () => {
    setLogs([]);
    setIsHealedSuccess(false);
    if (onClearOutput) onClearOutput();
  };

  // Start Self-Healing Loop Simulation
  const handleTriggerSelfHealing = (errorSnippet: string) => {
    setIsSelfHealing(true);
    setHealingAttempt(1);
    setHealingStep(0);
    setIsHealedSuccess(false);
    setActiveTab('healing');

    if (onAutoFixTriggered) {
      onAutoFixTriggered(errorSnippet);
    }

    // Step 0: Extracting error stack trace
    setTimeout(() => {
      setHealingStep(1);
    }, 800);

    // Step 1: Generating code patch via 3-Agent consensus
    setTimeout(() => {
      setHealingStep(2);
    }, 2000);

    // Step 2: Hot-patching workspace file
    setTimeout(() => {
      setHealingStep(3);
    }, 3200);

    // Step 3: Re-executing terminal tests
    setTimeout(() => {
      setHealingStep(4);
      setIsSelfHealing(false);
      setIsHealedSuccess(true);
      setLogs(prev => [
        ...prev,
        { id: `${Date.now()}-h1`, type: 'system', text: '🛠️ [Self-Healing Engine] Hot-patch applied to /app/runtime/sandbox.ts and /app/api/pipeline/stream/route.ts', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-h2`, type: 'command', text: '$ npm test (Verification Run)', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-h3`, type: 'success', text: ' PASS  src/__tests__/sandbox-runtime.spec.ts', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-h4`, type: 'success', text: ' PASS  app/api/pipeline/stream/route.test.ts', timestamp: new Date().toLocaleTimeString() },
        { id: `${Date.now()}-h5`, type: 'success', text: '✨ All 8 test suites passed with 100% invariant validation (0 errors, 0 warnings).', timestamp: new Date().toLocaleTimeString() }
      ]);
    }, 4500);
  };

  // Render Formatted Log Line
  const renderLogLine = (log: TerminalLogEntry) => {
    switch (log.type) {
      case 'command':
        return (
          <div className="flex items-start gap-2 text-cyan-300 font-bold py-0.5">
            <span className="text-slate-500 select-none text-[10px]">{log.timestamp}</span>
            <span className="text-indigo-400 select-none">&gt;</span>
            <span className="font-mono">{log.text}</span>
          </div>
        );
      case 'stderr': {
        const isErrorLine = log.text.includes('FAIL') || log.text.includes('TypeError') || log.text.includes('ERR!') || log.text.includes('failed');
        return (
          <div className="flex items-start justify-between gap-2 text-rose-300 bg-rose-950/20 px-2 py-0.5 rounded border-l-2 border-rose-500 my-0.5 group">
            <div className="flex items-start gap-2">
              <span className="text-slate-500 select-none text-[10px]">{log.timestamp}</span>
              <pre className="font-mono whitespace-pre-wrap break-all text-rose-200">{log.text}</pre>
            </div>
            {isErrorLine && !isSelfHealing && (
              <button
                onClick={() => handleTriggerSelfHealing(log.text)}
                className="opacity-90 hover:opacity-100 bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md shrink-0 transition-all active:scale-95 animate-pulse"
                title="Trigger automated 3-agent error healing loop"
              >
                <Zap size={11} /> 🛠️ Auto-Heal
              </button>
            )}
          </div>
        );
      }
      case 'stdout':
        return (
          <div className="flex items-start gap-2 text-emerald-300 py-0.5">
            <span className="text-slate-600 select-none text-[10px]">{log.timestamp}</span>
            <pre className="font-mono whitespace-pre-wrap break-all text-emerald-400">{log.text}</pre>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded border-l-2 border-emerald-500 my-0.5">
            <span className="text-slate-500 select-none text-[10px]">{log.timestamp}</span>
            <pre className="font-mono whitespace-pre-wrap break-all font-semibold">{log.text}</pre>
          </div>
        );
      case 'system':
      default:
        return (
          <div className="flex items-start gap-2 text-amber-300/90 py-0.5 bg-amber-950/10 px-2 rounded">
            <span className="text-slate-600 select-none text-[10px]">{log.timestamp}</span>
            <span className="font-mono text-amber-200">{log.text}</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs overflow-hidden select-none">
      {/* Top Header & Process Control Buttons */}
      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Terminal size={15} />
            </div>
            <span>🖥️ Sandbox Terminal Console</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-sans">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : isSelfHealing ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-slate-400 font-mono">
              {isRunning ? 'Status: RUNNING' : isSelfHealing ? 'Status: SELF-HEALING' : 'Status: IDLE'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTask}
            disabled={isRunning || isSelfHealing}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-sans font-bold flex items-center gap-1.5 text-xs transition-all shadow-sm active:scale-95"
          >
            <Play size={12} fill="currentColor" /> ▶️ Run Task
          </button>

          <button
            onClick={handleKillProcess}
            disabled={!isRunning && !isSelfHealing}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg font-sans font-bold flex items-center gap-1.5 text-xs transition-all shadow-sm active:scale-95"
          >
            <Square size={12} fill="currentColor" /> ⏹ Kill Process
          </button>

          <button
            onClick={handleClear}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-sans font-medium flex items-center gap-1.5 text-xs transition-colors"
          >
            <Trash2 size={13} /> 🧹 Clear Output
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-2 flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer ${
            activeTab === 'terminal'
              ? 'bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🖥️ Terminal Stream
        </button>
        <button
          onClick={() => setActiveTab('healing')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'healing'
              ? 'bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>🛠️ Self-Healing Console</span>
          {isSelfHealing && (
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping inline-block" />
          )}
        </button>
      </div>

      {/* Success Notification Banner */}
      {isHealedSuccess && !isSelfHealing && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/60 px-4 py-2 flex items-center justify-between text-xs text-emerald-300 font-sans animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span className="font-bold">Auto-Healing Succeeded! All AST invariants and test suites verified clean.</span>
          </div>
          <button 
            onClick={() => setIsHealedSuccess(false)}
            className="text-emerald-400 hover:text-emerald-200 text-[11px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'healing' ? (
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
          <SelfHealingConsole
            errorLog={logs.filter(l => l.type === 'stderr').map(l => l.text).join('\n') || undefined}
            filePath="app/runtime/sandbox.ts"
            onAcceptMerge={(patchCode) => {
              setIsSelfHealing(false);
              setIsHealedSuccess(true);
              setActiveTab('terminal');
              setLogs(prev => [
                ...prev,
                { id: `${Date.now()}-h1`, type: 'system', text: '🛠️ [Self-Healing Engine] Hot-patch merged into /app/runtime/sandbox.ts', timestamp: new Date().toLocaleTimeString() },
                { id: `${Date.now()}-h2`, type: 'command', text: '$ npm test (Post-Merge Verification)', timestamp: new Date().toLocaleTimeString() },
                { id: `${Date.now()}-h3`, type: 'success', text: ' PASS  src/__tests__/sandbox-runtime.spec.ts (6 passed, 0 failed)', timestamp: new Date().toLocaleTimeString() },
                { id: `${Date.now()}-h4`, type: 'success', text: '✨ Code self-healing merge verified clean in sandbox runtime.', timestamp: new Date().toLocaleTimeString() }
              ]);
            }}
            onHealed={(patchCode) => {
              setIsHealedSuccess(true);
            }}
            onCancel={() => {
              setIsSelfHealing(false);
              setActiveTab('terminal');
            }}
            autoTrigger={isSelfHealing}
          />
        </div>
      ) : (
        /* Terminal Main Stream Area */
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-slate-950">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 font-sans py-12">
            <Terminal size={24} className="text-slate-700" />
            <p className="text-xs">Terminal is clean. Click &quot;▶️ Run Task&quot; or execute bash commands.</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id}>
              {renderLogLine(log)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      )}

      {/* Interactive Command Input Line */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <span className="text-emerald-400 font-bold select-none">$</span>
        <input
          type="text"
          value={inputCommand}
          onChange={e => setInputCommand(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && inputCommand.trim()) {
              const timeStr = new Date().toLocaleTimeString();
              const cmd = inputCommand.trim();
              setLogs(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'command', text: `$ ${cmd}`, timestamp: timeStr }
              ]);
              setInputCommand('');

              // Mock quick execution feedback
              if (cmd.startsWith('npm test') || cmd.startsWith('vitest')) {
                setTimeout(() => {
                  setLogs(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'stdout', text: ' PASS  app/test/e2e.spec.ts (100% tests passed)', timestamp: new Date().toLocaleTimeString() }
                  ]);
                }, 500);
              } else if (cmd === 'clear') {
                handleClear();
              } else {
                setTimeout(() => {
                  setLogs(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'stdout', text: `Command completed with exit code 0. [${cmd}]`, timestamp: new Date().toLocaleTimeString() }
                  ]);
                }, 300);
              }
            }
          }}
          placeholder="Execute sandbox command (e.g., npm test, vitest, npm run lint, clear)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={() => {
            if (!inputCommand.trim()) return;
            const timeStr = new Date().toLocaleTimeString();
            const cmd = inputCommand.trim();
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), type: 'command', text: `$ ${cmd}`, timestamp: timeStr }
            ]);
            setInputCommand('');
            setTimeout(() => {
              setLogs(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'stdout', text: `Command completed with exit code 0. [${cmd}]`, timestamp: new Date().toLocaleTimeString() }
              ]);
            }, 300);
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-sans font-bold text-xs transition-colors"
        >
          Execute
        </button>
      </div>
    </div>
  );
}
