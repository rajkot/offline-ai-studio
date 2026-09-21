'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertCircle, Play, Terminal, Cpu, HardDrive, Zap, Send, Loader2 } from 'lucide-react';

interface ModelInfo {
  name: string;
  size: number;
  parameter_size?: string;
  quantization?: string;
  family?: string;
}

export default function OllamaSettingsTab() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [version, setVersion] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState('llama3.2:3b');
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingDaemon, setIsStartingDaemon] = useState(false);
  
  // Quick test state
  const [testPrompt, setTestPrompt] = useState('Write a hello world in Python');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testTimeMs, setTestTimeMs] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ollama/status');
      if (res.ok) {
        const data = await res.json();
        setOnline(data.online);
        setBaseUrl(data.baseUrl || 'http://127.0.0.1:11434');
        setVersion(data.version || '');
        if (Array.isArray(data.models)) {
          setModels(data.models.map((m: any) => ({
            name: m.name,
            size: m.size,
            parameter_size: m.details?.parameter_size,
            quantization: m.details?.quantization_level,
            family: m.details?.family,
          })));
        }
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartDaemon = async () => {
    setIsStartingDaemon(true);
    try {
      const res = await fetch('/api/ollama/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          await fetchStatus();
        }
      }
    } catch (e) {
      console.warn('Failed to start Ollama daemon:', e);
    } finally {
      setIsStartingDaemon(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offlineAi.ollamaModel');
      if (saved) setActiveModel(saved);

      const handleModelChanged = (e: Event) => {
        const ce = e as CustomEvent;
        if (ce.detail && typeof ce.detail === 'string') {
          setActiveModel(ce.detail);
        }
      };

      const handleModelsUpdated = () => {
        fetchStatus();
      };

      window.addEventListener('ollama-model-changed', handleModelChanged);
      window.addEventListener('ollama-models-updated', handleModelsUpdated);

      fetchStatus();

      return () => {
        window.removeEventListener('ollama-model-changed', handleModelChanged);
        window.removeEventListener('ollama-models-updated', handleModelsUpdated);
      };
    }
  }, [fetchStatus]);

  const handleSelectActiveModel = (modelName: string) => {
    setActiveModel(modelName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('offlineAi.ollamaModel', modelName);
      window.dispatchEvent(new CustomEvent('ollama-model-changed', { detail: modelName }));
    }
  };

  const runQuickTest = async () => {
    if (!testPrompt.trim() || isTesting) return;
    setIsTesting(true);
    setTestResponse('');
    const start = Date.now();

    try {
      const res = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt,
          model: activeModel,
          stream: false,
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResponse(data.response || 'No output received');
        setTestTimeMs(Date.now() - start);
      } else {
        setTestResponse(`Error: HTTP ${res.status}`);
      }
    } catch (e: any) {
      setTestResponse(`Inference error: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-5 text-zinc-100 font-sans">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-800/40 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Local Ollama AI Daemon</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 ${
                online ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {online ? `Online (v${version || 'active'})` : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              Host: <span className="text-zinc-200">{baseUrl}</span> ? Complete offline-first execution with zero cloud egress.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!online && (
            <button
              onClick={handleStartDaemon}
              disabled={isStartingDaemon}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-purple-950/40"
            >
              <Play size={12} />
              {isStartingDaemon ? 'Starting Ollama...' : 'Start Ollama Daemon'}
            </button>
          )}
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Installed Models Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu size={14} className="text-purple-400" />
            Installed Local Models ({models.length})
          </h4>
          <span className="text-[11px] text-zinc-400 font-mono">
            Active: <strong className="text-purple-300">{activeModel}</strong>
          </span>
        </div>

        {models.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {models.map((m) => {
              const isActive = m.name === activeModel;
              return (
                <div
                  key={m.name}
                  onClick={() => handleSelectActiveModel(m.name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-950/30 border-purple-500/70 shadow-lg shadow-purple-950/20'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {m.name}
                        {isActive && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-3 font-mono">
                        <span>Params: {m.parameter_size || 'N/A'}</span>
                        <span>Quant: {m.quantization || 'Q4_K_M'}</span>
                        <span>Size: {formatSize(m.size)}</span>
                      </div>
                    </div>
                    {isActive ? (
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                    ) : (
                      <button className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 font-sans">
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
            {online ? (
              <div>
                <p className="mb-2">No models installed in Ollama yet.</p>
                <code className="text-xs bg-black px-2 py-1 rounded text-purple-300 font-mono">ollama pull llama3.2</code>
              </div>
            ) : (
              <div>
                <p className="mb-2">Ollama server is not running.</p>
                <button
                  onClick={handleStartDaemon}
                  disabled={isStartingDaemon}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play size={12} />
                  {isStartingDaemon ? 'Launching Ollama Daemon...' : 'Launch Ollama Daemon'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Quick Inference Test */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl">
        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          Quick Inference Benchmark ({activeModel})
        </h4>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter test prompt..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') runQuickTest();
            }}
          />
          <button
            onClick={runQuickTest}
            disabled={isTesting || !online}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            Test Model
          </button>
        </div>

        {testResponse && (
          <div className="bg-black/60 border border-zinc-800/80 rounded-lg p-3 text-xs font-mono">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-zinc-800 pb-1 mb-2">
              <span>Model: {activeModel}</span>
              {testTimeMs && <span className="text-emerald-400 font-bold">{testTimeMs}ms latency</span>}
            </div>
            <pre className="text-zinc-200 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
              {testResponse}
            </pre>
          </div>
        )}
      </div>

      {/* CLI Quick References */}
      <div className="p-3.5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mb-2">
          <Terminal size={14} className="text-zinc-500" />
          Terminal Pull Commands
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-black/40 p-2 rounded border border-zinc-800/80 flex items-center justify-between">
            <span className="text-purple-300">ollama pull llama3.2</span>
            <span className="text-zinc-500 text-[9px]">General / Chat</span>
          </div>
          <div className="bg-black/40 p-2 rounded border border-zinc-800/80 flex items-center justify-between">
            <span className="text-purple-300">ollama pull qwen2.5:1.5b</span>
            <span className="text-zinc-500 text-[9px]">Fast Code FIM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
