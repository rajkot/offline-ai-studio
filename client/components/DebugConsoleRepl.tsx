'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { dapDebugger } from '@/lib/dapDebuggerEngine';

interface ConsoleLogItem {
  id: string;
  type: 'input' | 'result' | 'error' | 'logpoint' | 'system';
  content: string;
  timestamp: string;
}

export default function DebugConsoleRepl() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<ConsoleLogItem[]>([
    {
      id: 'init_1',
      type: 'system',
      content: 'Debug Console REPL initialized. Evaluate expressions in the active scope or inspect variables.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = dapDebugger.subscribe((event, payload) => {
      const ts = new Date().toLocaleTimeString();
      if (event === 'logpoint_output') {
        setLogs(prev => [
          ...prev,
          {
            id: `log_${Date.now()}_${Math.random()}`,
            type: 'logpoint',
            content: `[Logpoint ${payload.file}:${payload.line}] ${payload.message}`,
            timestamp: ts
          }
        ]);
      } else if (event === 'stopped') {
        setLogs(prev => [
          ...prev,
          {
            id: `stop_${Date.now()}_${Math.random()}`,
            type: 'system',
            content: `Paused on ${payload.file}:${payload.line} (${payload.reason})`,
            timestamp: ts
          }
        ]);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const ts = new Date().toLocaleTimeString();
    const inputItem: ConsoleLogItem = {
      id: `in_${Date.now()}`,
      type: 'input',
      content: trimmed,
      timestamp: ts
    };

    const evalResult = dapDebugger.evaluateExpression(trimmed);
    const resultItem: ConsoleLogItem = {
      id: `out_${Date.now()}`,
      type: evalResult.error ? 'error' : 'result',
      content: evalResult.error ? `Error: ${evalResult.error}` : evalResult.result || 'undefined',
      timestamp: ts
    };

    setLogs(prev => [...prev, inputItem, resultItem]);
    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f] border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Console Header */}
      <div className="p-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-zinc-400 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] text-zinc-200">
          <Terminal size={13} className="text-rose-400" />
          <span>Debug Console (REPL)</span>
        </div>
        <button
          onClick={() => setLogs([])}
          className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Clear Console"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Console Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar select-text">
        {logs.map(log => {
          if (log.type === 'input') {
            return (
              <div key={log.id} className="flex items-start gap-1.5 text-indigo-300">
                <span className="text-zinc-500 select-none">&gt;</span>
                <span className="font-semibold">{log.content}</span>
              </div>
            );
          } else if (log.type === 'result') {
            return (
              <div key={log.id} className="flex items-start gap-1.5 text-emerald-300 pl-3">
                <span className="text-zinc-600 select-none">&lt;</span>
                <span>{log.content}</span>
              </div>
            );
          } else if (log.type === 'error') {
            return (
              <div key={log.id} className="flex items-start gap-1.5 text-rose-400 pl-3">
                <span>✕ {log.content}</span>
              </div>
            );
          } else if (log.type === 'logpoint') {
            return (
              <div key={log.id} className="flex items-start gap-1.5 text-cyan-300 pl-2 bg-cyan-950/20 py-0.5 rounded border-l-2 border-cyan-500">
                <span>{log.content}</span>
              </div>
            );
          } else {
            return (
              <div key={log.id} className="text-zinc-500 text-[10px] italic">
                {log.content}
              </div>
            );
          }
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-1.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-1.5 shrink-0">
        <span className="text-rose-400 font-bold pl-1">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Evaluate variable or expression..."
          className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-xs font-mono"
        />
        <button
          type="submit"
          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Execute (Enter)"
        >
          <CornerDownLeft size={12} />
        </button>
      </form>
    </div>
  );
}
