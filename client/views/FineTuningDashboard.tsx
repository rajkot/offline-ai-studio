'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Zap,
  Sliders,
  Database,
  Terminal,
  Activity,
  Cpu,
  Save,
  Copy,
  Check,
  RotateCcw,
  Rocket,
  CheckCircle2,
  FileCode,
  Download,
  Flame,
  Layers,
  Sparkles,
  AlertCircle,
  HardDrive,
  RefreshCw,
  Code2,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Eye,
  Settings
} from 'lucide-react';
import { DatasetPair } from '@/lib/ai/loraFineTuningEngine';

export interface FineTuningDashboardProps {
  onApplyModelfile?: (filePath: string, content: string) => void;
  onSelectFile?: (filePath: string) => void;
}

export interface LossStep {
  step: number;
  epoch: number;
  loss: number;
  perplexity: number;
  vramUsageGb: number;
  learningRate: number;
  gradNorm?: number;
  timestamp?: string;
}

export interface TrainingResult {
  success: boolean;
  jobId: string;
  status: string;
  config: {
    baseModel: string;
    loraRank: number;
    loraAlpha: number;
    loraDropout: number;
    targetModules: string[];
    quantization: string;
    learningRate: number;
    epochs: number;
    batchSize: number;
    datasetSegments: string[];
  };
  metrics: {
    totalSamples: number;
    datasetSizeBytes: number;
    totalSteps: number;
    initialLoss: number;
    finalLoss: number;
    initialPerplexity: number;
    finalPerplexity: number;
    vramPeakGb: number;
    elapsedSeconds: number;
  };
  lossCurve: LossStep[];
  modelfile: string;
  adapterConfigJson: string;
  logs: string[];
}

