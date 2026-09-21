'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SwarmVisualizer from '../client/components/SwarmVisualizer';
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Terminal, 
  Activity, 
  Layers, 
  Cpu, 
  Users, 
  Zap, 
  Sliders,
  CheckCircle,
  FileCheck,
  Workflow
} from 'lucide-react';

export interface SwarmAgentState {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'active' | 'idle' | 'failed' | 'completed';
  currentTask: string;
  progress: number;
  score: number;
  vote: 'approved' | 'rejected' | 'needs_revision' | 'pending';
  lastLog: string;
  executionTimeMs: number;
  tokensUsed: number;
}

export interface SwarmConsensus {
  overallVerdict: string;
  consensusScore: number;
  status: 'agreed' | 'debating' | 'failed' | 'idle';
  totalTokens: number;
  iteration: number;
  maxIterations: number;
  agents: SwarmAgentState[];
}

interface SwarmTrackerPanelProps {
  onApplyConsensusCode?: (code: string) => void;
}

export default function SwarmTrackerPanel({ onApplyConsensusCode }: SwarmTrackerPanelProps) {
  const [data, setData] = useState<SwarmConsensus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoPolling, setAutoPolling] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'visual_graph' | 'table_roster'>('visual_graph');
  const [selectedAgent, setSelectedAgent] = useState<SwarmAgentState | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSwarmStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/swarm/status');
      if (res.ok) {
        const json: SwarmConsensus = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch swarm status', e);
    }
  }, []);

  const triggerSwarmStep = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/swarm/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_step' })
      });
      if (res.ok) {
        const json: SwarmConsensus = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to trigger swarm step', e);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      setLoading(true);
      await fetchSwarmStatus();
      if (isMounted) setLoading(false);
    };
    initialLoad();

    return () => {
      isMounted = false;
    };
  }, [fetchSwarmStatus]);

  useEffect(() => {
    if (!autoPolling) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(() => {
      fetchSwarmStatus();
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoPolling, fetchSwarmStatus]);

  const getVoteBadge = (vote: SwarmAgentState['vote']) => {
    switch (vote) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/80 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'needs_revision':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded-full">
            <AlertTriangle size={12} /> Revision Needed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/80 border border-red-700/80 px-2 py-0.5 rounded-full">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  const getStatusIndicator = (status: SwarmAgentState['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <CheckCircle size={12} className="text-blue-400" />
            Done
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"></span>
            Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-600 inline-block"></span>
            Idle
          </span>
        );
    }
  };

  const agents = data?.agents || [];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans select-none overflow-y-auto">
      {/* Top Banner Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Multi-Agent Swarm Tracker
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  Parallel Engine v3.0
                </span>
              </h3>
              <p className="text-xs text-slate-400">Real-time telemetry, task synthesis, and consensus matrix verification.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('visual_graph')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'visual_graph'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Workflow size={13} />
                Visual Triad Graph
              </button>
              <button
                onClick={() => setViewMode('table_roster')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table_roster'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users size={13} />
                Worker Roster
              </button>
            </div>

            <button
              onClick={() => setAutoPolling(!autoPolling)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoPolling 
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={13} className={autoPolling ? 'animate-pulse' : ''} />
              {autoPolling ? 'Live: ON' : 'Paused'}
            </button>
            <button
              onClick={triggerSwarmStep}
              disabled={simulating}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={simulating ? 'animate-spin' : ''} />
              Step Consensus
            </button>
          </div>
        </div>

        {/* Global Verdict Banner */}
        <div className="bg-slate-900 border border-indigo-900/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Swarm Consensus Verdict</div>
              <div className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                {data?.overallVerdict || '🟢 Consolidating Worker Outputs...'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-sans">Total Swarm Tokens</div>
              <span className="text-indigo-300 font-bold">{data?.totalTokens.toLocaleString() || '9,490'}</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-sans">Consensus Iteration</div>
              <span className="text-slate-200 font-bold">{data?.iteration || 2} / {data?.maxIterations || 5}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'visual_graph' ? (
        <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
          <SwarmVisualizer onApplyConsensusCode={onApplyConsensusCode} className="h-full" />
        </div>
      ) : (
        <div className="p-4 space-y-6 flex-1">
        {/* Specialized Worker Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <Users size={14} className="text-indigo-400" />
              Specialized Worker Agents ({agents.length})
            </h4>
            <span className="text-[11px] text-slate-400">Click any card to inspect agent logs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`bg-slate-900 border rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:border-indigo-500/60 ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900/90' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1 bg-slate-950 rounded-lg border border-slate-800">{agent.avatar}</span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-100">{agent.name}</h5>
                        <p className="text-[10px] text-slate-400">{agent.role}</p>
                      </div>
                    </div>
                    <div>
                      {getStatusIndicator(agent.status)}
                    </div>
                  </div>

                  {/* Task Description */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 mb-3">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Subtask:</div>
                    <div className="text-xs text-slate-200 font-mono mt-0.5 truncate">{agent.currentTask}</div>
                  </div>

                  {/* Progress Bar & Quality Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-indigo-400 font-bold">{agent.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-linear-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-slate-400">Score:</span>
                      <span className="font-bold text-emerald-400">{(agent.score * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      {getVoteBadge(agent.vote)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Consensus Matrix Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs uppercase font-bold text-slate-200 tracking-wider flex items-center gap-2">
              <Layers size={15} className="text-indigo-400" />
              Consensus Verification Matrix
            </h4>
            <span className="text-[11px] font-mono text-indigo-300 font-semibold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              Quorum: 3/4 Required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase font-sans">
                  <th className="pb-2 font-bold">Agent Name</th>
                  <th className="pb-2 font-bold">Quality Metric</th>
                  <th className="pb-2 font-bold">Confidence Bar</th>
                  <th className="pb-2 font-bold">Vote Status</th>
                  <th className="pb-2 font-bold text-right">Tokens / Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{agent.avatar}</span> {agent.name}
                    </td>
                    <td className="py-2.5 text-emerald-400 font-bold">
                      {agent.score.toFixed(2)} / 1.00
                    </td>
                    <td className="py-2.5 w-32">
                      <div className="h-1.5 w-24 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${agent.score * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5">
                      {getVoteBadge(agent.vote)}
                    </td>
                    <td className="py-2.5 text-right text-slate-400 text-[11px]">
                      {agent.tokensUsed.toLocaleString()} tok <span className="text-slate-600">|</span> {agent.executionTimeMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Agent Inspector Drawer / Log Viewer */}
        {selectedAgent && (
          <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedAgent.avatar}</span>
                <div>
                  <h5 className="font-bold text-xs text-slate-100 font-mono">{selectedAgent.name} Execution Trace</h5>
                  <span className="text-[10px] text-slate-400">{selectedAgent.role}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Terminal size={13} className="text-indigo-400" />
                Latest Output Stream / Invariant Log:
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed break-all">
                $ [AGENT_LOG] {selectedAgent.lastLog}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Latency</div>
                <div className="font-bold text-slate-200">{selectedAgent.executionTimeMs} ms</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Tokens Generated</div>
                <div className="font-bold text-indigo-300">{selectedAgent.tokensUsed.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Calculated Score</div>
                <div className="font-bold text-emerald-400">{selectedAgent.score.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
