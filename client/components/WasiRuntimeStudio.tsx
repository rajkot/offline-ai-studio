// In-Browser POSIX WASI Micro-OS & WebContainer Live Studio
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Square,
  RotateCw,
  Cpu,
  Server,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  ExternalLink,
  Shield,
  Zap,
  Layers,
  Search,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  ChevronRight,
  FileCode,
  Activity,
  Radio,
  Wifi,
  Package
} from 'lucide-react';
import {
  wasiRuntime,
  VfsFile,
  VirtualProcess,
  NetworkRequest,
  ConsoleLogMessage
} from '@/lib/wasiRuntime';
import Terminal, { TerminalHandle } from './Terminal';

interface WasiRuntimeStudioProps {
  workspaceFiles?: Record<string, string>;
  onOpenFile?: (path: string) => void;
}

export default function WasiRuntimeStudio({
  workspaceFiles,
  onOpenFile
}: WasiRuntimeStudioProps) {
  // Navigation & Sub-tabs
  const [activeTab, setActiveTab] = useState<'preview' | 'terminal' | 'network' | 'console' | 'processes' | 'vfs'>('preview');

  // Terminal state
  const terminalRef = useRef<TerminalHandle>(null);
  const [terminalBuffer, setTerminalBuffer] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);

  const handleTerminalData = React.useCallback(async (data: string) => {
    if (!terminalRef.current) return;
    const term = terminalRef.current;

    if (data === '\r') {
      const cmd = terminalBuffer.trim();
      term.write('\r\n');
      if (cmd) {
        const res = await wasiRuntime.executeCommand(cmd);
        if (res.stdout) term.write(res.stdout.replace(/\n/g, '\r\n'));
        if (res.stderr) term.write(res.stderr.replace(/\n/g, '\r\n'));
      }
      term.write(`\r\n\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      setTerminalBuffer('');
    } else if (data === '\u007f') { // Backspace
      if (terminalBuffer.length > 0) {
        setTerminalBuffer(prev => prev.slice(0, -1));
        term.write('\b \b');
      }
    } else if (data === '\u0003') { // Ctrl+C
      setTerminalBuffer('');
      term.write('^C\r\n');
      term.write(`\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
    } else {
      setTerminalBuffer(prev => prev + data);
      term.write(data);
    }
  }, [terminalBuffer]);

  // Dev server & Live Preview state
  const [isServerRunning, setIsServerRunning] = useState(wasiRuntime.isDevServerActive());
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [iframeSrcDoc, setIframeSrcDoc] = useState('');
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('desktop');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Network & Console state
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>(wasiRuntime.getNetworkRequests());
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogMessage[]>(wasiRuntime.getConsoleLogs());
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [consoleSearch, setConsoleSearch] = useState('');

  // Processes & VFS state
  const [processes, setProcesses] = useState<VirtualProcess[]>(wasiRuntime.getProcesses());
  const [vfsFiles, setVfsFiles] = useState<VfsFile[]>(wasiRuntime.readdir('/workspace'));
  const [currentVfsPath, setCurrentVfsPath] = useState('/workspace');

  // Sync workspace files on mount and update
  useEffect(() => {
    if (workspaceFiles && Object.keys(workspaceFiles).length > 0) {
      wasiRuntime.syncWorkspace(workspaceFiles);
    }
  }, [workspaceFiles]);

  const currentVfsPathRef = useRef(currentVfsPath);
  useEffect(() => {
    currentVfsPathRef.current = currentVfsPath;
  }, [currentVfsPath]);

  // Subscribe to WASI Runtime events
  useEffect(() => {
    // Initial dev server auto-start if not running
    if (!wasiRuntime.isDevServerActive()) {
      wasiRuntime.startDevServer(3000).then(({ url }) => {
        setIsServerRunning(true);
        setServerUrl(url);
        setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
      });
    } else {
      setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
    }

    const unsubscribe = wasiRuntime.subscribe((event, payload) => {
      if (event === 'server_started') {
        setIsServerRunning(true);
        setServerUrl(payload.url);
        setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
        setProcesses(wasiRuntime.getProcesses());
      } else if (event === 'server_stopped') {
        setIsServerRunning(false);
        setProcesses(wasiRuntime.getProcesses());
      } else if (event === 'hmr_update') {
        setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
      } else if (event === 'console_log') {
        setConsoleLogs(wasiRuntime.getConsoleLogs());
      } else if (event === 'console_clear') {
        setConsoleLogs([]);
      } else if (event === 'network_request') {
        setNetworkRequests(wasiRuntime.getNetworkRequests());
      } else if (event === 'network_clear') {
        setNetworkRequests([]);
      } else if (event === 'process_spawn' || event === 'process_kill') {
        setProcesses(wasiRuntime.getProcesses());
      } else if (event === 'vfs_change') {
        setVfsFiles(wasiRuntime.readdir(currentVfsPathRef.current));
      }
    });

    // Listen for postMessage from preview iframe
    // Initialize terminal greeting
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !isTerminalInitialized) {
      const term = terminalRef.current;
      term.write('\x1b[1;34m⚡ WASI POSIX Micro-Kernel Shell\x1b[0m\r\n');
      term.write('\x1b[2mLinux wasi-webcontainer 6.1.0-posix-wasm #1 SMP PREEMPT x86_64 WASI/1.0\x1b[0m\r\n');
      term.write('\x1b[32mType "help" for available commands.\x1b[0m\r\n\r\n');
      term.write(`\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      setIsTerminalInitialized(true);
    }
  }, [activeTab, isTerminalInitialized]);

  // Handle Terminal Input (xterm.js data)
  const handleTerminalData = async (data: string) => {
    const term = terminalRef.current;
    if (!term) return;

    // Handle Enter
    if (data === '\r' || data === '\n') {
      const cmd = terminalBuffer.trim();
      term.write('\r\n');
      
      if (cmd) {
        setCommandHistory(prev => [cmd, ...prev]);
        setHistoryIndex(-1);
        
        const result = await wasiRuntime.executeCommand(cmd);
        
        if (result.stdout) {
          // Convert \n to \r\n for xterm
          term.write(result.stdout.replace(/\n/g, '\r\n'));
        }
        if (result.stderr) {
          term.write('\x1b[31m' + result.stderr.replace(/\n/g, '\r\n') + '\x1b[0m');
        }
        
        setVfsFiles(wasiRuntime.readdir(currentVfsPath));
        setProcesses(wasiRuntime.getProcesses());
      }
      
      term.write(`\r\n\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      setTerminalBuffer('');
      return;
    }

    // Handle Backspace
    if (data === '\x7f' || data === '\b') {
      if (terminalBuffer.length > 0) {
        setTerminalBuffer(prev => prev.slice(0, -1));
        term.write('\b \b');
      }
      return;
    }

    // Handle Ctrl+C
    if (data === '\x03') {
      term.write('^C\r\n');
      term.write(`\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      setTerminalBuffer('');
      return;
    }

    // Regular typing
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      setTerminalBuffer(prev => prev + data);
      term.write(data);
    }
  };

  const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'WASI_PREVIEW_CONSOLE') {
        wasiRuntime.logConsole(e.data.level, e.data.message, 'preview');
      } else if (e.data?.type === 'WASI_PREVIEW_NETWORK') {
        wasiRuntime.recordNetworkRequest({
          url: e.data.url,
          method: e.data.method,
          status: e.data.status,
          statusText: e.data.statusText,
          type: 'fetch',
          durationMs: e.data.durationMs,
          requestHeaders: { 'Accept': '*/*', 'Origin': 'http://localhost:3000' },
          responseHeaders: { 'Content-Type': 'application/json' },
          sizeBytes: 380
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Live Preview manual refresh
  const handleRefreshPreview = () => {
    setIsRefreshing(true);
    setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
    wasiRuntime.triggerHmrUpdate('manual-reload');
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Quick Action Presets
  const handleRunPreset = async (preset: string) => {
    if (preset === 'vite-dev') {
      if (terminalRef.current) {
        terminalRef.current.write('\r\nnpm run dev\r\n');
      }
      await wasiRuntime.executeCommand('npm run dev');
      setIsServerRunning(true);
      setIframeSrcDoc(wasiRuntime.getLivePreviewHtml());
    } else if (preset === 'npm-test') {
      if (terminalRef.current) {
        terminalRef.current.write('\r\nnpm run test\r\n');
      }
      const res = await wasiRuntime.executeCommand('npm run test');
      if (terminalRef.current) {
        terminalRef.current.write(res.stdout.replace(/\n/g, '\r\n'));
        terminalRef.current.write(res.stderr.replace(/\n/g, '\r\n'));
        terminalRef.current.write(`\r\n\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      }
    } else if (preset === 'python-stats') {
      if (terminalRef.current) {
        terminalRef.current.write('\r\npython data_analysis.py\r\n');
      }
      const res = await wasiRuntime.executeCommand('python data_analysis.py');
      if (terminalRef.current) {
        terminalRef.current.write(res.stdout.replace(/\n/g, '\r\n'));
        terminalRef.current.write(res.stderr.replace(/\n/g, '\r\n'));
        terminalRef.current.write(`\r\n\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      }
    } else if (preset === 'npm-install') {
      if (terminalRef.current) {
        terminalRef.current.write('\r\nnpm i axios recharts\r\n');
      }
      const res = await wasiRuntime.executeCommand('npm i axios recharts');
      if (terminalRef.current) {
        terminalRef.current.write(res.stdout.replace(/\n/g, '\r\n'));
        terminalRef.current.write(res.stderr.replace(/\n/g, '\r\n'));
        terminalRef.current.write(`\r\n\x1b[1;32mdeveloper@wasi\x1b[0m:\x1b[1;34m${wasiRuntime.getCurrentDir()}\x1b[0m$ `);
      }
    }
    setActiveTab('terminal');
  };

  // Filtered console logs
  const filteredLogs = consoleLogs.filter(log => {
    const matchesLevel = consoleFilter === 'all' || log.level === consoleFilter;
    const matchesSearch = !consoleSearch || log.message.toLowerCase().includes(consoleSearch.toLowerCase()) || log.source.toLowerCase().includes(consoleSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header & Runtime Status Bar */}
      <div className="h-11 min-h-[44px] px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              WASI / WebContainer Runtime
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
            POSIX WASM v6.1
          </span>
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Server size={12} className="text-emerald-400" />
            <span>localhost:{isServerRunning ? '3000' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Action Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunPreset('vite-dev')}
            className="px-2.5 py-1 text-[11px] font-medium bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play size={11} className="text-emerald-400 fill-emerald-400" /> Vite Dev
          </button>
          <button
            onClick={() => handleRunPreset('npm-test')}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle size={11} className="text-emerald-400" /> Vitest
          </button>
          <button
            onClick={() => handleRunPreset('python-stats')}
            className="px-2.5 py-1 text-[11px] font-medium bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileCode size={11} className="text-amber-400" /> Pyodide
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="h-9 min-h-[36px] px-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe size={13} />
            Live Preview
            {isServerRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TerminalIcon size={13} />
            POSIX Bash
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'network'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wifi size={13} />
            Network
            {networkRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                {networkRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'console'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio size={13} />
            Console
            {consoleLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                {consoleLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('processes')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'processes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity size={13} />
            Processes ({processes.length})
          </button>

          <button
            onClick={() => setActiveTab('vfs')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'vfs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package size={13} />
            VFS Explorer
          </button>
        </div>

        {/* Viewport controls for Live Preview */}
        {activeTab === 'preview' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDeviceViewport('desktop')}
              title="Desktop View (100%)"
              className={`p-1 rounded transition-colors cursor-pointer ${deviceViewport === 'desktop' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setDeviceViewport('laptop')}
              title="Laptop View (1366px)"
              className={`p-1 rounded transition-colors cursor-pointer ${deviceViewport === 'laptop' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Laptop size={14} />
            </button>
            <button
              onClick={() => setDeviceViewport('tablet')}
              title="Tablet View (768px)"
              className={`p-1 rounded transition-colors cursor-pointer ${deviceViewport === 'tablet' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setDeviceViewport('mobile')}
              title="Mobile View (375px)"
              className={`p-1 rounded transition-colors cursor-pointer ${deviceViewport === 'mobile' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-slate-950">
        {/* Tab 1: Live Interactive Preview */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
            {/* Browser Address Bar */}
            <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefreshPreview}
                disabled={isRefreshing}
                title="Reload Preview Frame"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-slate-300">
                <span className="text-emerald-400">https://</span>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="bg-transparent flex-1 text-slate-200 outline-none"
                />
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Instant HMR
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([iframeSrcDoc], { type: 'text/html' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                  }}
                  title="Open in new tab"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="flex-1 bg-slate-950/80 p-4 flex items-center justify-center overflow-auto">
              <div
                className={`h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${
                  deviceViewport === 'desktop'
                    ? 'w-full max-w-full'
                    : deviceViewport === 'laptop'
                    ? 'w-[1024px]'
                    : deviceViewport === 'tablet'
                    ? 'w-[768px]'
                    : 'w-[375px]'
                }`}
              >
                <iframe
                  title="WASI Live Preview"
                  srcDoc={iframeSrcDoc}
                  sandbox="allow-scripts allow-modals allow-same-origin"
                  className="w-full flex-1 border-none bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: POSIX Bash Terminal */}
        {activeTab === 'terminal' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-2 font-mono text-xs">
            <div className="flex-1 min-h-0 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
              <Terminal 
                ref={terminalRef}
                onData={handleTerminalData}
                className="p-1"
              />
            </div>
            {/* Terminal Status Bar */}
            <div className="h-6 mt-1 flex items-center justify-between px-2 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Cpu size={10} className="text-indigo-400" /> posix-wasm</span>
                <span className="flex items-center gap-1"><TerminalIcon size={10} className="text-emerald-400" /> bash v5.2</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{terminalBuffer.length > 0 ? `Buffer: ${terminalBuffer.length}ch` : 'Ready'}</span>
                <button onClick={() => terminalRef.current?.clear()} className="hover:text-white transition-colors cursor-pointer text-[10px]">Clear</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Virtual Network Inspector */}
        {activeTab === 'network' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
            {/* Toolbar */}
            <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">HTTP/WebSocket Requests</span>
                <span className="text-[10px] text-slate-500 font-mono">({networkRequests.length} requests)</span>
              </div>
              <button
                onClick={() => wasiRuntime.clearNetworkRequests()}
                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>

            {/* Request Table */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">URL / Resource</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Latency</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {networkRequests.map(req => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${selectedRequest?.id === req.id ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : ''}`}
                    >
                      <td className="p-2.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          req.method === 'GET' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          req.method === 'POST' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {req.method}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`font-bold ${req.status < 400 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {req.status} {req.statusText}
                        </span>
                      </td>
                      <td className="p-2.5 truncate max-w-xs">{req.url}</td>
                      <td className="p-2.5 text-slate-400">{req.type}</td>
                      <td className="p-2.5 text-indigo-300">{req.durationMs}ms</td>
                      <td className="p-2.5 text-slate-400">{req.sizeBytes} B</td>
                      <td className="p-2.5 text-slate-500">{req.timestamp}</td>
                    </tr>
                  ))}
                  {networkRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-sans text-xs">
                        No network activity recorded. Trigger fetch requests or start the dev server.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected Request Detail Drawer */}
            {selectedRequest && (
              <div className="h-44 border-t border-slate-800 bg-slate-900/90 p-3 overflow-y-auto text-xs font-mono shrink-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="font-bold text-white">Request Headers & Details</span>
                  <button onClick={() => setSelectedRequest(null)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-indigo-400 font-semibold">Request Headers:</span>
                    <pre className="text-[11px] text-slate-300 mt-1">{JSON.stringify(selectedRequest.requestHeaders, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">Response Headers:</span>
                    <pre className="text-[11px] text-slate-300 mt-1">{JSON.stringify(selectedRequest.responseHeaders, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Live Bi-Directional Console */}
        {activeTab === 'console' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
            {/* Filter Bar */}
            <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  {(['all', 'log', 'info', 'warn', 'error'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setConsoleFilter(lvl)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer capitalize ${
                        consoleFilter === lvl ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 w-full text-xs">
                  <Search size={12} className="text-slate-500" />
                  <input
                    type="text"
                    value={consoleSearch}
                    onChange={(e) => setConsoleSearch(e.target.value)}
                    placeholder="Filter console output..."
                    className="bg-transparent text-slate-200 outline-none text-xs w-full"
                  />
                </div>
                <button
                  onClick={() => wasiRuntime.clearConsoleLogs()}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Clear Console"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Console Output List */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1 font-mono text-xs">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded flex items-start gap-2 border ${
                    log.level === 'error'
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      : log.level === 'warn'
                      ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
                      : log.level === 'info'
                      ? 'bg-indigo-950/30 border-indigo-900/40 text-indigo-300'
                      : 'bg-slate-900/50 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 shrink-0">
                    {log.source}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{log.message}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-sans text-xs">
                  No console messages matching filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Virtual Process Monitor */}
        {activeTab === 'processes' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Active WASI Process Table</h3>
                <p className="text-xs text-slate-400">Virtual processes, daemons, and microservices running in-memory</p>
              </div>
              <button
                onClick={() => wasiRuntime.spawnProcess('background-worker', 'node worker.js')}
                className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                + Spawn Process
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {processes.map(proc => (
                  <div key={proc.pid} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-white">{proc.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">PID: {proc.pid}</span>
                      </div>
                      <button
                        onClick={() => wasiRuntime.killProcess(proc.pid)}
                        className="px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-950/60 rounded border border-rose-900/60 transition-colors cursor-pointer"
                      >
                        Kill
                      </button>
                    </div>

                    <div className="p-2 bg-slate-950 rounded font-mono text-[11px] text-slate-300 truncate">
                      $ {proc.command}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>CPU: {proc.cpuPercent}%</span>
                      <span>RAM: {proc.memoryMb} MB</span>
                      <span>Port: {proc.port ? `:${proc.port}` : 'None'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: VFS Virtual File Explorer */}
        {activeTab === 'vfs' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4 font-mono text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-sans">
              <span className="text-slate-400">Path:</span>
              <span className="font-bold text-indigo-400">{currentVfsPath}</span>
              {currentVfsPath !== '/' && (
                <button
                  onClick={() => {
                    const parent = currentVfsPath.substring(0, currentVfsPath.lastIndexOf('/')) || '/';
                    setCurrentVfsPath(parent);
                    setVfsFiles(wasiRuntime.readdir(parent));
                  }}
                  className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded ml-auto"
                >
                  ↑ Up
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar mt-3 divide-y divide-slate-800/60">
              {vfsFiles.map(file => (
                <div
                  key={file.path}
                  onClick={() => {
                    if (file.type === 'directory') {
                      setCurrentVfsPath(file.path);
                      setVfsFiles(wasiRuntime.readdir(file.path));
                    } else if (onOpenFile) {
                      const rel = file.path.replace(/^\/workspace\//, '');
                      onOpenFile(rel);
                    }
                  }}
                  className="p-2 hover:bg-slate-900/60 rounded flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {file.type === 'directory' ? '📁' : '📄'}
                    <span className={file.type === 'directory' ? 'text-indigo-400 font-bold' : 'text-slate-200'}>
                      {file.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {file.type === 'directory' ? 'dir' : `${file.size} B`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
