import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Cpu,
  Terminal,
  Search,
  Sunrise,
  Code2,
  X,
  Play,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  History,
  Activity,
  Layers,
  Sparkles,
  Bot
} from 'lucide-react';
import { OpenJarvisAgentPreset, OpenJarvisTrace, OpenJarvisSpec, openJarvisEngine } from '@/lib/ai/openJarvisEngine';

interface OpenJarvisStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: string;
  onSelectAgentForAutonomous?: (presetId: string, prompt: string) => void;
  onInsertToEditor?: (content: string) => void;
}

export const OpenJarvisStudioModal: React.FC<OpenJarvisStudioModalProps> = ({
  isOpen,
  onClose,
  activeFile = '',
  onSelectAgentForAutonomous,
  onInsertToEditor
}) => {
  const [presets, setPresets] = useState<OpenJarvisAgentPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('morning_briefing');
  const [spec, setSpec] = useState<OpenJarvisSpec | null>(null);
  const [traces, setTraces] = useState<OpenJarvisTrace[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'traces' | 'pillars'>('presets');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/openjarvis');
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
        setSpec(data.spec || null);
        setTraces(data.traces || []);
        setMetrics(data.metrics || null);
      } else {
        setPresets(openJarvisEngine.getAgentPresets());
        setSpec(openJarvisEngine.getSpec());
        setTraces(openJarvisEngine.getTraces());
        setMetrics(openJarvisEngine.getMetrics());
      }
    } catch {
      setPresets(openJarvisEngine.getAgentPresets());
      setSpec(openJarvisEngine.getSpec());
      setTraces(openJarvisEngine.getTraces());
      setMetrics(openJarvisEngine.getMetrics());
    }
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId) || presets[0];

  useEffect(() => {
    if (selectedPreset && selectedPreset.exampleQueries && selectedPreset.exampleQueries.length > 0) {
      setUserPrompt(selectedPreset.exampleQueries[0]);
      setExecutionResult(null);
    }
  }, [selectedPresetId]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!selectedPreset || !userPrompt.trim()) return;
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/openjarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'executePreset',
          presetId: selectedPreset.id,
          task: userPrompt,
          context: activeFile ? `Active File: ${activeFile}` : ''
        })
      });
      const data = await res.json();
      setExecutionResult(data);
      if (data.metrics) setMetrics(data.metrics);
      loadData();
    } catch (err: any) {
      setExecutionResult({
        success: false,
        result: `Execution failed: ${err.message}`
      });
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPresetIcon = (iconName: string, color: string) => {
    const size = 16;
    switch (iconName) {
      case 'Sunrise': return <Sunrise size={size} style={{ color }} />;
      case 'Code2': return <Code2 size={size} style={{ color }} />;
      case 'Search': return <Search size={size} style={{ color }} />;
      case 'Terminal': return <Terminal size={size} style={{ color }} />;
      default: return <Brain size={size} style={{ color }} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[#121214] border border-cyan-900/50 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-cyan-950/60 via-[#18181b] to-indigo-950/60 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg shadow-inner">
              <Brain size={18} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">OpenJarvis Assistant Studio</h2>
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-mono font-medium">
                  Stanford Hazy Lab 5-Pillar Spec
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                  ⚡ Intelligence/Watt Optimized
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Low-FLOP local-first personal AI harness, on-device trace memory & multi-engine routing.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2">
            {metrics && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono">
                <span className="text-emerald-400 font-bold">~{metrics.avgFlopsSavedPct}% FLOPs Saved</span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-300">{metrics.avgDurationMs}ms Latency</span>
              </div>
            )}
            <button
              onClick={loadData}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Engine"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 5-Pillar Banner Bar */}
        <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between text-[11px] overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-zinc-400">1. Intelligence:</span>
              <strong className="text-zinc-200 font-mono">{spec?.intelligence.defaultModel || 'qwen2.5:1.5b'}</strong>
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">2. Engine:</span>
              <strong className="text-emerald-300 font-mono">Ollama (11434)</strong>
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-zinc-400">3. Agent:</span>
              <strong className="text-purple-300 font-mono">CodeAct Loop</strong>
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-zinc-400">4. Tools/Memory:</span>
              <strong className="text-amber-300 font-mono">MCP + Episodic</strong>
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-zinc-400">5. Learning:</span>
              <strong className="text-rose-300 font-mono">{traces.length} Traces</strong>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'presets' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab('traces')}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'traces' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Trace Memory ({traces.length})
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {activeTab === 'presets' && (
            <>
              {/* Left Column: Preset List */}
              <div className="w-80 border-r border-zinc-800/80 bg-[#141417] flex flex-col shrink-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  OpenJarvis Agent Presets
                </span>
                {presets.map(preset => {
                  const isSelected = selectedPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                        isSelected
                          ? 'bg-cyan-950/25 border-cyan-500/50 shadow-sm'
                          : 'bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                          {getPresetIcon(preset.icon, preset.color)}
                        </div>
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-200' : 'text-zinc-200'}`}>
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-cyan-400 border border-cyan-500/30 rounded font-mono">
                          Tier: {preset.recommendedFlopTier}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Execution Playground */}
              <div className="flex-1 flex flex-col bg-[#101012] overflow-hidden p-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  
                  {/* Query Input Box */}
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          {selectedPreset?.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                        Low-FLOP Routing
                      </span>
                    </div>

                    {/* Example Presets */}
                    {selectedPreset?.exampleQueries && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-zinc-400">Quick Prompt Presets:</label>
                        <div className="space-y-1">
                          {selectedPreset.exampleQueries.map((ex, i) => (
                            <button
                              key={i}
                              onClick={() => setUserPrompt(ex)}
                              className="w-full text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] transition-colors cursor-pointer"
                            >
                              ⚡ {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <label className="text-[11px] font-semibold text-zinc-400">Objective / Prompt:</label>
                      <textarea
                        rows={4}
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className="w-full flex-1 bg-zinc-950 border border-zinc-700/80 rounded-md p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 font-mono resize-none"
                        placeholder="Enter task for OpenJarvis..."
                      />
                    </div>

                    <button
                      onClick={handleExecute}
                      disabled={executing || !userPrompt.trim()}
                      className={`w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        executing
                          ? 'bg-cyan-600/50 text-zinc-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                      }`}
                    >
                      {executing ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Running OpenJarvis Intelligence...</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>Execute OpenJarvis Task</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Output Box */}
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Agent Output Stream
                      </h4>
                      {executionResult && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            {executionResult.flopsSavedPct}% FLOPs Saved
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {executionResult.durationMs}ms
                          </span>
                          <button
                            onClick={() => copyToClipboard(executionResult.result || '')}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
                            title="Copy Output"
                          >
                            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          {onInsertToEditor && (
                            <button
                              onClick={() => onInsertToEditor(executionResult.result || '')}
                              className="px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[10.5px] cursor-pointer"
                            >
                              Insert to File
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                      {executionResult ? (
                        <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                          {executionResult.result}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center p-4">
                          <Brain size={26} className="mb-2 opacity-50 text-cyan-400" />
                          <p className="text-xs">Select a preset prompt and click "Execute OpenJarvis Task".</p>
                          <p className="text-[10px] text-zinc-600 mt-1">Executes with minimal energy and low latency on local hardware.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {/* TAB 2: TRACES & LEARNING LOOP */}
          {activeTab === 'traces' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">On-Device Trace Memory & Learning Store</h3>
                  <p className="text-xs text-zinc-400">Captured execution traces used for on-device self-correction and continuous fine-tuning.</p>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/30">
                  Total Traces: {traces.length}
                </span>
              </div>

              <div className="space-y-2">
                {traces.map(trace => (
                  <div key={trace.id} className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-zinc-200">{trace.agentPreset}</span>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.2 rounded">
                          {trace.modelUsed}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-emerald-400">~{trace.estimatedFlopsSavedPct}% FLOPs Saved</span>
                        <span className="text-zinc-500">{trace.durationMs}ms</span>
                        <span className="text-zinc-600">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-cyan-300/90 truncate">
                      Prompt: {trace.userPrompt}
                    </p>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      {trace.responseSnippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
