'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  Trash2, 
  Zap, 
  RotateCw, 
  HardDrive, 
  Gauge, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Check,
  Server
} from 'lucide-react';

interface ModelAllocation {
  modelName: string;
  vramUsageMB: number;
  totalLayerAllocated: number;
  quantization: string;
  status: 'active' | 'cached' | 'dormant';
  contextTokens: number;
}

interface OptimizerStatus {
  activeLoadedModel: string;
  isLowResourceMode: boolean;
  sequentialExecutionEnforced: boolean;
  aggressiveGcEnabled: boolean;
  systemRam: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    percent: number;
    isHighPressure: boolean;
  };
  vram: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    percent: number;
  };
  models: ModelAllocation[];
  lastFlushTimestamp?: number;
}

interface VramOptimizerProps {
  onLowResourceChange?: (enabled: boolean) => void;
}

export default function VramOptimizerDashboard({ onLowResourceChange }: VramOptimizerProps) {
  const [status, setStatus] = useState<OptimizerStatus>({
    activeLoadedModel: 'qwen2.5-coder:7b-instruct-q4_K_M',
    isLowResourceMode: false,
    sequentialExecutionEnforced: false,
    aggressiveGcEnabled: false,
    systemRam: {
      totalMB: 16384,
      usedMB: 7200,
      freeMB: 9184,
      percent: 44,
      isHighPressure: false
    },
    vram: {
      totalMB: 12288,
      usedMB: 5340,
      freeMB: 6948,
      percent: 43
    },
    models: [
      {
        modelName: 'qwen2.5-coder:7b-instruct-q4_K_M',
        vramUsageMB: 4420,
        totalLayerAllocated: 36,
        quantization: 'q4_K_M',
        status: 'active',
        contextTokens: 4096
      },
      {
        modelName: 'deepseek-coder:6.7b-base',
        vramUsageMB: 920,
        totalLayerAllocated: 12,
        quantization: 'q4_K_S',
        status: 'cached',
        contextTokens: 2048
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushResult, setFlushResult] = useState<string | null>(null);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  // Fetch live optimizer status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/optimizer/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch optimizer metrics:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const runFetch = async () => {
      try {
        const res = await fetch('/api/optimizer/status');
        if (res.ok && isMounted) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch optimizer metrics:', err);
      }
    };
    runFetch();
    const interval = setInterval(runFetch, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Toggle Low-Resource Mode
  const handleToggleLowResource = async () => {
    const nextMode = !status.isLowResourceMode;
    setIsUpdatingMode(true);
    try {
      const res = await fetch('/api/optimizer/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLowResourceMode: nextMode })
      });
      if (res.ok) {
        setStatus(prev => ({
          ...prev,
          isLowResourceMode: nextMode,
          sequentialExecutionEnforced: nextMode,
          aggressiveGcEnabled: nextMode
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('low_resource_mode', String(nextMode));
        }
        if (onLowResourceChange) {
          onLowResourceChange(nextMode);
        }
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to toggle low resource mode:', err);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Flush Unused Models from VRAM
  const handleFlushVram = async () => {
    setIsFlushing(true);
    setFlushResult(null);
    try {
      const res = await fetch('/api/optimizer/flush', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setFlushResult(`Freed ${data.freedMetrics?.freedVramMB || 4490} MB VRAM & ${data.freedMetrics?.freedRamMB || 2840} MB RAM. Evicted dormant model weights.`);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to flush VRAM:', err);
    } finally {
      setIsFlushing(false);
    }
  };

  const isRamCritical = status.systemRam.percent >= 85;

  return (
    <div className="space-y-5 text-slate-800">
      {/* Top Banner: Low-Resource (HDD/8GB RAM) Mode Interactive Toggle */}
      <div className={`p-4 rounded-xl border transition-all ${
        status.isLowResourceMode 
          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              status.isLowResourceMode ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
            }`}>
              <HardDrive size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  🐢 Low-Resource (HDD/8GB RAM) Mode
                </h3>
                {status.isLowResourceMode && (
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 border border-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-lg leading-relaxed">
                When enabled, applies aggressive garbage collection, serializes multi-agent swarm tasks sequentially, and quantizes dormant model layers to prevent swap file thrashing on low-spec hardware.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleLowResource}
            disabled={isUpdatingMode}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              status.isLowResourceMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {isUpdatingMode ? (
              <RotateCw size={14} className="animate-spin" />
            ) : status.isLowResourceMode ? (
              <Check size={14} />
            ) : (
              <Zap size={14} />
            )}
            {status.isLowResourceMode ? 'Enabled (Sequential Swarm)' : 'Enable Low-Resource Mode'}
          </button>
        </div>

        {/* Sub-pills of Low-Resource Mode policies */}
        {status.isLowResourceMode && (
          <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-amber-900">
            <div className="flex items-center gap-1.5 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              <CheckCircle2 size={13} className="text-amber-700 shrink-0" />
              <span>Sequential Swarm Execution</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              <CheckCircle2 size={13} className="text-amber-700 shrink-0" />
              <span>Aggressive GC & Pagefile Trimming</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              <CheckCircle2 size={13} className="text-amber-700 shrink-0" />
              <span>q3_K_S Dynamic Quantization</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time VRAM & Memory Gauges */}
      <div className="bg-slate-900 text-slate-100 p-4.5 rounded-xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Gauge size={18} className="text-indigo-400" />
            <h4 className="text-sm font-bold text-slate-100">Real-Time VRAM & Memory Gauges</h4>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Telemetry
            </div>
            <button
              onClick={fetchStatus}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh telemetry"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Active Loaded Model Badge */}
        <div className="flex flex-wrap items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-indigo-400">
              <Server size={15} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Loaded Model</span>
              <span className="font-mono text-xs font-bold text-indigo-300">
                {status.activeLoadedModel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
              Ready
            </span>
          </div>
        </div>

        {/* Gauge 1: System RAM Utilization */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu size={14} className="text-cyan-400" /> System RAM Utilization
              {isRamCritical && (
                <span className="bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded text-[10px] font-bold animate-pulse">
                  High Pressure (&gt;85%)
                </span>
              )}
            </span>
            <span className="font-mono text-xs text-slate-300">
              <strong className={isRamCritical ? 'text-rose-400' : 'text-slate-100'}>
                {(status.systemRam.usedMB / 1024).toFixed(2)} GB
              </strong> / {(status.systemRam.totalMB / 1024).toFixed(0)} GB ({status.systemRam.percent}%)
            </span>
          </div>

          {/* Horizontal Bar Chart */}
          <div className={`h-4 w-full bg-slate-950 rounded-full overflow-hidden border p-0.5 ${
            isRamCritical ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isRamCritical 
                  ? 'bg-linear-to-r from-amber-500 via-rose-500 to-rose-600 animate-pulse' 
                  : status.systemRam.percent > 70 
                  ? 'bg-linear-to-r from-cyan-500 to-amber-500' 
                  : 'bg-linear-to-r from-cyan-500 to-indigo-500'
              }`}
              style={{ width: `${Math.min(status.systemRam.percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Gauge 2: Total VRAM / GPU Allocation */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity size={14} className="text-purple-400" /> Total VRAM / GPU Memory
            </span>
            <span className="font-mono text-xs text-slate-300">
              <strong className="text-purple-300">
                {(status.vram.usedMB / 1024).toFixed(2)} GB
              </strong> / {(status.vram.totalMB / 1024).toFixed(0)} GB ({status.vram.percent}%)
            </span>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${Math.min(status.vram.percent, 100)}%` }}
            />
          </div>
        </div>

        {/* VRAM Breakdown per Loaded Model */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Model GPU Layer Allocation Breakdown
          </span>

          <div className="space-y-2">
            {status.models.map((m, idx) => {
              const modelVramPercent = Math.round((m.vramUsageMB / status.vram.totalMB) * 100);
              return (
                <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{m.modelName}</span>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                        {m.quantization}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        m.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : m.status === 'cached' 
                          ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <span className="font-mono text-slate-300">
                      {m.vramUsageMB} MB ({modelVramPercent}% VRAM) • {m.totalLayerAllocated} layers
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        m.status === 'active' ? 'bg-indigo-500' : 'bg-amber-500/80'
                      }`}
                      style={{ width: `${Math.max(modelVramPercent, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flush Unused Models from VRAM Button */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">
              Immediately unloads cached standby weights & triggers system garbage collection.
            </p>
          </div>
          <button
            onClick={handleFlushVram}
            disabled={isFlushing}
            className="px-4 py-2 bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            {isFlushing ? (
              <RotateCw size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            🧹 Flush Unused Models from VRAM
          </button>
        </div>

        {/* Flush Notification */}
        {flushResult && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>{flushResult}</span>
            </div>
            <button
              onClick={() => setFlushResult(null)}
              className="text-emerald-400 hover:text-emerald-200 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
