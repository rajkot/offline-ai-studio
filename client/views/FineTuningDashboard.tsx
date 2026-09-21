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
  HardDrive
} from 'lucide-react';

export interface FineTuningDashboardProps {
  onApplyModelfile?: (filePath: string, content: string) => void;
  onSelectFile?: (filePath: string) => void;
}

export interface LossStep {
  step: number;
  epoch: number;
  loss: number;
  vramUsageGb: number;
  learningRate: number;
}

export interface TrainingResult {
  success: boolean;
  jobId: string;
  status: string;
  config: {
    baseModel: string;
    loraRank: number;
    loraAlpha: number;
    learningRate: number;
    epochs: number;
    batchSize: number;
    datasetSegments: string[];
  };
  metrics: {
    totalSamples: number;
    jsonlSizeBytes: number;
    jsonlSizeKb: number;
    estimatedMinutes: number;
    finalLoss: number;
    vramPeakGb: number;
  };
  lossCurve: LossStep[];
  modelfile: string;
  logs: string[];
}

export default function FineTuningDashboard({
  onApplyModelfile,
  onSelectFile
}: FineTuningDashboardProps) {
  // LoRA Hyperparameters State
  const [baseModel, setBaseModel] = useState<string>('llama3.2:3b');
  const [loraRank, setLoraRank] = useState<number>(16);
  const [loraAlpha, setLoraAlpha] = useState<number>(32);
  const [learningRate, setLearningRate] = useState<number>(0.0002);
  const [epochs, setEpochs] = useState<number>(3);
  const [batchSize, setBatchSize] = useState<number>(4);

  // Dataset Segments Switch
  const [segments, setSegments] = useState<{ [key: string]: boolean }>({
    apis: true,
    schemas: true,
    creative: false,
    security: true
  });

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

  const consoleLogRef = useRef<HTMLDivElement>(null);

  // Calculated Real-Time Sample Metrics
  const activeSegments = Object.keys(segments).filter(k => segments[k]);
  const sampleMap: Record<string, number> = { apis: 450, schemas: 320, creative: 280, security: 390 };
  const totalSamples = activeSegments.reduce((acc, seg) => acc + (sampleMap[seg] || 200), 0);
  const estimatedJsonlKb = Math.round((totalSamples * 1420) / 1024);
  const estimatedTrainingTimeMin = Math.max(1, Math.round((totalSamples * epochs) / 250));

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
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseModel,
          loraRank,
          loraAlpha,
          learningRate,
          epochs,
          batchSize,
          datasetSegments: activeSegments,
          systemPrompt
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
        await new Promise(r => setTimeout(r, 40));
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
    }
  };

  // SVG Loss Curve Generator
  const renderLossCurveSvg = () => {
    if (liveLossHistory.length === 0) return null;

    const width = 600;
    const height = 180;
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
      <div className="w-full overflow-hidden bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
          <span className="flex items-center gap-1.5 text-purple-400 font-bold">
            <Activity size={13} /> Live Telemetry Loss Curve (Epochs 1-{epochs})
          </span>
          {lastPt && (
            <span className="text-emerald-400 font-mono font-bold">
              Current Loss: {lastPt.loss.toFixed(4)} | Step: {lastPt.step}
            </span>
          )}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          <line x1="20" y1="20" x2={width - 20} y2="20" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
          <line x1="20" y1="80" x2={width - 20} y2="80" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
          <line x1="20" y1="140" x2={width - 20} y2="140" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />

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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-950 text-white">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">🔬 AI Training Lab &amp; Dataset Distillation</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full uppercase">
                PEFT / LoRA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Local model fine-tuning dashboard, dataset distillation, live loss curve telemetry, and Ollama Modelfile customizer.
            </p>
          </div>
        </div>

        {/* Progress Metrics Top Bar */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <div className="p-1.5 bg-purple-950 text-purple-400 rounded-lg">
              <Database size={14} />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-medium">Total Samples</div>
              <div className="text-xs font-bold text-white">{totalSamples} JSONL</div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <div className="p-1.5 bg-cyan-950 text-cyan-400 rounded-lg">
              <HardDrive size={14} />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-medium">Export Size</div>
              <div className="text-xs font-bold text-cyan-300">{estimatedJsonlKb} KB</div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <div className="p-1.5 bg-amber-950 text-amber-400 rounded-lg">
              <Flame size={14} />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-medium">Est. Training Time</div>
              <div className="text-xs font-bold text-amber-300">~{estimatedTrainingTimeMin} min</div>
            </div>
          </div>

          <a
            href="/api/distillation/export"
            download="sharegpt_training_dataset.jsonl"
            className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-700/60 hover:border-indigo-500 text-indigo-300 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Download ShareGPT formatted JSONL dataset"
          >
            <Download size={14} className="text-indigo-400" />
            <span>Export JSONL</span>
          </a>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANEL: Training Configuration Board */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Sliders size={14} />
            <span>LoRA Hyperparameters &amp; Config</span>
          </div>

          {/* Base Model Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Base Foundation Model:</label>
            <select
              value={baseModel}
              onChange={e => setBaseModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-xl font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="llama3.2:3b">Meta Llama 3.2 (3B)</option>
              <option value="mistral:7b">Mistral Instruct (7B)</option>
              <option value="qwen2.5-coder:7b">Qwen 2.5 Coder (7B)</option>
              <option value="deepseek-r1:8b">DeepSeek R1 Distill (8B)</option>
            </select>
          </div>

          {/* LoRA Rank & Alpha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">LoRA Rank (r):</label>
              <select
                value={loraRank}
                onChange={e => setLoraRank(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-xl font-mono focus:outline-none focus:border-purple-500"
              >
                <option value={8}>Rank 8 (Fast)</option>
                <option value={16}>Rank 16 (Optimal)</option>
                <option value={32}>Rank 32 (High Precision)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">LoRA Alpha (α):</label>
              <select
                value={loraAlpha}
                onChange={e => setLoraAlpha(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-xl font-mono focus:outline-none focus:border-purple-500"
              >
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
              </select>
            </div>
          </div>

          {/* Epochs & Learning Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Training Epochs:</label>
              <input
                type="number"
                min={1}
                max={5}
                value={epochs}
                onChange={e => setEpochs(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-xl font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Learning Rate:</label>
              <input
                type="number"
                step="0.0001"
                value={learningRate}
                onChange={e => setLearningRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-xl font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Dataset Segment Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Dataset Segment Filter:</span>
              <span className="text-[10px] text-purple-400 font-mono">{activeSegments.length} active</span>
            </label>

            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={segments.apis}
                    onChange={e => setSegments({ ...segments, apis: e.target.checked })}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                  />
                  <span>Backend REST / API Routes</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">450 pairs</span>
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={segments.schemas}
                    onChange={e => setSegments({ ...segments, schemas: e.target.checked })}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                  />
                  <span>SQL &amp; Database Schemas</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">320 pairs</span>
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={segments.security}
                    onChange={e => setSegments({ ...segments, security: e.target.checked })}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                  />
                  <span>Security Patches &amp; Auditing</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">390 pairs</span>
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={segments.creative}
                    onChange={e => setSegments({ ...segments, creative: e.target.checked })}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                  />
                  <span>Creative Text &amp; Documentation</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">280 pairs</span>
              </label>
            </div>
          </div>

          {/* ACTION BUTTON: Start Local Distillation */}
          <button
            onClick={handleStartTraining}
            disabled={isTraining}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-950 transition-all active:scale-98"
          >
            {isTraining ? (
              <RotateCcw size={16} className="animate-spin text-purple-200" />
            ) : (
              <Zap size={16} />
            )}
            <span>{isTraining ? `Distilling Model (${progressStep}%)...` : '⚡ Start Local Distillation / Training'}</span>
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Live Telemetry Loss Curve & Modelfile Customizer */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto p-4 gap-4">
          {/* Live SVG Loss Curve Graph */}
          {renderLossCurveSvg()}

          {/* Live Terminal Telemetry Output */}
          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono min-h-[220px]">
            <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2 text-purple-300 font-bold">
                <Terminal size={14} /> Training Log Console
              </span>
              <span className="text-[10px] text-slate-500">Unsloth PEFT Engine v2.4</span>
            </div>

            <div
              ref={consoleLogRef}
              className="flex-1 overflow-auto p-4 bg-slate-950 text-xs text-slate-300 space-y-1.5 leading-relaxed font-mono"
            >
              {trainingResult ? (
                <>
                  {trainingResult.logs.map((log, i) => (
                    <div key={i} className="text-purple-300 font-medium">{log}</div>
                  ))}
                  {liveLossHistory.map((stepPt, i) => (
                    <div key={i} className="text-slate-400 text-[11px] flex items-center justify-between border-b border-slate-900/60 pb-0.5">
                      <span>
                        [Epoch {stepPt.epoch}] Step {stepPt.step.toString().padStart(4, '0')} | Loss: <span className="text-purple-300 font-bold">{stepPt.loss.toFixed(4)}</span>
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        LR: {stepPt.learningRate.toFixed(6)} | VRAM: {stepPt.vramUsageGb} GB
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-8">
                  <Brain size={32} className="mb-2 text-purple-500/40 animate-pulse" />
                  <span>Click "⚡ Start Local Distillation / Training" to launch local PEFT pipeline...</span>
                </div>
              )}
            </div>
          </div>

          {/* MODELFILE CUSTOMIZER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <FileCode size={15} /> Editable Ollama "Modelfile" Customizer
              </span>

              {modelfileCode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyModelfile}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleSaveModelfileToProject}
                    disabled={savedModelfile}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                      savedModelfile
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                    }`}
                  >
                    {savedModelfile ? <CheckCircle2 size={13} /> : <Save size={13} />}
                    <span>{savedModelfile ? 'Saved Modelfile' : 'Export Modelfile'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editable System Prompt Binding */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">Custom System Prompt Binding:</label>
              <textarea
                value={systemPrompt}
                onChange={e => {
                  setSystemPrompt(e.target.value);
                  if (modelfileCode) {
                    setModelfileCode(prev => prev.replace(/SYSTEM """[\s\S]*?"""/, `SYSTEM """${e.target.value}"""`));
                  }
                }}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans resize-none"
              />
            </div>

            {/* Generated Modelfile Code Block */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 overflow-x-auto max-h-40">
              <pre>{modelfileCode || `# Modelfile will generate upon starting training job...\nFROM ${baseModel}\nSYSTEM """${systemPrompt}"""`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
