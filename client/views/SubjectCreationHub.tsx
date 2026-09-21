'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Sparkles, Send, Plus, Layers, FileText, Cpu, 
  MessageSquare, Trash2, CheckCircle2, Bot, Globe, Shield, Search, 
  ChevronRight, RefreshCw, Bookmark, Code2, Terminal, HardDrive, Database, Activity
} from 'lucide-react';
import ModelCatalogStorefront from '@/client/components/ModelCatalogStorefront';
import SwarmGraphVisualizer from '@/client/components/SwarmGraphVisualizer';
import KnowledgeVault from '@/client/views/KnowledgeVault';
import SandboxConsole from '@/client/components/SandboxConsole';

interface SubjectItem {
  id: string;
  name: string;
  category: string;
  model: string;
  description: string;
  createdAt: string;
}

interface WorkspaceTab {
  id: string;
  title: string;
  type: 'document' | 'code' | 'notes';
  content: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function SubjectCreationHub() {
  // State for Virtualizer / Subjects
  const [subjects, setSubjects] = useState<SubjectItem[]>([
    {
      id: 'sub-1',
      name: 'Quantum Physics & Mechanics',
      category: 'Science',
      model: 'gemini-1.5-flash',
      description: 'Advanced wave functions, superposition, and entanglement principles.',
      createdAt: '2026-08-25'
    },
    {
      id: 'sub-2',
      name: 'Classical Music Composition',
      category: 'Arts',
      model: 'gemini-1.5-flash',
      description: 'Counterpoint, harmony, orchestration, and sonata-allegro forms.',
      createdAt: '2026-08-25'
    }
  ]);

  const [activeSubjectId, setActiveSubjectId] = useState<string>('sub-1');
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCategory, setNewSubjectCategory] = useState<string>('Science');
  const [newSubjectModel, setNewSubjectModel] = useState<string>('gemini-1.5-flash');
  const [newSubjectDesc, setNewSubjectDesc] = useState<string>('');

