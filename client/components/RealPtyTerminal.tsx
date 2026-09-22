'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { TerminalErrorContext, terminalAutoPatcher } from '@/lib/ai/terminalAutoPatcher';
import { problemMatcherEngine } from '@/lib/tasks/problemMatcherEngine';
import TerminalAiFixModal from './TerminalAiFixModal';

interface RealPtyTerminalProps {
  className?: string;
  onTitleChange?: (title: string) => void;
  workspaceFiles?: Record<string, string>;
  onBatchApplyFiles?: (files: Record<string, string>) => void;
}

export default function RealPtyTerminal({
  className = '',
  onTitleChange,
  workspaceFiles,
  onBatchApplyFiles
}: RealPtyTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [selectedShell, setSelectedShell] = useState<string>('powershell.exe');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [detectedError, setDetectedError] = useState<TerminalErrorContext | null>(null);
  const [isFixModalOpen, setIsFixModalOpen] = useState<boolean>(false);
  const currentCommandLineRef = useRef<string>('');
  const outputBufferRef = useRef<string>('');
  const [availableShells, setAvailableShells] = useState<Array<{ id: string; name: string; command: string }>>([
    { id: 'powershell', name: 'Windows PowerShell', command: 'powershell.exe' },
    { id: 'cmd', name: 'Command Prompt', command: 'cmd.exe' },
    { id: 'wsl', name: 'WSL2 (Linux)', command: 'wsl.exe' },
    { id: 'bash', name: 'Git Bash', command: 'bash.exe' }
  ]);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current) return;

    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#030712', // gray-950
        foreground: '#f3f4f6',
        cursor: '#6366f1',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#111827',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f9fafb',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      allowProposedApi: true,
      scrollback: 5000
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    connectPtyWebSocket(term, fitAddon, selectedShell);
  }, [selectedShell]);

  const connectPtyWebSocket = async (term: XTerm, fitAddon: FitAddon, shellCmd: string) => {
    setConnectionStatus('connecting');

    // 1. Ensure WebSocket daemon is listening
    try {
      await fetch('/api/terminal/pty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-server' })
      });
    } catch (e) {
      console.warn('[RealPtyTerminal] Server ensure warning:', e);
    }

    const wsUrl = `ws://${window.location.hostname || 'localhost'}:3002`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
        ws.send(JSON.stringify({
          type: 'init',
          shell: shellCmd,
          cols: dims.cols,
          rows: dims.rows
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            term.write(msg.data);
            outputBufferRef.current += msg.data;
            if (outputBufferRef.current.length > 50000) {
              outputBufferRef.current = outputBufferRef.current.slice(-30000);
            }

            // Real-time compiler problem matcher
            problemMatcherEngine.processAndSyncTerminalOutput(msg.data, true);

            // Check for failures and extract error context
            if (terminalAutoPatcher.hasFailure(outputBufferRef.current)) {
              const ctx = terminalAutoPatcher.extractErrorContext(
                outputBufferRef.current,
                workspaceFiles || {},
                currentCommandLineRef.current
              );
              if (ctx) {
                setDetectedError(ctx);
              }
            }
          } else if (msg.type === 'ready') {
            if (onTitleChange) onTitleChange(msg.shell || shellCmd);
          }
        } catch (e) {
          term.write(event.data);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
      };

      term.onData((data) => {
        if (data === '\r' || data.includes('\r')) {
          if (currentCommandLineRef.current.trim().length > 1) {
            setDetectedError(null);
          }
          currentCommandLineRef.current = '';
        } else if (data === '\u007F' || data === '\b') {
          currentCommandLineRef.current = currentCommandLineRef.current.slice(0, -1);
        } else if (data.length === 1 && data >= ' ') {
          currentCommandLineRef.current += data;
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });
    } catch (err: any) {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    initTerminal();

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: dims.cols,
            rows: dims.rows
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [initTerminal]);

  const handleSwitchShell = (shellCmd: string) => {
    setSelectedShell(shellCmd);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const dims = fitAddonRef.current?.proposeDimensions() || { cols: 80, rows: 24 };
      wsRef.current.send(JSON.stringify({
        type: 'switch_shell',
        shell: shellCmd,
        cols: dims.cols,
        rows: dims.rows
      }));
    } else {
      initTerminal();
    }
  };

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleRestart = () => {
    initTerminal();
  };

  return (
    <div className={`flex flex-col h-full bg-[#030712] overflow-hidden ${className}`}>
      {/* Terminal Control Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0b0f19] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <TerminalIcon size={13} className="text-indigo-400" />
            <span className="font-bold">Real PTY Shell</span>
          </div>

          {/* Shell Switcher Dropdown */}
          <div className="flex items-center bg-slate-900 border border-slate-700/60 rounded-md px-2 py-0.5">
            <select
              value={selectedShell}
              onChange={(e) => handleSwitchShell(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              {availableShells.map((sh) => (
                <option key={sh.id} value={sh.command} className="bg-slate-900 text-white">
                  {sh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400">
              {connectionStatus === 'connected'
                ? 'PTY Online (WebSocket)'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Glowing Fix with AI Button (Cursor & Windsurf innovation) */}
          {detectedError && (
            <button
              onClick={() => setIsFixModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-[11px] rounded-full shadow-lg shadow-purple-900/50 border border-purple-300/60 animate-pulse transition-all cursor-pointer"
              title={`Fix ${detectedError.targetFile}:${detectedError.line} with AI`}
            >
              <Sparkles size={12} className="text-amber-300 animate-spin" />
              <span>Fix with AI</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-black/40 rounded-full font-normal border border-white/20">
                {detectedError.targetFile.split('/').pop()}:{detectedError.line}
              </span>
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Terminal (Ctrl+L)"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={handleRestart}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Restart PTY Shell"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div ref={terminalRef} className="flex-1 w-full h-full p-2 overflow-hidden" />

      {/* Terminal AI Auto-Patcher Modal */}
      <TerminalAiFixModal
        isOpen={isFixModalOpen}
        errorContext={detectedError}
        workspaceFiles={workspaceFiles || {}}
        onClose={() => setIsFixModalOpen(false)}
        onApplyFix={(filePath, updatedContent) => {
          if (onBatchApplyFiles) {
            onBatchApplyFiles({ [filePath]: updatedContent });
          }
          setDetectedError(null);
        }}
        onRerunCommand={(cmd) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'input', data: `${cmd}\r` }));
          }
        }}
      />
    </div>
  );
}
