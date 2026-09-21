'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Cpu,
  Bot,
  ShieldCheck,
  Code2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  Zap,
  Activity,
  Terminal,
  FileCheck,
  Check,
  Copy,
  ChevronRight,
  Shield,
  Gauge,
  Workflow,
  Lock,
  RefreshCw,
  GitMerge,
  Eye
} from 'lucide-react';

export interface SwarmNodeAgent {
  id: string;
  order: number;
  name: string;
  role: string;
  type: 'generator' | 'reviewer' | 'auditor';
  avatar: string;
  status: 'idle' | 'active' | 'debating' | 'completed' | 'failed';
  progress: number;
  confidenceScore: number; // 0 - 100
  vote: 'approved' | 'needs_revision' | 'rejected' | 'pending';
  currentTask: string;
  activeSnippet?: string;
  logs: string[];
  executionTimeMs: number;
  tokensConsumed: number;
  checksPassed: string[];
}

export interface SwarmWorkflowState {
  workflowId: string;
  title: string;
  status: 'running' | 'consensus_reached' | 'debating' | 'idle' | 'revision_requested';
  overallScore: number;
  requiredConsensusThreshold: number;
  currentIteration: number;
  maxIterations: number;
  totalTokens: number;
  totalLatencyMs: number;
  orchestrationMode: 'parallel_swarm' | 'sequential_pipeline' | 'low_vram_staggered';
  agents: SwarmNodeAgent[];
  consolidatedOutput: {
    code: string;
    summary: string;
    securityPassed: boolean;
    reviewPassed: boolean;
    generatedASTNodes: number;
  };
}

