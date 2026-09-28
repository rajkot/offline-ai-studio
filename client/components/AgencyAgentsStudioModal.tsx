'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Code2,
  Shield,
  Palette,
  Terminal,
  Cpu,
  Layers,
  Bot,
  Zap,
  Check,
  Copy,
  Play,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  Filter,
  X,
  RefreshCw,
  Send,
  MessageSquare
} from 'lucide-react';
import { AgencyAgent, AgencyDivisionMeta } from '@/lib/ai/agencyAgentsEngine';

interface AgencyAgentsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgentForAutonomous?: (agentId: string) => void;
  onSelectAgentForComposer?: (agentId: string, systemPrompt: string) => void;
  onInsertToEditor?: (content: string) => void;
  activeFile?: string;
}

export default function AgencyAgentsStudioModal({
  isOpen,
  onClose,
  onSelectAgentForAutonomous,
  onSelectAgentForComposer,
  onInsertToEditor,
  activeFile = ''
}: AgencyAgentsStudioModalProps) {
  const [agents, setAgents] = useState<AgencyAgent[]>([]);
  const [divisions, setDivisions] = useState<Record<string, AgencyDivisionMeta>>({});
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgencyAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Live test playground state
  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testModel, setTestModel] = useState('qwen2.5:1.5b');
  const [activeTab, setActiveTab] = useState<'details' | 'prompt' | 'test'>('details');

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/agency-agents')
      .then(res => res.json())
      .then(data => {
        if (data.agents) {
          setAgents(data.agents);
          setDivisions(data.divisions || {});
          if (data.agents.length > 0 && !selectedAgent) {
            setSelectedAgent(data.agents[0]);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load agency agents catalog:', err);
        setLoading(false);
      });
  }, [isOpen]);

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      const matchesDiv = selectedDivision === 'all' || a.division.toLowerCase() === selectedDivision.toLowerCase();
      const matchesSearch = !searchQuery.trim() || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.vibe.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDiv && matchesSearch;
    });
  }, [agents, selectedDivision, searchQuery]);

  const handleCopyPrompt = () => {
    if (!selectedAgent) return;
    navigator.clipboard.writeText(selectedAgent.systemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleExecuteLiveTest = async () => {
    if (!selectedAgent || !testPrompt.trim() || isExecutingTest) return;
    setIsExecutingTest(true);
    setTestResponse('');

    try {
      const res = await fetch('/api/agency-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          agentId: selectedAgent.id,
          task: testPrompt,
          model: testModel,
          useOnlineAi: true
        })
      });

      const data = await res.json();
      if (data.response) {
        setTestResponse(data.response);
      } else if (data.error) {
        setTestResponse(`⚠️ Execution note: ${data.error}\n\nGenerated Persona Prompt:\n${data.promptBuilt || ''}`);
      }
    } catch (err: any) {
      setTestResponse(`❌ Error: ${err.message}`);
    } finally {
      setIsExecutingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-7xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Agency Agents Studio</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {agents.length} Sovereign Personas
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  Air-Gapped & Cloud Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Specialized AI roles with deep system prompts, domain philosophies, and autonomous rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64 sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by role, stack, vibe (e.g. SRE, Rust, Laravel)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Division Filter Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-zinc-800/80 bg-zinc-900/30 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedDivision('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedDivision === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Divisions ({agents.length})
          </button>
          {Object.entries(divisions).map(([key, div]) => {
            const count = agents.filter(a => a.division === key).length;
            if (count === 0) return null;
            const isSelected = selectedDivision === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedDivision(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-zinc-800 text-white border border-indigo-500/50 shadow-sm'
                    : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/60'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: div.color || '#6366F1' }}
                />
                <span>{div.label}</span>
                <span className="text-[10px] text-zinc-500 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area (Split Grid + Inspector) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Agent Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 border-r border-zinc-800/80">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-sm">Loading agency agents catalog...</span>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Bot className="w-12 h-12 text-zinc-600 mb-3" />
                <h3 className="text-sm font-semibold text-zinc-300">No matching agency agents found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Try adjusting your search keywords or clear division filters to explore the full catalog.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedDivision('all'); }}
                  className="mt-4 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAgents.map(agent => {
                  const isSelected = selectedAgent?.id === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                          : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl p-1.5 bg-zinc-800/80 rounded-lg group-hover:scale-110 transition-transform">
                              {agent.emoji || '🤖'}
                            </span>
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors leading-snug">
                                {agent.name}
                              </h3>
                              <span
                                className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded border mt-0.5"
                                style={{
                                  borderColor: `${agent.divisionColor}40`,
                                  color: agent.divisionColor,
                                  backgroundColor: `${agent.divisionColor}10`
                                }}
                              >
                                {agent.divisionLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Vibe / Tagline */}
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {agent.vibe || agent.description}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="font-mono text-[10px] truncate max-w-[140px]">
                          {agent.id}
                        </span>
                        <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
                          Inspect <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Agent Inspector & Dispatcher */}
          {selectedAgent ? (
            <div className="w-[450px] lg:w-[500px] flex flex-col bg-zinc-900/40 overflow-hidden">
              
              {/* Agent Detail Header */}
              <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border"
                      style={{
                        backgroundColor: `${selectedAgent.divisionColor}15`,
                        borderColor: `${selectedAgent.divisionColor}40`
                      }}
                    >
                      {selectedAgent.emoji || '🤖'}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white leading-tight">
                        {selectedAgent.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded border"
                          style={{
                            borderColor: `${selectedAgent.divisionColor}50`,
                            color: selectedAgent.divisionColor,
                            backgroundColor: `${selectedAgent.divisionColor}15`
                          }}
                        >
                          {selectedAgent.divisionLabel} Division
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {selectedAgent.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 mt-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed">
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase mb-0.5">Role & Persona Vibe</span>
                  {selectedAgent.vibe || selectedAgent.description}
                </p>

                {/* Sub Tabs */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      activeTab === 'details'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
                    }`}
                  >
                    Workflow Dispatch
                  </button>
                  <button
                    onClick={() => setActiveTab('prompt')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      activeTab === 'prompt'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
                    }`}
                  >
                    System Prompt
                  </button>
                  <button
                    onClick={() => setActiveTab('test')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      activeTab === 'test'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
                    }`}
                  >
                    Live Sandbox
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                        1-Click IDE Integration
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        
                        {/* Autonomous Agent Button */}
                        <button
                          onClick={() => {
                            if (onSelectAgentForAutonomous) {
                              onSelectAgentForAutonomous(selectedAgent.id);
                              onClose();
                            }
                          }}
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 hover:from-indigo-800/50 hover:to-purple-800/50 border border-indigo-500/40 rounded-xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-300">
                              <Bot className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-indigo-200">
                                Launch as Autonomous Agent
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                Run self-healing Devin-style loop using {selectedAgent.name}'s standards
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Agentic Composer Button */}
                        <button
                          onClick={() => {
                            if (onSelectAgentForComposer) {
                              onSelectAgentForComposer(selectedAgent.id, selectedAgent.systemPrompt);
                              onClose();
                            }
                          }}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 rounded-xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-600/30 text-purple-300">
                              <Code2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-purple-200">
                                Attach to Agentic Composer
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                Multi-file generation & refactoring driven by this persona
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Insert into active file */}
                        <button
                          onClick={() => {
                            if (onInsertToEditor) {
                              onInsertToEditor(`\n/* === AGENT INSTRUCTION: ${selectedAgent.name} ===\n * ${selectedAgent.vibe}\n */\n`);
                              onClose();
                            }
                          }}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 rounded-xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-600/30 text-emerald-300">
                              <Terminal className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-emerald-200">
                                Inject Persona into Active File
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                Insert agent header into {activeFile || 'current editor buffer'}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* File Path & Source */}
                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-xs space-y-1.5">
                      <div className="text-zinc-500 font-semibold text-[10px] uppercase">Agent Source Path</div>
                      <div className="font-mono text-zinc-300 text-[11px] break-all">
                        agency-agents/{selectedAgent.filePath}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'prompt' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">
                        System Prompt ({selectedAgent.systemPrompt.length} chars)
                      </span>
                      <button
                        onClick={handleCopyPrompt}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors"
                      >
                        {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                      {selectedAgent.systemPrompt}
                    </pre>
                  </div>
                )}

                {activeTab === 'test' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Test Persona Prompt
                      </label>
                      <textarea
                        rows={3}
                        placeholder={`Ask ${selectedAgent.name} to write code, review architecture, or plan a feature...`}
                        value={testPrompt}
                        onChange={e => setTestPrompt(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      onClick={handleExecuteLiveTest}
                      disabled={isExecutingTest || !testPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all shadow-md shadow-indigo-600/30"
                    >
                      {isExecutingTest ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating response with {selectedAgent.name}...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Execute with {selectedAgent.name}</span>
                        </>
                      )}
                    </button>

                    {testResponse && (
                      <div className="mt-3 space-y-1.5">
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase">
                          Agent Response Output
                        </div>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                          {testResponse}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
