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
  Workflow,
  Code2,
  Copy,
  Check,
  Send,
  FileCode,
  ArrowRight
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
  consensusCode?: string;
  specSummary?: string;
  debateLog?: Array<{ agent: string; avatar: string; message: string; timestamp: string }>;
}

interface SwarmTrackerPanelProps {
  onApplyConsensusCode?: (code: string) => void;
}

export default function SwarmTrackerPanel({ onApplyConsensusCode }: SwarmTrackerPanelProps) {
  const [data, setData] = useState<SwarmConsensus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoPolling, setAutoPolling] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'visual_graph' | 'table_roster' | 'consensus_code'>('visual_graph');
  const [selectedAgent, setSelectedAgent] = useState<SwarmAgentState | null>(null);
  const [promptInput, setPromptInput] = useState<string>('Implement a thread-safe token bucket rate limiter class with burst capacity');
  const [targetFileInput, setTargetFileInput] = useState<string>('lib/rateLimiter.ts');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);
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

  const launchTriadDebate = async (overridePrompt?: string) => {
    if (simulating) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/swarm/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'run_consensus',
          prompt: overridePrompt || promptInput,
          activeFile: targetFileInput
        })
      });
      if (res.ok) {
        const json: SwarmConsensus = await res.json();
        setData(json);
        if (json.consensusCode) {
          setViewMode('consensus_code');
        }
      }
    } catch (e) {
      console.error('Failed to run consensus session', e);
    } finally {
      setSimulating(false);
    }
  };

  const handleApplyCode = () => {
    if (data?.consensusCode && onApplyConsensusCode) {
      onApplyConsensusCode(data.consensusCode);
      setAppliedNotification(true);
      setTimeout(() => setAppliedNotification(false), 3000);
    }
  };

  const handleCopyCode = () => {
    if (data?.consensusCode) {
      navigator.clipboard.writeText(data.consensusCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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
  const consensusReached = (data?.consensusScore ?? 0) >= 80;

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
                Multi-Agent Consensus Swarm
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  Triad Engine v3.0
                </span>
              </h3>
              <p className="text-xs text-slate-400">Architect Specification ➔ Implementer Coder ➔ Adversarial Reviewer ➔ Security Auditor</p>
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
              <button
                onClick={() => setViewMode('consensus_code')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'consensus_code'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={13} />
                Consensus Code & Debate
                {data?.consensusCode && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
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
          </div>
        </div>

        {/* Interactive Feature Debate Launcher Bar */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center gap-2 shadow-inner">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300">
            <FileCode size={13} className="text-indigo-400 shrink-0" />
            <input
              type="text"
              value={targetFileInput}
              onChange={(e) => setTargetFileInput(e.target.value)}
              placeholder="target/file.ts"
              className="bg-transparent border-none outline-none text-slate-200 w-28 md:w-36 text-xs font-mono"
            />
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs">
            <Sparkles size={13} className="text-amber-400 shrink-0" />
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') launchTriadDebate();
              }}
              placeholder="Enter feature goal or refactoring prompt for agent consensus..."
              className="bg-transparent border-none outline-none text-slate-100 w-full placeholder-slate-500 text-xs"
            />
          </div>

          <button
            onClick={() => launchTriadDebate()}
            disabled={simulating}
            className="px-4 py-1.5 bg-linear-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {simulating ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Triad Deliberating...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Launch Triad Debate
              </>
            )}
          </button>
        </div>

        {/* Global Verdict Banner */}
        <div className="bg-slate-900 border border-indigo-900/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${consensusReached ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Swarm Consensus Verdict</div>
              <div className={`text-xs font-bold font-mono mt-0.5 ${consensusReached ? 'text-emerald-300' : 'text-amber-300'}`}>
                {data?.overallVerdict || '🟢 Triad ready for feature or refactoring prompt.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-sans">Consensus Score</div>
              <span className={`font-bold ${consensusReached ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data?.consensusScore ?? 0}%
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-sans">Total Tokens</div>
              <span className="text-indigo-300 font-bold">{data?.totalTokens?.toLocaleString() || '0'}</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-sans">Consensus Iteration</div>
              <span className="text-slate-200 font-bold">{data?.iteration || 1} / {data?.maxIterations || 4}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'visual_graph' ? (
        <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0 space-y-3">
          {data?.consensusCode && (
            <div className="bg-emerald-950/70 border border-emerald-700/60 rounded-xl p-3 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-200">
                  Adversarially Verified Code Available ({data.consensusCode.split('\n').length} lines).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('consensus_code')}
                  className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Code2 size={12} /> View Code & Debate
                </button>
                {onApplyConsensusCode && (
                  <button
                    onClick={handleApplyCode}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={12} /> Apply to Editor
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <SwarmVisualizer onApplyConsensusCode={onApplyConsensusCode} className="h-full" />
          </div>
        </div>
      ) : viewMode === 'consensus_code' ? (
        /* Consensus Code & Live Debate Timeline Tab */
        <div className="p-4 space-y-6 flex-1">
          {/* Header Action Bar for Code */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Code2 size={16} className="text-indigo-400" />
                Consensus Output Code Artifact
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {data?.consensusScore ?? 0}% Confidence
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <span className="font-mono text-indigo-300">{targetFileInput}</span> • Verified across 4 adversarial agent boundaries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>

              {onApplyConsensusCode && data?.consensusCode && (
                <button
                  onClick={handleApplyCode}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {appliedNotification ? <Check size={14} /> : <FileCheck size={14} />}
                  {appliedNotification ? 'Applied to Editor!' : 'Apply Code to Editor'}
                </button>
              )}
            </div>
          </div>

          {/* Architectural Spec from Architect Agent */}
          {data?.specSummary && (
            <div className="bg-slate-900 border border-indigo-950 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <span>🏗️</span> Architect Specification & Invariants
                </h5>
                <span className="text-[10px] font-mono text-slate-400">Phase 1 Output</span>
              </div>
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                {data.specSummary}
              </pre>
            </div>
          )}

          {/* Synthesized Code Viewer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <FileCode size={13} className="text-indigo-400" />
                {targetFileInput} ({data?.consensusCode ? data.consensusCode.split('\n').length : 0} lines)
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                TypeScript strict: zero any-types
              </span>
            </div>
            <div className="p-4 bg-slate-950/90 font-mono text-xs text-slate-200 overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed">
              {data?.consensusCode ? (
                <pre>{data.consensusCode}</pre>
              ) : (
                <div className="text-slate-500 py-8 text-center italic">
                  No consensus code generated yet. Click "Launch Triad Debate" above to synthesize and verify code.
                </div>
              )}
            </div>
          </div>

          {/* Adversarial Debate & Review Log Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-indigo-400" />
                Adversarial Triad Deliberation Timeline
              </h5>
              <span className="text-[10px] font-mono text-slate-400">
                {data?.debateLog?.length || 0} events logged
              </span>
            </div>

            <div className="space-y-2.5">
              {data?.debateLog && data.debateLog.length > 0 ? (
                data.debateLog.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 flex items-start gap-3">
                    <span className="text-lg p-1 bg-slate-900 rounded border border-slate-800 shrink-0">
                      {entry.avatar}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-300 font-mono">{entry.agent}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{entry.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed break-words">
                        {entry.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs italic py-4 text-center">
                  Agent deliberation messages will appear here during consensus sessions.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Worker Roster & Table Mode */
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
                Quorum: 3/4 Required (&ge; 80%)
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
                  className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
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
