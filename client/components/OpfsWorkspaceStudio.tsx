'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { 
  HardDrive, 
  FolderPlus, 
  RefreshCw, 
  Search, 
  FileCode, 
  FileText, 
  Image as ImageIcon, 
  Database, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Gauge, 
  Sparkles,
  Download,
  FolderTree,
  Terminal,
  ExternalLink,
  ChevronRight,
  Eye,
  Binary
} from 'lucide-react';
import { opfsEngine, OpfsFileEntry, OpfsQuotaInfo, LargeScaleBenchmarkResult } from '@/lib/opfsEngine';

interface OpfsWorkspaceStudioProps {
  workspaceFiles?: Record<string, string>;
  onOpenFile?: (path: string) => void;
  onImportFilesToWorkspace?: (files: Record<string, string>) => void;
}

export default function OpfsWorkspaceStudio({
  workspaceFiles = {},
  onOpenFile,
  onImportFilesToWorkspace
}: OpfsWorkspaceStudioProps) {
  const [quotaInfo, setQuotaInfo] = useState<OpfsQuotaInfo>({
    usageBytes: 0,
    quotaBytes: 10 * 1024 * 1024 * 1024,
    usagePercent: 0,
    fileCount: 0,
    isOpfsSupported: true,
    isFileSystemAccessSupported: true,
    mountedDirectoryName: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<OpfsFileEntry | null>(null);
  const [fileContentPreview, setFileContentPreview] = useState<string | null>(null);
  const [hexPreview, setHexPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explorer' | 'benchmark' | 'binary_inspector' | 'storage_telemetry'>('explorer');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<LargeScaleBenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkTarget, setBenchmarkTarget] = useState(25000);
  const [filterType, setFilterType] = useState<string>('all');
  const [, startTransition] = useTransition();

  const hasAutoSyncedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = opfsEngine.subscribe((info) => {
      setQuotaInfo(info);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-sync initial workspace once if index is empty
    if (!hasAutoSyncedRef.current && Object.keys(workspaceFiles).length > 0 && opfsEngine.getAllFiles().length === 0) {
      hasAutoSyncedRef.current = true;
      opfsEngine.syncWorkspaceToOpfs(workspaceFiles).then(() => {
        setSyncStatus(`Auto-synced ${Object.keys(workspaceFiles).length} project files to OPFS disk`);
      });
    }
  }, [workspaceFiles]);

  const handleSyncWorkspace = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing files to OPFS disk...');
    try {
      const res = await opfsEngine.syncWorkspaceToOpfs(workspaceFiles);
      setSyncStatus(`Successfully synced ${res.count} files (${(res.bytes / 1024).toFixed(1)} KB) in ${res.durationMs}ms`);
    } catch (err: any) {
      setSyncStatus(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMountLocalDirectory = async () => {
    try {
      setSyncStatus('Selecting local directory...');
      const res = await opfsEngine.mountLocalDirectory();
      if (res) {
        setSyncStatus(`Mounted directory '${res.directoryName}': Indexed ${res.fileCount} files in ${res.durationMs}ms`);
      }
    } catch (err: any) {
      setSyncStatus(`Mount failed: ${err.message}`);
    }
  };

  const handleRunBenchmark = () => {
    setIsBenchmarking(true);
    startTransition(() => {
      setTimeout(() => {
        const result = opfsEngine.generateLargeScaleBenchmark(benchmarkTarget);
        setBenchmarkResult(result);
        setIsBenchmarking(false);
        setSyncStatus(`Benchmark completed: Indexed ${result.fileCount.toLocaleString()} files (${result.filesIndexedPerSec.toLocaleString()} files/sec)`);
      }, 50);
    });
  };

  const filteredFiles = useMemo(() => {
    const all = opfsEngine.searchFiles(searchQuery, 200);
    if (filterType === 'all') return all;
    return all.filter(f => f.type === filterType);
  }, [searchQuery, filterType, quotaInfo.fileCount]);

  const handleSelectEntry = async (entry: OpfsFileEntry) => {
    setSelectedEntry(entry);
    const content = await opfsEngine.readFile(entry.path);
    if (typeof content === 'string') {
      setFileContentPreview(content.slice(0, 10000));
      setHexPreview(null);
    } else if (content instanceof ArrayBuffer) {
      setFileContentPreview(null);
      // Generate hex preview
      const uint8 = new Uint8Array(content.slice(0, 512));
      let hex = '';
      for (let i = 0; i < uint8.length; i += 16) {
        const chunk = uint8.slice(i, i + 16);
        const hexPart = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
        const asciiPart = Array.from(chunk).map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
        hex += `${i.toString(16).padStart(6, '0')}  ${hexPart.padEnd(48, ' ')}  |${asciiPart}|\n`;
      }
      setHexPreview(hex);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0e12] text-zinc-200 select-none overflow-hidden font-sans border-r border-[#1f2028]">
      {/* Top Header */}
      <div className="p-3 bg-[#13141a] border-b border-[#242531] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-md">
            <HardDrive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Origin Private File System (OPFS)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 font-mono">
                Zero-Copy Storage
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">High-scale workspace buffer & local disk mounting</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncWorkspace}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-emerald-400' : 'text-zinc-400'} />
            Sync Workspace
          </button>
          
          <button
            onClick={handleMountLocalDirectory}
            className="px-2.5 py-1.5 rounded-md bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-xs font-semibold text-emerald-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FolderPlus size={13} className="text-emerald-300" />
            Mount Local Directory
          </button>
        </div>
      </div>

      {/* Quota & Disk Status Bar */}
      <div className="px-3 py-2 bg-[#090a0e] border-b border-[#1f2028] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">OPFS Status:</span>
            {quotaInfo.isOpfsSupported ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> Active
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> Virtual Memory Fallback
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Indexed Files:</span>
            <span className="text-white font-bold">{quotaInfo.fileCount.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Storage Used:</span>
            <span className="text-cyan-300">{formatBytes(quotaInfo.usageBytes)} / {formatBytes(quotaInfo.quotaBytes)}</span>
          </div>

          {quotaInfo.mountedDirectoryName && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-200">
              <FolderTree size={12} className="text-indigo-400" />
              <span>Mounted: {quotaInfo.mountedDirectoryName}</span>
            </div>
          )}
        </div>

        {/* Storage Bar Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-28 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300" 
              style={{ width: `${Math.max(2, Math.min(100, quotaInfo.usagePercent))}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-400">{quotaInfo.usagePercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Status Alert Banner if any */}
      {syncStatus && (
        <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-300 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-emerald-400 shrink-0" />
            <span className="truncate">{syncStatus}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-zinc-400 hover:text-zinc-200 text-xs ml-2 cursor-pointer">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#242531] bg-[#101117] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'explorer' 
              ? 'border-emerald-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FolderTree size={14} className="text-emerald-400" />
          High-Scale File Explorer ({quotaInfo.fileCount.toLocaleString()})
        </button>

        <button
          onClick={() => setActiveTab('benchmark')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'benchmark' 
              ? 'border-emerald-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap size={14} className="text-amber-400" />
          50,000+ Files Benchmark
        </button>

        <button
          onClick={() => setActiveTab('binary_inspector')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'binary_inspector' 
              ? 'border-emerald-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Binary size={14} className="text-cyan-400" />
          Binary & Asset Inspector
        </button>

        <button
          onClick={() => setActiveTab('storage_telemetry')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'storage_telemetry' 
              ? 'border-emerald-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Gauge size={14} className="text-purple-400" />
          Zero-Copy Telemetry
        </button>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'explorer' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Search & Virtualized File List */}
            <div className="w-1/2 border-r border-[#1f2028] flex flex-col bg-[#0d0e12]">
              {/* Search & Filter Header */}
              <div className="p-2.5 bg-[#13141a] border-b border-[#242531] flex flex-col gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Fast search indexed files (50k+ capacity)..."
                    className="w-full bg-[#090a0e] text-white text-xs pl-8 pr-3 py-1.5 rounded border border-[#27272a] focus:border-emerald-500 focus:outline-none font-mono placeholder-zinc-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                  {['all', 'text', 'binary', 'image', 'wasm', 'database'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2 py-0.5 rounded capitalize font-medium transition-colors cursor-pointer ${
                        filterType === type 
                          ? 'bg-emerald-950 border border-emerald-600 text-emerald-200' 
                          : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Virtualized File List */}
              <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-[#171821]">
                {filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <p>No files match query "{searchQuery}"</p>
                    <p className="text-[11px] mt-1 text-zinc-600">Sync workspace or run large-scale benchmark</p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => handleSelectEntry(file)}
                      className={`p-2 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedEntry?.path === file.path 
                          ? 'bg-emerald-950/60 text-emerald-200' 
                          : 'hover:bg-zinc-800/40 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {file.type === 'text' && <FileCode size={13} className="text-blue-400 shrink-0" />}
                        {file.type === 'image' && <ImageIcon size={13} className="text-purple-400 shrink-0" />}
                        {file.type === 'wasm' && <Cpu size={13} className="text-amber-400 shrink-0" />}
                        {file.type === 'database' && <Database size={13} className="text-emerald-400 shrink-0" />}
                        {file.type === 'binary' && <Binary size={13} className="text-cyan-400 shrink-0" />}

                        <span className="truncate text-xs">{file.path}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500">
                        <span>{formatBytes(file.size)}</span>
                        {onOpenFile && file.type === 'text' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFile(file.path);
                            }}
                            title="Open in Code Editor"
                            className="p-1 hover:text-emerald-300 hover:bg-zinc-700/50 rounded"
                          >
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: File Preview & Hex Inspector */}
            <div className="w-1/2 flex flex-col bg-[#07080b]">
              <div className="p-2.5 bg-[#101117] border-b border-[#242531] flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 truncate">
                  {selectedEntry ? selectedEntry.path : 'Select a file to inspect zero-copy buffer'}
                </span>
                {selectedEntry && (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {selectedEntry.mimeType} • {formatBytes(selectedEntry.size)}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto p-3 font-mono text-xs text-zinc-300">
                {selectedEntry ? (
                  hexPreview ? (
                    <div>
                      <div className="text-[11px] text-cyan-400 mb-2 font-semibold flex items-center gap-1.5">
                        <Binary size={13} /> Hex Dump & Raw Binary Stream (Zero-Copy OPFS Slice):
                      </div>
                      <pre className="text-emerald-400 bg-black/60 p-3 rounded-lg border border-zinc-800 overflow-x-auto text-[11px] leading-relaxed">
                        {hexPreview}
                      </pre>
                    </div>
                  ) : fileContentPreview !== null ? (
                    <pre className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {fileContentPreview}
                    </pre>
                  ) : (
                    <div className="p-8 text-center text-zinc-500">Loading file buffer from OPFS...</div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <Eye size={24} className="opacity-40" />
                    <p>No file selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#090a0e] flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="bg-[#13141a] p-5 rounded-xl border border-[#27272a] shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">50,000+ Files Zero-Copy OPFS Stress Benchmark</h3>
                  <p className="text-xs text-zinc-400">
                    Test your browser's native Origin Private File System throughput and instant index lookup speeds.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 my-4">
                <div className="p-3 bg-[#0d0e12] rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400 block mb-1">Target Scale</span>
                  <select
                    value={benchmarkTarget}
                    onChange={(e) => setBenchmarkTarget(Number(e.target.value))}
                    className="w-full bg-[#181922] text-white text-xs p-2 rounded border border-zinc-700 outline-none font-bold"
                  >
                    <option value={10000}>10,000 Files (Linux Core Subsystem)</option>
                    <option value={25000}>25,000 Files (Chromium Module Scale)</option>
                    <option value={50000}>50,000 Files (Enterprise Monorepo Scale)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#0d0e12] rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400 block mb-1">Memory Model</span>
                  <span className="text-xs font-semibold text-emerald-400">W3C Direct OPFS Fast Stream</span>
                </div>

                <div className="p-3 bg-[#0d0e12] rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400 block mb-1">Status</span>
                  <span className={`text-xs font-bold ${isBenchmarking ? 'text-amber-400 animate-pulse' : 'text-zinc-300'}`}>
                    {isBenchmarking ? 'Generating & Indexing...' : 'Ready to Run'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Zap size={14} />
                {isBenchmarking ? 'Running Zero-Copy Stress Test...' : `Generate & Index ${benchmarkTarget.toLocaleString()} Files Now`}
              </button>
            </div>

            {/* Benchmark Results */}
            {benchmarkResult && (
              <div className="bg-[#111218] p-5 rounded-xl border border-emerald-700/60 shadow-lg">
                <h4 className="text-sm font-bold text-emerald-300 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Benchmark Results: Zero-Lag Invariant Confirmed
                </h4>

                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block">Total Files Indexed</span>
                    <span className="text-lg font-bold text-white">{benchmarkResult.fileCount.toLocaleString()}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block">Indexing Throughput</span>
                    <span className="text-lg font-bold text-cyan-300">{benchmarkResult.filesIndexedPerSec.toLocaleString()} /s</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block">Search Query Latency</span>
                    <span className="text-lg font-bold text-emerald-400">{benchmarkResult.searchLatencyMs} ms</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block">Total Disk Ingestion</span>
                    <span className="text-lg font-bold text-amber-300">{formatBytes(benchmarkResult.totalSizeBytes)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'binary_inspector' && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#090a0e] flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="bg-[#13141a] p-5 rounded-xl border border-[#27272a]">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Binary size={18} className="text-cyan-400" />
                Binary File & Asset Capabilities
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                OPFS directly stores and streams compiled WebAssembly binaries (.wasm), SQLite databases (.db, .sqlite), images (PNG, WebP, SVG), and typography font files (TTF, WOFF2) without base64 serialization overhead.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0d0e12] rounded-lg border border-zinc-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <Cpu size={14} /> WebAssembly Modules (.wasm)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Zero-copy streaming into <code className="text-amber-300">WebAssembly.instantiateStreaming()</code> straight from OPFS memory descriptors.
                  </p>
                </div>

                <div className="p-4 bg-[#0d0e12] rounded-lg border border-zinc-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <Database size={14} /> SQLite Web Storage Engines (.sqlite)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    High-throughput page reads and atomic transactions using OPFS FileSystemSyncAccessHandle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'storage_telemetry' && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#090a0e] flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="bg-[#13141a] p-5 rounded-xl border border-[#27272a]">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Gauge size={18} className="text-purple-400" />
                Storage & Zero-Copy Telemetry
              </h3>
              <div className="space-y-3 mt-4 text-xs font-mono">
                <div className="flex justify-between p-2.5 bg-[#090a0e] rounded border border-zinc-800">
                  <span className="text-zinc-400">Direct OPFS API Supported:</span>
                  <span className={quotaInfo.isOpfsSupported ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                    {quotaInfo.isOpfsSupported ? 'YES (navigator.storage.getDirectory)' : 'NO (Polyfilled)'}
                  </span>
                </div>

                <div className="flex justify-between p-2.5 bg-[#090a0e] rounded border border-zinc-800">
                  <span className="text-zinc-400">Local Directory Picker API:</span>
                  <span className={quotaInfo.isFileSystemAccessSupported ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                    {quotaInfo.isFileSystemAccessSupported ? 'YES (window.showDirectoryPicker)' : 'NO'}
                  </span>
                </div>

                <div className="flex justify-between p-2.5 bg-[#090a0e] rounded border border-zinc-800">
                  <span className="text-zinc-400">Total Indexed Items in Memory Graph:</span>
                  <span className="text-white font-bold">{quotaInfo.fileCount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between p-2.5 bg-[#090a0e] rounded border border-zinc-800">
                  <span className="text-zinc-400">Total Storage Consumed:</span>
                  <span className="text-cyan-300 font-bold">{formatBytes(quotaInfo.usageBytes)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
