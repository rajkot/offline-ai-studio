'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Flame,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Thermometer,
  BarChart2,
  Maximize2,
  Info,
  Search,
  Filter
} from 'lucide-react';

export interface FlameFrame {
  id: string;
  name: string;
  file: string;
  depth: number;
  startTimeMs: number;
  durationMs: number;
  selfTimeMs: number;
  vramCostMb: number;
  cpuPct: number;
  children?: FlameFrame[];
}

export interface TelemetryPoint {
  timestamp: string;
  cpuPct: number;
  ramHeapMb: number;
  ramTotalMb: number;
  gpuVramGb: number;
  gpuVramTotalGb: number;
  gpuTempC: number;
}

export interface ProfilerData {
  jobId: string;
  status: 'profiling' | 'stopped' | 'idle';
  summary: {
    totalDurationMs: number;
    peakCpuPct: number;
    peakRamHeapMb: number;
    ramWarningLimitMb: number;
    peakVramGb: number;
    gpuTempC: number;
    totalSamplesRecorded: number;
  };
  telemetryHistory: TelemetryPoint[];
  flamegraph: FlameFrame[];
  hotspots: { function: string; file: string; selfTimeMs: number; pctTotal: number; vramMb: number }[];
}

export default function PerformanceDashboard() {
  const [isProfiling, setIsProfiling] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<ProfilerData | null>(null);
  const [hoveredFrame, setHoveredFrame] = useState<FlameFrame | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FlameFrame | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Live polling timer for profiling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProfileData = async (action: 'start' | 'stop' | 'clear' = 'start') => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiler/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const json = await res.json();

      if (json.success) {
        if (action === 'clear') {
          setData(null);
          setIsProfiling(false);
          setStatusMessage('🧹 Telemetry metrics and flamegraph traces cleared.');
        } else if (action === 'stop') {
          setIsProfiling(false);
          setStatusMessage('⏹ Profiling trace session stopped and compiled.');
        } else {
          setData(json);
          setIsProfiling(true);
          setStatusMessage('▶️ Real-time profiler active - recording CPU, VRAM & flamegraph traces...');
        }
      }
    } catch (err: any) {
      console.error('Failed to execute profiler action:', err);
      setStatusMessage('⚠️ Profiler API Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh live metrics while profiling
  useEffect(() => {
    if (isProfiling) {
      pollIntervalRef.current = setInterval(() => {
        fetchProfileData('start');
      }, 3000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isProfiling]);

  // Handle Start Profiling
  const handleStartProfiling = () => {
    fetchProfileData('start');
  };

  // Handle Stop Profiling
  const handleStopProfiling = () => {
    fetchProfileData('stop');
  };

  // Handle Clear Metrics
  const handleClearMetrics = () => {
    fetchProfileData('clear');
  };

  // Initial load
  useEffect(() => {
    fetchProfileData('start');
  }, []);

  // SVG Telemetry Area Chart Renderer
  const renderAreaChart = (
    metricKey: 'cpuPct' | 'ramHeapMb' | 'gpuVramGb' | 'gpuTempC',
    label: string,
    unit: string,
    color: string,
    gradientId: string,
    warningLimit?: number,
    maxValue: number = 100
  ) => {
    if (!data || !data.telemetryHistory || data.telemetryHistory.length === 0) {
      return (
        <div className="h-36 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-500 font-mono">
          No Telemetry Stream Data
        </div>
      );
    }

    const history = data.telemetryHistory;
    const width = 450;
    const height = 120;

    const points = history.map((pt, idx) => {
      const x = (idx / (history.length - 1 || 1)) * (width - 20) + 10;
      const val = pt[metricKey];
      const normalizedY = Math.min(1, Math.max(0, val / maxValue));
      const y = height - 20 - normalizedY * (height - 35);
      return `${x},${y}`;
    }).join(' ');

    const currentVal = history[history.length - 1][metricKey];
    const isWarning = warningLimit ? currentVal >= warningLimit : false;

    // Warning Line Y calculation
    const warningY = warningLimit
      ? height - 20 - (warningLimit / maxValue) * (height - 35)
      : null;

    return (
      <div className={`p-4 bg-slate-900 border rounded-2xl flex flex-col justify-between shadow-lg transition-all ${
        isWarning ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isWarning ? 'bg-rose-500 animate-ping' : ''}`} style={!isWarning ? { backgroundColor: color } : undefined}></span>
            <span className="text-xs font-bold text-slate-300">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {isWarning && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full flex items-center gap-1">
                <AlertTriangle size={11} /> High Usage
              </span>
            )}
            <span className="text-xs font-black font-mono text-white">
              {currentVal} {unit}
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Warning threshold line */}
          {warningY !== null && (
            <line
              x1="10"
              y1={warningY}
              x2={width - 10}
              y2={warningY}
              stroke="#f43f5e"
              strokeDasharray="4,4"
              strokeWidth="1.5"
            />
          )}

          {/* Gradient polygon */}
          <polygon
            points={`10,${height - 20} ${points} ${width - 10},${height - 20}`}
            fill={`url(#${gradientId})`}
          />

          {/* Main area line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
          <span>T-20s</span>
          <span>{history[history.length - 1].timestamp}</span>
        </div>
      </div>
    );
  };

  // Helper to color flamegraph blocks based on CPU / VRAM hotness
  const getFlameColor = (cpuPct: number, vramMb: number, depth: number) => {
    if (cpuPct > 80 || vramMb > 400) {
      return 'bg-gradient-to-r from-rose-600 to-amber-600 border-rose-400 text-white shadow-rose-950';
    }
    if (cpuPct > 40 || vramMb > 100) {
      return 'bg-gradient-to-r from-amber-600 to-yellow-600 border-amber-400 text-white shadow-amber-950';
    }
    if (depth === 0) {
      return 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-indigo-950';
    }
    return 'bg-gradient-to-r from-cyan-700 to-blue-700 border-cyan-400 text-cyan-100 shadow-blue-950';
  };

  // Recursive Flamegraph Row Renderer
  const renderFlameFrame = (frame: FlameFrame, totalDurationMs: number) => {
    const widthPct = Math.max(12, (frame.durationMs / totalDurationMs) * 100);
    const leftPct = (frame.startTimeMs / totalDurationMs) * 100;

    const isMatch = searchFilter
      ? frame.name.toLowerCase().includes(searchFilter.toLowerCase()) || frame.file.toLowerCase().includes(searchFilter.toLowerCase())
      : false;

    return (
      <div key={frame.id} className="w-full flex flex-col gap-1 my-1">
        <div className="relative w-full h-8 bg-slate-950/40 rounded-lg overflow-hidden">
          <div
            onClick={() => setSelectedFrame(frame)}
            onMouseEnter={(e) => {
              setHoveredFrame(frame);
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left, y: rect.top - 70 });
            }}
            onMouseLeave={() => setHoveredFrame(null)}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`
            }}
            className={`absolute top-0 bottom-0 px-2 flex items-center justify-between rounded-md border text-xs font-mono font-bold cursor-pointer transition-all hover:scale-[1.01] hover:brightness-125 z-10 ${
              getFlameColor(frame.cpuPct, frame.vramCostMb, frame.depth)
            } ${isMatch ? 'ring-2 ring-yellow-400 animate-pulse' : ''} ${
              selectedFrame?.id === frame.id ? 'ring-2 ring-white scale-[1.01]' : ''
            }`}
          >
            <span className="truncate">{frame.name}</span>
            <span className="text-[10px] opacity-90 shrink-0 ml-2">{frame.durationMs}ms</span>
          </div>
        </div>

        {/* Render child frames recursively */}
        {frame.children && frame.children.length > 0 && (
          <div className="pl-4 border-l border-slate-800 space-y-1">
            {frame.children.map(child => renderFlameFrame(child, totalDurationMs))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-y-auto p-4 md:p-6 gap-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner">
            <Activity size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white">📊 Performance Profiler &amp; Flamegraph Studio</h1>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase border ${
                isProfiling ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isProfiling ? 'Live Profiler Active' : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor real-time CPU thread utilization, RAM heap memory limits, GPU VRAM temperature, and inspect execution flamegraphs.
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!isProfiling ? (
            <button
              onClick={handleStartProfiling}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 active:scale-98"
            >
              <Play size={15} fill="currentColor" />
              <span>▶️ Start Profiling</span>
            </button>
          ) : (
            <button
              onClick={handleStopProfiling}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950 transition-all flex items-center gap-2 active:scale-98"
            >
              <Square size={15} fill="currentColor" />
              <span>⏹ Stop Profiling</span>
            </button>
          )}

          <button
            onClick={handleClearMetrics}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} className="text-slate-400" />
            <span>🧹 Clear Metrics</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Info size={15} className="text-indigo-400" />
            {statusMessage}
          </span>
          <span className="text-[10px] text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {/* SECTION 1: Real-Time Resource Telemetry Area Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CPU Thread Utilization */}
        {renderAreaChart('cpuPct', 'CPU Thread Utilization', '%', '#a855f7', 'cpuGrad', 85, 100)}

        {/* RAM Heap Allocation (With 80% Warning Limit = 3276 MB out of 4096 MB) */}
        {renderAreaChart('ramHeapMb', 'Active RAM Heap Allocation', 'MB', '#38bdf8', 'ramGrad', 3276, 4096)}

        {/* GPU VRAM Footprint & Temperature */}
        {renderAreaChart('gpuVramGb', 'GPU VRAM Footprint', 'GB', '#10b981', 'vramGrad', 10.0, 12.0)}
      </div>

      {/* SECTION 2: INTERACTIVE SVG FLAMEGRAPH VIEWER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Flame size={18} className="text-rose-500" /> Interactive Execution Call Stack Flamegraph
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Horizontally stacked execution blocks. Width = duration (ms), Color = CPU / VRAM hotspot. Hover to inspect latency details.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter stack frames..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Flamegraph Canvas / Stack Area */}
        {data && data.flamegraph && data.flamegraph.length > 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto min-h-[280px] relative">
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-2 pb-1 border-b border-slate-900">
              <span>0 ms (Request Start)</span>
              <span>210 ms</span>
              <span>{data.summary.totalDurationMs} ms (Execution End)</span>
            </div>

            <div className="space-y-1">
              {data.flamegraph.map(frame => renderFlameFrame(frame, data.summary.totalDurationMs))}
            </div>

            {/* Hover Tooltip Popup */}
            {hoveredFrame && (
              <div
                style={{ left: Math.min(window.innerWidth - 280, tooltipPos.x), top: tooltipPos.y }}
                className="fixed z-50 bg-slate-900 border border-indigo-500/60 p-3 rounded-xl shadow-2xl text-xs font-mono text-slate-200 w-64 pointer-events-none backdrop-blur-md"
              >
                <div className="font-bold text-white text-xs truncate mb-1">{hoveredFrame.name}</div>
                <div className="text-[10px] text-slate-400 truncate mb-2">{hoveredFrame.file}</div>
                <div className="space-y-1 text-[11px] border-t border-slate-800 pt-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Duration:</span>
                    <span className="font-bold text-emerald-400">{hoveredFrame.durationMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Self Time:</span>
                    <span className="font-bold text-purple-400">{hoveredFrame.selfTimeMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPU Usage:</span>
                    <span className="font-bold text-amber-400">{hoveredFrame.cpuPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">VRAM Cost:</span>
                    <span className="font-bold text-cyan-400">{hoveredFrame.vramCostMb} MB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 font-mono">
            <Activity size={28} className="mb-2 text-indigo-500/40 animate-pulse" />
            <span>Click "▶️ Start Profiling" to capture real-time execution call stacks...</span>
          </div>
        )}
      </div>

      {/* SECTION 3: TOP HOTSPOTS & RESOURCE SUMMARY */}
      {data && data.hotspots && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                <Flame size={15} className="text-rose-400" /> Top Identified Latency Hotspots
              </h4>
              <span className="text-[10px] text-rose-400 font-mono font-bold">Bottleneck Analysis</span>
            </div>

            <div className="space-y-2">
              {data.hotspots.map((hs, i) => (
                <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200 font-mono">{hs.function}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{hs.file}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-rose-400 font-mono">{hs.selfTimeMs} ms ({hs.pctTotal}%)</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{hs.vramMb} MB VRAM</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                <BarChart2 size={15} className="text-indigo-400" /> Telemetry Summary Metrics
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Passed Limits</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400">Peak CPU Thread</div>
                <div className="text-base font-extrabold text-purple-400 font-mono">{data.summary.peakCpuPct}%</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400">Peak RAM Heap</div>
                <div className="text-base font-extrabold text-cyan-400 font-mono">{data.summary.peakRamHeapMb} MB</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400">Peak GPU VRAM</div>
                <div className="text-base font-extrabold text-emerald-400 font-mono">{data.summary.peakVramGb} GB</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400">GPU Core Temp</div>
                <div className="text-base font-extrabold text-amber-400 font-mono">{data.summary.gpuTempC} °C</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Total Trace Duration: {data.summary.totalDurationMs} ms</span>
              <span>Samples: {data.summary.totalSamplesRecorded}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
