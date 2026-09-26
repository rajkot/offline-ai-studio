'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
  Brain,
  Code2,
  Copy,
  Terminal,
  Send,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  BookOpen,
  GitBranch,
  Bot,
  HelpCircle,
  FileCode,
  Flame,
  Check,
  Play
} from 'lucide-react';

export interface SuperpowerSkill {
  id: string;
  name: string;
  description: string;
  category: 'workflow' | 'quality' | 'collaboration' | 'infrastructure';
  stage: number;
  stageName: string;
  icon: string;
  content?: string;
}

interface SuperpowersStudioPanelProps {
  onOpenFile?: (path: string) => void;
  onSendToChat?: (prompt: string) => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
}

export default function SuperpowersStudioPanel({
  onOpenFile,
  onSendToChat,
  workspaceFiles = {},
  activeFile = 'components/Playground.tsx'
}: SuperpowersStudioPanelProps) {
  const [skills, setSkills] = useState<SuperpowerSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('brainstorming');
  const [selectedSkillContent, setSelectedSkillContent] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [customTaskPrompt, setCustomTaskPrompt] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const METHODOLOGY_STAGES = [
    {
      stage: 1,
      title: 'Brainstorm & Clarify',
      icon: '💡',
      skillId: 'brainstorming',
      summary: 'Socratic clarification & specification drafting before code writing.',
      defaultPrompt: `Using superpowers:brainstorming, please interview me to clarify the specifications and user experience for: `
    },
    {
      stage: 2,
      title: 'Architect & Plan',
      icon: '📋',
      skillId: 'writing-plans',
      summary: 'Decompose feature into bite-sized testable units following DRY & YAGNI.',
      defaultPrompt: `Using superpowers:writing-plans, formulate a step-by-step phased engineering plan with red/green testing milestones for: `
    },
    {
      stage: 3,
      title: 'Red-Green-Refactor TDD',
      icon: '🧪',
      skillId: 'test-driven-development',
      summary: 'Enforce failing tests first before writing minimal passing implementation code.',
      defaultPrompt: `Using superpowers:test-driven-development, write a failing unit test first for the current functionality in ${activeFile}: `
    },
    {
      stage: 4,
      title: 'Subagent Execution',
      icon: '🤖',
      skillId: 'subagent-driven-development',
      summary: 'Dispatch autonomous subagent tasks with automated progress verification.',
      defaultPrompt: `Using superpowers:subagent-driven-development and superpowers:executing-plans, execute the pending tasks for: `
    },
    {
      stage: 5,
      title: 'Hypothesis Debugging',
      icon: '🔍',
      skillId: 'systematic-debugging',
      summary: 'Disciplined 4-phase root-cause analysis rather than trial-and-error edits.',
      defaultPrompt: `Using superpowers:systematic-debugging, investigate this issue without guessing or speculative patches: `
    },
    {
      stage: 6,
      title: 'Code Review & Audit',
      icon: '🛡️',
      skillId: 'requesting-code-review',
      summary: 'Automated adversarial code review inspecting security invariants and logic.',
      defaultPrompt: `Using superpowers:requesting-code-review, perform an adversarial code review on the latest edits in ${activeFile}: `
    },
    {
      stage: 7,
      title: 'Branch Finish & Ship',
      icon: '🚀',
      skillId: 'finishing-a-development-branch',
      summary: 'Pre-completion validation, test suite confirmation, and clean commit packaging.',
      defaultPrompt: `Using superpowers:verification-before-completion and superpowers:finishing-a-development-branch, verify all tests pass and finalize this branch: `
    }
  ];

  // Fetch installed skills on mount
  useEffect(() => {
    fetch('/api/superpowers')
      .then(res => res.json())
      .then(data => {
        if (data.skills) {
          setSkills(data.skills);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Fetch specific skill content when selected
  useEffect(() => {
    if (!selectedSkillId) return;
    fetch(`/api/superpowers?skill=${selectedSkillId}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setSelectedSkillContent(data.content);
        }
      })
      .catch(() => {});
  }, [selectedSkillId]);

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [skills, selectedCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLaunchStage = (stageObj: typeof METHODOLOGY_STAGES[0]) => {
    const promptToSend = stageObj.defaultPrompt + (customTaskPrompt.trim() ? customTaskPrompt.trim() : 'our active feature implementation');
    if (onSendToChat) {
      onSendToChat(promptToSend);
      setActionNotice(`🚀 Dispatched "${stageObj.title}" to AI Assistant`);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0f] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Superpowers Banner */}
      <div className="p-4 bg-linear-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border-b border-indigo-500/20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                  Superpowers Methodology Engine
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    obra/superpowers
                  </span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Disciplined agentic engineering: Socratic spec brainstorming, red/green TDD, subagents, root-cause debugging, &amp; code reviews.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-[11px] font-mono text-indigo-300 font-semibold">15 Autonomous Skills Active</div>
              <div className="text-[10px] text-zinc-500">Installed in .agents/skills/</div>
            </div>
            <button
              onClick={() => {
                const prompt = `Using superpowers:using-superpowers, assess the current workspace state and outline which methodology skill should be applied next.`;
                if (onSendToChat) onSendToChat(prompt);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Evaluate Skills</span>
            </button>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-950/90 border-b border-emerald-600/40 text-emerald-200 px-4 py-2 text-xs flex items-center justify-between shrink-0 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Check AI Assistant tab</span>
        </div>
      )}

      {/* Main Content: Pipeline Visualizer + Skills Grid */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Side: 7-Stage Methodology Flow & Quick Dispatcher */}
        <div className="w-full md:w-96 lg:w-[420px] border-r border-[#27272a] bg-[#0c0c12] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#27272a] flex items-center justify-between bg-[#101018]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              7-Stage Engineering Pipeline
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Methodology Sequence</span>
          </div>

          <div className="p-3 border-b border-[#27272a]/60 bg-zinc-950/60">
            <label className="text-[11px] text-zinc-400 font-medium block mb-1">
              Active Task or Feature Context:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customTaskPrompt}
                onChange={(e) => setCustomTaskPrompt(e.target.value)}
                placeholder="e.g. Add offline vector embeddings cache..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Stepper List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {METHODOLOGY_STAGES.map((stg, idx) => {
              const isSelected = activeStageIndex === idx;
              return (
                <div
                  key={stg.stage}
                  onClick={() => {
                    setActiveStageIndex(idx);
                    setSelectedSkillId(stg.skillId);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                      : 'bg-[#12121a] hover:bg-[#181824] border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{stg.icon}</span>
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {stg.stage}. {stg.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchStage(stg);
                      }}
                      title="Launch Stage in AI Assistant"
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Play size={10} />
                      <span>Dispatch</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {stg.summary}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-zinc-800/50">
                    <span>Skill: <code className="text-indigo-400 font-semibold">{stg.skillId}</code></span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(stg.defaultPrompt + (customTaskPrompt || 'current workspace'), `stage-${stg.stage}`);
                      }}
                      className="hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `stage-${stg.stage}` ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      <span>{copiedId === `stage-${stg.stage}` ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Skill Catalog & Deep-Dive Markdown Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090e] overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 border-b border-[#27272a] bg-[#101018] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['all', 'workflow', 'quality', 'collaboration', 'infrastructure'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {cat === 'all' ? 'All Skills (15)' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter skills..."
                  className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>
            </div>
          </div>

          {/* Dual Split: Skill Pills + Selected Skill Rules & Instructions */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Skill Selector List */}
            <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-[#27272a] overflow-y-auto p-2.5 space-y-1.5 bg-[#0e0e14] shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
                Available Skills ({filteredSkills.length})
              </div>
              {filteredSkills.map(skill => {
                const isSelected = selectedSkillId === skill.id;
                return (
                  <div
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/80 text-white shadow-xs'
                        : 'bg-[#13131c] hover:bg-[#181826] border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <span>{skill.icon}</span>
                        <span>{skill.name}</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Skill Detail View & Rule Viewer */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#08080c] overflow-hidden">
              <div className="p-3 border-b border-[#27272a] bg-[#0d0d14] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    .agents/skills/{selectedSkillId}/SKILL.md
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedSkillContent, 'full-skill')}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedId === 'full-skill' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedId === 'full-skill' ? 'Copied' : 'Copy Skill.md'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const prompt = `Using superpowers:${selectedSkillId}, please execute this skill for our active task in ${activeFile}.`;
                      if (onSendToChat) onSendToChat(prompt);
                    }}
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Send size={12} />
                    <span>Run Skill in Chat</span>
                  </button>
                </div>
              </div>

              {/* Skill Content Display */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed bg-[#060609]">
                {selectedSkillContent ? (
                  <pre className="whitespace-pre-wrap font-mono text-[11px] text-zinc-300 selection:bg-indigo-900 selection:text-white">
                    {selectedSkillContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    <span>Loading skill specification...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
