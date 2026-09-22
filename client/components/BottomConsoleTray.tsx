'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal as TerminalIcon,
  Activity,
  ShieldAlert,
  Settings,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Play,
  RotateCw,
  Cpu,
  Database,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Server,
  Zap,
  CheckCircle,
  FileText,
  Bug,
  Globe,
  HardDrive,
  GitBranch,
  GitMerge,
  Package,
  Radio,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import WasiRuntimeStudio from './WasiRuntimeStudio';
import DapDebuggerPanel from './DapDebuggerPanel';
import OpfsWorkspaceStudio from './OpfsWorkspaceStudio';
import GitVisualizerStudio from './GitVisualizerStudio';
import PluginMarketplaceStudio from './PluginMarketplaceStudio';
import McpStudioPanel from './McpStudioPanel';
import RealPtyTerminal from './RealPtyTerminal';
import { lspWorkerHub, LspProblemItem } from '@/lib/lsp/LspWorkerHub';

interface BottomConsoleTrayProps {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  consoleOutput?: string;
  onRunSandbox?: () => void;
  onClearOutput?: () => void;
  toolLogsCount?: number;
  sandboxConsole?: React.ReactNode;
  workspaceFiles?: Record<string, string>;
  currentFile?: string;
  onOpenFile?: (path: string, line?: number) => void;
  onJumpToLine?: (line: number) => void;
  onBatchApplyFiles?: (files: Record<string, string>) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
}

