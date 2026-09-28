"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Cpu,
  Brain,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Plus,
  Play,
  X,
  Database,
  Terminal,
  FileCode,
  Activity,
  SlidersHorizontal,
  ThumbsUp,
  Tag
} from "lucide-react";
import {
  rufloSwarmEngine,
  SwarmAgent,
  SwarmMemoryItem,
  SwarmExecutionPlan,
  SwarmTopology
} from "@/lib/ai/rufloSwarmEngine";

interface RufloSwarmStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  onApplyCodeToEditor?: (code: string) => void;
  onLaunchAutonomousAgent?: (prompt: string) => void;
}

export const RufloSwarmStudioModal: React.FC<RufloSwarmStudioModalProps> = ({
  isOpen,
  onClose,
  activeFilePath = "components/Playground.tsx",
  onApplyCodeToEditor,
  onLaunchAutonomousAgent
}) => {
  const [activeTab, setActiveTab] = useState<"swarm" | "dag" | "memory">("dag");
  const [agents, setAgents] = useState<SwarmAgent[]>(() => rufloSwarmEngine.getAgents());
  const [memories, setMemories] = useState<SwarmMemoryItem[]>(() => rufloSwarmEngine.getMemories());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopology, setSelectedTopology] = useState<SwarmTopology>("hierarchical");
  const [objectiveInput, setObjectiveInput] = useState(
    `Implement type-safe event broadcasting and error recovery in ${activeFilePath}`
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SwarmExecutionPlan | null>(null);

  // New Memory Modal Form
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState("");
  const [newMemContent, setNewMemContent] = useState("");
  const [newMemCategory, setNewMemCategory] = useState<SwarmMemoryItem["category"]>("architecture");
  const [newMemTags, setNewMemTags] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setAgents(rufloSwarmEngine.getAgents());
    setMemories(rufloSwarmEngine.getMemories());
  }, [isOpen]);

  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    return rufloSwarmEngine.searchMemories(searchQuery);
  }, [memories, searchQuery]);

  if (!isOpen) return null;

  const handleDispatchSwarm = async () => {
    if (!objectiveInput.trim() || isExecuting) return;
    setIsExecuting(true);
    try {
      const plan = rufloSwarmEngine.createSwarmPlan(objectiveInput, selectedTopology);
      setCurrentPlan(plan);
      const executed = await rufloSwarmEngine.executeSwarmPlan(plan.id, (task) => {
        setAgents(rufloSwarmEngine.getAgents());
        setCurrentPlan({ ...plan });
      });
      setCurrentPlan(executed);
      setAgents(rufloSwarmEngine.getAgents());
    } catch (err) {
      console.error("Swarm dispatch failed:", err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim() || !newMemContent.trim()) return;

    const item = rufloSwarmEngine.addMemory({
      title: newMemTitle.trim(),
      content: newMemContent.trim(),
      category: newMemCategory,
      tags: newMemTags.split(",").map((t) => t.trim()).filter(Boolean),
      confidence: 0.96
    });

    setMemories(rufloSwarmEngine.getMemories());
    setIsAddingMemory(false);
    setNewMemTitle("");
    setNewMemContent("");
    setNewMemTags("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f1117] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100">
        {/* Header */}
        <div className="p-4 bg-[#141824] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Users size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Ruflo Multi-Agent Swarm Harness
                </h2>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                  ruvnet/ruflo • v2.4
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  HNSW Vector Memory Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Coordinated sovereign agent fleets with consensus gating & cross-session adaptive memory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onLaunchAutonomousAgent) {
                  onLaunchAutonomousAgent(`Objective for Ruflo Swarm: ${objectiveInput}`);
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles size={13} />
              Launch as Autonomous Agent
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-4 py-2 bg-[#121520] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dag")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "dag"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Activity size={14} />
              Swarm Execution DAG
            </button>
            <button
              onClick={() => setActiveTab("swarm")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "swarm"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Cpu size={14} />
              Agent Fleet ({agents.length})
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "memory"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Brain size={14} />
              HNSW Vector Memory ({memories.length})
            </button>
          </div>

          {activeTab === "memory" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Semantic search memories..."
                  className="bg-zinc-900 border border-zinc-700/60 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 w-56 font-mono"
                />
              </div>
              <button
                onClick={() => setIsAddingMemory(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* TAB 1: SWARM EXECUTION DAG */}
          {activeTab === "dag" && (
            <div className="space-y-4">
              {/* Objective & Topology Bar */}
              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Zap size={14} className="text-cyan-400" /> Swarm Objective Dispatch
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-400">Topology:</span>
                    {(["hierarchical", "mesh", "consensus", "pipeline"] as SwarmTopology[]).map((top) => (
                      <button
                        key={top}
                        onClick={() => setSelectedTopology(top)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-all cursor-pointer ${
                          selectedTopology === top
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                            : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {top}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    placeholder="Enter target feature, refactor, or verification goal..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    onClick={handleDispatchSwarm}
                    disabled={isExecuting || !objectiveInput.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Orchestrating...
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" /> Dispatch Swarm
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Execution Progress & Task Nodes */}
              {currentPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-300">
                        Execution Plan: {currentPlan.id}
                      </span>
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono uppercase">
                        {currentPlan.status}
                      </span>
                    </div>
                    {currentPlan.summary && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 size={13} /> {currentPlan.summary}
                      </span>
                    )}
                  </div>

                  {/* Task Nodes DAG */}
                  <div className="space-y-2.5">
                    {currentPlan.tasks.map((task, idx) => {
                      const agent = agents.find((a) => a.role === task.assignedAgentRole);
                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            task.status === "completed"
                              ? "bg-emerald-950/10 border-emerald-500/30"
                              : task.status === "in-progress"
                              ? "bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-900/20 animate-pulse"
                              : "bg-zinc-900/40 border-zinc-800/80 opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{agent?.avatar || "🤖"}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-zinc-100">
                                    {idx + 1}. {task.title}
                                  </h4>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono capitalize">
                                    {task.assignedAgentRole}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate max-w-xl">
                                  {task.inputPrompt}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {task.executionTimeMs && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {task.executionTimeMs}ms
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                                  task.status === "completed"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : task.status === "in-progress"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                          </div>

                          {task.outputArtifact && (
                            <div className="mt-2.5 p-2 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-[11px] font-mono text-emerald-300">
                              {task.outputArtifact}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Consensus Gate Outcome */}
                  {currentPlan.consensus && (
                    <div className="p-4 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-500/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <ThumbsUp size={14} /> Multi-Agent Consensus Decision
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          Consensus Score: {currentPlan.consensus.consensusScore}% (APPROVED)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {currentPlan.consensus.votes.map((v) => (
                          <div
                            key={v.agentId}
                            className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-zinc-200 font-bold">{v.agentName}</span>
                              <span className="text-emerald-400">✓ {v.choice}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">{v.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl space-y-2">
                  <Activity size={32} className="mx-auto text-zinc-600" />
                  <p className="text-xs">No active execution plan.</p>
                  <p className="text-[11px] text-zinc-600">
                    Enter an objective and click <strong>Dispatch Swarm</strong> to execute multi-agent coordination.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AGENT FLEET */}
          {activeTab === "swarm" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{agent.avatar}</span>
                        <div>
                          <h3 className="text-xs font-bold text-white">{agent.name}</h3>
                          <span className="text-[10px] font-mono text-cyan-400 capitalize">
                            {agent.role}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                          agent.status === "working"
                            ? "bg-cyan-500/20 text-cyan-300 animate-pulse"
                            : agent.status === "done"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                      {agent.systemPrompt}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[9px] bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                      <span>Tokens: {agent.tokensProcessed}</span>
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: HNSW VECTOR MEMORY */}
          {activeTab === "memory" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono uppercase">
                          {mem.category}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          <span>Relevance: {(mem.confidence * 100).toFixed(0)}%</span>
                          <span>Hits: {mem.accessCount}</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-100">{mem.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {mem.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <div className="flex flex-wrap gap-1">
                        {mem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5"
                          >
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(mem.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMemories.length === 0 && (
                <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  No memories matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Memory Modal Dialog */}
        {isAddingMemory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#121520] border border-cyan-500/40 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Brain size={16} className="text-cyan-400" /> Add Knowledge Memory Item
                </h3>
                <button
                  onClick={() => setIsAddingMemory(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateMemory} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newMemTitle}
                    onChange={(e) => setNewMemTitle(e.target.value)}
                    placeholder="e.g., SQLite WAL Mode Concurrency Rule"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Category</label>
                  <select
                    value={newMemCategory}
                    onChange={(e) => setNewMemCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="architecture">Architecture</option>
                    <option value="convention">Convention</option>
                    <option value="bugfix">Bugfix</option>
                    <option value="decision">Decision</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Content / Rule</label>
                  <textarea
                    required
                    rows={3}
                    value={newMemContent}
                    onChange={(e) => setNewMemContent(e.target.value)}
                    placeholder="Explain the invariant, convention, or architectural constraint..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={newMemTags}
                    onChange={(e) => setNewMemTags(e.target.value)}
                    placeholder="sqlite, concurrency, database"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMemory(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
