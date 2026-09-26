'use client';

import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Zap,
  HardDrive,
  Copy,
  Check,
  Activity,
  Terminal,
  Code2,
  Sliders,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';
import {
  GGUF_QUANTIZATION_TYPES,
  llamaCppEngine,
  VramCalculationResult,
  LlamaCppGenerationResult
} from '@/lib/ai/llamaCppEngine';

export interface LlamaCppStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
  onOpenFile?: (path: string) => void;
}

export default function LlamaCppStudioModal({
  isOpen = true,
  onClose,
  workspaceFiles = {},
  activeFile,
  onOpenFile
}: LlamaCppStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'inference' | 'matrix' | 'commands' | 'architecture'>('calculator');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // VRAM Calculator State
  const [paramSizeB, setParamSizeB] = useState<number>(7.0);
  const [quantKey, setQuantKey] = useState<string>('Q4_K_M');
  const [contextTokens, setContextTokens] = useState<number>(8192);
  const [availableVramGb, setAvailableVramGb] = useState<number>(8.0);
  const [totalLayers, setTotalLayers] = useState<number>(33);

  // Inference State
  const [prompt, setPrompt] = useState<string>('Write a fast binary search algorithm in C++');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationResult, setGenerationResult] = useState<LlamaCppGenerationResult | null>(() => {
    return {
      text: `// Fast binary search implementation in C++ (Optimized with llama.cpp)\n#include <vector>\n#include <cstdint>\n\ntemplate <typename T>\nint64_t binarySearch(const std::vector<T>& arr, const T& target) {\n    int64_t left = 0;\n    int64_t right = static_cast<int64_t>(arr.size()) - 1;\n    \n    while (left <= right) {\n        int64_t mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1; // Not found\n}`,
      tokensGenerated: 142,
      promptTokens: 11,
      tokensPerSecond: 64.5,
      timeToFirstTokenMs: 22,
      totalDurationMs: 2220,
      model: 'Qwen2.5-Coder-7B-Instruct',
      quant: 'Q4_K_M'
    };
  });

  const vramCalc: VramCalculationResult = useMemo(() => {
    return llamaCppEngine.calculateVram(paramSizeB, quantKey, contextTokens, availableVramGb, totalLayers);
  }, [paramSizeB, quantKey, contextTokens, availableVramGb, totalLayers]);

  const cliCommand = useMemo(() => {
    return llamaCppEngine.generateCliCommand(
      `models/model-${paramSizeB}b.${quantKey}.gguf`,
      vramCalc,
      prompt
    );
  }, [paramSizeB, quantKey, vramCalc, prompt]);

  const serverCommand = useMemo(() => {
    return llamaCppEngine.generateServerCommand(
      `models/model-${paramSizeB}b.${quantKey}.gguf`,
      vramCalc,
      8080
    );
  }, [paramSizeB, quantKey, vramCalc]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleRunInference = async () => {
    setIsGenerating(true);
    try {
      const res = await llamaCppEngine.generateText(prompt, `Model-${paramSizeB}B`, quantKey);
      setGenerationResult(res);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1320] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-xl text-orange-400 shadow-inner">
            <Cpu size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                llama.cpp Standalone C/C++ Engine
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/10 text-orange-300 border border-orange-500/30">
                ggerganov · b4500 (GGUF v3)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Zap size={11} />
                Zero-Python Native C/C++
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Blazing fast GGUF inference, exact VRAM fitting, continuous batching, and FlashAttention in minimal memory.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-5 border-b border-slate-800/80 bg-[#0c101c] gap-1 shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'calculator' as const, label: '⚡ VRAM Fitter & Hardware Sizer', icon: <Gauge size={13} /> },
          { id: 'inference' as const, label: '🚀 C/C++ Inference Arena', icon: <Zap size={13} /> },
          { id: 'matrix' as const, label: '📊 GGUF Quantization Matrix', icon: <Layers size={13} /> },
          { id: 'commands' as const, label: '💻 CLI & Server Commands', icon: <Terminal size={13} /> },
          { id: 'architecture' as const, label: '⚙️ Architecture & Build Presets', icon: <Code2 size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-orange-400 text-orange-300 bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: VRAM Fitter & Sizer */}
        {activeTab === 'calculator' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Input Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Parameter Size */}
              <div className="p-4 bg-[#111728] rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Model Size</span>
                <select
                  value={paramSizeB}
                  onChange={e => {
                    const p = Number(e.target.value);
                    setParamSizeB(p);
                    if (p >= 70) setTotalLayers(80);
                    else if (p >= 14) setTotalLayers(48);
                    else if (p >= 7) setTotalLayers(33);
                    else setTotalLayers(28);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-400 font-semibold"
                >
                  <option value={0.5}>0.5 Billion (e.g. Qwen2.5-0.5B)</option>
                  <option value={1.5}>1.5 Billion (e.g. Qwen2.5-Coder-1.5B)</option>
                  <option value={3.0}>3.0 Billion (e.g. LLaMA-3.2-3B)</option>
                  <option value={7.0}>7.0 Billion (e.g. Qwen2.5-Coder-7B)</option>
                  <option value={14.0}>14.0 Billion (e.g. Qwen2.5-14B)</option>
                  <option value={32.0}>32.0 Billion (e.g. DeepSeek-R1-32B)</option>
                  <option value={70.0}>70.0 Billion (e.g. LLaMA-3.3-70B)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono">Layers: {totalLayers}</span>
              </div>

              {/* Quantization Format */}
              <div className="p-4 bg-[#111728] rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">GGUF Quantization</span>
                <select
                  value={quantKey}
                  onChange={e => setQuantKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-400 font-semibold"
                >
                  {Object.entries(GGUF_QUANTIZATION_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name} ({v.bitsPerWeight} bpw)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-orange-400 font-mono">
                  Fidelity: {GGUF_QUANTIZATION_TYPES[quantKey]?.qualityRetention}
                </span>
              </div>

              {/* Context Window */}
              <div className="p-4 bg-[#111728] rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Context Window</span>
                <select
                  value={contextTokens}
                  onChange={e => setContextTokens(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-400 font-semibold"
                >
                  <option value={2048}>2,048 Tokens</option>
                  <option value={4096}>4,096 Tokens</option>
                  <option value={8192}>8,192 Tokens (Recommended)</option>
                  <option value={16384}>16,384 Tokens</option>
                  <option value={32768}>32,768 Tokens</option>
                  <option value={65536}>65,536 Tokens</option>
                  <option value={131072}>131,072 Tokens (128K)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono">KV Cache: {vramCalc.kvCacheSizeGb} GB</span>
              </div>

              {/* Available GPU VRAM */}
              <div className="p-4 bg-[#111728] rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target GPU VRAM</span>
                <select
                  value={availableVramGb}
                  onChange={e => setAvailableVramGb(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-400 font-semibold"
                >
                  <option value={4.0}>4 GB (GTX 1650 / Laptop)</option>
                  <option value={6.0}>6 GB (RTX 3060 Laptop / 2060)</option>
                  <option value={8.0}>8 GB (RTX 3070 / 4060)</option>
                  <option value={12.0}>12 GB (RTX 3060 12GB / 4070)</option>
                  <option value={16.0}>16 GB (RTX 4080 / Apple 16GB)</option>
                  <option value={24.0}>24 GB (RTX 3090 / 4090)</option>
                  <option value={48.0}>48 GB (Dual 3090 / A6000)</option>
                  <option value={64.0}>64 GB (Apple M3 Max 64GB)</option>
                </select>
                <span className="text-[10px] text-emerald-400 font-mono">Hardware Budget</span>
              </div>
            </div>

            {/* VRAM Fit Verdict Card */}
            <div className={`p-6 rounded-2xl border shadow-xl transition-all ${
              vramCalc.fitsOnGpu
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
                : vramCalc.recommendedGpuLayers > 0
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
                : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {vramCalc.fitsOnGpu ? (
                      <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={24} className="text-amber-400 shrink-0" />
                    )}
                    <h3 className="text-lg font-bold text-white">
                      {vramCalc.fitsOnGpu
                        ? '100% Full GPU Acceleration (Zero CPU Bottleneck)'
                        : vramCalc.recommendedGpuLayers > 0
                        ? `Hybrid Partial Offload (${vramCalc.recommendedGpuLayers}/${vramCalc.totalLayers} Layers on GPU)`
                        : 'Pure CPU RAM Execution (Out of VRAM)'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    {vramCalc.fitsOnGpu
                      ? `Model requires ${vramCalc.totalVramGb} GB VRAM, fitting fully within your ${availableVramGb} GB card for maximum token speed.`
                      : `Weights require ${vramCalc.totalVramGb} GB. Offload ${vramCalc.recommendedGpuLayers} layers to GPU (-ngl ${vramCalc.recommendedGpuLayers}) and remaining ${vramCalc.totalLayers - vramCalc.recommendedGpuLayers} layers to system RAM.`}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Required Total</span>
                    <span className="text-2xl font-extrabold font-mono text-orange-300">
                      {vramCalc.totalVramGb} GB
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Layer Flag</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      -ngl {vramCalc.recommendedGpuLayers}
                    </span>
                  </div>
                </div>
              </div>

              {/* Memory Breakdown Bar */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Weights: {vramCalc.weightsSizeGb} GB</span>
                  <span>KV Cache: {vramCalc.kvCacheSizeGb} GB</span>
                  <span>Driver Overhead: {vramCalc.cudaOverheadGb} GB</span>
                  <span className="text-white font-bold">Total: {vramCalc.totalVramGb} GB / {availableVramGb} GB</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5 flex">
                  <div
                    className="h-full bg-orange-400 rounded-l-full"
                    style={{ width: `${Math.min(100, (vramCalc.weightsSizeGb / availableVramGb) * 100)}%` }}
                    title={`Weights: ${vramCalc.weightsSizeGb} GB`}
                  />
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (vramCalc.kvCacheSizeGb / availableVramGb) * 100)}%` }}
                    title={`KV Cache: ${vramCalc.kvCacheSizeGb} GB`}
                  />
                  <div
                    className="h-full bg-purple-400 rounded-r-full"
                    style={{ width: `${Math.min(100, (vramCalc.cudaOverheadGb / availableVramGb) * 100)}%` }}
                    title={`Overhead: ${vramCalc.cudaOverheadGb} GB`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: High-Speed C/C++ Inference Arena */}
        {activeTab === 'inference' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <Zap size={16} className="text-orange-400" />
                    Native C/C++ Inference Runner
                  </h3>
                  <p className="text-xs text-slate-400">
                    Runs zero-overhead token generation powered directly by GGML and llama.cpp.
                  </p>
                </div>
                <button
                  onClick={handleRunInference}
                  disabled={isGenerating}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  <span>Execute Native C++ Prompt</span>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full min-h-[85px] p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 resize-none outline-none focus:border-orange-500"
                placeholder="Enter prompt to execute..."
              />
            </div>

            {generationResult && (
              <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden space-y-0">
                {/* Metrics Bar */}
                <div className="px-5 py-3 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400">Speed:</span>
                      <span className="text-emerald-400 font-bold">{generationResult.tokensPerSecond} tok/s</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400">TTFT:</span>
                      <span className="text-cyan-400 font-bold">{generationResult.timeToFirstTokenMs} ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400">Tokens:</span>
                      <span className="text-orange-400 font-bold">{generationResult.tokensGenerated}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(generationResult.text, 'inf-copy')}
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono text-xs cursor-pointer"
                  >
                    {isCopied === 'inf-copy' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied === 'inf-copy' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Output code */}
                <pre className="p-4 text-xs font-mono text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
                  <code>{generationResult.text}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: GGUF Quantization Matrix */}
        {activeTab === 'matrix' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-200">GGUF Quantization Comparison Matrix</h3>
                <p className="text-xs text-slate-400">Technical trade-offs between bits-per-weight and perplexity retention.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#121727] text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Format</th>
                    <th className="p-3 font-semibold">Bits/Weight</th>
                    <th className="p-3 font-semibold">Quality Retention</th>
                    <th className="p-3 font-semibold">Description</th>
                    <th className="p-3 font-semibold">Recommended Hardware</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0e1322]">
                  {Object.entries(GGUF_QUANTIZATION_TYPES).map(([k, v]) => (
                    <tr key={k} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-orange-300">{k}</td>
                      <td className="p-3 font-mono text-slate-200">{v.bitsPerWeight} bpw</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{v.qualityRetention}</td>
                      <td className="p-3 text-slate-300 max-w-xs">{v.description}</td>
                      <td className="p-3 text-slate-400">{v.recommendedFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: CLI & Server Commands */}
        {activeTab === 'commands' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* llama-server Command */}
            <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                  <Server size={14} className="text-orange-400" /> llama-server (OpenAI Compatible API)
                </span>
                <button
                  onClick={() => handleCopy(serverCommand, 'srv-cmd')}
                  className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono text-xs cursor-pointer"
                >
                  {isCopied === 'srv-cmd' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'srv-cmd' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
                <code>{serverCommand}</code>
              </pre>
            </div>

            {/* llama-cli Command */}
            <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                  <Terminal size={14} className="text-cyan-400" /> llama-cli (Direct CLI Inference)
                </span>
                <button
                  onClick={() => handleCopy(cliCommand, 'cli-cmd')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs cursor-pointer"
                >
                  {isCopied === 'cli-cmd' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'cli-cmd' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
                <code>{cliCommand}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: Architecture & Build Presets */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu size={18} className="text-orange-400" />
                llama.cpp Native Compilation Presets
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                llama.cpp is written in pure C/C++ (C11 and C++17) for zero-dependency execution. Below are standard CMake presets for compiling on various GPU architectures:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-orange-400 block font-bold mb-1"># NVIDIA CUDA (Linux / Windows)</span>
                  <span className="text-slate-300">cmake -B build -DGGML_CUDA=ON && cmake --build build --config Release -j</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-cyan-400 block font-bold mb-1"># AMD / Intel Vulkan (Cross-Platform)</span>
                  <span className="text-slate-300">cmake -B build -DGGML_VULKAN=ON && cmake --build build --config Release -j</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-purple-400 block font-bold mb-1"># Apple Silicon Metal (macOS)</span>
                  <span className="text-slate-300">cmake -B build -DGGML_METAL=ON && cmake --build build --config Release -j</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 block font-bold mb-1"># High-Performance CPU (AVX2 / AVX-512)</span>
                  <span className="text-slate-300">cmake -B build -DGGML_AVX2=ON -DGGML_FMA=ON && cmake --build build --config Release -j</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
