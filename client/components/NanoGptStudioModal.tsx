'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Brain,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  BookOpen,
  Code2,
  Flame,
  Activity,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  Rocket
} from 'lucide-react';
import {
  NANOGPT_PRESETS,
  NanoGptConfig,
  NanoGptModelMetrics,
  TrainingLossStep,
  SubjectCheckpoint,
  nanoGptEngine
} from '@/lib/ai/nanoGptEngine';

export interface NanoGptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectId?: string;
  initialSubjectName?: string;
  subjectDocuments?: Array<{ title: string; content: string }>;
  onApplyCompletionToSubject?: (text: string) => void;
  onCheckpointTrained?: (checkpoint: SubjectCheckpoint) => void;
}

export default function NanoGptStudioModal({
  isOpen,
  onClose,
  initialSubjectId = 'sub-1',
  initialSubjectName = 'Quantum Physics & Mechanics',
  subjectDocuments = [],
  onApplyCompletionToSubject,
  onCheckpointTrained
}: NanoGptStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'train' | 'metrics' | 'inference' | 'python' | 'blueprint'>('train');

  // Selected Subject State
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId);
  const [subjectName, setSubjectName] = useState<string>(initialSubjectName);

  // Architecture & Preset State
  const [selectedPreset, setSelectedPreset] = useState<string>('micro-gpt');
  const [config, setConfig] = useState<NanoGptConfig>(NANOGPT_PRESETS['micro-gpt']);
  const [modelMetrics, setModelMetrics] = useState<NanoGptModelMetrics>(
    nanoGptEngine.calculateModelMetrics(NANOGPT_PRESETS['micro-gpt'])
  );

  // Documents inclusion
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const documentsToUse = subjectDocuments.length > 0 ? subjectDocuments : [
    {
      title: 'WaveFunctionSummary.md',
      content: '# Quantum Wave Functions\n\nThe Schrödinger equation governs how the quantum state of a physical system changes over time...\n- Superposition principles\n- Eigenvalues and eigenvectors\n- Uncertainty relations $\\Delta x \\Delta p \\ge \\hbar / 2$'
    },
    {
      title: 'Simulation.py',
      content: 'import numpy as np\n# Schrödinger 1D Wavepacket Simulation\nx = np.linspace(-10, 10, 1000)\npsi = np.exp(-x**2) * np.exp(1j * 5 * x)\nprob_density = np.abs(psi)**2'
    },
    {
      title: 'QuantumMechanics_Notes.txt',
      content: 'Observable operators in Hilbert space are self-adjoint. The expectation value of an observable A in state psi is <psi|A|psi>.'
    }
  ];

  // Training Execution State
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [currentStepData, setCurrentStepData] = useState<TrainingLossStep | null>(null);
  const [lossHistory, setLossHistory] = useState<TrainingLossStep[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<SubjectCheckpoint | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [generatedPyConfig, setGeneratedPyConfig] = useState<string>('');
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  // Inference Playground State
  const [inferencePrompt, setInferencePrompt] = useState<string>(
    'Explain the mathematical formulation of wavepacket dispersion.'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topK, setTopK] = useState<number>(50);
  const [inferenceOutput, setInferenceOutput] = useState<string>('');
  const [isInferenceLoading, setIsInferenceLoading] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  // Backend Info
  const [backendStatus, setBackendStatus] = useState<{
    hasRepo: boolean;
    hasPython: boolean;
    pythonVersion: string;
    hasTorch: boolean;
  }>({
    hasRepo: true,
    hasPython: true,
    pythonVersion: 'Python 3.11',
    hasTorch: false
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Sync props when opening
  useEffect(() => {
    if (initialSubjectId) setSubjectId(initialSubjectId);
    if (initialSubjectName) setSubjectName(initialSubjectName);
  }, [initialSubjectId, initialSubjectName]);

  // Initialize selected docs
  useEffect(() => {
    setSelectedDocs(documentsToUse.map(d => d.title));
  }, [documentsToUse.length]);

  // Recalculate metrics when config changes
  useEffect(() => {
    setModelMetrics(nanoGptEngine.calculateModelMetrics(config));
  }, [config]);

  // Load backend status and existing checkpoint
  useEffect(() => {
    if (isOpen) {
      fetch('/api/nanogpt')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setBackendStatus({
              hasRepo: data.hasRepo,
              hasPython: data.environment.hasPython,
              pythonVersion: data.environment.pythonVersion,
              hasTorch: data.environment.hasTorch
            });
          }
        })
        .catch(err => console.error('Failed to query nanoGPT status', err));

      const existing = nanoGptEngine.getCheckpoint(subjectId);
      if (existing) {
        setActiveCheckpoint(existing);
        setGeneratedPyConfig(nanoGptEngine.generatePythonConfig(existing));
      }
    }
  }, [isOpen, subjectId]);

  // Handle Preset Change
  const handleSelectPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const p = NANOGPT_PRESETS[presetKey];
    if (p) {
      setConfig({ ...p });
    }
  };

  // Start Training
  const handleStartTraining = async () => {
    setIsTraining(true);
    setLossHistory([]);
    setTrainingProgress(0);
    setTrainingLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 Initializing Karpathy nanoGPT PyTorch engine...`,
      `[${new Date().toLocaleTimeString()}] 📦 Bundling ${selectedDocs.length} domain documents for "${subjectName}"...`
    ]);

    const docsToTrain = documentsToUse.filter(d => selectedDocs.includes(d.title));

    try {
      const response = await fetch('/api/nanogpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'train',
          subjectId,
          subjectName,
          documents: docsToTrain,
          presetKey: selectedPreset,
          customConfig: config
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to complete nanoGPT training');
      }

      const steps: TrainingLossStep[] = data.lossCurve || [];
      const cp: SubjectCheckpoint = data.checkpoint;

      // Animate steps for visual feedback
      for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 12));
        setCurrentStepData(steps[i]);
        setLossHistory(prev => [...prev, steps[i]]);
        setTrainingProgress(Math.round(((i + 1) / steps.length) * 100));
      }

      setActiveCheckpoint(cp);
      nanoGptEngine.saveCheckpoint(cp);
      setGeneratedPyConfig(nanoGptEngine.generatePythonConfig(cp));
      setTrainingLogs(data.logs || []);

      if (onCheckpointTrained) {
        onCheckpointTrained(cp);
      }
    } catch (err: any) {
      console.error('nanoGPT Training error:', err);
      setTrainingLogs(prev => [...prev, `[ERROR] ${err?.message || 'Training failed'}`]);
    } finally {
      setIsTraining(false);
    }
  };

  // Run Inference
  const handleRunInference = async () => {
    if (!inferencePrompt.trim()) return;
    setIsInferenceLoading(true);
    setInferenceOutput('');

    try {
      const res = await fetch('/api/nanogpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          subjectId,
          prompt: inferencePrompt,
          temperature,
          topK
        })
      });

      const data = await res.json();
      if (data.success && data.completion) {
        setInferenceOutput(data.completion.text);
      }
    } catch (e: any) {
      console.error('Inference error', e);
      setInferenceOutput(`[Inference Error]: ${e?.message || 'Failed to generate'}`);
    } finally {
      setIsInferenceLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0c0d12] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold">
              <Brain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                  nanoGPT Subject AI Model Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-950/80 text-orange-400 border border-orange-700/50">
                  {modelMetrics.paramString} Params
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  karpathy/nanoGPT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>Active Target Subject:</span>
                <strong className="text-amber-300 font-semibold">{subjectName}</strong>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400 font-mono text-[11px]">ID: {subjectId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeCheckpoint && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-mono">
                <CheckCircle2 size={13} />
                <span>Loss: {activeCheckpoint.finalTrainLoss.toFixed(3)} (PPL: {activeCheckpoint.finalPerplexity.toFixed(1)})</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800/80 shrink-0 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('train')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'train'
                ? 'border-orange-500 text-orange-400 font-semibold bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={13} />
            <span>1. Train Subject Model</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-orange-500 text-orange-400 font-semibold bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={13} />
            <span>2. Live Loss &amp; Perplexity Curve</span>
            {lossHistory.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inference')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'inference'
                ? 'border-orange-500 text-orange-400 font-semibold bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={13} />
            <span>3. Subject Inference Arena</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'python'
                ? 'border-orange-500 text-orange-400 font-semibold bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={13} />
            <span>4. PyTorch CLI &amp; Config</span>
          </button>

          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'blueprint'
                ? 'border-orange-500 text-orange-400 font-semibold bg-orange-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={13} />
            <span>5. Transformer Architecture Blueprint</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#090a0f]">
          
          {/* TAB 1: TRAIN */}
          {activeTab === 'train' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl mx-auto">
              {/* Architecture Presets & Hyperparameters (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                    <Cpu size={14} className="text-orange-400" />
                    <span>nanoGPT Architecture Presets</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    {Object.entries(NANOGPT_PRESETS).map(([key, p]) => {
                      const isSel = selectedPreset === key;
                      const metrics = nanoGptEngine.calculateModelMetrics(p);
                      return (
                        <div
                          key={key}
                          onClick={() => handleSelectPreset(key)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            isSel
                              ? 'bg-orange-950/40 border-orange-500/80 text-orange-200 shadow-md'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-white">{key.toUpperCase()}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-orange-300">
                              {metrics.paramString}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {p.n_layer}L &bull; {p.n_head}H &bull; {p.n_embd}D
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono mt-1">
                            Ctx: {p.block_size} tokens
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hyperparameter Matrix */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sliders size={14} className="text-orange-400" />
                    <span>Transformer Hyperparameters</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Layers (n_layer)</label>
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={config.n_layer}
                        onChange={(e) => setConfig({ ...config, n_layer: parseInt(e.target.value) || 6 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Heads (n_head)</label>
                      <input
                        type="number"
                        min={2}
                        max={16}
                        value={config.n_head}
                        onChange={(e) => setConfig({ ...config, n_head: parseInt(e.target.value) || 6 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Embedding (n_embd)</label>
                      <input
                        type="number"
                        step={64}
                        min={128}
                        max={1024}
                        value={config.n_embd}
                        onChange={(e) => setConfig({ ...config, n_embd: parseInt(e.target.value) || 384 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Context (block_size)</label>
                      <input
                        type="number"
                        step={128}
                        min={128}
                        max={2048}
                        value={config.block_size}
                        onChange={(e) => setConfig({ ...config, block_size: parseInt(e.target.value) || 256 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-800/80">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Learning Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={config.learning_rate}
                        onChange={(e) => setConfig({ ...config, learning_rate: parseFloat(e.target.value) || 1e-3 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Batch Size</label>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={config.batch_size}
                        onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 8 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Max Iterations</label>
                      <input
                        type="number"
                        step={50}
                        min={50}
                        max={2000}
                        value={config.max_iters}
                        onChange={(e) => setConfig({ ...config, max_iters: parseInt(e.target.value) || 300 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Dataset Sources Picker */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <BookOpen size={14} className="text-orange-400" />
                      <span>Subject Documents for Model Training ({selectedDocs.length} selected)</span>
                    </span>
                    <button
                      onClick={() => {
                        if (selectedDocs.length === documentsToUse.length) setSelectedDocs([]);
                        else setSelectedDocs(documentsToUse.map(d => d.title));
                      }}
                      className="text-[10px] text-orange-400 hover:underline"
                    >
                      {selectedDocs.length === documentsToUse.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </h3>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {documentsToUse.map((doc, idx) => {
                      const isChecked = selectedDocs.includes(doc.title);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isChecked) setSelectedDocs(selectedDocs.filter(t => t !== doc.title));
                            else setSelectedDocs([...selectedDocs, doc.title]);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-slate-950 border-orange-500/40 text-slate-200'
                              : 'bg-slate-950/40 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded text-orange-500 focus:ring-0"
                            />
                            <span className="font-mono text-xs">{doc.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ~{Math.round(doc.content.length / 3.8)} tokens
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Model Blueprint & Action Panel (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Subject Model Specification</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Total Parameters:</span>
                      <span className="font-mono font-bold text-orange-400">{modelMetrics.totalParams.toLocaleString()} ({modelMetrics.paramString})</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Embedding Parameters:</span>
                      <span className="font-mono text-slate-300">{(modelMetrics.embeddingParams / 1_000_000).toFixed(2)}M</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Block Attention / MLP (x{config.n_layer}):</span>
                      <span className="font-mono text-slate-300">{(config.n_layer * (modelMetrics.attentionParamsPerLayer + modelMetrics.mlpParamsPerLayer) / 1_000_000).toFixed(2)}M</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Estimated Training VRAM / RAM:</span>
                      <span className="font-mono text-emerald-400">{modelMetrics.estimatedVramMb} MB</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">FLOPs per Token:</span>
                      <span className="font-mono text-slate-300">{(modelMetrics.flopsPerToken / 1_000_000).toFixed(1)} MFLOPs</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-[11px] text-amber-200/90 leading-relaxed">
                    💡 <strong>Subject Specialization Advantage:</strong> Training a compact {modelMetrics.paramString} nanoGPT from scratch on {subjectName} allows instant inference (&lt;15ms latency), zero cloud egress, and razor-sharp domain focus without generic model bloat.
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  {isTraining && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-400 font-mono">
                        <span>Training Steps ({currentStepData?.step || 0} / {config.max_iters})</span>
                        <span className="text-orange-400 font-bold">{trainingProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-150"
                          style={{ width: `${trainingProgress}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                        <span>Loss: {currentStepData?.trainLoss || '...'}</span>
                        <span>{currentStepData?.tokensPerSec || 5000} tokens/sec</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleStartTraining}
                    disabled={isTraining || selectedDocs.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    {isTraining ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Training Subject nanoGPT Model...</span>
                      </>
                    ) : (
                      <>
                        <Rocket size={15} />
                        <span>⚡ Train Dedicated nanoGPT for {subjectName}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Engine: integrations/nanogpt</span>
                    <span className="text-emerald-400 font-semibold">100% Air-Gapped Local</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE METRICS & LOSS CURVE */}
          {activeTab === 'metrics' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Final Loss</div>
                  <div className="text-lg font-bold text-orange-400 font-mono mt-0.5">
                    {currentStepData?.trainLoss || activeCheckpoint?.finalTrainLoss.toFixed(4) || 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Perplexity (PPL)</div>
                  <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                    {currentStepData?.perplexity || activeCheckpoint?.finalPerplexity.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Token Throughput</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {currentStepData?.tokensPerSec || 5200} tok/s
                  </div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Steps Completed</div>
                  <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
                    {currentStepData?.step || activeCheckpoint?.stepsTrained || 0} / {config.max_iters}
                  </div>
                </div>
              </div>

              {/* SVG Loss Curve */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-2">
                    <Activity size={14} className="text-orange-400" />
                    <span>Loss Convergence &amp; Perplexity Descent Curve</span>
                  </span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-orange-400 inline-block"></span> Train Loss</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-indigo-400 inline-block"></span> Val Loss</span>
                  </div>
                </div>

                {lossHistory.length > 0 ? (
                  <div className="w-full overflow-hidden">
                    <svg viewBox="0 0 600 180" className="w-full h-48">
                      {/* Grid Lines */}
                      <line x1="30" y1="20" x2="580" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="30" y1="70" x2="580" y2="70" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="30" y1="120" x2="580" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="30" y1="160" x2="580" y2="160" stroke="#334155" />

                      {/* Train Loss Line */}
                      <polyline
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        points={lossHistory.map((pt, i) => {
                          const x = 30 + (i / Math.max(1, lossHistory.length - 1)) * 550;
                          const normY = Math.min(1, Math.max(0, (pt.trainLoss - 0.2) / 4.2));
                          const y = 160 - normY * 135;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* Val Loss Line */}
                      <polyline
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        points={lossHistory.map((pt, i) => {
                          const x = 30 + (i / Math.max(1, lossHistory.length - 1)) * 550;
                          const normY = Math.min(1, Math.max(0, (pt.valLoss - 0.2) / 4.2));
                          const y = 160 - normY * 135;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <Activity size={24} className="text-slate-600 animate-pulse" />
                    <span>No active loss curve history yet. Click "Train Dedicated nanoGPT" to start.</span>
                  </div>
                )}
              </div>

              {/* Terminal Logs */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Training Event Log</div>
                {trainingLogs.length > 0 ? (
                  trainingLogs.map((log, i) => (
                    <div key={i} className="text-slate-400 leading-relaxed text-[11px]">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600 italic">Awaiting training trigger...</div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* TAB 3: INFERENCE ARENA */}
          {activeTab === 'inference' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap size={14} className="text-orange-400" />
                    <span>Prompt Subject AI with {activeCheckpoint?.metrics.paramString || modelMetrics.paramString} nanoGPT Weights</span>
                  </h3>
                  <span className="text-[11px] text-amber-400 font-mono font-semibold">
                    Target: {subjectName}
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    value={inferencePrompt}
                    onChange={(e) => setInferencePrompt(e.target.value)}
                    rows={3}
                    placeholder="Enter prompt to query this subject's nanoGPT model..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500 resize-none font-mono"
                  />
                  <button
                    onClick={handleRunInference}
                    disabled={isInferenceLoading || !inferencePrompt.trim()}
                    className="absolute right-2.5 bottom-3.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    {isInferenceLoading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>Generate</span>
                  </button>
                </div>

                {/* Sampling Controls */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Temperature:</span>
                      <span className="font-mono text-orange-400">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.5}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Top-K Sampling:</span>
                      <span className="font-mono text-orange-400">{topK}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={5}
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Output Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Autoregressive Output</span>
                  </span>
                  {inferenceOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inferenceOutput);
                          setCopiedOutput(true);
                          setTimeout(() => setCopiedOutput(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] flex items-center gap-1 text-slate-300"
                      >
                        {copiedOutput ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                      </button>
                      {onApplyCompletionToSubject && (
                        <button
                          onClick={() => {
                            onApplyCompletionToSubject(inferenceOutput);
                            onClose();
                          }}
                          className="px-2 py-0.5 rounded bg-orange-600/80 hover:bg-orange-600 text-[11px] font-semibold text-white flex items-center gap-1"
                        >
                          <span>Insert in Subject Hub</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="min-h-36 max-h-72 overflow-y-auto p-3.5 bg-slate-900/40 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {inferenceOutput || (
                    <span className="text-slate-600 italic">
                      Trained output will appear here with domain-specialized tokens...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PYTHON CLI & CONFIG */}
          {activeTab === 'python' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Terminal size={14} className="text-orange-400" />
                  <span>Execute on Host with PyTorch &amp; CUDA</span>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  The IDE generated a customized configuration in <code className="text-orange-300 bg-slate-950 px-1 py-0.5 rounded">integrations/nanogpt/config/subject_{subjectId}.py</code>. You can run training on any GPU machine using Karpathy's pure PyTorch code:
                </p>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-amber-300 flex items-center justify-between">
                  <span>cd integrations/nanogpt &amp;&amp; python train.py config/subject_{subjectId}.py</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`cd integrations/nanogpt && python train.py config/subject_${subjectId}.py`);
                      setCopiedConfig(true);
                      setTimeout(() => setCopiedConfig(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {copiedConfig ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Config Viewer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-slate-300">config/subject_{subjectId}.py</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPyConfig || '# nanoGPT configuration');
                      setCopiedConfig(true);
                      setTimeout(() => setCopiedConfig(false), 2000);
                    }}
                    className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <Copy size={11} />
                    <span>Copy Config File</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto leading-relaxed">
                  {generatedPyConfig || '# Click "Train Dedicated nanoGPT" to compile Python configuration.'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: ARCHITECTURE BLUEPRINT */}
          {activeTab === 'blueprint' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                  <Layers size={14} className="text-orange-400" />
                  <span>Andrej Karpathy's nanoGPT Architecture Breakdown (model.py)</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  nanoGPT is an ultra-pure, 300-line PyTorch implementation of the decoder-only generative transformer. Here is the mathematical execution graph compiled for {subjectName}:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-orange-400 font-bold uppercase font-mono">1. Embeddings</div>
                    <div className="font-semibold text-white">wte + wpe</div>
                    <div className="text-[11px] text-slate-400">
                      Token lookup ($V \times d$) + learned position encoding ($T \times d$). Added and passed through Dropout.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold uppercase font-mono">2. Attention</div>
                    <div className="font-semibold text-white">CausalSelfAttention</div>
                    <div className="text-[11px] text-slate-400">
                      Pre-LN LayerNorm $\to$ Batched Q, K, V projection ($3 \cdot d$) $\to$ FlashAttention scaled dot product $\to$ Output projection + residual.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase font-mono">3. Feed-Forward</div>
                    <div className="font-semibold text-white">MLP ($4 \times d$)</div>
                    <div className="text-[11px] text-slate-400">
                      Pre-LN LayerNorm $\to$ Linear ($d \to 4d$) $\to$ GELU non-linearity $\to$ Linear ($4d \to d$) $\to$ Residual addition.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase font-mono">4. Language Head</div>
                    <div className="font-semibold text-white">ln_f + lm_head</div>
                    <div className="text-[11px] text-slate-400">
                      Final LayerNorm $\to$ Linear projection ($d \to V$) with tied weights $\to$ Softmax cross-entropy loss.
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Snippet from model.py */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400 font-mono">
                  integrations/nanogpt/model.py &mdash; Transformer Block Definition
                </div>
                <pre className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-xs text-orange-200/90 max-h-60 overflow-y-auto leading-relaxed">
{`class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln_1 = LayerNorm(config.n_embd, bias=config.bias)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = LayerNorm(config.n_embd, bias=config.bias)
        self.mlp = MLP(config)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${backendStatus.hasPython ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>Python: {backendStatus.pythonVersion || 'Detected'}</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeCheckpoint ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              <span>Subject Status: {activeCheckpoint ? 'nanoGPT Trained' : 'Untrained'}</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>

      </div>
    </div>
  );
}