  // Workspace Tabs per Subject
  const [workspaceTabs, setWorkspaceTabs] = useState<Record<string, WorkspaceTab[]>>({
    'sub-1': [
      {
        id: 'tab-1',
        title: 'WaveFunctionSummary.md',
        type: 'document',
        content: '# Quantum Wave Functions\n\nThe Schrödinger equation governs how the quantum state of a physical system changes over time...\n\n- Superposition principles\n- Eigenvalues and eigenvectors\n- Uncertainty relations'
      },
      {
        id: 'tab-2',
        title: 'Simulation.py',
        type: 'code',
        content: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# Schrödinger 1D Wavepacket Simulation\nx = np.linspace(-10, 10, 1000)\npsi = np.exp(-x**2) * np.exp(1j * 5 * x)\nplt.plot(x, np.abs(psi)**2)\nplt.title("Probability Density")\nplt.show()'
      }
    ],
    'sub-2': [
      {
        id: 'tab-3',
        title: 'HarmonyRules.md',
        type: 'document',
        content: '# Bach Counterpoint Principles\n\n1. Avoid parallel fifths and octaves.\n2. Use contrary motion wherever possible.\n3. Resolve dissonances stepwise.'
      }
    ]
  });

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [showModelStore, setShowModelStore] = useState<boolean>(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'subjects' | 'vault'>('subjects');
  const [mobileTab, setMobileTab] = useState<'explorer' | 'editor' | 'chat' | 'telemetry'>('editor');

  const renderMessageWithCitations = (text: string) => {
    const regex = /\[Ref:\s*([^,]+),\s*p\.\s*(\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, filename, page] = match;
      const startIndex = match.index;
      
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      const snippet = `[Source chunk from ${filename.trim()}: Extracted embedding index segment representing semantic vector space invariants and markdown AST structure at page ${page}.]`;

      parts.push(
        <span key={`${startIndex}-${fullMatch}`} className="relative group inline-block mx-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-mono text-[10px] cursor-help shadow-xs">
            <span>📄 Ref: {filename.trim()} (p. {page})</span>
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-64 p-2.5 bg-zinc-950 border border-zinc-700 text-zinc-200 text-[10px] font-mono rounded-lg shadow-2xl pointer-events-none leading-relaxed">
            <div className="text-indigo-400 font-bold mb-1">RAG Vector Chunk Snippet:</div>
            <div>{snippet}</div>
          </div>
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Chat Conversations per Subject
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({
    'sub-1': [
      { id: 'c-1', sender: 'ai', text: 'Welcome to Quantum Physics & Mechanics. How shall we explore wave-particle duality today?', timestamp: '10:00 AM' },
      { id: 'c-2', sender: 'user', text: 'Can you explain the double-slit experiment math?', timestamp: '10:01 AM' },
      { id: 'c-3', sender: 'ai', text: 'Certainly! The probability amplitude P is given by |psi_1 + psi_2|^2...', timestamp: '10:01 AM' }
    ],
    'sub-2': [
      { id: 'c-4', sender: 'ai', text: 'Hello maestro! Ready to compose a fugue?', timestamp: '10:00 AM' }
    ]
  });

  const [chatInput, setChatInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
  const currentTabs = workspaceTabs[activeSubjectId] || [];
  const activeTab = currentTabs.find(t => t.id === activeTabId) || currentTabs[0];
  const currentChat = conversations[activeSubjectId] || [];

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const newId = `sub-${Date.now()}`;
    const newSub: SubjectItem = {
      id: newId,
      name: newSubjectName.trim(),
      category: newSubjectCategory,
      model: newSubjectModel,
      description: newSubjectDesc.trim() || 'Custom virtualized subject knowledge base.',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setSubjects(prev => [...prev, newSub]);
    setWorkspaceTabs(prev => ({
      ...prev,
      [newId]: [
        {
          id: `tab-${Date.now()}`,
          title: `${newSub.name.replace(/\s+/g, '')}Overview.md`,
          type: 'document',
          content: `# ${newSub.name}\n\nCategory: ${newSub.category}\nModel: ${newSub.model}\n\n${newSub.description}\n\n## Initial Curriculum\n- Core Concepts\n- Advanced Applications\n- Practice Exercises`
        }
      ]
    }));
    setConversations(prev => ({
      ...prev,
      [newId]: [
        { id: `msg-${Date.now()}`, sender: 'ai', text: `Virtualization complete for ${newSub.name}. I am your dedicated specialist AI. What would you like to build or learn first?`, timestamp: 'Just now' }
      ]
    }));
    setActiveSubjectId(newId);
    setActiveTabId(`tab-${Date.now()}`);
    setNewSubjectName('');
    setNewSubjectDesc('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setConversations(prev => ({
      ...prev,
      [activeSubjectId]: [...(prev[activeSubjectId] || []), userMsg]
    }));
    const query = chatInput.trim();
    setChatInput('');
    setIsGenerating(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: `Analysis for "${query}" in ${activeSubject.name}: Virtual synthesis generated successfully using model ${activeSubject.model}. Vector RAG grounding confirmed via [Ref: api_developer_manual.pdf, p. 12]. Key theorems and structural guidelines have been updated in your workspace.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversations(prev => ({
        ...prev,
        [activeSubjectId]: [...(prev[activeSubjectId] || []), aiMsg]
      }));
      setIsGenerating(false);
    }, 900);
  };

  return (
    <div className="w-full h-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 48px Header */}
      <header className="h-[48px] bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">⚡ Standalone Subject Creator AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 hidden sm:inline">
            Universal Virtualizer v3.5
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModelStore(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
              showModelStore 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                : 'bg-zinc-900 border-zinc-700/80 text-indigo-300 hover:bg-zinc-800'
            }`}
          >
            <HardDrive size={13} />
            <span>{showModelStore ? 'Back to Workspace' : 'Model Registry Store'}</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-[#27272a] hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Subject: <strong className="text-zinc-200">{activeSubject.name}</strong></span>
          </div>
          <button 
            onClick={() => alert('Subject Workspace exported successfully.')}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            Export Hub
          </button>
        </div>
      </header>

      {/* Three-Panel Grid System with calc(100vh - 48px) */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        
        {/* Left Panel: Subject Virtualizer / Knowledge Vault (260px) */}
        <aside className={`w-full md:w-[260px] bg-[#18181b]/90 backdrop-blur-md border-r border-[#27272a] flex-col shrink-0 overflow-hidden ${mobileTab === 'explorer' ? 'flex' : 'hidden md:flex'}`}>
          {/* Left Panel Tab Switcher */}
          <div className="flex border-b border-[#27272a] bg-zinc-900/80 p-1.5 shrink-0 gap-1">
            <button
              onClick={() => setLeftPanelTab('subjects')}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                leftPanelTab === 'subjects' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen size={12} />
              <span>Subjects</span>
            </button>
            <button
              onClick={() => setLeftPanelTab('vault')}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                leftPanelTab === 'vault' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database size={12} />
              <span>Vault</span>
            </button>
          </div>

          {leftPanelTab === 'vault' ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <KnowledgeVault />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-3 border-b border-[#27272a]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
                  <BookOpen size={13} className="text-indigo-400" />
                  Subject Virtualizer
                </h2>

                {/* Create Subject Card */}
                <form onSubmit={handleCreateSubject} className="space-y-2 mt-2 bg-zinc-900/60 p-2.5 rounded-lg border border-[#27272a]">
                  <div>
                    <label className="text-[10px] font-medium text-zinc-400 block mb-1">Subject Title</label>
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g., Artificial Intelligence"
                      className="w-full bg-[#18181b] border border-zinc-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">Category</label>
                      <select
                        value={newSubjectCategory}
                        onChange={(e) => setNewSubjectCategory(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-700/80 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Science">Science</option>
                        <option value="Arts">Arts</option>
                        <option value="Humanities">Humanities</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Mathematics">Mathematics</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">Model</label>
                      <select
                        value={newSubjectModel}
                        onChange={(e) => setNewSubjectModel(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-700/80 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash-8b">Flash Lite</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-zinc-400 block mb-1">Description</label>
                    <textarea
                      value={newSubjectDesc}
                      onChange={(e) => setNewSubjectDesc(e.target.value)}
                      placeholder="Brief description..."
                      rows={2}
                      className="w-full bg-[#18181b] border border-zinc-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={13} />
                    Virtualize Subject
                  </button>
                </form>
              </div>

              {/* Subjects List */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 tracking-wider block">Virtualized Library</span>
                {subjects.map(subj => {
                  const isActive = subj.id === activeSubjectId;
                  return (
                    <button
                      key={subj.id}
                      onClick={() => setActiveSubjectId(subj.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                        isActive 
                          ? 'bg-indigo-950/60 border-indigo-700/80 text-indigo-100 shadow-md shadow-indigo-950/40' 
                          : 'bg-zinc-900/40 border-[#27272a] text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate">{subj.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700">{subj.category}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{subj.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Center Panel: Multi-tab Workspace or Model Store (Flex-1) */}
        <main className={`flex-1 bg-[#09090b] flex-col overflow-hidden ${mobileTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          {showModelStore ? (
            <ModelCatalogStorefront />
          ) : (
            <>
              {/* Tab Bar */}
              <div className="h-10 bg-[#18181b]/60 border-b border-[#27272a] flex items-center px-3 gap-1 overflow-x-auto shrink-0">
                {currentTabs.map(tab => {
                  const isTabActive = tab.id === activeTabId;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`px-3 py-1.5 rounded-t-md text-xs font-medium flex items-center gap-2 border-t border-x transition-colors cursor-pointer ${
                        isTabActive
                          ? 'bg-[#09090b] border-[#27272a] text-white border-b-transparent shadow-sm'
                          : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      {tab.type === 'code' ? <Code2 size={13} className="text-cyan-400" /> : <FileText size={13} className="text-indigo-400" />}
                      <span>{tab.title}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const newTId = `tab-${Date.now()}`;
                    const newTTitle = `Document_${currentTabs.length + 1}.md`;
                    setWorkspaceTabs(prev => ({
                      ...prev,
                      [activeSubjectId]: [...(prev[activeSubjectId] || []), { id: newTId, title: newTTitle, type: 'document', content: '# New Workspace Document\n\nType your notes or generated content here...' }]
                    }));
                    setActiveTabId(newTId);
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 ml-1 transition-colors cursor-pointer"
                  title="New Tab"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Active Tab Content Editor / Viewer */}
              <div className="flex-1 flex flex-col bg-[#09090b] p-4 overflow-hidden">
                {activeTab ? (
                  <div className="flex-1 flex flex-col bg-[#18181b]/40 rounded-xl border border-[#27272a] overflow-hidden shadow-2xl">
                    <div className="px-4 py-2 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-mono text-indigo-300 font-semibold">{activeTab.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 uppercase">{activeTab.type}</span>
                        <span className="text-[10px] text-emerald-400">Auto-saved</span>
                      </div>
                    </div>
                    <textarea
                      value={activeTab.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkspaceTabs(prev => ({
                          ...prev,
                          [activeSubjectId]: (prev[activeSubjectId] || []).map(t => t.id === activeTabId ? { ...t, content: val } : t)
                        }));
                      }}
                      className="flex-1 bg-transparent p-4 font-mono text-xs text-zinc-200 outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                    No active workspace document selected.
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right Panel: Conversations & Prompting Panel (350px) */}
        <aside className={`w-full md:w-[350px] bg-[#18181b]/90 backdrop-blur-md border-l border-[#27272a] flex-col shrink-0 overflow-hidden ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-3 border-b border-[#27272a] flex items-center justify-between bg-zinc-900/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-cyan-400" />
              Specialist AI Chat
            </h2>
            <span className="text-[10px] text-indigo-400 font-mono">{activeSubject.model}</span>
          </div>

          {/* Live Swarm Graph Visualizer */}
          <SwarmGraphVisualizer />

          {/* Messages Stream */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {currentChat.map(msg => {
              const isAi = msg.sender === 'ai';
              return (
                <div key={msg.id} className={`flex flex-col gap-1 ${isAi ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 px-1">
                    {isAi ? <Bot size={11} className="text-indigo-400" /> : <span className="font-semibold text-zinc-400">You</span>}
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className={`p-3 rounded-xl text-xs leading-relaxed max-w-[90%] border shadow-sm ${
                    isAi 
                      ? 'bg-zinc-900/90 border-[#27272a] text-zinc-200' 
                      : 'bg-indigo-600/90 border-indigo-500 text-white'
                  }`}>
                    {renderMessageWithCitations(msg.text)}
                  </div>
                </div>
              );
            })}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 p-2 bg-indigo-950/40 rounded-lg border border-indigo-900/60 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span>Specialist AI is synthesizing response...</span>
              </div>
            )}
          </div>

          {/* Prompting Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#27272a] bg-zinc-900/60">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask ${activeSubject.name} specialist...`}
                className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isGenerating}
                className="absolute right-1.5 top-1.5 p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Send size={12} />
              </button>
            </div>
          </form>
        </aside>

      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) with 44px x 44px touch targets */}
      <nav aria-label="Mobile Navigation" className="md:hidden h-14 bg-[#18181b] border-t border-[#27272a] flex items-center justify-around px-2 shrink-0 z-40">
        <button
          onClick={() => setMobileTab('explorer')}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded transition-colors cursor-pointer ${
            mobileTab === 'explorer' ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen size={18} />
          <span className="text-[10px] mt-0.5">Explorer</span>
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded transition-colors cursor-pointer ${
            mobileTab === 'editor' ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Code2 size={18} />
          <span className="text-[10px] mt-0.5">Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded transition-colors cursor-pointer ${
            mobileTab === 'chat' ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare size={18} />
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>
        <button
          onClick={() => setMobileTab('telemetry')}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded transition-colors cursor-pointer ${
            mobileTab === 'telemetry' ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Activity size={18} />
          <span className="text-[10px] mt-0.5">Telemetry</span>
        </button>
      </nav>

      <SandboxConsole />
    </div>
  );
}
