'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Layers, 
  ArrowRight,
  Terminal,
  Code
} from 'lucide-react';
import { ghostTextEngine, AutocompleteTelemetry } from '@/lib/ghostTextEngine';

interface GhostTextSettingsProps {
  onClose?: () => void;
}

export default function GhostTextSettings({ onClose }: GhostTextSettingsProps) {
  const [telemetry, setTelemetry] = useState<AutocompleteTelemetry>(ghostTextEngine.getTelemetry());
  const [debounceDelay, setDebounceDelay] = useState<number>(75);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5-coder-speculative');
  const [testInput, setTestInput] = useState<string>('const [activeTab, set');
  const [predictedGhost, setPredictedGhost] = useState<string>('ActiveTab] = useState("overview");');

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(ghostTextEngine.getTelemetry());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTestTyping = async (text: string) => {
    setTestInput(text);
    const res = await ghostTextEngine.getCompletion(text, '', 'test.tsx', {});
    if (res && res.insertText) {
      setPredictedGhost(res.insertText);
    } else {
      setPredictedGhost('');
    }
  };

  const handleAcceptGhost = () => {
    if (predictedGhost) {
      setTestInput(prev => prev + predictedGhost);
      setPredictedGhost('');
      ghostTextEngine.recordAcceptance();
      setTelemetry(ghostTextEngine.getTelemetry());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 p-4 border border-[#27272a] rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-400">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Inline Ghost Text & Speculative Autocomplete</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/80 border border-purple-700 text-purple-300">
                ⚡ Active
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono">Sub-50ms Multi-Token Speculative Decoding</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
        <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Mean Latency</span>
          <div className="text-lg font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
            <span>{telemetry.lastLatencyMs}ms</span>
            <Activity size={14} className="text-emerald-500" />
          </div>
          <span className="text-[10px] text-zinc-400">Local WASM / WebGPU</span>
        </div>

        <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Completions Offered</span>
          <div className="text-lg font-mono font-bold text-purple-400 mt-0.5">
            {telemetry.totalCompletionsOffered}
          </div>
          <span className="text-[10px] text-zinc-400">Live keystroke pauses</span>
        </div>

        <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Accepted Completions</span>
          <div className="text-lg font-mono font-bold text-indigo-400 mt-0.5">
            {telemetry.totalCompletionsAccepted}
          </div>
          <span className="text-[10px] text-zinc-400">Via [Tab] key</span>
        </div>

        <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Cache Hit Rate</span>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
            {(telemetry.cacheHitRate * 100).toFixed(0)}%
          </div>
          <span className="text-[10px] text-zinc-400">N-gram prefix trees</span>
        </div>
      </div>

      {/* Model & Latency Controls */}
      <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col gap-3">
        <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
          <Sliders size={14} className="text-purple-400" />
          <span>Autocomplete Engine Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono text-zinc-400">Speculative Model</label>
            <select
              value={selectedModel}
              onChange={e => {
                setSelectedModel(e.target.value);
                ghostTextEngine.setModel(e.target.value);
              }}
              className="bg-[#111113] border border-[#27272a] rounded-lg p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="qwen2.5-coder-speculative">Qwen2.5-Coder-1.5B (WASM Speculative / 24ms)</option>
              <option value="starcoder2-wasm">StarCoder2-3B (WebGPU Local / 45ms)</option>
              <option value="gemini-1.5-flash">Gemini-1.5-Flash (Hybrid FIM Cloud / 120ms)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
              <span>Keystroke Pause Delay</span>
              <span className="text-purple-400 font-bold">{debounceDelay}ms</span>
            </div>
            <input
              type="range"
              min={50}
              max={250}
              step={25}
              value={debounceDelay}
              onChange={e => setDebounceDelay(Number(e.target.value))}
              className="w-full accent-purple-500 mt-1 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Interactive Ghost Text Scratchpad */}
      <div className="mt-4 flex-1 flex flex-col gap-2 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Code size={14} className="text-emerald-400" />
            <span>Interactive Ghost Text Scratchpad (Type code below to test)</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">Tab</kbd> to accept ghost text
          </span>
        </div>

        <div className="relative flex-1 bg-[#111113] border border-[#27272a] rounded-xl p-3 font-mono text-xs overflow-hidden flex flex-col justify-start">
          <div className="flex items-center flex-wrap">
            <span className="text-zinc-100 font-medium whitespace-pre">{testInput}</span>
            {predictedGhost && (
              <span className="text-zinc-500/80 italic animate-pulse whitespace-pre select-none">
                {predictedGhost}
              </span>
            )}
          </div>

          <textarea
            value={testInput}
            onChange={e => handleTestTyping(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Tab' && predictedGhost) {
                e.preventDefault();
                handleAcceptGhost();
              }
            }}
            placeholder="Type e.g. 'const [tab, set' or 'export async function POST'..."
            className="absolute inset-0 opacity-0 cursor-text resize-none p-3 w-full h-full font-mono text-xs"
            autoFocus
          />
        </div>

        {predictedGhost && (
          <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/60 p-2 rounded-lg">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-purple-400" />
              <span>Multi-token completion predicted ({predictedGhost.split(/\s+/).length} tokens)</span>
            </span>
            <button
              onClick={handleAcceptGhost}
              className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-xs"
            >
              Accept [Tab]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
