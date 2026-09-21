'use client';
import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, Clock, Activity } from 'lucide-react';

export default function TelemetryPanel() {
  const [data, setData] = useState({ cpu: 28.4, ram: 42.1, tps: 34.8, lat: 85, totalTokens: 1420 });

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        cpu: Math.min(100, Math.max(12, +(prev.cpu + (Math.random() * 8 - 4)).toFixed(1))),
        ram: Math.min(100, Math.max(25, +(prev.ram + (Math.random() * 4 - 2)).toFixed(1))),
        tps: Math.min(60, Math.max(15, +(prev.tps + (Math.random() * 6 - 3)).toFixed(1))),
        lat: Math.min(250, Math.max(40, Math.round(prev.lat + (Math.random() * 14 - 7)))),
        totalTokens: prev.totalTokens + Math.floor(Math.random() * 4)
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-3 space-y-3 font-sans text-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Cpu size={13} className="text-indigo-400" />
              Node.js CPU Usage
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">{data.cpu}%</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 flex items-center justify-center text-[10px] font-mono text-indigo-400">
            {Math.round(data.cpu)}%
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <HardDrive size={13} className="text-emerald-400" />
              Process RAM
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">{data.ram}%</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 flex items-center justify-center text-[10px] font-mono text-emerald-400">
            {Math.round(data.ram)}%
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Zap size={13} className="text-amber-400" />
              Inference Speed
            </div>
            <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">{data.tps} <span className="text-xs font-normal text-slate-400">tok/s</span></div>
          </div>
          <div className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            Active
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={13} className="text-purple-400" />
              RAG Vector Latency
            </div>
            <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">{data.lat} <span className="text-xs font-normal text-slate-400">ms</span></div>
          </div>
          <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
            Cosine
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-slate-300">Background Worker Threads: <strong className="text-white font-mono">4 Active</strong></span>
        </div>
        <div className="text-slate-400 font-mono">
          Session Tokens Generated: <strong className="text-emerald-400 font-bold">{data.totalTokens}</strong>
        </div>
      </div>
    </div>
  );
}
