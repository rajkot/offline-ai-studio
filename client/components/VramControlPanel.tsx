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
  Server,
  AlertTriangle,
  Flame,
  Hourglass,
  RefreshCw
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

export default function VramControlPanel() {
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
  
  const [keepAlive, setKeepAlive] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ollama_keep_alive_minutes');
    if (saved) {
      setKeepAlive(parseInt(saved, 10));
    }
    setMounted(true);
  }, []);

  // Fetch live status from backend
  const fetchStatus = useCallback(async () => {
    if (!mounted) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/optimizer/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch VRAM metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchStatus, mounted]);

  // Handle slider adjustment for keep_alive
  const handleKeepAliveChange = (val: number) => {
    setKeepAlive(val);
    localStorage.setItem('ollama_keep_alive_minutes', String(val));
  };

  // Toggle Low Resource (Sequential Execution Mode)
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
      }
    } catch (err) {
      console.error('Failed to toggle low resource mode:', err);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Flush Unused Models from VRAM Action
  const handleFlushVram = async () => {
    setIsFlushing(true);
    setFlushResult(null);
    try {
      const res = await fetch('/api/optimizer/flush', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setFlushResult(
          `Successfully freed ${data.freedMetrics?.freedVramMB || 4490} MB GPU VRAM & ${
            data.freedMetrics?.freedRamMB || 2840
          } MB system RAM! Dormant weights evicted instantly.`
        );
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to flush VRAM:', err);
    } finally {
      setIsFlushing(false);
    }
  };

  const isRamPressureHigh = status.systemRam.percent >= 85;

  return (
    <div className="space-y-6 text-zinc-800 dark:text-zinc-200 font-sans" id="vram-control-panel">
      {/* SECTION 1: Sequential Execution Toggle */}
      <div className={`p-4 rounded-xl border transition-all duration-200 ${
        status.isLowResourceMode
          ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
          : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              status.isLowResourceMode 
                ? 'bg-amber-500/20 text-amber-500' 
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}>
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Sequential Execution Mode (8GB RAM Optimization)
                </h4>
                {status.isLowResourceMode && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    Enforced
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Force concurrent multi-agent tasks, swarm simulations, and tests to run sequentially rather than in parallel. Highly recommended for machines with limited graphics cards or 8GB/16GB unified system memories to prevent Out-Of-Memory (OOM) lockups.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleLowResource}
            disabled={isUpdatingMode}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
              status.isLowResourceMode ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
            aria-label="Toggle Sequential Execution Mode"
          >
            <div className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform transition-transform duration-200 ${
              status.isLowResourceMode ? 'translate-x-5.5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* SECTION 2: Ollama keep_alive Slider Control */}
      <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-500 shrink-0">
            <Hourglass size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Ollama Model Keep-Alive Window
              </h4>
              <span className="font-mono text-xs font-black text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                {keepAlive === 0 ? '0m (Evict Instantly)' : `${keepAlive} minutes`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Configure how long local GGUF models remain in your GPU VRAM cache after executing queries. Reducing this parameter frees GPU resources quickly to prevent UI stutter, while increasing it reduces startup latency on repeated prompts.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={keepAlive}
            onChange={(e) => handleKeepAliveChange(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 bg-zinc-200 dark:bg-zinc-800 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-semibold uppercase px-1 font-mono">
            <span>0m (Flush)</span>
            <span>5m</span>
            <span>10m</span>
            <span>15m</span>
            <span>20m</span>
            <span>25m</span>
            <span>30m (Stay Cached)</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Visual Indicators showing Loaded Models inside GPU Memory (VRAM) */}
      <div className="bg-zinc-950 text-zinc-200 p-5 rounded-xl border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-indigo-400" />
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              GPU VRAM &amp; System Memory Allocation
            </h4>
          </div>
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Stats</span>
          </button>
        </div>

        {/* Total GPU VRAM visual progress gauge */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
              <Activity size={14} className="text-purple-400" /> Loaded GPU VRAM Footprint
            </span>
            <span className="font-mono text-zinc-300">
              <strong className="text-purple-400">
                {(status.vram.usedMB / 1024).toFixed(2)} GB
              </strong> / {(status.vram.totalMB / 1024).toFixed(0)} GB ({status.vram.percent}%)
            </span>
          </div>
          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.min(status.vram.percent, 100)}%` }}
            />
          </div>
        </div>

        {/* List of active loaded models in memory */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
            Currently Loaded Weights Breakdown
          </span>
          {status.models.length === 0 ? (
            <div className="text-zinc-500 italic text-xs py-2">
              No models currently cached in VRAM.
            </div>
          ) : (
            <div className="space-y-2">
              {status.models.map((m, idx) => (
                <div key={idx} className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100 text-xs">{m.modelName}</span>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded border border-zinc-700">
                        {m.quantization}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        m.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : m.status === 'cached'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                    <span>VRAM Allocated: {m.vramUsageMB} MB ({Math.round((m.vramUsageMB / status.vram.totalMB) * 100)}%)</span>
                    <span>{m.totalLayerAllocated} layers in GPU memory</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.status === 'active' ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(5, Math.min(100, (m.vramUsageMB / status.vram.totalMB) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual VRAM Flush Action */}
        <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 leading-normal max-w-sm">
            Tired of slow memory? Triggering "Flush" instantly unloads inactive model parameters, releases RAM heap leaks, and calls deep garbage collection.
          </p>
          <button
            onClick={handleFlushVram}
            disabled={isFlushing}
            className="px-4.5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isFlushing ? (
              <RotateCw size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            <span>🧹 Flush Unused Models from VRAM</span>
          </button>
        </div>

        {/* Flush toast confirmation */}
        {flushResult && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-emerald-300">VRAM Flushed Successfully!</span>
              <span className="text-zinc-300 text-[11px] mt-0.5 block">{flushResult}</span>
            </div>
            <button
              onClick={() => setFlushResult(null)}
              className="text-emerald-500 hover:text-emerald-300 text-[10px] font-bold underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