const INITIAL_SWARM_STATE: SwarmWorkflowState = {
  workflowId: 'swarm-exec-904',
  title: 'Autonomous Multi-Agent Consensus Workflow',
  status: 'consensus_reached',
  overallScore: 94,
  requiredConsensusThreshold: 85,
  currentIteration: 2,
  maxIterations: 5,
  totalTokens: 9480,
  totalLatencyMs: 2310,
  orchestrationMode: 'parallel_swarm',
  agents: [
    {
      id: 'agent-1-generator',
      order: 1,
      name: 'Agent 1: Code Generator',
      role: 'Syntactic Generation & AST Assembly',
      type: 'generator',
      avatar: '💻',
      status: 'completed',
      progress: 100,
      confidenceScore: 96,
      vote: 'approved',
      currentTask: 'Generated full TypeScript component with typed props & memoization',
      activeSnippet: `export const MultiAgentDashboard = memo(function MultiAgentDashboard({ data }) {\n  const [state, setState] = useState(() => initializeState(data));\n  return <div className="grid grid-cols-3 gap-4">{/* Safe AST */}</div>;\n});`,
      logs: [
        'Parsed user prompt and partitioned intent into typed AST nodes.',
        'Synthesized React App Router component tree with zero any-types.',
        'Applied React.memo and primitive dependency arrays for render safety.'
      ],
      executionTimeMs: 920,
      tokensConsumed: 4320,
      checksPassed: ['Strict TypeScript Validation', 'Component Composition Check', 'JSX Syntactic Validity']
    },
    {
      id: 'agent-2-reviewer',
      order: 2,
      name: 'Agent 2: Code Reviewer',
      role: 'Logical Invariant & Render Idempotence',
      type: 'reviewer',
      avatar: '🔍',
      status: 'completed',
      progress: 100,
      confidenceScore: 92,
      vote: 'approved',
      currentTask: 'Validated hook order, dependency arrays, and state purity',
      activeSnippet: `// Invariant Analysis: Zero cyclomatic complexity violations found.\n// Render Purity: Idempotent state transitions verified via symbol table.\n// Memoization ratio: 100% stable hooks.`,
      logs: [
        'Inspected React useEffect dependency array; verified zero unbound references.',
        'Cyclomatic complexity index: 3.2 (Well below threshold 10.0).',
        'State transition idempotence confirmed; zero infinite re-render paths.'
      ],
      executionTimeMs: 740,
      tokensConsumed: 2680,
      checksPassed: ['Hook Order & Rules of Hooks', 'Memory Leak Prevention', 'Zero Cyclic Re-renders']
    },
    {
      id: 'agent-3-auditor',
      order: 3,
      name: 'Agent 3: Security Auditor',
      role: 'AST Safety, Sanitization & Defense',
      type: 'auditor',
      avatar: '🛡️',
      status: 'completed',
      progress: 100,
      confidenceScore: 98,
      vote: 'approved',
      currentTask: 'Audited against XSS, prototype pollution, and unchecked dynamic eval',
      activeSnippet: `// Security Assertion Report:\n// - Dynamic eval: 0 detected\n// - Unescaped innerHTML: 0 detected\n// - External telemetry leaks: NONE (Strict local runtime)`,
      logs: [
        'Audited AST for dangerouslySetInnerHTML and direct DOM manipulation: Clean.',
        'Checked input string sanitization across all reactive props: Passed.',
        'Cryptographic checksum of synthesized AST validated: SHA-256 matched.'
      ],
      executionTimeMs: 650,
      tokensConsumed: 2480,
      checksPassed: ['Zero Injection Vectors', 'Safe DOM Traversal', 'Strict Local Isolation (Zero API Leaks)']
    }
  ],
  consolidatedOutput: {
    code: `// Multi-Agent Swarm Verified Consensus Artifact\n// Generated by: Code Generator -> Reviewed by: Code Reviewer -> Verified by: Security Auditor\n\nimport React, { useState, useEffect, useMemo, memo } from 'react';\n\nexport interface VerifiedModuleProps {\n  endpoint?: string;\n  isLowResourceMode?: boolean;\n}\n\nexport const AutonomousConsensusView = memo(function AutonomousConsensusView({\n  endpoint = '/api/swarm',\n  isLowResourceMode = false\n}: VerifiedModuleProps) {\n  const [metrics, setMetrics] = useState({ latency: 24, status: 'stable' });\n\n  const isOptimal = useMemo(() => metrics.latency < 50, [metrics.latency]);\n\n  return (\n    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">\n      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">\n        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />\n        CONSENSUS ATTESTATION: 94% APPROVAL\n      </div>\n      <p className="text-xs text-zinc-400 mt-2 font-sans">\n        All 3 agents (Generator, Reviewer, Auditor) reached unanimous convergence in 2.31s.\n      </p>\n    </div>\n  );\n});`,
    summary: 'Unanimous 3/3 Swarm Approval (94% Consensus Score). Generated clean React TypeScript component with zero cyclomatic issues and verified local security isolation.',
    securityPassed: true,
    reviewPassed: true,
    generatedASTNodes: 48
  }
};

interface SwarmVisualizerProps {
  onApplyConsensusCode?: (code: string) => void;
  className?: string;
}

