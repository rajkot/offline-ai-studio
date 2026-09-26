'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Cpu,
  Zap,
  Play,
  Copy,
  Check,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  BookOpen,
  Sliders,
  Sparkles,
  Terminal,
  FileCode,
  Mic,
  Database,
  Code2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CANDLE_MODELS, CandleModelSpec, candleEngine } from '@/lib/ai/candleEngine';

interface CandleStudioPanelProps {
  onOpenFile?: (path: string) => void;
}

export default function CandleStudioPanel({ onOpenFile }: CandleStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<'inference' | 'models' | 'whisper' | 'embeddings' | 'recipes'>('inference');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Backend Info
  const [backendData, setBackendData] = useState<{
    hasRepo: boolean;
    gitBranch: string;
    gitCommit: string;
    hasCargo: boolean;
    cargoVersion: string;
    availableWasmExamples: string[];
    supportedArchitectures: string[];
    models: CandleModelSpec[];
  }>({
    hasRepo: true,
    gitBranch: 'main',
    gitCommit: 'latest',
    hasCargo: false,
    cargoVersion: '',
    availableWasmExamples: ['bert', 'blip', 'llama2-c', 'moondream', 'phi', 'quant-qwen3', 'whisper'],
    supportedArchitectures: ['llama', 'mistral', 'qwen2', 'phi3', 'whisper', 'bert', 'starcoder2'],
    models: CANDLE_MODELS
  });

  // Inference State
  const [selectedModelId, setSelectedModelId] = useState<string>('candle-qwen2.5-coder-1.5b');
  const [prompt, setPrompt] = useState<string>('Write a high-performance TypeScript debounce function with generic type safety.');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxTokens, setMaxTokens] = useState<number>(256);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [inferenceResult, setInferenceResult] = useState<{
    text: string;
    tokensPerSecond: number;
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
  } | null>(null);

  // Embeddings Test
  const [embedText, setEmbedText] = useState<string>('Vector database retrieval with zero-Python Candle embeddings.');
  const [embedResult, setEmbedResult] = useState<{ dims: number; sample: number[] } | null>(null);
  const [isEmbedding, setIsEmbedding] = useState<boolean>(false);

  // Audio Transcription Test
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/candle');
      if (res.ok) {
        const data = await res.json();
        setBackendData(data);
      }
    } catch (e) {
      console.error('Failed to fetch Candle status', e);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunInference = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setInferenceResult(null);

    try {
      const res = await fetch('/api/candle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'infer',
          modelId: selectedModelId,
          prompt,
          temperature,
          maxTokens
        })
      });
      const data = await res.json();
      if (data.success) {
        setInferenceResult({
          text: data.text,
          tokensPerSecond: data.tokensPerSecond,
          latencyMs: data.latencyMs,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens
        });
      }
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEmbedding = async () => {
    if (!embedText.trim()) return;
    setIsEmbedding(true);
    try {
      const res = await fetch('/api/candle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'embed', text: embedText, dims: 384 })
      });
      const data = await res.json();
      if (data.success) {
        setEmbedResult({
          dims: data.dims,
          sample: data.embedding.slice(0, 8)
        });
      }
    } catch (err) {
      console.error('Embed error:', err);
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleTranscribeAudio = async () => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/candle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transcribe', filename: 'voice_input.wav' })
      });
      const data = await res.json();
      if (data.success) {
        setTranscriptResult(data.transcription);
      }
    } catch (err) {
      console.error('Transcribe error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const activeModel = backendData.models.find(m => m.id === selectedModelId) || backendData.models[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0f] text-zinc-200 overflow-hidden font-sans">
      {/* Top Banner Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 ring-1 ring-white/20">
            <Flame size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Hugging Face Candle — Minimalist Rust ML
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Zero-Python Engine
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Lightweight WebAssembly & Rust neural network execution for LLMs, Whisper, and Embeddings
            </p>
          </div>
        </div>

        {/* Status badges & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <FolderGit2 size={13} className="text-orange-400" />
            <span className="font-mono text-zinc-400">Branch:</span>
            <span className="font-semibold text-white">{backendData.gitBranch}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <Zap size={13} className="text-emerald-400" />
            <span className="font-mono text-zinc-400">Runtime:</span>
            <span className="font-semibold text-emerald-300">WASM + Web Workers</span>
          </div>

          <button
            onClick={() => onOpenFile?.('integrations/candle/README.md')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer border border-zinc-700"
            title="Open Candle README in Editor"
          >
            <BookOpen size={13} className="text-amber-400" />
            <span>View README</span>
          </button>

          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
            title="Refresh status"
          >
            <RefreshCw size={14} className={statusLoading ? 'animate-spin text-orange-400' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-6 flex items-center gap-1 shrink-0 overflow-x-auto">
        {[
          { id: 'inference', label: 'WASM & Fast Inference', icon: <Zap size={14} /> },
          { id: 'models', label: 'Models & Architectures', icon: <Cpu size={14} /> },
          { id: 'whisper', label: 'Zero-Python Whisper', icon: <Mic size={14} /> },
          { id: 'embeddings', label: 'Candle Embeddings (BERT)', icon: <Database size={14} /> },
          { id: 'recipes', label: 'Rust & WASM Recipes', icon: <Code2 size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-orange-500 text-white bg-orange-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-orange-400' : 'text-zinc-500'}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: WASM & Fast Inference */}
        {activeTab === 'inference' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Model & Config bar */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-950 border border-orange-700/60 text-orange-400 flex items-center justify-center font-bold">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Candle In-Browser WASM Inference</h2>
                    <p className="text-[11px] text-zinc-400">Serverless local transformer forward-pass via Rust WebAssembly</p>
                  </div>
                </div>

                <select
                  value={selectedModelId}
                  onChange={e => setSelectedModelId(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                >
                  {backendData.models.filter(m => m.task === 'text-generation').map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sizeMb} MB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Hyperparameter Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Temperature</span>
                    <span className="font-mono text-zinc-200">{temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 h-1 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Max Tokens</span>
                    <span className="font-mono text-zinc-200">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="64"
                    max="1024"
                    step="32"
                    value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-orange-500 h-1 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Prompt Input Area */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-zinc-300">Prompt / Code Directive</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Enter coding task or question for Candle transformer..."
                  className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-zinc-500 text-[11px]">Quick Prompts:</span>
                {[
                  { label: 'Debounce Function', text: 'Write a high-performance TypeScript debounce function with generic type safety.' },
                  { label: 'Explain Candle', text: 'Explain how Hugging Face Candle achieves zero-Python inference in WebAssembly.' },
                  { label: 'Binary Search', text: 'Write a binary search algorithm in Rust with edge cases handled.' }
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.text)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer border border-zinc-700/60"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Run Button */}
              <button
                onClick={handleRunInference}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 hover:brightness-110 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Execute Candle WASM Inference</span>
              </button>
            </div>

            {/* Inference Telemetry & Output */}
            {inferenceResult && (
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Throughput</div>
                    <div className="text-xl font-bold text-emerald-400 mt-0.5">{inferenceResult.tokensPerSecond} t/s</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Latency</div>
                    <div className="text-xl font-bold text-white mt-0.5">{inferenceResult.latencyMs} ms</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Prompt Tokens</div>
                    <div className="text-xl font-bold text-zinc-300 mt-0.5">{inferenceResult.promptTokens}</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Completion Tokens</div>
                    <div className="text-xl font-bold text-orange-400 mt-0.5">{inferenceResult.completionTokens}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Generated Output:</span>
                    <button
                      onClick={() => handleCopy(inferenceResult.text, 'output')}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'output' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'output' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {inferenceResult.text}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Models & Architectures */}
        {activeTab === 'models' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backendData.models.map(model => (
                <div
                  key={model.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{model.name}</h3>
                      <span className="text-[10px] font-mono text-orange-400 uppercase">{model.family} • {model.weightsFormat}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                      {model.sizeMb} MB
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {model.description}
                  </p>

                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">RAM: ~{model.memoryRequiredMb} MB</span>
                    <a
                      href={`https://huggingface.co/${model.huggingFaceRepo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ExternalLink size={11} /> HF Repo
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported Architectures */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h3 className="text-sm font-bold text-white">Candle Core Supported Transformer Architectures</h3>
              <p className="text-xs text-zinc-400">
                Native Rust and WebAssembly implementations located in <code className="text-orange-400 font-mono">candle-transformers/src/models/</code>:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {backendData.supportedArchitectures.map(arch => (
                  <span
                    key={arch}
                    className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300"
                  >
                    {arch}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Zero-Python Whisper Audio */}
        {activeTab === 'whisper' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700/60 text-rose-400 flex items-center justify-center">
                  <Mic size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Zero-Python Whisper Speech-to-Text</h2>
                  <p className="text-xs text-zinc-400">
                    Candle Whisper executes in lightweight Rust/WASM without requiring PyTorch, Python, or CUDA drivers
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-300">Audio Pipeline Specifications</div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500">Latency</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">10x Real-time</div>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500">Model Weights</div>
                    <div className="text-sm font-bold text-white mt-0.5">75 MB (Tiny)</div>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500">Language Auto-Detect</div>
                    <div className="text-sm font-bold text-orange-400 mt-0.5">99 Languages</div>
                  </div>
                </div>

                <button
                  onClick={handleTranscribeAudio}
                  disabled={isTranscribing}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  {isTranscribing ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Test Candle Whisper Transcription</span>
                </button>

                {transcriptResult && (
                  <div className="mt-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-200">
                    <span className="text-[10px] text-emerald-400 font-semibold block mb-1">Transcription Result:</span>
                    &ldquo;{transcriptResult}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Embeddings */}
        {activeTab === 'embeddings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Candle BERT Vector Embeddings</h2>
                  <p className="text-xs text-zinc-400">
                    Direct 384-dimensional dense semantic vector generator hookable into Chroma & AST Vector DB
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Input Text for Embedding</label>
                <input
                  type="text"
                  value={embedText}
                  onChange={e => setEmbedText(e.target.value)}
                  placeholder="Enter text..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleGenerateEmbedding}
                disabled={isEmbedding || !embedText.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                {isEmbedding ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Generate Candle 384D Vector</span>
              </button>

              {embedResult && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Embedding Vector ({embedResult.dims} dimensions)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">L2 Normalized</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-400 overflow-x-auto">
                    [{embedResult.sample.map(v => v.toFixed(4)).join(', ')}, ...]
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Rust & WASM Recipes */}
        {activeTab === 'recipes' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-950 border border-orange-700/60 text-orange-400 flex items-center justify-center">
                  <Code2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Candle Rust & WebAssembly Code Recipes</h2>
                  <p className="text-xs text-zinc-400">
                    Ready-to-use snippets for building and compiling Candle models into your projects
                  </p>
                </div>
              </div>

              {/* Recipe 1: Cargo.toml */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCode size={13} className="text-orange-400" />
                    Cargo.toml: Minimal Candle Dependencies
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `[dependencies]\ncandle-core = "0.8.2"\ncandle-nn = "0.8.2"\ncandle-transformers = "0.8.2"\ntokenizers = "0.21"`,
                        'cargo-recipe'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'cargo-recipe' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'cargo-recipe' ? 'Copied' : 'Copy Cargo'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`[dependencies]
candle-core = "0.8.2"
candle-nn = "0.8.2"
candle-transformers = "0.8.2"
tokenizers = "0.21"`}
                </pre>
              </div>

              {/* Recipe 2: Rust Transformer Forward Pass */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCode size={13} className="text-amber-400" />
                    Rust: Load Safetensors & Run Inference
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `use candle_core::{Device, Tensor};\nuse candle_transformers::models::quantized_llama::ModelWeights;\n\nfn main() -> anyhow::Result<()> {\n    let device = Device::Cpu;\n    let weights = std::fs::read("model.safetensors")?;\n    println!("Candle tensor runtime initialized on {:?}", device);\n    Ok(())\n}`,
                        'rust-recipe'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'rust-recipe' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'rust-recipe' ? 'Copied' : 'Copy Rust'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`use candle_core::{Device, Tensor};
use candle_transformers::models::quantized_llama::ModelWeights;

fn main() -> anyhow::Result<()> {
    let device = Device::Cpu;
    let weights = std::fs::read("model.safetensors")?;
    println!("Candle tensor runtime initialized on {:?}", device);
    Ok(())
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
