// Full Interactive DAP (Debug Adapter Protocol) Debugger Panel
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  ArrowRight,
  CornerDownRight,
  CornerUpLeft,
  RotateCw,
  Square,
  Bug,
  Plus,
  Trash2,
  CheckSquare,
  Square as SquareIcon,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  X,
  Eye,
  Layers,
  Terminal,
  Activity,
  Zap,
  Shield,
  HelpCircle
} from 'lucide-react';
import {
  dapDebugger,
  DapBreakpoint,
  DapStackFrame,
  DapVariable,
  DapWatchExpression
} from '@/lib/dapDebuggerEngine';

interface DapDebuggerPanelProps {
  currentFile?: string;
  sourceCode?: string;
  onJumpToLine?: (line: number) => void;
  onOpenFile?: (file: string, line?: number) => void;
}

export default function DapDebuggerPanel({
  currentFile = 'components/Playground.tsx',
  sourceCode,
  onJumpToLine,
  onOpenFile
}: DapDebuggerPanelProps) {
  const [isDebugging, setIsDebugging] = useState(dapDebugger.getIsDebugging());
  const [isPaused, setIsPaused] = useState(dapDebugger.getIsPaused());
  const [activeLine, setActiveLine] = useState(dapDebugger.getActiveLine());
  const [activeFile, setActiveFile] = useState(dapDebugger.getActiveFile());
  const [stackFrames, setStackFrames] = useState<DapStackFrame[]>(dapDebugger.getStackFrames());
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [breakpoints, setBreakpoints] = useState<DapBreakpoint[]>(dapDebugger.getBreakpoints());
  const [watchExpressions, setWatchExpressions] = useState<DapWatchExpression[]>(dapDebugger.getWatchExpressions());
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  // New Breakpoint Form
  const [isAddingBp, setIsAddingBp] = useState(false);
  const [bpLineInput, setBpLineInput] = useState<string>('601');
  const [bpConditionInput, setBpConditionInput] = useState<string>('');
  const [bpLogInput, setBpLogInput] = useState<string>('');
  const [bpType, setBpType] = useState<'standard' | 'conditional' | 'logpoint'>('standard');

  // Inline variable editing
  const [editingVar, setEditingVar] = useState<{ scope: string; name: string; value: string } | null>(null);

  // Debug Console Output Logs
  const [debugLogs, setDebugLogs] = useState<Array<{ text: string; type: 'info' | 'logpoint' | 'event' }>>([
    { text: '[DAP Session] Adapter initialized for Node.js / V8 runtime target', type: 'info' }
  ]);

  // Subscribe to DAP engine events
  const onJumpToLineRef = useRef(onJumpToLine);
  useEffect(() => {
    onJumpToLineRef.current = onJumpToLine;
  }, [onJumpToLine]);

  useEffect(() => {
    const unsubscribe = dapDebugger.subscribe((event, payload) => {
      setIsDebugging(dapDebugger.getIsDebugging());
      setIsPaused(dapDebugger.getIsPaused());
      setActiveLine(dapDebugger.getActiveLine());
      setActiveFile(dapDebugger.getActiveFile());
      setStackFrames(dapDebugger.getStackFrames());
      setBreakpoints(dapDebugger.getBreakpoints());
      setWatchExpressions(dapDebugger.getWatchExpressions());

      if (event === 'stopped') {
        setDebugLogs(prev => [
          ...prev,
          { text: `[STOPPED] Reason: ${payload.reason} at ${payload.file}:${payload.line}`, type: 'event' }
        ]);
        if (onJumpToLineRef.current && payload.line) {
          onJumpToLineRef.current(payload.line);
        }
      } else if (event === 'continued') {
        setDebugLogs(prev => [...prev, { text: '[CONTINUED] Execution resumed', type: 'event' }]);
      } else if (event === 'logpoint_output') {
        setDebugLogs(prev => [
          ...prev,
          { text: `[LOGPOINT ${payload.file}:${payload.line}] ${payload.message}`, type: 'logpoint' }
        ]);
      } else if (event === 'session_started') {
        setDebugLogs(prev => [...prev, { text: `[START] Debug session started for ${payload.file}`, type: 'info' }]);
      } else if (event === 'session_terminated') {
        setDebugLogs(prev => [...prev, { text: '[TERMINATED] Debug session stopped', type: 'info' }]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Execution Controls
  const handleStartOrResume = () => {
    if (!isDebugging) {
      dapDebugger.startDebugging(currentFile, sourceCode);
    } else if (isPaused) {
      dapDebugger.resumeExecution();
    } else {
      dapDebugger.pauseExecution('pause');
    }
  };

  const handleStepOver = () => dapDebugger.stepOver();
  const handleStepInto = () => dapDebugger.stepInto();
  const handleStepOut = () => dapDebugger.stepOut();
  const handleRestart = () => dapDebugger.restart();
  const handleStop = () => dapDebugger.stop();

  // Watch Expression handlers
  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchInput.trim()) {
      dapDebugger.addWatchExpression(newWatchInput);
      setNewWatchInput('');
      setIsAddingWatch(false);
    }
  };

  // Breakpoint Creation
  const handleCreateBreakpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const lineNum = parseInt(bpLineInput, 10);
    if (!isNaN(lineNum) && lineNum > 0) {
      dapDebugger.addBreakpoint(currentFile, lineNum, {
        condition: bpType === 'conditional' ? bpConditionInput : undefined,
        logMessage: bpType === 'logpoint' ? bpLogInput : undefined,
        enabled: true
      });
      setIsAddingBp(false);
      setBpConditionInput('');
      setBpLogInput('');
    }
  };

  // Variable edit submission
  const handleSaveVarEdit = () => {
    if (editingVar) {
      dapDebugger.updateVariableValue(editingVar.scope, editingVar.name, editingVar.value);
      setEditingVar(null);
    }
  };

  const currentFrame = stackFrames[selectedFrameIndex] || stackFrames[0];

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Controls Toolbar (F5, F10, F11, Shift+F11, Shift+F5) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {/* Play / Pause (F5) */}
          <button
            onClick={handleStartOrResume}
            title={!isDebugging ? 'Start Debugging (F5)' : isPaused ? 'Continue (F5)' : 'Pause (F5)'}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            {!isDebugging || isPaused ? (
              <>
                <Play size={13} className="fill-white" />
                <span>{isDebugging ? 'Continue (F5)' : 'Start (F5)'}</span>
              </>
            ) : (
              <>
                <Pause size={13} className="fill-white" />
                <span>Pause (F5)</span>
              </>
            )}
          </button>

          {/* Step Over (F10) */}
          <button
            onClick={handleStepOver}
            disabled={!isDebugging}
            title="Step Over (F10)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ArrowRight size={14} className="text-blue-400" />
          </button>

          {/* Step Into (F11) */}
          <button
            onClick={handleStepInto}
            disabled={!isDebugging}
            title="Step Into (F11)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <CornerDownRight size={14} className="text-emerald-400" />
          </button>

          {/* Step Out (Shift+F11) */}
          <button
            onClick={handleStepOut}
            disabled={!isDebugging}
            title="Step Out (Shift+F11)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <CornerUpLeft size={14} className="text-amber-400" />
          </button>

          {/* Restart (Ctrl+Shift+F5) */}
          <button
            onClick={handleRestart}
            disabled={!isDebugging}
            title="Restart Debug Session (Ctrl+Shift+F5)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <RotateCw size={14} className="text-purple-400" />
          </button>

          {/* Stop (Shift+F5) */}
          <button
            onClick={handleStop}
            disabled={!isDebugging}
            title="Stop Debugging (Shift+F5)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/60 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Square size={14} className="fill-rose-500 text-rose-500" />
          </button>
        </div>

        {/* State Badge */}
        <div className="flex items-center gap-2">
          {isDebugging ? (
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 ${
              isPaused ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
              {isPaused ? `PAUSED line ${activeLine}` : 'RUNNING'}
            </div>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">IDLE</span>
          )}
        </div>
      </div>

      {/* Main Panels Grid (Split View) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Section 1: Dynamic Watch Expressions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Eye size={13} className="text-indigo-400" /> Watch Expressions
            </span>
            <button
              onClick={() => setIsAddingWatch(true)}
              className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Add Watch Expression"
            >
              <Plus size={12} />
            </button>
          </div>

          {isAddingWatch && (
            <form onSubmit={handleAddWatch} className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
              <input
                type="text"
                value={newWatchInput}
                onChange={(e) => setNewWatchInput(e.target.value)}
                placeholder="Expression (e.g. data.length, state.count)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 outline-none"
                autoFocus
              />
              <button type="submit" className="p-1 bg-indigo-600 rounded text-white"><Check size={12} /></button>
              <button type="button" onClick={() => setIsAddingWatch(false)} className="p-1 bg-slate-800 rounded text-slate-400"><X size={12} /></button>
            </form>
          )}

          <div className="p-2 divide-y divide-slate-800/60 font-mono text-xs">
            {watchExpressions.map(w => (
              <div key={w.id} className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-indigo-300 font-semibold">{w.expression}:</span>
                <span className="text-slate-300 truncate">{w.value}</span>
                <span className="text-[10px] text-slate-500">({w.type})</span>
                <button
                  onClick={() => dapDebugger.removeWatchExpression(w.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {watchExpressions.length === 0 && (
              <div className="text-center py-3 text-slate-500 text-xs font-sans">
                No watch expressions. Click + to evaluate dynamic variables.
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Variable Scope Inspector (Local, Closure, Global) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" /> Variable Scopes
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Frame: {currentFrame?.name.split(' ')[0] || 'Top'}
            </span>
          </div>

          <div className="p-3 space-y-3 font-mono text-xs">
            {currentFrame?.scopes.map(scope => (
              <div key={scope.name} className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1">
                  <ChevronDown size={12} /> {scope.name} Scope
                </div>
                <div className="pl-3 border-l-2 border-slate-800 space-y-1">
                  {scope.variables.map(v => (
                    <div key={v.name} className="flex items-center justify-between group py-0.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-indigo-300">{v.name}:</span>
                        {editingVar?.name === v.name && editingVar.scope === scope.name ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingVar.value}
                              onChange={(e) => setEditingVar({ ...editingVar, value: e.target.value })}
                              className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs text-amber-300 outline-none"
                              autoFocus
                            />
                            <button onClick={handleSaveVarEdit} className="text-emerald-400"><Check size={11} /></button>
                            <button onClick={() => setEditingVar(null)} className="text-slate-400"><X size={11} /></button>
                          </div>
                        ) : (
                          <span className={`truncate ${
                            v.type === 'string' ? 'text-amber-300' :
                            v.type === 'number' ? 'text-emerald-400' :
                            v.type === 'boolean' ? 'text-purple-400' :
                            'text-slate-300'
                          }`}>
                            {v.value}
                          </span>
                        )}
                      </div>

                      {v.canEdit && !editingVar && (
                        <button
                          onClick={() => setEditingVar({ scope: scope.name, name: v.name, value: v.value })}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity p-0.5"
                          title="Mutate variable value live"
                        >
                          <Edit2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(!currentFrame || currentFrame.scopes.length === 0) && (
              <div className="text-center py-4 text-slate-500 text-xs font-sans">
                Start debugging (F5) to inspect variable scopes.
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Call Stack Tree */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-400" /> Call Stack Tree
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Thread #1: Main</span>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {stackFrames.map((frame, idx) => (
              <div
                key={frame.id}
                onClick={() => {
                  setSelectedFrameIndex(idx);
                  dapDebugger.setCurrentFrameIndex(idx);
                }}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                  selectedFrameIndex === idx ? 'bg-indigo-950/50 border-l-2 border-indigo-500' : 'hover:bg-slate-850'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="text-slate-200 font-semibold truncate">{frame.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {frame.file}:{frame.line}:{frame.column}
                  </div>
                </div>
                {selectedFrameIndex === idx && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-200 font-sans font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
            ))}
            {stackFrames.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-xs font-sans">
                No active call stack.
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Breakpoints Manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Bug size={13} className="text-rose-400" /> Breakpoints ({breakpoints.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAddingBp(true)}
                className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Add Breakpoint"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => dapDebugger.clearAllBreakpoints()}
                className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Clear All Breakpoints"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {isAddingBp && (
            <form onSubmit={handleCreateBreakpoint} className="p-3 bg-slate-950 border-b border-slate-800 space-y-2 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Line:</span>
                <input
                  type="number"
                  value={bpLineInput}
                  onChange={(e) => setBpLineInput(e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                />
                <select
                  value={bpType}
                  onChange={(e: any) => setBpType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="standard">Standard Line</option>
                  <option value="conditional">Conditional</option>
                  <option value="logpoint">Logpoint</option>
                </select>
              </div>

              {bpType === 'conditional' && (
                <input
                  type="text"
                  placeholder="Condition expression (e.g. telemetrySpeed > 100)"
                  value={bpConditionInput}
                  onChange={(e) => setBpConditionInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                />
              )}

              {bpType === 'logpoint' && (
                <input
                  type="text"
                  placeholder="Log message (e.g. Health check speed={telemetrySpeed})"
                  value={bpLogInput}
                  onChange={(e) => setBpLogInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                />
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsAddingBp(false)} className="px-2 py-1 bg-slate-800 rounded text-slate-400">Cancel</button>
                <button type="submit" className="px-2 py-1 bg-indigo-600 rounded text-white font-semibold">Add</button>
              </div>
            </form>
          )}

          <div className="p-2 divide-y divide-slate-800/60 font-mono text-xs">
            {breakpoints.map(bp => (
              <div key={bp.id} className="py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <button
                    onClick={() => dapDebugger.updateBreakpoint(bp.id, { enabled: !bp.enabled })}
                    className="text-rose-500 cursor-pointer"
                  >
                    {bp.enabled ? <CheckSquare size={13} /> : <SquareIcon size={13} className="text-slate-600" />}
                  </button>
                  <span
                    onClick={() => {
                      if (onJumpToLine) onJumpToLine(bp.line);
                    }}
                    className="text-slate-200 hover:text-indigo-400 cursor-pointer truncate"
                  >
                    {bp.file.split('/').pop()}:{bp.line}
                  </span>
                  {bp.condition && (
                    <span className="text-[10px] px-1 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                      cond: {bp.condition}
                    </span>
                  )}
                  {bp.logMessage && (
                    <span className="text-[10px] px-1 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                      log: {bp.logMessage}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => dapDebugger.removeBreakpoint(bp.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: DAP Debug Console Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Terminal size={13} className="text-emerald-400" /> DAP Debug Console
            </span>
            <button onClick={() => setDebugLogs([])} className="text-slate-500 hover:text-white text-xs">
              Clear
            </button>
          </div>
          <div className="p-3 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1 bg-slate-950">
            {debugLogs.map((log, i) => (
              <div
                key={i}
                className={
                  log.type === 'logpoint'
                    ? 'text-blue-300 font-bold'
                    : log.type === 'event'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }
              >
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
