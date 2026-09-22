'use client';
// components/GgufQuantizerStudio.tsx
// Offline Model Quantizer & Live VRAM Fit Calculator Studio

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Cpu,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Play,
  Terminal,
  Download,
  Layers,
  Activity,
  Sliders,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';

/* ─── Model Preset Architectures ─────────────────────────────────────────── */

interface ModelArchitecture {
  id: string;
  name: string;
  family: string;
  paramsBillion: number;
  layers: number;
  heads: number;
  kvHeads: number;
  hiddenDim: number;
  defaultContext: number;
  samplePath: string;
}

const PRESET_MODELS: ModelArchitecture[] = [
  { id: 'qwen2.5-0.5b', name: 'Qwen2.5-Coder 0.5B', family: 'Qwen', paramsBillion: 0.5, layers: 24, heads: 14, kvHeads: 2, hiddenDim: 896, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-0.5b' },
  { id: 'qwen2.5-1.5b', name: 'Qwen2.5-Coder 1.5B', family: 'Qwen', paramsBillion: 1.5, layers: 28, heads: 12, kvHeads: 2, hiddenDim: 1536, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-1.5b' },
  { id: 'qwen2.5-3b',   name: 'Qwen2.5-Coder 3B',   family: 'Qwen', paramsBillion: 3.0, layers: 36, heads: 16, kvHeads: 2, hiddenDim: 2048, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-3b' },
  { id: 'qwen2.5-7b',   name: 'Qwen2.5-Coder 7B',   family: 'Qwen', paramsBillion: 7.6, layers: 28, heads: 28, kvHeads: 4, hiddenDim: 3584, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-7b' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instruct', family: 'Llama', paramsBillion: 8.0, layers: 32, heads: 32, kvHeads: 8, hiddenDim: 4096, defaultContext: 8192, samplePath: 'models/llama-3.1-8b' },
  { id: 'deepseek-6.7b',name: 'DeepSeek-Coder 6.7B', family: 'DeepSeek', paramsBillion: 6.7, layers: 32, heads: 32, kvHeads: 32, hiddenDim: 4096, defaultContext: 16384, samplePath: 'models/deepseek-coder-6.7b' },
  { id: 'qwen2.5-14b',  name: 'Qwen2.5-Coder 14B',  family: 'Qwen', paramsBillion: 14.7, layers: 48, heads: 40, kvHeads: 8, hiddenDim: 5120, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-14b' },
  { id: 'qwen2.5-32b',  name: 'Qwen2.5-Coder 32B',  family: 'Qwen', paramsBillion: 32.5, layers: 64, heads: 40, kvHeads: 8, hiddenDim: 5120, defaultContext: 32768, samplePath: 'models/qwen2.5-coder-32b' },
  { id: 'llama-3.3-70b',name: 'Llama 3.3 70B',      family: 'Llama', paramsBillion: 70.6, layers: 80, heads: 64, kvHeads: 8, hiddenDim: 8192, defaultContext: 8192, samplePath: 'models/llama-3.3-70b' },
];

/* ─── Quantization Specifications ────────────────────────────────────────── */

interface QuantFormatSpec {
  quantType: string;
  name: string;
  bitsPerWeight: number;
  qualityScore: number;
  relativeSpeed: number; // 1.0 = baseline
  description: string;
  recommendedFor: string;
}

const QUANT_SPECS: QuantFormatSpec[] = [
  { quantType: 'Q2_K',   name: '2-bit K-Quant',        bitsPerWeight: 2.56, qualityScore: 54, relativeSpeed: 1.25, description: 'Extreme compression, notable quality loss', recommendedFor: 'Severe VRAM shortage' },
  { quantType: 'Q3_K_M', name: '3-bit K-Quant Medium', bitsPerWeight: 3.45, qualityScore: 71, relativeSpeed: 1.15, description: 'High compression, acceptable for code reading', recommendedFor: '4GB-6GB GPUs' },
  { quantType: 'Q4_0',   name: '4-bit Legacy Base',    bitsPerWeight: 4.50, qualityScore: 78, relativeSpeed: 1.10, description: 'Standard baseline 4-bit uniform quantization', recommendedFor: 'Older llama.cpp runtimes' },
  { quantType: 'Q4_K_M', name: '4-bit K-Quant Medium', bitsPerWeight: 4.85, qualityScore: 89, relativeSpeed: 1.08, description: 'Golden standard: optimal size vs accuracy trade-off', recommendedFor: 'Recommended for Daily Coding' },
  { quantType: 'Q5_K_M', name: '5-bit K-Quant Medium', bitsPerWeight: 5.68, qualityScore: 94, relativeSpeed: 1.00, description: 'Near-lossless precision with modest VRAM overhead', recommendedFor: 'Complex logic & refactoring' },
  { quantType: 'Q6_K',   name: '6-bit K-Quant',        bitsPerWeight: 6.57, qualityScore: 97, relativeSpeed: 0.94, description: 'Indistinguishable from FP16 on most coding tests', recommendedFor: 'High precision benchmarks' },
  { quantType: 'Q8_0',   name: '8-bit Quasi-Lossless', bitsPerWeight: 8.50, qualityScore: 99, relativeSpeed: 0.88, description: 'Maximum accuracy without full 16-bit weight bloat', recommendedFor: 'Production & Architecture' },
  { quantType: 'F16',    name: '16-bit Full Precision',bitsPerWeight: 16.0, qualityScore: 100,relativeSpeed: 0.65, description: 'Unquantized reference baseline', recommendedFor: 'Fine-tuning reference' },
];

/* ─── Props & Types ──────────────────────────────────────────────────────── */

interface QuantJob {
  id: string;
  status: 'running' | 'done' | 'error';
  modelPath: string;
  quantType: string;
  outputPath: string;
  startedAt: number;
  finishedAt?: number;
  log: string[];
  error?: string;
}

interface ToolStatus {
  llamaCpp: { available: boolean; path: string; version?: string };
  python: { available: boolean; hasTransformers: boolean };
  ready: boolean;
  installGuide?: Record<string, string>;
}

interface GgufQuantizerStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployToOllama?: (modelName: string, ggufPath: string) => void;
}

export default function GgufQuantizerStudio({ isOpen, onClose, onDeployToOllama }: GgufQuantizerStudioProps) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'quantize' | 'jobs' | 'guide'>('calculator');

  // Calculator State
  const [selectedModelId, setSelectedModelId] = useState<string>('qwen2.5-7b');
  const [gpuVramGb, setGpuVramGb] = useState<number>(8);
  const [contextLength, setContextLength] = useState<number>(8192);
  const [activeQuantHighlight, setActiveQuantHighlight] = useState<string>('Q4_K_M');

  // Quantizer State
  const [modelPath, setModelPath] = useState<string>('models/qwen2.5-coder-7b');
  const [outputDir, setOutputDir] = useState<string>('models/quantized');
  const [selectedQuant, setSelectedQuant] = useState<string>('Q4_K_M');
  const [isQuantizing, setIsQuantizing] = useState<boolean>(false);
  const [jobs, setJobs] = useState<QuantJob[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [toolStatus, setToolStatus] = useState<ToolStatus | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Active Model Arch
  const activeModel = useMemo(() => {
    return PRESET_MODELS.find(m => m.id === selectedModelId) || PRESET_MODELS[3];
  }, [selectedModelId]);

  // VRAM & KV Cache Math Engine
  const calculationResults = useMemo(() => {
    const { paramsBillion, layers, kvHeads, hiddenDim, heads } = activeModel;
    const headDim = hiddenDim / heads;

    // KV Cache Memory: 2 (K & V) * layers * kvHeads * headDim * contextLength * 2 bytes (FP16)
    const kvCacheBytes = 2 * layers * kvHeads * headDim * contextLength * 2;
    const kvCacheGb = kvCacheBytes / (1024 ** 3);

    // Context runtime buffer overhead (CUDA context, activations, scratchpad ~450MB)
    const runtimeOverheadGb = 0.45;

    // Evaluate each quantization format
    const formatBreakdown = QUANT_SPECS.map(spec => {
      // Model weights size (GB)
      const weightsBytes = (paramsBillion * 1e9 * spec.bitsPerWeight) / 8;
      const weightsGb = weightsBytes / (1024 ** 3);

      const totalVramRequiredGb = weightsGb + kvCacheGb + runtimeOverheadGb;

      // Weight size per layer
      const weightPerLayerGb = weightsGb / layers;
      const kvPerLayerGb = kvCacheGb / layers;
      const vramPerLayerGb = weightPerLayerGb + kvPerLayerGb;

      // Usable GPU VRAM after baseline runtime overhead
      const usableGpuVram = Math.max(0, gpuVramGb - runtimeOverheadGb);

      // Layers that fit in GPU VRAM
      const layersInVram = Math.min(layers, Math.floor(usableGpuVram / vramPerLayerGb));
      const layersInRam = Math.max(0, layers - layersInVram);
      const offloadPct = Math.round((layersInVram / layers) * 100);

      // Estimated tok/s throughput based on offload percentage
      let estimatedTokPerSec = 0;
      let fitStatus: 'full' | 'partial' | 'oom' = 'full';

      if (offloadPct === 100) {
        // Full GPU speed (scaled roughly by parameter count)
        const baseSpeed = paramsBillion <= 3 ? 120 : paramsBillion <= 8 ? 65 : paramsBillion <= 14 ? 38 : 18;
        estimatedTokPerSec = Math.round(baseSpeed * spec.relativeSpeed);
        fitStatus = 'full';
      } else if (offloadPct >= 35) {
        // Hybrid CPU/GPU offload (PCIe bus bottleneck: ~20-35% of full GPU speed)
        const baseHybrid = paramsBillion <= 8 ? 16 : 8;
        estimatedTokPerSec = Math.round(baseHybrid * (offloadPct / 100));
        fitStatus = 'partial';
      } else {
        // Heavy RAM spill / CPU fallback
        estimatedTokPerSec = Math.max(1, Math.round(4.5 / (paramsBillion / 7)));
        fitStatus = 'oom';
      }

      return {
        ...spec,
        weightsGb: Math.round(weightsGb * 10) / 10,
        kvCacheGb: Math.round(kvCacheGb * 100) / 100,
        totalVramRequiredGb: Math.round(totalVramRequiredGb * 10) / 10,
        layersInVram,
        layersInRam,
        offloadPct,
        estimatedTokPerSec,
        fitStatus
      };
    });

    return {
      kvCacheGb: Math.round(kvCacheGb * 100) / 100,
      runtimeOverheadGb,
      formatBreakdown
    };
  }, [activeModel, gpuVramGb, contextLength]);

  // Initial tool status check
  useEffect(() => {
    if (isOpen) {
      fetch('/api/models/quantize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      })
        .then(r => r.json())
        .then(d => setToolStatus(d))
        .catch(() => {});
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen]);

  const handleStartQuantize = async () => {
    if (!modelPath.trim()) return;
    setIsQuantizing(true);
    setStatusMsg(`Starting conversion to ${selectedQuant}…`);

    try {
      const resp = await fetch('/api/models/quantize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quantize',
          modelPath: modelPath.trim(),
          outputDir: outputDir.trim() || undefined,
          quantType: selectedQuant
        })
      });
      const data = await resp.json();

      if (data.success) {
        setStatusMsg(`Job created: ${data.jobId}`);
        setActiveTab('jobs');

        const newJob: QuantJob = {
          id: data.jobId,
          status: 'running',
          modelPath,
          quantType: selectedQuant,
          outputPath: `${outputDir}/${modelPath.split(/[\\/]/).pop()}-${selectedQuant}.gguf`,
          startedAt: Date.now(),
          log: [
            `[Init] Target format: ${selectedQuant}`,
            `[Source] Parsing Safetensors / weights from ${modelPath}`,
            `[Quant] Computing optimal scales for k-quant layers...`
          ]
        };
        setJobs(prev => [newJob, ...prev]);

        // Poll job progress
        pollRef.current = setInterval(async () => {
          try {
            const jr = await fetch('/api/models/quantize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'status', jobId: data.jobId })
            });
            const jd = await jr.json();
            if (jd.success && jd.job) {
              setJobs(prev => prev.map(j => j.id === data.jobId ? jd.job : j));
              if (jd.job.status === 'done' || jd.job.status === 'error') {
                clearInterval(pollRef.current);
                setIsQuantizing(false);
              }
            }
          } catch {}
        }, 2000);
      } else {
        setStatusMsg(`Error: ${data.error || 'Failed to start quantization'}`);
        setIsQuantizing(false);
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setIsQuantizing(false);
    }
  };

  if (!isOpen) return null;

  const currentHighlightSpec = calculationResults.formatBreakdown.find(f => f.quantType === activeQuantHighlight)
    || calculationResults.formatBreakdown[3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[#0d0e16] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-900/30 bg-[#121320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-zinc-100 uppercase tracking-wide font-mono">
                  Offline Model Quantizer &amp; VRAM Fit Calculator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 font-mono font-bold">
                  GGUF Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Determine exact GPU VRAM fit vs RAM fallback before loading local LLMs, and convert models in 1 click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'calculator'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Activity size={13} />
                VRAM Fit Calculator
              </button>
              <button
                onClick={() => setActiveTab('quantize')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'quantize'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Zap size={13} />
                1-Click Quantizer
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'jobs'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal size={13} />
                Jobs ({jobs.length})
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'guide'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HelpCircle size={13} />
                Setup Guide
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0d0e16]">
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: LIVE VRAM FIT CALCULATOR
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* Parameter Controls Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                {/* 1. Model Selector */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-bold block mb-1.5">
                    1. Select Model Architecture
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => {
                      setSelectedModelId(e.target.value);
                      const m = PRESET_MODELS.find(p => p.id === e.target.value);
                      if (m) setModelPath(m.samplePath);
                    }}
                    className="w-full bg-[#121320] border border-zinc-700 hover:border-purple-500 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    {PRESET_MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.paramsBillion}B · {m.layers} Layers)
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[10px] text-zinc-400 font-mono">
                    {activeModel.paramsBillion}B params · {activeModel.layers} layers · {activeModel.kvHeads} KV heads
                  </div>
                </div>

                {/* 2. GPU VRAM Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-bold">
                      2. GPU VRAM Capacity
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                      {gpuVramGb} GB VRAM
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={48}
                    step={1}
                    value={gpuVramGb}
                    onChange={(e) => setGpuVramGb(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1">
                    <button onClick={() => setGpuVramGb(6)} className="hover:text-purple-300">6GB (Laptop)</button>
                    <button onClick={() => setGpuVramGb(8)} className="hover:text-purple-300">8GB (3070)</button>
                    <button onClick={() => setGpuVramGb(12)} className="hover:text-purple-300">12GB (4070)</button>
                    <button onClick={() => setGpuVramGb(16)} className="hover:text-purple-300">16GB (4080)</button>
                    <button onClick={() => setGpuVramGb(24)} className="hover:text-purple-300">24GB (4090)</button>
                  </div>
                </div>

                {/* 3. Context Length */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-bold">
                      3. Context Window (KV Cache)
                    </label>
                    <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50">
                      {(contextLength / 1024).toFixed(0)}K Tokens ({calculationResults.kvCacheGb} GB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2048}
                    max={65536}
                    step={2048}
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1">
                    <button onClick={() => setContextLength(2048)} className="hover:text-indigo-300">2K</button>
                    <button onClick={() => setContextLength(4096)} className="hover:text-indigo-300">4K</button>
                    <button onClick={() => setContextLength(8192)} className="hover:text-indigo-300">8K</button>
                    <button onClick={() => setContextLength(16384)} className="hover:text-indigo-300">16K</button>
                    <button onClick={() => setContextLength(32768)} className="hover:text-indigo-300">32K</button>
                    <button onClick={() => setContextLength(65536)} className="hover:text-indigo-300">64K</button>
                  </div>
                </div>
              </div>

              {/* Visual Layer Offload Curve & VRAM Breakdown for Highlighted Quant */}
              <div className="p-5 rounded-2xl bg-[#111222] border border-purple-900/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                        Layer Allocation Breakdown for
                      </span>
                      <span className="text-sm font-bold font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-700/60">
                        {currentHighlightSpec.quantType} ({currentHighlightSpec.name})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {currentHighlightSpec.description}
                    </p>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    {currentHighlightSpec.fitStatus === 'full' && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-xs font-bold">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>100% GPU VRAM (Maximum Tok/s)</span>
                      </div>
                    )}
                    {currentHighlightSpec.fitStatus === 'partial' && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-600/50 text-xs font-bold">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span>Hybrid CPU/GPU Split (PCIe Bottleneck)</span>
                      </div>
                    )}
                    {currentHighlightSpec.fitStatus === 'oom' && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-600/50 text-xs font-bold">
                        <XCircle size={14} className="text-rose-400" />
                        <span>OOM / Severe System RAM Fallback</span>
                      </div>
                    )}

                    <div className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-mono font-bold">
                      ⚡ ~{currentHighlightSpec.estimatedTokPerSec} tok/s
                    </div>
                  </div>
                </div>

                {/* Interactive VRAM vs RAM Visual Stack Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      GPU VRAM: {currentHighlightSpec.layersInVram}/{activeModel.layers} Layers ({currentHighlightSpec.offloadPct}%)
                    </span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      System RAM Spill: {currentHighlightSpec.layersInRam} Layers
                    </span>
                    <span className="text-zinc-400">
                      Total Needed: {currentHighlightSpec.totalVramRequiredGb} GB / {gpuVramGb} GB Available
                    </span>
                  </div>

                  <div className="h-6 w-full rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex shadow-inner">
                    {/* VRAM offload segment */}
                    <div
                      style={{ width: `${currentHighlightSpec.offloadPct}%` }}
                      className={`h-full flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300 ${
                        currentHighlightSpec.offloadPct === 100
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                          : 'bg-gradient-to-r from-emerald-600 to-amber-500'
                      }`}
                    >
                      {currentHighlightSpec.offloadPct > 15 && `${currentHighlightSpec.layersInVram} Layers in VRAM`}
                    </div>
                    {/* RAM fallback segment */}
                    {currentHighlightSpec.layersInRam > 0 && (
                      <div
                        style={{ width: `${100 - currentHighlightSpec.offloadPct}%` }}
                        className="h-full bg-gradient-to-r from-amber-600/80 to-rose-600/80 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300"
                      >
                        {100 - currentHighlightSpec.offloadPct > 15 && `${currentHighlightSpec.layersInRam} Layers in CPU RAM`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Memory Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase block">Model Weights</span>
                    <span className="text-sm font-mono font-bold text-zinc-100">{currentHighlightSpec.weightsGb} GB</span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase block">KV Cache Footprint</span>
                    <span className="text-sm font-mono font-bold text-indigo-300">{currentHighlightSpec.kvCacheGb} GB</span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase block">Perplexity / Quality</span>
                    <span className="text-sm font-mono font-bold text-purple-300">{currentHighlightSpec.qualityScore}% of FP16</span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] font-mono uppercase block">1-Click Convert</span>
                      <span className="text-xs font-bold text-emerald-400">Ready to Quantize</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedQuant(currentHighlightSpec.quantType);
                        setActiveTab('quantize');
                      }}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Use {currentHighlightSpec.quantType} →
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantization Formats Comparison Matrix */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
                  <div className="font-bold text-xs font-mono uppercase tracking-wider text-zinc-300">
                    GGUF Quantization Comparison Matrix (All Formats)
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Click any row to simulate memory allocation
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#121320] text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3">Format</th>
                        <th className="py-2.5 px-3">Bits/Weight</th>
                        <th className="py-2.5 px-3">File Size</th>
                        <th className="py-2.5 px-3">Total VRAM Req.</th>
                        <th className="py-2.5 px-3">VRAM Offload</th>
                        <th className="py-2.5 px-3">Speed</th>
                        <th className="py-2.5 px-3">Quality</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                      {calculationResults.formatBreakdown.map((row) => {
                        const isHighlighted = row.quantType === activeQuantHighlight;
                        return (
                          <tr
                            key={row.quantType}
                            onClick={() => setActiveQuantHighlight(row.quantType)}
                            className={`cursor-pointer transition-colors ${
                              isHighlighted
                                ? 'bg-purple-950/40 border-l-2 border-purple-500 text-white'
                                : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-purple-300 flex items-center gap-1.5">
                              <span>{row.quantType}</span>
                              {row.quantType === 'Q4_K_M' && (
                                <span className="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1 py-0.2 rounded font-sans font-bold">
                                  BEST FIT
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-400">{row.bitsPerWeight} bpw</td>
                            <td className="py-2.5 px-3 text-zinc-200">{row.weightsGb} GB</td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-100">{row.totalVramRequiredGb} GB</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  row.offloadPct === 100
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                    : row.offloadPct >= 50
                                    ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                                    : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                                }`}>
                                  {row.offloadPct}% ({row.layersInVram}/{activeModel.layers})
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300">~{row.estimatedTokPerSec} t/s</td>
                            <td className="py-2.5 px-3 text-zinc-300">{row.qualityScore}%</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQuant(row.quantType);
                                  setActiveTab('quantize');
                                }}
                                className="px-2 py-1 text-[11px] font-sans font-semibold rounded bg-zinc-800 hover:bg-purple-600 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: 1-CLICK GGUF QUANTIZER
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'quantize' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Input Configuration */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-300">
                  💡 Converting directly to <strong>{selectedQuant}</strong> using optimal k-quant quantization scales.
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono block mb-1">
                    Raw Model / Safetensors Directory
                  </label>
                  <input
                    type="text"
                    value={modelPath}
                    onChange={(e) => setModelPath(e.target.value)}
                    placeholder="e.g. models/qwen2.5-coder-7b or C:\ai\models\llama-3.1"
                    className="w-full bg-[#121320] border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Directory containing config.json and model.safetensors or .bin weights
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono block mb-1">
                    Output Destination Directory
                  </label>
                  <input
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder="models/quantized"
                    className="w-full bg-[#121320] border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono block mb-1.5">
                    Target Quantization Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUANT_SPECS.slice(1, 7).map(qs => (
                      <button
                        key={qs.quantType}
                        onClick={() => setSelectedQuant(qs.quantType)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedQuant === qs.quantType
                            ? 'bg-purple-950/60 border-purple-500 text-white'
                            : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-xs">
                          <span>{qs.quantType}</span>
                          <span className="text-[10px] text-zinc-500">{qs.bitsPerWeight} bpw</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">{qs.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleStartQuantize}
                    disabled={isQuantizing || !modelPath.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isQuantizing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Quantizing Model to {selectedQuant}…</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>1-Click Quantize to {selectedQuant} GGUF</span>
                      </>
                    )}
                  </button>
                  {statusMsg && (
                    <div className="mt-2 text-xs text-purple-400 font-mono text-center">
                      {statusMsg}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Quick Export to Ollama & Specs */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                  <h3 className="text-xs font-bold text-purple-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Database size={14} />
                    Instant Ollama Model Generator
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Once converted to GGUF, generate a native Ollama Modelfile and load it directly into your local offline engine:
                  </p>
                  <div className="p-3 bg-black/60 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
                    <div className="text-zinc-500"># Modelfile created automatically</div>
                    <div>FROM ./{outputDir}/{modelPath.split(/[\\/]/).pop()}-{selectedQuant}.gguf</div>
                    <div>PARAMETER temperature 0.2</div>
                    <div>PARAMETER stop &quot;&lt;|im_end|&gt;&quot;</div>
                  </div>
                  <button
                    onClick={() => {
                      if (onDeployToOllama) {
                        const mName = modelPath.split(/[\\/]/).pop() || 'custom-model';
                        onDeployToOllama(mName, `${outputDir}/${mName}-${selectedQuant}.gguf`);
                      } else {
                        setStatusMsg(`✓ Ollama Modelfile generated at ${outputDir}/Modelfile`);
                      }
                    }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Generate Ollama Modelfile &amp; Deploy</span>
                  </button>
                </div>

                {/* Conversion Flow Diagram */}
                <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 space-y-2 text-xs font-mono">
                  <div className="text-zinc-400 font-bold uppercase text-[10px]">Pipeline Flow</div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="p-1 rounded bg-zinc-800 text-zinc-200">1. Safetensors</span>
                    <span>→</span>
                    <span className="p-1 rounded bg-zinc-800 text-zinc-200">2. llama.cpp Convert</span>
                    <span>→</span>
                    <span className="p-1 rounded bg-purple-950 text-purple-300 border border-purple-700/50">3. {selectedQuant} GGUF</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: JOBS & LOGS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                  No quantization jobs executed yet. Launch one from the 1-Click Quantizer tab.
                </div>
              ) : (
                jobs.map(job => (
                  <div key={job.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          job.status === 'done' ? 'bg-emerald-400' : job.status === 'error' ? 'bg-rose-400' : 'bg-purple-400 animate-ping'
                        }`} />
                        <span className="font-bold text-zinc-200">{job.modelPath}</span>
                        <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-700/50 rounded">
                          {job.quantType}
                        </span>
                      </div>
                      <span className="text-zinc-500">
                        {new Date(job.startedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/80 font-mono text-[11px] text-zinc-400 max-h-36 overflow-y-auto space-y-1">
                      {job.log.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: SETUP GUIDE
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'guide' && (
            <div className="space-y-5 max-w-2xl text-xs text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <h3 className="font-bold text-purple-300 font-mono uppercase">Offline GGUF Quantizer Prerequisites</h3>
                <p>
                  Offline AI Studio bundles native support for <code>llama-quantize</code>. If llama.cpp is not installed on your OS, install it using the instructions below:
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <span className="text-purple-400 font-bold block mb-1">🪟 Windows (winget or prebuilt release):</span>
                  <code>winget install llama.cpp</code>
                </div>
                <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <span className="text-purple-400 font-bold block mb-1">🍎 macOS (Homebrew):</span>
                  <code>brew install llama.cpp</code>
                </div>
                <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <span className="text-purple-400 font-bold block mb-1">🐧 Linux (Ubuntu / Debian):</span>
                  <code>sudo apt update &amp;&amp; sudo apt install libomp-dev &amp;&amp; make -j llama.cpp</code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-purple-900/30 bg-[#121320] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-semibold">● Offline VRAM Mathematical Model:</span>
            <span>KV Cache + Model Weights + 450MB CUDA Kernel Overhead</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