export default function FineTuningDashboard({
  onApplyModelfile,
  onSelectFile
}: FineTuningDashboardProps) {
  // Navigation Tabs: 'config' (Training) | 'dataset' (Harvester) | 'evaluator' (Side-by-Side)
  const [activeTab, setActiveTab] = useState<'config' | 'dataset' | 'evaluator'>('config');

  // LoRA / QLoRA Hyperparameters State
  const [baseModel, setBaseModel] = useState<string>('qwen2.5-coder:1.5b');
  const [quantization, setQuantization] = useState<'4bit_qlora_nf4' | '8bit_int8' | '16bit_bf16'>('4bit_qlora_nf4');
  const [loraRank, setLoraRank] = useState<number>(16);
  const [loraAlpha, setLoraAlpha] = useState<number>(32);
  const [loraDropout, setLoraDropout] = useState<number>(0.05);
  const [learningRate, setLearningRate] = useState<number>(0.0002);
  const [epochs, setEpochs] = useState<number>(3);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [targetModules, setTargetModules] = useState<string[]>(['q_proj', 'v_proj', 'k_proj', 'o_proj']);

  // Dataset Segments Switch
  const [segments, setSegments] = useState<{ [key: string]: boolean }>({
    apis: true,
    schemas: true,
    creative: false,
    security: true
  });

  // Harvested Dataset State
  const [harvestedPairs, setHarvestedPairs] = useState<DatasetPair[]>([]);
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [selectedPair, setSelectedPair] = useState<DatasetPair | null>(null);

  // Modelfile Customizer State
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a specialized AI Coding Assistant fine-tuned for high-performance React and Next.js applications.'
  );

  // Execution & Live Training Telemetry
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [liveLossHistory, setLiveLossHistory] = useState<LossStep[]>([]);
  const [modelfileCode, setModelfileCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedModelfile, setSavedModelfile] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Side-by-Side Evaluator State
  const [evalPrompt, setEvalPrompt] = useState<string>('Implement a thread-safe token bucket rate limiter with burst capacity');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<{ baseOutput: string; adapterOutput: string } | null>(null);

  const consoleLogRef = useRef<HTMLDivElement>(null);

  // Initial load: Harvest workspace dataset pairs
  useEffect(() => {
    handleHarvestDataset();
  }, []);

  const handleHarvestDataset = async () => {
    setIsHarvesting(true);
    try {
      const res = await fetch('/api/training/dataset');
      if (res.ok) {
        const json = await res.json();
        if (json.pairs) {
          setHarvestedPairs(json.pairs);
          if (json.pairs.length > 0 && !selectedPair) {
            setSelectedPair(json.pairs[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to harvest dataset from workspace', e);
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleToggleModule = (mod: string) => {
    setTargetModules(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  // Auto scroll telemetry logs
  useEffect(() => {
    if (consoleLogRef.current) {
      consoleLogRef.current.scrollTop = consoleLogRef.current.scrollHeight;
    }
  }, [liveLossHistory, isTraining]);

  // Handle Training Start Action
  const handleStartTraining = async () => {
    setIsTraining(true);
    setErrorMsg(null);
    setLiveLossHistory([]);
    setProgressStep(0);
    setSavedModelfile(false);

    try {
      const activeSegments = Object.keys(segments).filter(k => segments[k]);
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseModel,
          loraRank,
          loraAlpha,
          loraDropout,
          targetModules,
          quantization,
          learningRate,
          epochs,
          batchSize,
          datasetSegments: activeSegments,
          systemPrompt,
          dataset: harvestedPairs
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start training pipeline');
      }

      setTrainingResult(data);
      setModelfileCode(data.modelfile);

      // Stream live loss points for visual telemetry effect
      const steps: LossStep[] = data.lossCurve || [];
      for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 30));
        setLiveLossHistory(prev => [...prev, steps[i]]);
        setProgressStep(Math.round(((i + 1) / steps.length) * 100));
      }
    } catch (err: any) {
      console.error('Training Error:', err);
      setErrorMsg(err?.message || 'Error executing training backend pipeline');
    } finally {
      setIsTraining(false);
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/training/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: evalPrompt,
          baseModel,
          jobId: trainingResult?.jobId
        })
      });
      if (res.ok) {
        const json = await res.json();
        setEvalResult({ baseOutput: json.baseOutput, adapterOutput: json.adapterOutput });
      }
    } catch (e) {
      console.error('Failed to run comparison evaluation', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopyModelfile = () => {
    if (modelfileCode) {
      navigator.clipboard.writeText(modelfileCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveModelfileToProject = () => {
    if (modelfileCode && onApplyModelfile) {
      onApplyModelfile('Modelfile', modelfileCode);
      setSavedModelfile(true);
      setTimeout(() => setSavedModelfile(false), 3000);
    }
  };

  // SVG Loss Curve Generator
  const renderLossCurveSvg = () => {
    if (liveLossHistory.length === 0) return null;

    const width = 640;
    const height = 190;
    const maxLoss = 2.6;
    const minLoss = 0.1;

    const points = liveLossHistory.map((pt, idx) => {
      const x = (idx / (liveLossHistory.length - 1 || 1)) * (width - 40) + 20;
      const normalizedY = (pt.loss - minLoss) / (maxLoss - minLoss);
      const y = height - 30 - normalizedY * (height - 50);
      return `${x},${y}`;
    }).join(' ');

    const lastPt = liveLossHistory[liveLossHistory.length - 1];

    return (
      <div className="w-full overflow-hidden bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span className="flex items-center gap-1.5 text-purple-400 font-bold">
            <Activity size={14} /> SGD Loss &amp; Perplexity Convergence (Epochs 1-{epochs})
          </span>
          {lastPt && (
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-3">
              <span>Loss: {lastPt.loss.toFixed(4)}</span>
              <span className="text-cyan-400">PPL: {lastPt.perplexity.toFixed(2)}</span>
              <span className="text-slate-500">Step: {lastPt.step}</span>
            </span>
          )}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          <line x1="20" y1="20" x2={width - 20} y2="20" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
          <line x1="20" y1="75" x2={width - 20} y2="75" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
          <line x1="20" y1="130" x2={width - 20} y2="130" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />

          {/* Area gradient under line */}
          <defs>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Polygon area */}
          <polygon
            points={`20,${height - 30} ${points} ${width - 20},${height - 30}`}
            fill="url(#lossGradient)"
          />

          {/* Polyline loss plot */}
          <polyline
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

  const totalHarvestedSamples = harvestedPairs.length;
  const estimatedJsonlKb = Math.round((totalHarvestedSamples * 1420) / 1024) || 24;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-950 text-white">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">LoRA &amp; QLoRA Local Fine-Tuning Studio</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full uppercase">
                PEFT / QLoRA v4.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              100% offline air-gapped domain adaptation: AST dataset harvesting, QLoRA tuning, live loss curves, and Ollama Modelfile export.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders size={13} />
              LoRA / QLoRA Tuning
            </button>
            <button
              onClick={() => setActiveTab('dataset')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'dataset'
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database size={13} />
              Dataset Harvester ({totalHarvestedSamples})
            </button>
            <button
              onClick={() => setActiveTab('evaluator')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'evaluator'
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye size={13} />
              Side-by-Side Evaluator
            </button>
          </div>

          <a
            href="/api/distillation/export"
            download="workspace_training_dataset.jsonl"
            className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-700/60 hover:border-indigo-500 text-indigo-300 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Download JSONL dataset"
          >
            <Download size={14} className="text-indigo-400" />
            <span>Export JSONL</span>
          </a>
        </div>
      </div>

      {/* TAB 1: LoRA / QLoRA Tuning & Live Telemetry */}
      {activeTab === 'config' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT PANEL: Hyperparameters Board */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Sliders size={14} />
              <span>Hyperparameters &amp; Hardware Offload</span>
            </div>

            {/* Base Model Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Base Foundation Model:</label>
              <select
                value={baseModel}
                onChange={e => setBaseModel(e.target.value)}
                disabled={isTraining}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="qwen2.5-coder:1.5b">qwen2.5-coder:1.5b (Fastest, 1.5B Params)</option>
                <option value="llama3.2:3b">llama3.2:3b (Meta LLaMA 3.2, 3B Params)</option>
                <option value="phi-3.5:mini">phi-3.5:mini (Microsoft SLM, 3.8B Params)</option>
                <option value="deepseek-coder:1.3b">deepseek-coder:1.3b (DeepSeek AI, 1.3B)</option>
                <option value="mistral:7b">mistral:7b (Mistral AI Instruct, 7B)</option>
              </select>
            </div>

            {/* Quantization Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Quantization / VRAM Profile:</label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setQuantization('4bit_qlora_nf4')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    quantization === '4bit_qlora_nf4'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">4-bit NF4</div>
                  <div className="text-[9px] text-emerald-400">&lt;6 GB VRAM</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuantization('8bit_int8')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    quantization === '8bit_int8'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">8-bit int8</div>
                  <div className="text-[9px] text-slate-400">~8 GB VRAM</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuantization('16bit_bf16')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    quantization === '16bit_bf16'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">16-bit BF16</div>
                  <div className="text-[9px] text-amber-400">&gt;14 GB VRAM</div>
                </button>
              </div>
            </div>

            {/* Target Modules Multi-select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Target Linear Projections:</label>
              <div className="flex flex-wrap gap-1.5">
                {['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map(mod => {
                  const active = targetModules.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => handleToggleModule(mod)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-900/70 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {mod}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rank (r) Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">LoRA Rank (r):</span>
                <span className="font-mono text-purple-400 font-bold">{loraRank}</span>
              </div>
              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={loraRank}
                onChange={e => setLoraRank(Number(e.target.value))}
                disabled={isTraining}
                className="accent-purple-500 w-full"
              />
              <span className="text-[10px] text-slate-500">Low-rank bottleneck matrix dimension ($A \\in \\mathbb{'{R}'}^{'{r \\times k}'}$).</span>
            </div>

            {/* Alpha (α) Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">Scaling Alpha (α):</span>
                <span className="font-mono text-purple-400 font-bold">{loraAlpha}</span>
              </div>
              <input
                type="range"
                min="8"
                max="128"
                step="8"
                value={loraAlpha}
                onChange={e => setLoraAlpha(Number(e.target.value))}
                disabled={isTraining}
                className="accent-purple-500 w-full"
              />
            </div>

            {/* Learning Rate & Epochs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400">Learning Rate:</label>
                <input
                  type="number"
                  step="0.00005"
                  value={learningRate}
                  onChange={e => setLearningRate(Number(e.target.value))}
                  disabled={isTraining}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400">Epochs:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={epochs}
                  onChange={e => setEpochs(Number(e.target.value))}
                  disabled={isTraining}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* System Prompt Customizer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Subject AI System Directive:</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                disabled={isTraining}
                rows={3}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 font-mono leading-relaxed resize-none"
              />
            </div>

            {/* Launch Training Button */}
            <button
              onClick={handleStartTraining}
              disabled={isTraining}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isTraining
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950'
              }`}
            >
              {isTraining ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-purple-400" />
                  <span>Training Adapter ({progressStep}%)...</span>
                </>
              ) : (
                <>
                  <Rocket size={14} />
                  <span>Start LoRA / QLoRA Job</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT PANEL: Live Telemetry, Loss Curve & Modelfile */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4 gap-4 overflow-y-auto">
            {/* Real-time Loss Curve Canvas/SVG */}
            {liveLossHistory.length > 0 ? (
              renderLossCurveSvg()
            ) : (
              <div className="h-44 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs gap-2 p-4">
                <Activity size={24} className="text-slate-600 animate-pulse" />
                <span>Loss and perplexity convergence curve will render here in real time when training starts.</span>
                <span className="text-[11px] text-slate-600">Dataset contains {totalHarvestedSamples} samples ready for adaptation.</span>
              </div>
            )}

            {/* Real-Time Metrics Gauges */}
            {trainingResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Initial vs Final Loss</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {trainingResult.metrics.initialLoss.toFixed(4)} ➔ {trainingResult.metrics.finalLoss.toFixed(4)}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Perplexity (PPL)</span>
                  <span className="text-sm font-mono font-bold text-cyan-400">
                    {trainingResult.metrics.initialPerplexity.toFixed(1)} ➔ {trainingResult.metrics.finalPerplexity.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Peak VRAM Allocation</span>
                  <span className="text-sm font-mono font-bold text-purple-400">
                    {trainingResult.metrics.vramPeakGb} GB
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Optimization Steps</span>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {trainingResult.metrics.totalSteps} Steps
                  </span>
                </div>
              </div>
            )}

            {/* Modelfile & PEFT Config Action Bar */}
            {modelfileCode && (
              <div className="bg-slate-900 border border-purple-950 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-purple-400" />
                    <span className="text-xs font-bold text-white">Synthesized Ollama Modelfile</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Adapter Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyModelfile}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    {onApplyModelfile && (
                      <button
                        onClick={handleSaveModelfileToProject}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        {savedModelfile ? <CheckCircle size={12} /> : <Save size={12} />}
                        {savedModelfile ? 'Saved to Workspace!' : 'Save & Register Modelfile'}
                      </button>
                    )}
                  </div>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-40 overflow-y-auto leading-relaxed">
                  {modelfileCode}
                </pre>
              </div>
            )}

            {/* Terminal Log Stream */}
            <div className="flex-1 min-h-[140px] bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Terminal size={13} className="text-purple-400" /> Training Telemetry Stream
                </span>
                <span className="text-[10px] text-slate-500">Unsloth / PEFT Runtime</span>
              </div>
              <div ref={consoleLogRef} className="flex-1 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
                {trainingResult?.logs.map((log, idx) => (
                  <div key={idx} className="text-emerald-400/90 leading-relaxed">$ {log}</div>
                ))}
                {liveLossHistory.map((step, idx) => (
                  <div key={`step-${idx}`} className="text-slate-400">
                    Step {step.step}: Loss={step.loss.toFixed(4)} | PPL={step.perplexity.toFixed(2)} | VRAM={step.vramUsageGb}GB | LR={step.learningRate}
                  </div>
                ))}
                {isTraining && (
                  <div className="text-purple-400 flex items-center gap-2 animate-pulse">
                    <span>⚡ Optimizing linear adapter tensors (r={loraRank}, alpha={loraAlpha})...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Dataset Harvester & Inspector */}
      {activeTab === 'dataset' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden p-4 gap-4">
          {/* Left List of Harvested Pairs */}
          <div className="w-full md:w-96 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-purple-400" />
                <span className="text-xs font-bold text-white">Harvested Dataset Pairs ({harvestedPairs.length})</span>
              </div>
              <button
                onClick={handleHarvestDataset}
                disabled={isHarvesting}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={isHarvesting ? 'animate-spin' : ''} />
                Re-harvest AST
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {harvestedPairs.map(pair => {
                const isSelected = selectedPair?.id === pair.id;
                return (
                  <div
                    key={pair.id}
                    onClick={() => setSelectedPair(pair)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/30'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-purple-300 font-bold uppercase border border-slate-800">
                        {pair.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{pair.tokenCount} tok</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium line-clamp-2">{pair.instruction}</p>
                    {pair.sourceFile && (
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block truncate">
                        {pair.sourceFile}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Sample Inspector */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
            {selectedPair ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <FileCode size={14} className="text-purple-400" />
                      Dataset Sample: {selectedPair.id}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedPair.sourceFile}</p>
                  </div>
                  <span className="text-xs font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                    Category: {selectedPair.category}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Instruction:</label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-purple-200 font-mono leading-relaxed">
                    {selectedPair.instruction}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Input Context:</label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono">
                    {selectedPair.input}
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 min-h-[160px] flex flex-col">
                  <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Expected Output Code:</label>
                  <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                    {selectedPair.output}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                Select a dataset sample from the left to inspect its instruction and synthesized code output.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Side-by-Side Inference Evaluator */}
      {activeTab === 'evaluator' && (
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-y-auto">
          {/* Prompt Testing Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-md">
            <div className="flex-1 min-w-[280px] flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <input
                type="text"
                value={evalPrompt}
                onChange={e => setEvalPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRunEvaluation();
                }}
                placeholder="Enter prompt to evaluate model performance before vs after LoRA adaptation..."
                className="bg-transparent border-none outline-none text-slate-100 w-full placeholder-slate-500 text-xs"
              />
            </div>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={isEvaluating ? 'animate-spin' : ''} />
              {isEvaluating ? 'Evaluating Inference...' : 'Compare Before vs After LoRA'}
            </button>
          </div>

          {/* Side-by-Side Dual View */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[360px]">
            {/* Base Model Output */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-200">Base Foundation Model ({baseModel})</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Zero Adapters
                </span>
              </div>
              <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-y-auto leading-relaxed">
                {evalResult?.baseOutput ? (
                  <pre className="whitespace-pre-wrap">{evalResult.baseOutput}</pre>
                ) : (
                  <div className="text-slate-500 italic py-8 text-center">
                    Click "Compare Before vs After LoRA" to run side-by-side inference generation.
                  </div>
                )}
              </div>
            </div>

            {/* Fine-Tuned LoRA Adapter Output */}
            <div className="bg-slate-900 border border-purple-900/60 rounded-xl p-4 flex flex-col gap-2 shadow-lg shadow-purple-950/20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <h4 className="text-xs font-bold text-purple-200">LoRA Adapted Model ({baseModel} + Adapter)</h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                  Rank {loraRank} / Alpha {loraAlpha}
                </span>
              </div>
              <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-purple-950 font-mono text-xs text-emerald-300 overflow-y-auto leading-relaxed">
                {evalResult?.adapterOutput ? (
                  <pre className="whitespace-pre-wrap">{evalResult.adapterOutput}</pre>
                ) : (
                  <div className="text-slate-500 italic py-8 text-center">
                    Adapted model output with strict types and workspace invariants will render here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
