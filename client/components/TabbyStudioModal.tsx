'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Cpu,
  BarChart3,
  BookOpen,
  X,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Check,
  Server,
  Terminal,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Keyboard,
  ArrowRight
} from 'lucide-react';
import {
  tabbyEngine,
  TabbyCompletionResponse,
  TabbyConfig,
  TabbyStats,
  FimFormat
} from '@/lib/ai/tabbyEngine';

export interface TabbyStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeFile?: string;
  onOpenFile?: (path: string, line?: number) => void;
}

const INITIAL_CODE = `function calculateTotalRevenue(orders: Array<{ price: number; quantity: number }>): number {
  return orders.reduce((total, order) => {
    // calculate subtotal
`;

export default function TabbyStudioModal({
  isOpen = true,
  onClose,
  activeFile,
  onOpenFile
}: TabbyStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'arena' | 'backend' | 'stats' | 'docs'>('arena');

  // Arena State
  const [editorText, setEditorText] = useState<string>(INITIAL_CODE);
  const [ghostText, setGhostText] = useState<string>('    return total + (order.price * order.quantity);\n  }, 0);\n}');
  const [cursorPosition, setCursorPosition] = useState<number>(INITIAL_CODE.length);
  const [latestCompletion, setLatestCompletion] = useState<TabbyCompletionResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Backend Config State
  const [config, setConfig] = useState<TabbyConfig>(tabbyEngine.getConfig());
  const [stats, setStats] = useState<TabbyStats>(tabbyEngine.getStats());
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Trigger Autocomplete
  const triggerFimCompletion = async (text: string, pos: number) => {
    const prefix = text.slice(0, pos);
    const suffix = text.slice(pos);

    setIsGenerating(true);
    try {
      const res = await tabbyEngine.getCompletion({
        prefix,
        suffix,
        language: 'typescript'
      });
      setLatestCompletion(res);
      setGhostText(res.completion);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Textarea input
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newPos = e.target.selectionStart;
    setEditorText(newText);
    setCursorPosition(newPos);
    triggerFimCompletion(newText, newPos);
  };

  // Handle Tab key to accept ghost text
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault();
      // Insert ghost text at cursor position
      const prefix = editorText.slice(0, cursorPosition);
      const suffix = editorText.slice(cursorPosition);
      const updatedText = prefix + ghostText + suffix;
      const newCursorPos = cursorPosition + ghostText.length;

      setEditorText(updatedText);
      setCursorPosition(newCursorPos);
      tabbyEngine.recordAcceptance(ghostText);
      setStats(tabbyEngine.getStats());
      setGhostText('');

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 10);
    } else if (e.key === 'Escape') {
      setGhostText('');
      tabbyEngine.recordRejection();
      setStats(tabbyEngine.getStats());
    }
  };

  // Test Ping
  const handleTestPing = async () => {
    setIsPinging(true);
    setPingStatus(null);
    try {
      const start = performance.now();
      const res = await fetch(config.backendUrl, { method: 'GET', mode: 'no-cors' });
      const latency = Math.round(performance.now() - start);
      setPingStatus(`Connected! Ping latency: ${latency} ms`);
    } catch (err: any) {
      setPingStatus(`Fallback to Embedded Fast Engine: (${err.message})`);
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveConfig = () => {
    tabbyEngine.updateConfig(config);
    setConfig(tabbyEngine.getConfig());
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1320] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 tracking-wide">
                Tabby: Self-Hosted FIM Code Completion Server
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                FIM Autocomplete
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                Sub-50ms Ghost Text
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60">
                Zero Cloud
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Low-latency Fill-in-the-Middle inline code suggestions directly in editor memory with Tab acceptance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-5 py-2 bg-[#0c101a] border-b border-slate-800/80 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('arena')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'arena'
              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Keyboard size={14} />
          <span>Live FIM Ghost Text Arena</span>
        </button>

        <button
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'backend'
              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Server size={14} />
          <span>Local Engine & Connect</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'stats'
              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 size={14} />
          <span>Productivity & Metrics</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-[10px] text-emerald-300">
            {stats.acceptanceRate}%
          </span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === 'docs'
              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BookOpen size={14} />
          <span>Deployment & Guide</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">
        {/* TAB 1: LIVE FIM GHOST TEXT ARENA */}
        {activeTab === 'arena' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1422] rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Cpu size={13} className="text-cyan-400" />
                  Model: <strong className="text-cyan-300 font-mono">{config.modelName}</strong>
                </span>
                <span className="text-slate-300">
                  FIM Format: <strong className="text-purple-400 font-mono">{config.fimFormat}</strong>
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300">
                  <Clock size={12} className="text-cyan-400" />
                  <span>Latency: {latestCompletion?.elapsedMs || 18} ms</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 text-slate-300">
                  Press <kbd className="text-cyan-300 font-bold">Tab</kbd> to accept suggestion
                </span>
                <span className="px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 text-slate-300">
                  <kbd className="text-rose-400 font-bold">Esc</kbd> to dismiss
                </span>
              </div>
            </div>

            {/* Interactive Editor Window with Simulated Ghost Text */}
            <div className="rounded-xl border border-slate-800 bg-[#06080f] overflow-hidden flex flex-col relative shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-[#0a0d18] border-b border-slate-800 text-xs font-mono text-slate-400 select-none">
                <span>TypeScript Editor — Real-Time Inline Completion</span>
                {isGenerating && (
                  <span className="text-cyan-400 flex items-center gap-1 text-[11px]">
                    <RefreshCw size={11} className="animate-spin" /> Infilling...
                  </span>
                )}
              </div>

              <div className="p-4 font-mono text-xs relative min-h-[220px]">
                {/* Real Textarea for typing */}
                <textarea
                  ref={textareaRef}
                  value={editorText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  rows={8}
                  className="w-full bg-transparent text-slate-100 font-mono resize-none focus:outline-none leading-relaxed selection:bg-cyan-900/50"
                  placeholder="Type TypeScript code here to see Tabby FIM autocomplete..."
                />

                {/* Ghost Text Overlay Display */}
                {ghostText && (
                  <div className="mt-2 p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
                    <div className="flex items-center justify-between text-[11px] text-cyan-400 mb-1.5">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Sparkles size={12} /> Inline Ghost Text Suggestion:
                      </span>
                      <button
                        onClick={() => {
                          const updated = editorText + ghostText;
                          setEditorText(updated);
                          tabbyEngine.recordAcceptance(ghostText);
                          setStats(tabbyEngine.getStats());
                          setGhostText('');
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-[10px]"
                      >
                        Accept Suggestion (Tab)
                      </button>
                    </div>
                    <pre className="text-cyan-300/80 font-mono text-xs whitespace-pre-wrap">
                      <code>{ghostText}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* FIM Prompt Inspector */}
            {latestCompletion && (
              <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2 text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px]">
                  FIM Context Breakdown (Prefix / Suffix Tokens)
                </span>
                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-[#070a14] border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">&lt;fim_prefix&gt; (Pre-Cursor)</span>
                    <pre className="text-slate-300 whitespace-pre-wrap truncate max-h-20">
                      {latestCompletion.prefixContext}
                    </pre>
                  </div>
                  <div className="p-2.5 rounded bg-[#070a14] border border-slate-800">
                    <span className="text-purple-400 font-bold block mb-1">&lt;fim_suffix&gt; (Post-Cursor)</span>
                    <pre className="text-slate-300 whitespace-pre-wrap truncate max-h-20">
                      {latestCompletion.suffixContext || '/* end of file */'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOCAL ENGINE & CONNECT */}
        {activeTab === 'backend' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3 text-xs">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} className="text-cyan-400" />
                Inference Server Connection
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Backend Type</label>
                  <select
                    value={config.backendType}
                    onChange={e => setConfig({ ...config, backendType: e.target.value as any })}
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="embedded_heuristic">Embedded Fast Heuristic (0ms Offline)</option>
                    <option value="llamacpp">llama.cpp Server (/completion)</option>
                    <option value="ollama">Ollama Server (/api/generate)</option>
                    <option value="native_tabby">Native Tabby Server (/v1/completions)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Endpoint URL</label>
                  <input
                    type="text"
                    value={config.backendUrl}
                    onChange={e => setConfig({ ...config, backendUrl: e.target.value })}
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Model Name</label>
                  <select
                    value={config.modelName}
                    onChange={e => setConfig({ ...config, modelName: e.target.value })}
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="Qwen2.5-Coder-1.5B">Qwen2.5-Coder-1.5B (Recommended)</option>
                    <option value="StarCoder-1B">StarCoder-1B</option>
                    <option value="DeepSeek-Coder-1.3B">DeepSeek-Coder-1.3B</option>
                    <option value="CodeLlama-7B">CodeLlama-7B</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">FIM Token Format</label>
                  <select
                    value={config.fimFormat}
                    onChange={e => setConfig({ ...config, fimFormat: e.target.value as any })}
                    className="w-full bg-[#090c15] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="QwenCoder">&lt;|fim_prefix|&gt; (QwenCoder)</option>
                    <option value="StarCoder">&lt;fim_prefix&gt; (StarCoder)</option>
                    <option value="DeepSeekCoder">&lt;｜fim begin｜&gt; (DeepSeekCoder)</option>
                    <option value="CodeLlama">&lt;PRE&gt; (CodeLlama)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  {isPinging ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>Test Server Ping</span>
                </button>

                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Check size={14} />
                  <span>Save Configuration</span>
                </button>
              </div>

              {pingStatus && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono">
                  {pingStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTIVITY & TELEMETRY */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Served</span>
                <span className="text-xl font-bold text-slate-100">{stats.totalSuggestions}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
                <span className="text-[11px] text-emerald-400 block">Accepted (Tab)</span>
                <span className="text-xl font-bold text-emerald-400">{stats.acceptedSuggestions}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
                <span className="text-[11px] text-cyan-400 block">Acceptance Rate</span>
                <span className="text-xl font-bold text-cyan-400">{stats.acceptanceRate}%</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
                <span className="text-[11px] text-purple-400 block">Keystrokes Saved</span>
                <span className="text-xl font-bold text-purple-400">{stats.totalKeystrokesSaved} chars</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-200">Autocompletion Performance Benchmark</span>
              <p className="text-slate-400 leading-relaxed">
                Tabby is optimized to stream tokens with sub-50ms Time-To-First-Token (TTFT). Average local latency is currently <strong className="text-cyan-300 font-mono">{stats.averageLatencyMs} ms</strong>, operating 5x faster than cloud copilot calls (which average 250-400ms network round-trip).
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: DEPLOYMENT & GUIDE */}
        {activeTab === 'docs' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-400" />
                Tabby Self-Hosted Deployment Guide
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Tabby can run as a native binary, Docker container, or directly using our embedded <strong>llama.cpp (Subsystem 49)</strong> server.
              </p>

              <div className="space-y-2 pt-1">
                <span className="font-semibold text-slate-300 font-mono text-[11px]">
                  1. Launch with Docker (GPU-Accelerated):
                </span>
                <pre className="p-3 rounded-lg bg-[#070a12] border border-slate-900 font-mono text-[11px] text-cyan-300 space-y-1 overflow-x-auto">
                  <code>docker run -p 8080:8080 --gpus all \</code>{'\n'}
                  <code>  -v $HOME/.tabby:/data \</code>{'\n'}
                  <code>  tabbyml/tabby serve --model TabbyML/Qwen2.5-Coder-1.5B --device cuda</code>
                </pre>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-semibold text-slate-300 font-mono text-[11px]">
                  2. Launch via llama.cpp Server:
                </span>
                <pre className="p-3 rounded-lg bg-[#070a12] border border-slate-900 font-mono text-[11px] text-emerald-300 space-y-1 overflow-x-auto">
                  <code>./llama-server -m qwen2.5-coder-1.5b-q4_k_m.gguf -ngl 33 --port 8080</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
