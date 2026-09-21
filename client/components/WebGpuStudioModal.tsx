'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Trash2,
  Gauge,
  HardDrive,
  RefreshCw,
  Sparkles,
  X,
  Layers,
  Activity
} from 'lucide-react';
import {
  webGpuEngine,
  WEBGPU_MODELS,
  WebGpuModelInfo,
  WebGpuEngineState
} from '@/lib/ai/webGpuEngine';

interface WebGpuStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCodeToEditor?: (code: string) => void;
}

export default function WebGpuStudioModal({
  isOpen,
  onClose,
  onApplyCodeToEditor
}: WebGpuStudioModalProps) {
  const [engineState, setEngineState] = useState<WebGpuEngineState>(webGpuEngine.getState());
  const [selectedModelId, setSelectedModelId] = useState<string>('qwen2.5-coder-0.5b');
  const [testPrompt, setTestPrompt] = useState('Write a TypeScript function to debounce an async callback with cancellation.');
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [isBusyLoading, setIsBusyLoading] = useState(false);

  useEffect(() => {
    const unsub = webGpuEngine.subscribe((s) => {
      setEngineState(s);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleLoadModel = async (modelId: string) => {
    setIsBusyLoading(true);
    try {
      await webGpuEngine.loadModel(modelId);
      setSelectedModelId(modelId);
    } catch (err) {
      console.error('Failed to load WebGPU model:', err);
    } finally {
      setIsBusyLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    await webGpuEngine.unloadModel();
  };

  const handleGenerate = async () => {
    if (!testPrompt.trim() || engineState.isGenerating) return;
    setGeneratedOutput('');
    try {
      await webGpuEngine.generateStream(
        testPrompt,
        { temperature: 0.2, maxTokens: 400 },
        (token) => {
          setGeneratedOutput((prev) => prev + token);
        }
      );
    } catch (err: any) {
      setGeneratedOutput((prev) => prev + `\n[Generation Error: ${err.message}]`);
    }
  };

  const handleAbort = () => {
    webGpuEngine.abort();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  WebGPU Zero-Install Local Inference
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-mono">
                  100% In-Browser Memory • Zero Daemons
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Execute lightweight AI models directly via WebGPU shaders in client RAM without Ollama or backend servers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${engineState.hardware.isSupported ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">
                {engineState.hardware.isSupported ? 'WebGPU Active' : 'Fallback Mode'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Hardware Diagnostics & Model Catalog */}
          <div className="w-96 border-r border-slate-800 p-5 flex flex-col gap-4 bg-slate-950/40 overflow-y-auto custom-scrollbar">
            
            {/* Hardware Diagnostic Card */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge size={13} className="text-cyan-400" />
                <span>GPU Compute Diagnostics</span>
              </span>
              <div className="text-xs space-y-1 font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Adapter:</span>
                  <span className="text-white truncate max-w-[160px]" title={engineState.hardware.adapterName}>
                    {engineState.hardware.adapterName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Vendor:</span>
                  <span className="text-slate-200">{engineState.hardware.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shader F16:</span>
                  <span className={engineState.hardware.hasF16 ? 'text-emerald-400' : 'text-slate-500'}>
                    {engineState.hardware.hasF16 ? 'Supported (Fast)' : 'Emulated (F32)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Storage Buffer:</span>
                  <span className="text-slate-200">{engineState.hardware.maxStorageBufferMb} MB</span>
                </div>
              </div>
            </div>

            {/* Models Catalog */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-400" />
                <span>Zero-Install Model Catalog</span>
              </span>

              {WEBGPU_MODELS.map((model) => {
                const isLoaded = engineState.loadedModelId === model.id;
                return (
                  <div
                    key={model.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isLoaded
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                        : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{model.name}</span>
                          {isLoaded && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-cyan-900 text-cyan-200 rounded font-mono">
                              In VRAM
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                          {model.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        ~{model.vramRequiredMb} MB
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                      <span>{model.recommendedFor}</span>
                      {isLoaded ? (
                        <button
                          onClick={handleUnloadModel}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Unload</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLoadModel(model.id)}
                          disabled={isBusyLoading}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Download size={11} />
                          <span>Load Model</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Download Progress Status Bar */}
            {engineState.downloadProgress > 0 && engineState.downloadProgress < 100 && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                  <span>{engineState.downloadStatusText}</span>
                  <span>{engineState.downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${engineState.downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: WebGPU Live Generation Playground */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Telemetry Header */}
            <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  Active Model:{' '}
                  <span className="text-cyan-300 font-bold">
                    {engineState.loadedModelId
                      ? WEBGPU_MODELS.find((m) => m.id === engineState.loadedModelId)?.name
                      : 'None (Select & Load)'}
                  </span>
                </span>
                {engineState.tokensPerSecond > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                    ⚡ {engineState.tokensPerSecond} tok/sec
                  </span>
                )}
                {engineState.lastLatencyMs > 0 && (
                  <span className="text-slate-500">
                    Latency: {engineState.lastLatencyMs}ms
                  </span>
                )}
              </div>

              {engineState.isGenerating && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Computing on WebGPU...</span>
                </div>
              )}
            </div>

            {/* Output Stream Canvas */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {generatedOutput ? (
                <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {generatedOutput}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                  <Cpu size={36} className="mb-3 text-slate-700" />
                  <p className="font-semibold text-slate-400">WebGPU Inference Ready</p>
                  <p className="text-xs max-w-md mt-1 text-slate-500">
                    Load a model on the left, then enter a coding prompt below to test WebGPU execution directly inside your browser memory.
                  </p>
                </div>
              )}
            </div>

            {/* Prompt Input & Execution Bar */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Enter coding task or question for WebGPU model..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                {!engineState.isGenerating ? (
                  <button
                    onClick={handleGenerate}
                    disabled={!testPrompt.trim() || isBusyLoading}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Run on WebGPU</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAbort}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square size={13} fill="currentColor" />
                    <span>Stop</span>
                  </button>
                )}

                {generatedOutput && onApplyCodeToEditor && (
                  <button
                    onClick={() => onApplyCodeToEditor(generatedOutput)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                    title="Apply generated code to active Monaco editor"
                  >
                    Apply to Code
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