export default function BottomConsoleTray({
  initialHeight = 250,
  minHeight = 44,
  maxHeight = 700,
  consoleOutput = '',
  onRunSandbox,
  onClearOutput,
  toolLogsCount = 0,
  sandboxConsole,
  workspaceFiles,
  currentFile,
  onOpenFile,
  onJumpToLine,
  onBatchApplyFiles,
  isOpen = true,
  onToggleOpen,
  onClose
}: BottomConsoleTrayProps) {
  const [height, setHeight] = useState(initialHeight);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'wasi' | 'dap' | 'opfs' | 'git' | 'plugins' | 'terminal' | 'telemetry' | 'security' | 'build' | 'problems' | 'mcp'>('problems');
  
  // Real-time LSP Problems State
  const [problems, setProblems] = useState<LspProblemItem[]>(() => lspWorkerHub.getAllProblems());
  const [problemFilterSeverity, setProblemFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');

  useEffect(() => {
    return lspWorkerHub.subscribeProblems(setProblems);
  }, []);

  const errorCount = useMemo(() => problems.filter(p => p.severity === 'error').length, [problems]);
  const warningCount = useMemo(() => problems.filter(p => p.severity === 'warning').length, [problems]);

  const filteredProblems = useMemo(() => {
    if (problemFilterSeverity === 'all') return problems;
    return problems.filter(p => p.severity === problemFilterSeverity);
  }, [problems, problemFilterSeverity]);

  // Save pre-collapsed height
  const preCollapsedHeightRef = useRef(initialHeight);
  const preMaximizedHeightRef = useRef(initialHeight);

  // Resize State Handler
  const isResizingRef = useRef(false);

  // Live Telemetry states with dynamic history streams (30 data points)
  const [cpuHistory, setCpuHistory] = useState<number[]>(() =>
    Array.from({ length: 30 }, () => 18 + Math.floor(Math.random() * 10))
  );
  const [ramHistory, setRamHistory] = useState<number[]>(() => 
    Array.from({ length: 30 }, () => 38 + Math.floor(Math.random() * 8))
  );
  const [vramHistory, setVramHistory] = useState<number[]>(() => 
    Array.from({ length: 30 }, () => 28 + Math.floor(Math.random() * 8))
  );
  const [tokenHistory, setTokenHistory] = useState<number[]>(() => 
    Array.from({ length: 30 }, () => 35 + Math.floor(Math.random() * 10))
  );

  const [memoryOverload, setMemoryOverload] = useState(false);

  // Auto update telemetry data points via simulated WebSocket stream
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuHistory(prev => {
        const currentVal = Math.max(10, Math.min(80, prev[prev.length - 1] + (Math.random() * 6 - 3)));
        return [...prev.slice(1), parseFloat(currentVal.toFixed(1))];
      });

      setRamHistory(prev => {
        const currentVal = Math.max(30, Math.min(65, prev[prev.length - 1] + (Math.random() * 4 - 2)));
        const next = [...prev.slice(1), parseFloat(currentVal.toFixed(1))];
        return next;
      });

      setVramHistory(prev => {
        const currentVal = Math.max(20, Math.min(70, prev[prev.length - 1] + (Math.random() * 5 - 2.5)));
        return [...prev.slice(1), parseFloat(currentVal.toFixed(1))];
      });

      setTokenHistory(prev => {
        const currentVal = Math.max(20, Math.min(80, prev[prev.length - 1] + (Math.random() * 8 - 4)));
        return [...prev.slice(1), parseFloat(currentVal.toFixed(1))];
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const [isResizing, setIsResizing] = useState(false);

  // Mouse handlers for vertical panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const windowHeight = window.innerHeight;
      const computedHeight = windowHeight - e.clientY;
      if (computedHeight >= minHeight && computedHeight <= maxHeight) {
        setHeight(computedHeight);
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minHeight, maxHeight]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  };

  const toggleCollapse = () => {
    if (isCollapsed) {
      setHeight(preCollapsedHeightRef.current);
      setIsCollapsed(false);
    } else {
      preCollapsedHeightRef.current = height;
      setHeight(44); // Header height
      setIsCollapsed(true);
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setHeight(preMaximizedHeightRef.current);
      setIsMaximized(false);
      setIsCollapsed(false);
    } else {
      preMaximizedHeightRef.current = height;
      const targetMax = typeof window !== 'undefined' ? Math.min(window.innerHeight - 120, 560) : 560;
      setHeight(targetMax);
      setIsMaximized(true);
      setIsCollapsed(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onToggleOpen) {
      onToggleOpen();
    } else {
      toggleCollapse();
    }
  };

  // SVG Sparkline path generator
  const generateSparklinePath = (data: number[], width = 160, height = 45, maxVal = 100) => {
    if (data.length === 0) return '';
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      // Invert Y coordinate so 100% sits at the top (0px offset)
      const y = height - (val / maxVal) * height + 2;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // SVG Area path generator
  const generateSparklineAreaPath = (data: number[], width = 160, height = 45, maxVal = 100) => {
    if (data.length === 0) return '';
    const linePath = generateSparklinePath(data, width, height, maxVal);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  // Simulated static lists for non-terminal tabs
  const securityAlerts = useMemo(() => [
    { id: 'sec-1', level: 'low', type: 'Dependency Overhaul', desc: 'Outdated @tailwindcss/postcss library', status: 'monitored' },
    { id: 'sec-2', level: 'medium', type: 'Env Leak Risk', desc: 'Raw private key loaded on client-side check', status: 'fixed' },
    { id: 'sec-3', level: 'safe', type: 'Static Analysis', desc: 'NextJS strict headers & frames security constraints enforced', status: 'active' }
  ], []);

  const buildLogsSimulated = useMemo(() => [
    { id: 'log-1', time: '21:42:01', tag: 'system', text: 'Initializing offline sandbox VM environment...' },
    { id: 'log-2', time: '21:42:02', tag: 'builder', text: 'Compiling applet modules through esbuild type-stripping pipeline...' },
    { id: 'log-3', time: '21:42:04', tag: 'bundler', text: '✓ Compiled successfully. Output buffers cached in /.next/server' },
    { id: 'log-4', time: '21:42:05', tag: 'runtime', text: 'Live runtime development listener active on localhost:3000.' }
  ], []);

  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentRam = ramHistory[ramHistory.length - 1];
  const currentVram = vramHistory[vramHistory.length - 1];
  const currentTokens = tokenHistory[tokenHistory.length - 1];

  return (
    <div 
      style={{ height: !isOpen ? 0 : isCollapsed ? 44 : height }}
      className={`w-full bg-[#0d0d10] border-t border-[#27272a] flex flex-col overflow-hidden shrink-0 select-none relative font-sans ${
        isResizing ? 'transition-none' : 'transition-all duration-300 ease-in-out'
      } ${
        !isOpen ? 'opacity-0 border-t-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Full-screen dragging overlay to prevent losing cursor on mousemove */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-row-resize select-none bg-transparent" />
      )}

      {/* Dynamic Draggable Top Handle Bar */}
      {isOpen && !isCollapsed && (
        <div 
          onMouseDown={startResize}
          onDoubleClick={toggleCollapse}
          className={`absolute top-0 left-0 right-0 h-1.5 cursor-row-resize group z-30 transition-colors ${
            isResizing ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'hover:bg-indigo-500/80 bg-transparent'
          }`}
          title="Drag to resize / Double-click to collapse"
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-10 h-1 bg-zinc-600 group-hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Main Console Tabbed Header */}
      <div className="h-11 min-h-[44px] px-4 bg-[#141416] border-b border-[#27272a] flex items-center justify-between gap-4 shrink-0 relative z-10">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full">
          
          {/* 1. PROBLEMS (LSP DIAGNOSTICS) TAB */}
          <button
            onClick={() => { setActiveTab('problems'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'problems' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <ShieldAlert size={12} className={errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'} />
            <span>Problems</span>
            {(errorCount > 0 || warningCount > 0) ? (
              <span className="flex items-center gap-1 ml-1">
                {errorCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-950/90 text-rose-300 border border-rose-700/60 rounded-full text-[9px] font-mono font-bold">
                    {errorCount}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-950/90 text-amber-300 border border-amber-700/60 rounded-full text-[9px] font-mono font-bold">
                    {warningCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-emerald-950/90 text-emerald-400 border border-emerald-800 rounded-full text-[9px] font-mono font-bold">
                0
              </span>
            )}
          </button>

          {/* 2. OUTPUT (COMPILER & TASKS LOGS) TAB */}
          <button
            onClick={() => { setActiveTab('build'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'build' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <FileText size={12} className="text-blue-400" />
            Output
          </button>

          {/* 3. DEBUG CONSOLE (DAP RUNTIME & REPL) TAB */}
          <button
            onClick={() => { setActiveTab('dap'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'dap' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <Bug size={12} className="text-rose-400" />
            Debug Console
          </button>

          {/* 4. TERMINAL (PTY SHELL & AI FIX) TAB */}
          <button
            onClick={() => { setActiveTab('terminal'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'terminal' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <TerminalIcon size={12} className="text-emerald-400" />
            Terminal
          </button>

          {/* 5. MCP HUB TAB */}
          <button
            onClick={() => { setActiveTab('mcp'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'mcp' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <Radio size={12} className="text-purple-400" />
            <span>MCP Hub</span>
          </button>

          {/* 6. WEBCONTAINER (WASI) TAB */}
          <button
            onClick={() => { setActiveTab('wasi'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'wasi' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <Zap size={12} className="text-amber-400" />
            WebContainer
          </button>

          {/* 7. GIT DAG TAB */}
          <button
            onClick={() => { setActiveTab('git'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'git' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <GitBranch size={12} className="text-cyan-400" />
            Git DAG
          </button>

          {/* 8. STORAGE (OPFS) TAB */}
          <button
            onClick={() => { setActiveTab('opfs'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'opfs' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <HardDrive size={12} className="text-emerald-400" />
            Storage
          </button>

          {/* 9. TELEMETRY TAB */}
          <button
            onClick={() => { setActiveTab('telemetry'); setIsCollapsed(false); }}
            className={`h-full px-3.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer uppercase tracking-wider ${
              activeTab === 'telemetry' && !isCollapsed
                ? 'border-indigo-500 text-white bg-[#18181b]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
            }`}
          >
            <Activity size={12} className="text-indigo-400" />
            Telemetry
          </button>
        </div>

        {/* Global Warning Statuses & Window Actions */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Pulse Memory Overload Badge */}
          {memoryOverload && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-600/50 rounded-lg text-amber-400 text-[10px] font-extrabold uppercase tracking-wider animate-pulse font-sans">
              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              ⚠️ Memory Warning ({currentRam}%)
            </div>
          )}

          {/* Collapsible Action buttons */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Tray" : "Collapse Tray"}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={toggleMaximize}
            title={isMaximized ? "Restore Height" : "Maximize Panel"}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={handleClose}
            title="Close Panel (Ctrl+J)"
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Bottom Console Workspace Tray Panels */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#070709] text-zinc-300 font-mono text-xs p-3 relative">
          
          {/* LSP PROBLEMS & DIAGNOSTICS TAB */}
          {activeTab === 'problems' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a] bg-[#101116]">
              {/* Header filter bar */}
              <div className="p-2.5 border-b border-zinc-800 bg-[#14151c] flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <ShieldAlert size={14} className={errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                    <span>LSP Diagnostics ({problems.length})</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setProblemFilterSeverity('all')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        problemFilterSeverity === 'all'
                          ? 'bg-zinc-700 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      All ({problems.length})
                    </button>
                    <button
                      onClick={() => setProblemFilterSeverity('error')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                        problemFilterSeverity === 'error'
                          ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800'
                          : 'text-zinc-400 hover:text-rose-300'
                      }`}
                    >
                      <AlertCircle size={11} className="text-rose-400" />
                      <span>Errors ({errorCount})</span>
                    </button>
                    <button
                      onClick={() => setProblemFilterSeverity('warning')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                        problemFilterSeverity === 'warning'
                          ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800'
                          : 'text-zinc-400 hover:text-amber-300'
                      }`}
                    >
                      <AlertTriangle size={11} className="text-amber-400" />
                      <span>Warnings ({warningCount})</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono">
                  TypeScript / ESLint Language Server
                </div>
              </div>

              {/* Problems list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
                {filteredProblems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 font-sans">
                    <CheckCircle size={28} className="text-emerald-500 mb-2 opacity-80" />
                    <span className="font-semibold text-zinc-300">No problems detected in workspace</span>
                    <span className="text-xs text-zinc-500 mt-1">LSP syntax & type analyzer reported 0 errors</span>
                  </div>
                ) : (
                  filteredProblems.map((prob) => (
                    <div
                      key={prob.id}
                      onClick={() => {
                        if (onOpenFile) onOpenFile(prob.filePath, prob.line);
                        else if (onJumpToLine) onJumpToLine(prob.line);
                      }}
                      className="p-2 rounded-lg border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      {prob.severity === 'error' ? (
                        <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      ) : prob.severity === 'warning' ? (
                        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      ) : (
                        <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-200 font-sans text-xs">{prob.message}</span>
                          {prob.code && (
                            <span className="text-[10px] text-zinc-500 font-mono">ts({prob.code})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                          <span className="text-indigo-400 hover:underline">{prob.filePath}</span>
                          <span>[{prob.line}:{prob.column}]</span>
                          <span className="text-zinc-600">({prob.source})</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MODEL CONTEXT PROTOCOL (MCP) STUDIO TAB */}
          {activeTab === 'mcp' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <McpStudioPanel
                workspaceFiles={workspaceFiles || {}}
                onOpenFile={onOpenFile}
              />
            </div>
          )}

          {/* WASI WEBCONTAINER RUNTIME TAB */}
          {activeTab === 'wasi' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <WasiRuntimeStudio
                workspaceFiles={workspaceFiles}
                onOpenFile={(p) => {
                  if (onOpenFile) onOpenFile(p);
                }}
              />
            </div>
          )}

          {/* DAP VISUAL DEBUGGER TAB */}
          {activeTab === 'dap' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <DapDebuggerPanel
                currentFile={currentFile || 'components/Playground.tsx'}
                sourceCode={workspaceFiles && currentFile ? workspaceFiles[currentFile] : undefined}
                onOpenFile={(p, l) => {
                  if (onOpenFile) onOpenFile(p, l);
                }}
                onJumpToLine={(l) => {
                  if (onJumpToLine) {
                    onJumpToLine(l);
                  } else if (onOpenFile && currentFile) {
                    onOpenFile(currentFile, l);
                  }
                }}
              />
            </div>
          )}

          {/* OPFS WORKSPACE & BINARY STORAGE TAB */}
          {activeTab === 'opfs' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <OpfsWorkspaceStudio
                workspaceFiles={workspaceFiles}
                onOpenFile={(p) => {
                  if (onOpenFile) onOpenFile(p);
                }}
              />
            </div>
          )}

          {/* VISUAL GIT DAG & 3-WAY MERGE RESOLVER TAB */}
          {activeTab === 'git' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <GitVisualizerStudio
                workspaceFiles={workspaceFiles}
                currentFile={currentFile || 'components/Playground.tsx'}
                onOpenFile={(p) => {
                  if (onOpenFile) onOpenFile(p);
                }}
              />
            </div>
          )}

          {/* PLUGINS, THEMES, KEYMAPS & VIM TAB */}
          {activeTab === 'plugins' && (
            <div className="h-full flex flex-col min-h-0 rounded-xl overflow-hidden border border-[#27272a]">
              <PluginMarketplaceStudio />
            </div>
          )}

          {/* REAL PTY SHELL TERMINAL TAB */}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col overflow-hidden">
              {sandboxConsole ? (
                <div className="flex-1 min-h-0">
                  {sandboxConsole}
                </div>
              ) : (
                <RealPtyTerminal
                  className="flex-1 min-h-0 rounded-xl border border-slate-800"
                  workspaceFiles={workspaceFiles}
                  onBatchApplyFiles={onBatchApplyFiles}
                />
              )}
            </div>
          )}

          {/* TELEMETRY SPARKLINES TAB (Live lightweight self-updating SVGs) */}
          {activeTab === 'telemetry' && (
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60 text-[11px] text-zinc-400 font-sans">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Cpu size={14} className="text-indigo-400" /> Real-time System Telemetry & Workload Metrics
                </span>
                <div className="flex items-center gap-2">
                  {memoryOverload && (
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={10} /> ⚠️ Memory Warning ({currentRam}%)
                    </span>
                  )}
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Hz Refresh rate: 1s
                  </span>
                </div>
              </div>

              {/* Sparklines Grid container - 4 animated panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
                
                {/* Sparkline 1: CPU Utilization */}
                <div className="bg-[#0f0f12] border border-[#27272a] p-3.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-zinc-800/60 pointer-events-none group-hover:text-cyan-950/20 transition-colors">
                    <Cpu size={38} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CPU Utilization</span>
                      <span className="text-xs font-black text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-md font-mono">
                        {currentCpu}%
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1">
                      8-Core Host Engine
                    </div>
                  </div>
                  
                  {/* Lightweight SVG path chart */}
                  <div className="h-12 mt-3 relative">
                    <svg className="w-full h-full" viewBox="0 0 160 45" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={generateSparklineAreaPath(cpuHistory, 160, 45, 100)}
                        fill="url(#cpuGrad)"
                      />
                      <path
                        d={generateSparklinePath(cpuHistory, 160, 45, 100)}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Sparkline 2: System Heap Memory utilization */}
                <div className={`bg-[#0f0f12] border p-3.5 rounded-xl flex flex-col justify-between relative overflow-hidden group transition-colors ${
                  currentRam > 85 ? 'border-amber-700/80 bg-amber-950/20' : 'border-[#27272a]'
                }`}>
                  <div className="absolute top-0 right-0 p-3 text-zinc-800/60 pointer-events-none group-hover:text-indigo-950/20 transition-colors">
                    <Database size={38} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">System Heap Memory</span>
                      <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${
                        currentRam > 85 ? 'text-amber-400 bg-amber-950/80 border border-amber-900 animate-pulse' : 'text-indigo-400 bg-indigo-950/50'
                      }`}>
                        {currentRam}%
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1 flex items-center gap-1.5">
                      <span>{(8.0 * (currentRam / 100)).toFixed(2)} GB</span>
                      <span className="text-xs font-normal text-zinc-500">/ 8.00 GB</span>
                    </div>
                  </div>
                  
                  {/* Lightweight SVG path chart */}
                  <div className="h-12 mt-3 relative">
                    <svg className="w-full h-full" viewBox="0 0 160 45" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={currentRam > 85 ? '#f59e0b' : '#818cf8'} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={currentRam > 85 ? '#f59e0b' : '#818cf8'} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={generateSparklineAreaPath(ramHistory, 160, 45, 100)}
                        fill="url(#ramGrad)"
                      />
                      <path
                        d={generateSparklinePath(ramHistory, 160, 45, 100)}
                        fill="none"
                        stroke={currentRam > 85 ? '#f59e0b' : '#818cf8'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Sparkline 3: VRAM Allocation */}
                <div className="bg-[#0f0f12] border border-[#27272a] p-3.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-zinc-800/60 pointer-events-none group-hover:text-emerald-950/20 transition-colors">
                    <Gauge size={38} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">VRAM Allocation</span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md font-mono">
                        {currentVram}%
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1 flex items-center gap-1.5">
                      <span>{(12.0 * (currentVram / 100)).toFixed(2)} GB</span>
                      <span className="text-xs font-normal text-zinc-500">/ 12.00 GB</span>
                    </div>
                  </div>

                  {/* Lightweight SVG path chart */}
                  <div className="h-12 mt-3 relative">
                    <svg className="w-full h-full" viewBox="0 0 160 45" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="vramGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={generateSparklineAreaPath(vramHistory, 160, 45, 100)}
                        fill="url(#vramGrad)"
                      />
                      <path
                        d={generateSparklinePath(vramHistory, 160, 45, 100)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Sparkline 4: Token Generation Speed */}
                <div className="bg-[#0f0f12] border border-[#27272a] p-3.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-zinc-800/60 pointer-events-none group-hover:text-purple-950/20 transition-colors">
                    <Zap size={38} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Token Generation Speed</span>
                      <span className="text-xs font-black text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-md font-mono">
                        {currentTokens.toFixed(0)} T/s
                      </span>
                    </div>
                    <div className="text-base font-black text-white mt-1">
                      LLM Stream Pipeline
                    </div>
                  </div>

                  {/* Lightweight SVG path chart */}
                  <div className="h-12 mt-3 relative">
                    <svg className="w-full h-full" viewBox="0 0 160 45" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={generateSparklineAreaPath(tokenHistory, 160, 45, 150)}
                        fill="url(#tokenGrad)"
                      />
                      <path
                        d={generateSparklinePath(tokenHistory, 160, 45, 150)}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SECURITY SHIELD TAB */}
          {activeTab === 'security' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60 text-[11px] text-zinc-400 font-sans">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <ShieldCheck size={14} className="text-emerald-400" /> Active Vulnerability Audit & Compliance Logs
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Audit state: Secure</span>
              </div>

              <div className="space-y-2 font-sans">
                {securityAlerts.map(alert => (
                  <div key={alert.id} className="p-2.5 bg-[#0f0f12] border border-[#27272a] rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        alert.level === 'low' ? 'bg-amber-400' : alert.level === 'medium' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {alert.type}
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                            alert.level === 'low' ? 'text-amber-400 bg-amber-950/40' : alert.level === 'medium' ? 'text-orange-400 bg-orange-950/40' : 'text-emerald-400 bg-emerald-950/40'
                          }`}>
                            {alert.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{alert.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                      {alert.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BUILD LOGS TAB */}
          {activeTab === 'build' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60 text-[11px] text-zinc-400 font-sans">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <FileText size={14} className="text-amber-400" /> Background Compilation Streams & Telemetry
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  IDLE
                </span>
              </div>

              <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3.5 space-y-1.5 leading-relaxed font-mono text-[11px] text-zinc-300">
                {buildLogsSimulated.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="text-zinc-500 select-none">{log.time}</span>
                    <span className={`font-bold select-none px-1.5 py-0.2 rounded text-[10px] min-w-[55px] text-center uppercase ${
                      log.tag === 'system' ? 'text-indigo-400 bg-indigo-950/40' : log.tag === 'builder' ? 'text-amber-400 bg-amber-950/40' : log.tag === 'bundler' ? 'text-emerald-400 bg-emerald-950/40' : 'text-zinc-400 bg-zinc-800/40'
                    }`}>
                      {log.tag}
                    </span>
                    <span className="text-zinc-300 flex-1">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