export default function SwarmVisualizer({
  onApplyConsensusCode,
  className = ''
}: SwarmVisualizerProps) {
  const [workflow, setWorkflow] = useState<SwarmWorkflowState>(INITIAL_SWARM_STATE);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-1-generator');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'code' | 'logs' | 'matrix'>('graph');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [pulseTick, setPulseTick] = useState<number>(0);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation ticker for graph edges
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 100);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const selectedAgent = useMemo(() => {
    return workflow.agents.find((a) => a.id === selectedAgentId) || workflow.agents[0];
  }, [workflow.agents, selectedAgentId]);

  // Simulate Swarm Execution Cycle
  const runSwarmSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Step 1: Set Workflow to running, Agent 1 active, others pending/idle
    setWorkflow((prev) => ({
      ...prev,
      status: 'running',
      currentIteration: (prev.currentIteration % prev.maxIterations) + 1,
      agents: [
        {
          ...prev.agents[0],
          status: 'active',
          progress: 35,
          vote: 'pending',
          currentTask: 'Generating typed AST component specification...'
        },
        {
          ...prev.agents[1],
          status: 'idle',
          progress: 0,
          vote: 'pending',
          currentTask: 'Waiting for Code Generator AST emission...'
        },
        {
          ...prev.agents[2],
          status: 'idle',
          progress: 0,
          vote: 'pending',
          currentTask: 'Security sandbox standing by...'
        }
      ]
    }));

    // Step 2: Code Generator finishes -> Code Reviewer starts
    setTimeout(() => {
      setWorkflow((prev) => ({
        ...prev,
        agents: [
          {
            ...prev.agents[0],
            status: 'completed',
            progress: 100,
            vote: 'approved',
            confidenceScore: 95 + Math.floor(Math.random() * 4),
            currentTask: 'AST emission complete (48 typed nodes generated)'
          },
          {
            ...prev.agents[1],
            status: 'active',
            progress: 50,
            vote: 'pending',
            currentTask: 'Analyzing React render invariants and state cycles...'
          },
          {
            ...prev.agents[2],
            status: 'idle',
            progress: 0,
            vote: 'pending'
          }
        ]
      }));
    }, 1100);

    // Step 3: Code Reviewer finishes -> Security Auditor starts
    setTimeout(() => {
      setWorkflow((prev) => ({
        ...prev,
        agents: [
          prev.agents[0],
          {
            ...prev.agents[1],
            status: 'completed',
            progress: 100,
            vote: 'approved',
            confidenceScore: 92 + Math.floor(Math.random() * 5),
            currentTask: 'Review complete: 0 cyclic dependencies, 100% hook stability'
          },
          {
            ...prev.agents[2],
            status: 'active',
            progress: 65,
            vote: 'pending',
            currentTask: 'Performing AST security vulnerability audit...'
          }
        ]
      }));
    }, 2200);

    // Step 4: Security Auditor finishes -> Final Consensus Computed
    setTimeout(() => {
      const gScore = 96;
      const rScore = 93;
      const aScore = 98;
      const avg = Math.round((gScore + rScore + aScore) / 3);

      setWorkflow((prev) => ({
        ...prev,
        status: 'consensus_reached',
        overallScore: avg,
        totalTokens: prev.totalTokens + 1850,
        totalLatencyMs: 2310 + Math.floor(Math.random() * 300),
        agents: [
          prev.agents[0],
          prev.agents[1],
          {
            ...prev.agents[2],
            status: 'completed',
            progress: 100,
            vote: 'approved',
            confidenceScore: aScore,
            currentTask: 'Security audit passed: 0 vulnerabilities detected'
          }
        ]
      }));
      setIsSimulating(false);
    }, 3300);
  };

  const handleCopyCode = () => {
    if (!workflow.consolidatedOutput?.code) return;
    navigator.clipboard.writeText(workflow.consolidatedOutput.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getAgentStatusBadge = (status: SwarmNodeAgent['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Executing
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={11} />
            Completed
          </span>
        );
      case 'debating':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full">
            <AlertTriangle size={11} />
            Debating
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
            Idle
          </span>
        );
    }
  };

  const getVotePill = (vote: SwarmNodeAgent['vote']) => {
    switch (vote) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-700 px-2 py-0.5 rounded">
            <Check size={11} strokeWidth={3} /> Approved
          </span>
        );
      case 'needs_revision':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/90 border border-amber-700 px-2 py-0.5 rounded">
            <AlertTriangle size={11} /> Revision Needed
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/90 border border-rose-700 px-2 py-0.5 rounded">
            <XCircle size={11} /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            Pending Vote
          </span>
        );
    }
  };

  return (
    <div
      id="swarm-visualizer-container"
      className={`flex flex-col h-full bg-[#09090b] text-[#f4f4f5] border border-zinc-800 rounded-xl overflow-hidden select-none font-sans ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-950/90 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-950/50 border border-purple-900 text-purple-400 rounded-lg shadow-sm">
            <Workflow size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight font-mono">
                Parallel Swarm Consensus Engine
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800/80 rounded-full">
                3-Agent Triad
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Agent 1: Code Generator → Agent 2: Code Reviewer → Agent 3: Security Auditor
            </p>
          </div>
        </div>

        {/* Global Action & Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-trigger-swarm-step"
            onClick={runSwarmSimulation}
            disabled={isSimulating}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer shadow-sm ${
              isSimulating
                ? 'bg-purple-950/60 text-purple-400 border border-purple-800 cursor-not-allowed animate-pulse'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/40'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Orchestrating Swarm...</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Trigger Swarm Triad</span>
              </>
            )}
          </button>

          {onApplyConsensusCode && workflow.consolidatedOutput?.code && (
            <button
              id="btn-apply-consensus-code"
              onClick={() => onApplyConsensusCode(workflow.consolidatedOutput.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-zinc-100 text-black rounded-lg transition-all cursor-pointer"
            >
              <FileCheck size={13} strokeWidth={2.5} />
              <span>Apply to Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Consensus Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-2.5 bg-[#101014] border-b border-zinc-800/80 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Gauge size={15} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Consensus Score
            </div>
            <div className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
              <span>{workflow.overallScore}%</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                (≥{workflow.requiredConsensusThreshold}% req)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/50 flex items-center justify-center text-indigo-400 shrink-0">
            <GitMerge size={15} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Swarm State
            </div>
            <div className="text-sm font-bold text-zinc-200 capitalize flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  workflow.status === 'consensus_reached'
                    ? 'bg-emerald-400'
                    : workflow.status === 'running'
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {workflow.status.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0">
            <Zap size={15} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Tokens / Latency
            </div>
            <div className="text-xs font-bold text-zinc-300">
              {workflow.totalTokens.toLocaleString()} tok · {(workflow.totalLatencyMs / 1000).toFixed(2)}s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <Layers size={15} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Cycle Iteration
            </div>
            <div className="text-xs font-bold text-zinc-300">
              Round {workflow.currentIteration} of {workflow.maxIterations}
            </div>
          </div>
        </div>
      </div>

      {/* Main Execution Body: Visual Graph + Details Explorer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Visual Graph & Agent Pipeline Nodes */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-[#0a0a0d]">
          {/* Subheader & Navigation Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Workflow size={13} className="text-purple-400" />
              Visual Swarm Execution Graph
            </span>
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-colors ${
                  activeTab === 'graph' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Graph
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-colors ${
                  activeTab === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Output Code
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-colors ${
                  activeTab === 'matrix' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Consensus Matrix
              </button>
            </div>
          </div>

          {/* TAB 1: VISUAL EXECUTION GRAPH NODES */}
          {activeTab === 'graph' && (
            <div className="space-y-4">
              {/* Connected Step Pipeline */}
              <div className="space-y-3 relative">
                {workflow.agents.map((agent, index) => {
                  const isSelected = selectedAgentId === agent.id;
                  const isLast = index === workflow.agents.length - 1;

                  return (
                    <div key={agent.id} className="relative">
                      {/* Node Card */}
                      <div
                        id={`swarm-agent-card-${agent.id}`}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-zinc-900 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.12)]'
                            : 'bg-[#121216] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                      >
                        {/* Top Node Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg select-none">
                              {agent.avatar}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-zinc-100 font-mono">
                                  {agent.name}
                                </h4>
                                {getAgentStatusBadge(agent.status)}
                              </div>
                              <p className="text-[11px] text-zinc-400 font-sans">{agent.role}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getVotePill(agent.vote)}
                            <div className="text-right font-mono">
                              <span className="text-xs font-black text-purple-400">
                                {agent.confidenceScore}%
                              </span>
                              <span className="block text-[9px] text-zinc-500 uppercase font-bold">
                                Conf
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Current Task Readout */}
                        <div className="mt-2.5 px-3 py-1.5 bg-black/40 border border-zinc-850 rounded-lg text-[11px] font-mono text-zinc-300 flex items-center justify-between gap-2">
                          <span className="truncate">{agent.currentTask}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0">
                            {agent.executionTimeMs}ms · {agent.tokensConsumed} tok
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2.5 w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                          <div
                            className={`h-full transition-all duration-500 ${
                              agent.status === 'completed'
                                ? 'bg-emerald-500'
                                : agent.status === 'active'
                                ? 'bg-cyan-400'
                                : 'bg-purple-500'
                            }`}
                            style={{ width: `${agent.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Animated Connector Arrow to next agent */}
                      {!isLast && (
                        <div className="flex items-center justify-center my-1.5 text-zinc-600">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900/80 border border-zinc-800/80 rounded-full text-[10px] font-mono text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                            <span>AST Handshake</span>
                            <ArrowRight size={10} className="text-purple-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Consensus Terminal Output Banner */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-950 border border-emerald-700 text-emerald-400 rounded-lg">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300 font-mono">
                      Swarm Consensus Verified (94%)
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Unanimous agreement reached across Code Generation, Review & AST Safety.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('code')}
                  className="px-3 py-1 text-xs font-mono font-bold bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-lg cursor-pointer transition-colors"
                >
                  View Code
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONSOLIDATED CODE ARTIFACT */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">
                  Consolidated Swarm Artifact · TypeScript
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md cursor-pointer transition-colors"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[360px] custom-scrollbar">
                <code>{workflow.consolidatedOutput.code}</code>
              </pre>
            </div>
          )}

          {/* TAB 3: CONSENSUS MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-3">
              <div className="overflow-hidden border border-zinc-800 rounded-xl bg-zinc-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="px-3 py-2">Agent Name</th>
                      <th className="px-3 py-2">Verdict</th>
                      <th className="px-3 py-2">Confidence</th>
                      <th className="px-3 py-2">Execution</th>
                      <th className="px-3 py-2">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {workflow.agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-zinc-900/40">
                        <td className="px-3 py-2.5 font-bold text-zinc-200 flex items-center gap-1.5">
                          <span>{agent.avatar}</span>
                          <span>{agent.name}</span>
                        </td>
                        <td className="px-3 py-2.5">{getVotePill(agent.vote)}</td>
                        <td className="px-3 py-2.5 font-black text-purple-400">
                          {agent.confidenceScore}%
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">{agent.executionTimeMs}ms</td>
                        <td className="px-3 py-2.5 text-zinc-400">{agent.tokensConsumed} tok</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Selected Agent Telemetry & Log Explorer */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-[#0d0d10] p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Terminal size={13} className="text-indigo-400" />
              Agent Telemetry & Logs
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              ID: {selectedAgent.id}
            </span>
          </div>

          {/* Selected Agent Identity Card */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{selectedAgent.avatar}</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-100 font-mono">
                  {selectedAgent.name}
                </h4>
                <p className="text-[11px] text-zinc-400">{selectedAgent.role}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Vote Status:</span>
              <span>{getVotePill(selectedAgent.vote)}</span>
            </div>
          </div>

          {/* Verification Checks Passed */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Enforced Agent Assertions
            </span>
            <div className="space-y-1.5">
              {selectedAgent.checksPassed.map((chk, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 font-sans"
                >
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{chk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Agent Execution Stream Logs */}
          <div className="space-y-2 flex-1 flex flex-col min-h-[160px]">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Execution Logs & Thought Stream
            </span>
            <div className="flex-1 bg-black/60 border border-zinc-850 rounded-xl p-3 font-mono text-[11px] space-y-1.5 text-zinc-400 overflow-y-auto custom-scrollbar">
              {selectedAgent.logs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5">
                  <span className="text-purple-500 select-none font-bold">›</span>
                  <span className="text-zinc-300">{log}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-zinc-600 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px]">Attestation signature verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
