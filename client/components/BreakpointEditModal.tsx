'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Sliders, MessageSquare, Flame } from 'lucide-react';
import { DapBreakpoint } from '@/lib/dapDebuggerEngine';

interface BreakpointEditModalProps {
  breakpoint: DapBreakpoint | null;
  filePath: string;
  line: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: {
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
    enabled: boolean;
  }) => void;
  onRemove: () => void;
}

export default function BreakpointEditModal({
  breakpoint,
  filePath,
  line,
  isOpen,
  onClose,
  onSave,
  onRemove
}: BreakpointEditModalProps) {
  const [type, setType] = useState<'standard' | 'expression' | 'hitCount' | 'logpoint'>('standard');
  const [condition, setCondition] = useState('');
  const [hitCondition, setHitCondition] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (breakpoint?.logMessage) {
        setType('logpoint');
        setLogMessage(breakpoint.logMessage);
      } else if (breakpoint?.hitCondition) {
        setType('hitCount');
        setHitCondition(breakpoint.hitCondition);
      } else if (breakpoint?.condition) {
        setType('expression');
        setCondition(breakpoint.condition);
      } else {
        setType('standard');
      }
      setCondition(breakpoint?.condition || '');
      setHitCondition(breakpoint?.hitCondition || '');
      setLogMessage(breakpoint?.logMessage || '');
      setEnabled(breakpoint?.enabled ?? true);
    }
  }, [isOpen, breakpoint]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      condition: type === 'expression' ? condition : undefined,
      hitCondition: type === 'hitCount' ? hitCondition : undefined,
      logMessage: type === 'logpoint' ? logMessage : undefined,
      enabled
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-[#18181b] border border-rose-500/50 rounded-xl shadow-2xl overflow-hidden text-xs text-zinc-200">
        {/* Modal Header */}
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <h3 className="font-semibold text-white">
              Breakpoint Settings: <span className="font-mono text-zinc-400">{filePath.split('/').pop()}:{line}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Breakpoint Type Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Breakpoint Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('standard')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'standard'
                    ? 'bg-rose-950/60 border-rose-600 text-rose-200 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Standard</span>
              </button>

              <button
                type="button"
                onClick={() => setType('expression')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'expression'
                    ? 'bg-amber-950/60 border-amber-600 text-amber-200 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Expression</span>
              </button>

              <button
                type="button"
                onClick={() => setType('hitCount')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'hitCount'
                    ? 'bg-purple-950/60 border-purple-600 text-purple-200 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Flame size={12} className="text-purple-400" />
                <span>Hit Count</span>
              </button>

              <button
                type="button"
                onClick={() => setType('logpoint')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'logpoint'
                    ? 'bg-cyan-950/60 border-cyan-600 text-cyan-200 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <MessageSquare size={12} className="text-cyan-400" />
                <span>Logpoint</span>
              </button>
            </div>
          </div>

          {/* Conditional Input */}
          {type === 'expression' && (
            <div>
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Expression Condition (pauses only when true)
              </label>
              <input
                type="text"
                placeholder="e.g. x === 42 || telemetrySpeed > 100"
                value={condition}
                onChange={e => setCondition(e.target.value)}
                className="w-full h-8 bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded px-2.5 font-mono text-zinc-100 outline-none text-xs"
                autoFocus
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Evaluated in local scope. Execution will only pause when truthy.
              </span>
            </div>
          )}

          {type === 'hitCount' && (
            <div>
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                Hit Count Condition
              </label>
              <input
                type="text"
                placeholder="e.g. > 5 or == 10"
                value={hitCondition}
                onChange={e => setHitCondition(e.target.value)}
                className="w-full h-8 bg-zinc-950 border border-zinc-700 focus:border-purple-500 rounded px-2.5 font-mono text-zinc-100 outline-none text-xs"
                autoFocus
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Pauses only after this breakpoint has been hit a specified number of times.
              </span>
            </div>
          )}

          {type === 'logpoint' && (
            <div>
              <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Log Message (does not pause execution)
              </label>
              <input
                type="text"
                placeholder="e.g. Iteration {loopCounter}: telemetrySpeed is {telemetrySpeed}"
                value={logMessage}
                onChange={e => setLogMessage(e.target.value)}
                className="w-full h-8 bg-zinc-950 border border-zinc-700 focus:border-cyan-500 rounded px-2.5 font-mono text-zinc-100 outline-none text-xs"
                autoFocus
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Expressions inside &#123;curlies&#125; are evaluated and logged directly to Debug Console.
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check size={12} />
              <span>Save Breakpoint</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
