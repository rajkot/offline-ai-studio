'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cpu, Activity, CheckCircle2, RefreshCw, Layers, ShieldCheck, 
  Zap, Database, ArrowRight, Sparkles 
} from 'lucide-react';

interface SwarmNode {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'active' | 'waiting' | 'calculating';
}

interface TaskProgressItem {
  id: string;
  label: string;
  progress: number; // 0 to 100
  status: 'completed' | 'processing' | 'queued';
}

export default function SwarmGraphVisualizer() {
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
  const [latency, setLatency] = useState<number>(142);
  const [confidence, setConfidence] = useState<number>(98.4);
  const [tokensPerSec, setTokensPerSec] = useState<number>(64.8);

  const nodes: SwarmNode[] = [
    { id: 'architect', name: 'Architect', role: 'Planning & Decomposition', icon: '🏗️', status: activeNodeIndex === 0 ? 'calculating' : activeNodeIndex > 0 ? 'active' : 'waiting' },
    { id: 'generator', name: 'Generator', role: 'Core Code & Content', icon: '🎨', status: activeNodeIndex === 1 ? 'calculating' : activeNodeIndex > 1 ? 'active' : 'waiting' },
    { id: 'auditor', name: 'Auditor', role: 'Syntax & Structure Critic', icon: '🔍', status: activeNodeIndex === 2 ? 'calculating' : activeNodeIndex > 2 ? 'active' : 'waiting' },
    { id: 'keeper', name: 'Memory Keeper', role: 'Subject Database Sync', icon: '🧠', status: activeNodeIndex === 3 ? 'calculating' : activeNodeIndex > 3 ? 'active' : 'waiting' }
  ];

  const [tasks, setTasks] = useState<TaskProgressItem[]>([
    { id: 't-1', label: 'Stage 1: Intent Analysis & Parsing', progress: 100, status: 'completed' },
    { id: 't-2', label: 'Stage 2: Formatting & Syntax Audit', progress: 75, status: 'processing' },
    { id: 't-3', label: 'Stage 3: GGUF Vector Embedding Sync', progress: 0, status: 'queued' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNodeIndex(prev => (prev + 1) % 4);
      setLatency(Math.floor(Math.random() * 40) + 120);
      setConfidence(Number((Math.random() * 2 + 97).toFixed(1)));
      setTokensPerSec(Number((Math.random() * 10 + 60).toFixed(1)));

      setTasks(prev => prev.map((t, idx) => {
        if (idx === 0) return { ...t, progress: 100, status: 'completed' };
        if (idx === 1) {
          const nextProg = (t.progress + 15) % 101;
          return { ...t, progress: nextProg, status: nextProg === 100 ? 'completed' : 'processing' };
        }
        if (idx === 2) {
          const prevDone = prev[1].progress === 100;
          const nextProg = prevDone ? Math.min(100, t.progress + 20) : 0;
          return { ...t, progress: nextProg, status: nextProg === 100 ? 'completed' : prevDone ? 'processing' : 'queued' };
        }
        return t;
      }));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#18181b]/90 backdrop-blur-md border-b border-[#27272a] p-3 flex flex-col gap-3 font-sans select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <Activity size={13} className="animate-pulse" />
          </div>
          <span className="font-bold text-xs text-white font-mono uppercase tracking-wider">Live Swarm Execution Graph</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span>Latency: <strong className="text-indigo-300">{latency}ms</strong></span>
          <span>Confidence: <strong className="text-emerald-400">{confidence}%</strong></span>
          <span>T/s: <strong className="text-cyan-300">{tokensPerSec}</strong></span>
        </div>
      </div>

      {/* 4 Agent Nodes Flow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {nodes.map((node, i) => {
          const isCalculating = node.status === 'calculating';
          const isActive = node.status === 'active';
          return (
            <div 
              key={node.id}
              className={`p-2 rounded-lg border flex flex-col gap-1 transition-all relative overflow-hidden ${
                isCalculating 
                  ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/50 animate-pulse' 
                  : isActive 
                    ? 'bg-emerald-950/40 border-emerald-600/80 shadow-md shadow-emerald-950/40' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{node.icon}</span>
                <span className={`w-2 h-2 rounded-full ${
                  isCalculating ? 'bg-amber-400 animate-ping' : isActive ? 'bg-emerald-400' : 'bg-blue-500/50'
                }`} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[11px] text-white truncate">{node.name}</span>
                <span className="text-[9px] text-zinc-400 truncate">{node.role}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Checklist */}
      <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sub-Task Pipeline Checklist</span>
        <div className="space-y-1">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                {task.status === 'completed' ? (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                ) : task.status === 'processing' ? (
                  <RefreshCw size={12} className="text-amber-400 shrink-0 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-zinc-600 shrink-0" />
                )}
                <span className={task.status === 'completed' ? 'text-zinc-300' : 'text-white font-medium'}>{task.label}</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                {task.status === 'completed' ? '[100%]' : `${task.progress}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
