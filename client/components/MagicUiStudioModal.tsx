'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Bell,
  Play,
  RotateCcw,
  Sliders,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { sonnerNotificationEngine } from '@/lib/ui/sonnerNotificationEngine';

export interface MagicUiStudioModalProps {
  onClose?: () => void;
}

export default function MagicUiStudioModal({ onClose }: MagicUiStudioModalProps) {
  const [selectedColor, setSelectedColor] = useState<string>('#6366f1');
  const [beamSpeed, setBeamSpeed] = useState<number>(6);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 150, y: 100 });
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const colors = [
    { name: 'Cosmic Indigo', hex: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
    { name: 'Neon Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
    { name: 'Emerald Sovereignty', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    { name: 'Lyric Rose', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
    { name: 'Solar Amber', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }
  ];

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const fireTestToast = (type: 'success' | 'info' | 'warning' | 'error' | 'ai') => {
    if (type === 'ai') {
      sonnerNotificationEngine.ai(
        '✨ Autonomous AI Agent Loop #4 Completed',
        'Synthesized 3 diff hunks across Playground.tsx and resolved Tree-sitter AST nodes.',
        { label: 'View Diff', onClick: () => showNotification('Opening interactive diff...') }
      );
    } else if (type === 'success') {
      sonnerNotificationEngine.success(
        '✅ Local Build Succeeded (0 Errors)',
        'TypeScript check passed in 1.4s with full zero-cloud air-gapped isolation.'
      );
    } else if (type === 'warning') {
      sonnerNotificationEngine.warning(
        '⚠️ High VRAM Utilization (88%)',
        'GGUF Q4_K_M model requires 3.8GB / 4.0GB allocated buffer.'
      );
    } else if (type === 'error') {
      sonnerNotificationEngine.error(
        '❌ Connection Timed Out',
        'Could not reach local Ollama daemon on http://localhost:11434.'
      );
    } else {
      sonnerNotificationEngine.show({
        title: 'ℹ️ LanceDB Vector Ingestion Finished',
        description: 'Indexed 4,820 chunks into disk-persisted Apache Arrow table.'
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#0c101a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles size={18} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-white">Magic UI & Sonner Aesthetics Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Linear & Raycast Polish
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Interactive sandbox for animated border beams, shimmer buttons, and spring-animated stacked toasts
            </p>
          </div>
        </div>

        {statusNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fadeIn">
            <CheckCircle2 size={13} />
            <span>{statusNotice}</span>
          </div>
        )}

        <div className="text-[11px] text-zinc-500 font-mono">
          Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-zinc-300 border border-slate-700">Ctrl+Alt+M</kbd>
        </div>
      </div>

      {/* Main Studio Arena */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#080b11] space-y-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Section 1: Magic UI Animated Border Beam */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Zap size={13} />
                  <span>1. Animated Border Beam Effect</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  A traveling light gradient that loops along card perimeters during active AI inference and code tasks.
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        selectedColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setBeamSpeed(3)}
                    className={`px-2 py-0.5 rounded ${beamSpeed === 3 ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                  >
                    3s (Fast)
                  </button>
                  <button
                    onClick={() => setBeamSpeed(6)}
                    className={`px-2 py-0.5 rounded ${beamSpeed === 6 ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                  >
                    6s (Smooth)
                  </button>
                  <button
                    onClick={() => setBeamSpeed(12)}
                    className={`px-2 py-0.5 rounded ${beamSpeed === 12 ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                  >
                    12s (Ambient)
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Beam Demo Card */}
            <div className="relative p-6 rounded-2xl bg-[#0d121e] border border-slate-800 overflow-hidden shadow-2xl">
              {/* Pseudo-element animated border beam simulation */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  border: `2px solid ${selectedColor}40`,
                  boxShadow: `inset 0 0 20px ${selectedColor}15, 0 0 30px ${selectedColor}10`
                }}
              />
              <div
                className="absolute -inset-[100%] pointer-events-none animate-spin"
                style={{
                  animationDuration: `${beamSpeed}s`,
                  background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 330deg, ${selectedColor} 360deg)`
                }}
              />
              <div className="absolute inset-[1px] bg-[#0c101a] rounded-2xl" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Tabby & LanceDB Sovereign Neural Stream</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/30">
                    Beam Speed: {beamSpeed}s
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                  const modelOutput = await localInferenceEngine.stream(&quot;Quantum annealing matrix&quot;);<br />
                  // Processing at 68.4 tokens/sec without external network connectivity.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>Hardware Offload: 100% GPU VRAM</span>
                  <span>Latency: 18ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sonner Stacked Toasts Simulator */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Bell size={13} />
                <span>2. Sonner Stacked Notification Manager</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any notification trigger below to fire an animated stacked toast directly into the IDE.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => fireTestToast('ai')}
                className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-900/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between text-indigo-400 mb-1">
                  <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-mono">AI Action</span>
                </div>
                <div className="text-xs font-medium text-white">✨ Autonomous Agent</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Multi-diff resolution</div>
              </button>

              <button
                onClick={() => fireTestToast('success')}
                className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">Success</span>
                </div>
                <div className="text-xs font-medium text-white">✅ Build Finished</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">0 type errors in 1.4s</div>
              </button>

              <button
                onClick={() => fireTestToast('warning')}
                className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between text-amber-400 mb-1">
                  <AlertTriangle size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span className="text-[10px] font-mono">Warning</span>
                </div>
                <div className="text-xs font-medium text-white">⚠️ VRAM High (88%)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Q4_K_M memory spike</div>
              </button>

              <button
                onClick={() => fireTestToast('error')}
                className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 hover:bg-rose-900/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between text-rose-400 mb-1">
                  <AlertCircle size={14} className="group-hover:shake transition-transform" />
                  <span className="text-[10px] font-mono">Error</span>
                </div>
                <div className="text-xs font-medium text-white">❌ Daemon Offline</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Port 11434 unreachable</div>
              </button>

              <button
                onClick={() => fireTestToast('info')}
                className="p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between text-cyan-400 mb-1">
                  <Layers size={14} className="group-hover:rotate-6 transition-transform" />
                  <span className="text-[10px] font-mono">Info</span>
                </div>
                <div className="text-xs font-medium text-white">ℹ️ LanceDB Sync</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">4,820 chunks indexed</div>
              </button>
            </div>
          </div>

          {/* Section 3: Shimmer Buttons & Spotlight Cursor Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shimmer Buttons Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0d121e] space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-white">Shimmer Buttons & Metallic Gleam</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Subtle, continuous metallic highlights inspired by Linear and Raycast.
                </p>
              </div>

              <div className="space-y-2.5">
                <button className="relative w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] animate-gradient hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles size={13} className="text-amber-300" />
                    <span>Deploy Sovereign AI Agent Loop</span>
                  </span>
                </button>

                <button className="relative w-full py-2 px-4 rounded-xl font-medium text-xs text-zinc-200 border border-slate-700 bg-slate-900 hover:border-slate-600 transition-all flex items-center justify-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Verified Air-Gapped Sandbox Execution</span>
                </button>
              </div>
            </div>

            {/* Spotlight Interactive Card */}
            <div
              onMouseMove={handleMouseMove}
              className="relative p-5 rounded-xl border border-slate-800 bg-[#0d121e] overflow-hidden cursor-crosshair space-y-3"
            >
              {/* Radial gradient spotlight following cursor */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 transition-opacity"
                style={{
                  background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.25), transparent 80%)`
                }}
              />

              <div className="relative z-10">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Eye size={13} className="text-indigo-400" />
                  <span>Spotlight Cursor Tracker</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Move your mouse across this card. A subtle ambient glow follows your cursor coordinates dynamically.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-[#090c13] border border-slate-800 text-[10px] font-mono text-zinc-400">
                  Cursor Coordinate: X: {Math.round(mousePos.x)}px, Y: {Math.round(mousePos.y)}px
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
