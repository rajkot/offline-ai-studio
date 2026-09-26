'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Shield,
  Zap,
  Code2,
  Copy,
  Download,
  FolderGit2,
  Eye,
  RefreshCw,
  Send,
  Sliders,
  Check,
  Cpu,
  Brain,
  FileText
} from 'lucide-react';

export interface AutoGptThought {
  text: string;
  reasoning: string;
  plan: string[];
  criticism: string;
  speak?: string;
}

export interface AutoGptCommand {
  name: string;
  args: Record<string, any>;
}

export interface AutoGptCycle {
  cycleNumber: number;
  timestamp: number;
  thoughts: AutoGptThought;
  command: AutoGptCommand;
  output?: string;
  status: 'pending' | 'success' | 'failed';
}

interface AutoGptStudioPanelProps {
  onOpenFile?: (path: string) => void;
  onUpdateFile?: (path: string, content: string) => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
}

export default function AutoGptStudioPanel({
  onOpenFile,
  onUpdateFile,
  workspaceFiles = {},
  activeFile = 'components/Playground.tsx'
}: AutoGptStudioPanelProps) {
  // Goal and Agent Config
  const [agentName, setAgentName] = useState('AutoGPT-Studio-Agent');
  const [goal, setGoal] = useState('Analyze workspace files, find architectural optimizations, and synthesize production-ready code');
  const [selectedFile, setSelectedFile] = useState(activeFile);
  const [model, setModel] = useState('qwen2.5:1.5b');
  const [autoApprove, setAutoApprove] = useState(true);
  const [maxCycles, setMaxCycles] = useState(5);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [cycles, setCycles] = useState<AutoGptCycle[]>([]);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'executing' | 'paused' | 'completed' | 'error'>('idle');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // File Patch preview
  const [stagedPatch, setStagedPatch] = useState<{ path: string; content: string } | null>(null);

  // Backend System Info & Templates
  const [systemInfo, setSystemInfo] = useState<{
    hasRepo: boolean;
    hasPlatform: boolean;
    hasClassic: boolean;
    templates: { name: string; filename: string; size: number }[];
    pythonVersion?: string;
    hasDocker?: boolean;
    isServerRunning?: boolean;
  }>({
    hasRepo: true,
    hasPlatform: true,
    hasClassic: true,
    templates: []
  });

  const [activeTab, setActiveTab] = useState<'stream' | 'patch' | 'templates' | 'system'>('stream');
  const [selectedTemplate, setSelectedTemplate] = useState<{ filename: string; content: any } | null>(null);
  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;

  // Poll system status on mount
  useEffect(() => {
    fetch('/api/autogpt')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSystemInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeFile) setSelectedFile(activeFile);
  }, [activeFile]);

  // Toast notification timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-scroll thought logs
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cycles, agentStatus]);

  // Execute single cycle
  const executeStep = async (cycleNum: number): Promise<boolean> => {
    setAgentStatus('thinking');
    try {
      const historyPayload = cycles.map(c => ({
        role: 'assistant',
        content: { thoughts: c.thoughts, command: c.command }
      }));

      const res = await fetch('/api/autogpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-step',
          goal,
          cycle: cycleNum,
          activeFile: selectedFile,
          workspaceFiles,
          history: historyPayload,
          model
        })
      });

      const data = await res.json();
      if (!data.success || !data.result) {
        setAgentStatus('error');
        setNotification({ type: 'error', message: data.error || 'AutoGPT step failed' });
        return false;
      }

      const { thoughts, command } = data.result;
      setAgentStatus('executing');

      let commandOutput = '';
      if (command.name === 'write_file' && command.args?.path && command.args?.content) {
        commandOutput = `[write_file]: Staged file update for ${command.args.path} (${Buffer.byteLength(command.args.content, 'utf-8')} bytes)`;
        setStagedPatch({ path: command.args.path, content: command.args.content });
        if (autoApprove && onUpdateFile) {
          onUpdateFile(command.args.path, command.args.content);
          commandOutput += ' -> Automatically applied to workspace.';
        }
      } else if (command.name === 'read_file') {
        const p = command.args?.path || selectedFile;
        const c = workspaceFiles[p] || '';
        commandOutput = `[read_file]: Read ${p} (${c.length} chars).`;
      } else if (command.name === 'list_files') {
        commandOutput = `[list_files]: ${Object.keys(workspaceFiles).length} files indexed in workspace.`;
      } else if (command.name === 'finish') {
        commandOutput = `[finish]: ${command.args?.response || 'Goal fulfilled.'}`;
      } else {
        commandOutput = `[${command.name}]: Executed with arguments ${JSON.stringify(command.args)}`;
      }

      const cycleEntry: AutoGptCycle = {
        cycleNumber: cycleNum,
        timestamp: Date.now(),
        thoughts,
        command,
        output: commandOutput,
        status: 'success'
      };

      setCycles(prev => [...prev, cycleEntry]);
      setCurrentCycle(cycleNum);

      if (command.name === 'finish' || cycleNum >= maxCycles) {
        setAgentStatus('completed');
        setIsRunning(false);
        setNotification({ type: 'success', message: 'AutoGPT finished all cycles successfully.' });
        return false; // Stop loop
      }

      return true; // Continue
    } catch (err: any) {
      setAgentStatus('error');
      setNotification({ type: 'error', message: err.message || 'AutoGPT execution error' });
      return false;
    }
  };

  // Run full autonomous loop
  const handleStartLoop = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsPaused(false);
    setAgentStatus('thinking');

    let cycleNum = currentCycle === 0 ? 1 : currentCycle + 1;
    while (cycleNum <= maxCycles) {
      if (!isRunningRef.current) break;
      const shouldContinue = await executeStep(cycleNum);
      if (!shouldContinue) break;
      cycleNum++;
      // Give UI brief pause between cycles
      await new Promise(r => setTimeout(r, 600));
    }
    setIsRunning(false);
  };

  const handleStopLoop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setAgentStatus('idle');
    setNotification({ type: 'info', message: 'AutoGPT loop stopped by user' });
  };

  const handleSingleStep = async () => {
    const nextCycle = currentCycle + 1;
    await executeStep(nextCycle);
  };

  const handleReset = () => {
    handleStopLoop();
    setCurrentCycle(0);
    setCycles([]);
    setStagedPatch(null);
    setAgentStatus('idle');
  };

  const handleApplyStagedPatch = async () => {
    if (!stagedPatch) return;
    if (onUpdateFile) {
      onUpdateFile(stagedPatch.path, stagedPatch.content);
    }
    try {
      await fetch('/api/autogpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-file',
          filePath: stagedPatch.path,
          content: stagedPatch.content
        })
      });
      setNotification({ type: 'success', message: `Applied ${stagedPatch.path} to physical disk!` });
    } catch (_) {
      setNotification({ type: 'info', message: `Updated ${stagedPatch.path} in workspace.` });
    }
  };

  const handleLoadTemplate = async (filename: string) => {
    try {
      const res = await fetch('/api/autogpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-template', filename })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTemplate({ filename, content: data.content });
        setActiveTab('templates');
        setNotification({ type: 'success', message: `Loaded AutoGPT template: ${filename}` });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Failed to load template' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0f] text-zinc-200 overflow-hidden font-sans select-none">
      {/* TOP HEADER BAR */}
      <header className="px-5 py-3 bg-[#11121a] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-black rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-cyan-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">AutoGPT Autonomous Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                Official Significant-Gravitas Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Recursive cognitive agent loop: Thought → Reasoning → Plan → Critic → Autonomous Tool Execution
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            agentStatus === 'thinking' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800 animate-pulse' :
            agentStatus === 'executing' ? 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse' :
            agentStatus === 'completed' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
            agentStatus === 'error' ? 'bg-red-950/80 text-red-300 border-red-800' :
            'bg-zinc-900 text-zinc-400 border-zinc-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              agentStatus === 'thinking' || agentStatus === 'executing' ? 'bg-cyan-400 animate-ping' :
              agentStatus === 'completed' ? 'bg-emerald-400' :
              agentStatus === 'error' ? 'bg-red-400' : 'bg-zinc-600'
            }`} />
            <span className="capitalize">{agentStatus}</span>
            {currentCycle > 0 && <span className="font-mono text-[10px] text-zinc-400">({currentCycle}/{maxCycles})</span>}
          </div>

          {/* Model Selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isRunning}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="qwen2.5:1.5b">Ollama: Qwen2.5-Coder (1.5B)</option>
            <option value="llama3.2">Ollama: LLaMA 3.2</option>
            <option value="deepseek-coder">Ollama: DeepSeek-Coder</option>
            <option value="webgpu-local">WebGPU: In-Browser Pure Air-Gap</option>
          </select>

          {/* Auto-Approve Toggle */}
          <button
            onClick={() => setAutoApprove(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              autoApprove 
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300 shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="When active, AutoGPT automatically commits non-destructive edits to workspace"
          >
            <Shield size={12} className={autoApprove ? 'text-emerald-400' : 'text-zinc-500'} />
            <span>Auto-Apply Patches</span>
          </button>

          {/* Step Button */}
          <button
            onClick={handleSingleStep}
            disabled={isRunning}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer"
            title="Run a single AutoGPT cycle"
          >
            <ArrowRight size={13} />
            <span>Step Cycle</span>
          </button>

          {/* Start / Stop Toggle */}
          {isRunning ? (
            <button
              onClick={handleStopLoop}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
            >
              <Square size={13} />
              <span>Stop Agent</span>
            </button>
          ) : (
            <button
              onClick={handleStartLoop}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:brightness-110 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Start Autonomous Loop</span>
            </button>
          )}

          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            title="Reset AutoGPT session"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' :
          notification.type === 'error' ? 'bg-red-950/80 border-red-800 text-red-200' :
          'bg-indigo-950/80 border-indigo-800 text-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
            {notification.type === 'error' && <AlertTriangle size={14} className="text-red-400" />}
            {notification.type === 'info' && <Sparkles size={14} className="text-indigo-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* AGENT DIRECTIVE / GOAL CONFIGURATION BAR */}
      <div className="px-5 py-3 bg-[#0d0e14] border-b border-zinc-800/60 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 font-mono shrink-0">🎯 DIRECTIVE:</span>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isRunning}
            placeholder="Describe the high-level objective for AutoGPT..."
            className="flex-1 bg-black/60 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium placeholder-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-zinc-500">Target File:</span>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              disabled={isRunning}
              className="bg-black/60 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
            >
              {Object.keys(workspaceFiles).length === 0 ? (
                <option value={selectedFile}>{selectedFile}</option>
              ) : (
                Object.keys(workspaceFiles).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-zinc-500">Max Cycles:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={maxCycles}
              onChange={(e) => setMaxCycles(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isRunning}
              className="w-14 bg-black/60 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 text-center font-mono"
            />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="px-5 border-b border-zinc-800/80 bg-[#0e0f17] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'stream'
                ? 'border-purple-500 text-white bg-purple-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Brain size={13} className="text-purple-400" />
            <span>Live Cognitive Feed</span>
            {cycles.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 font-mono">
                {cycles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('patch')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'patch'
                ? 'border-cyan-500 text-white bg-cyan-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 size={13} className="text-cyan-400" />
            <span>Workspace Code Patch</span>
            {stagedPatch && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'templates'
                ? 'border-indigo-500 text-white bg-indigo-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={13} className="text-indigo-400" />
            <span>AutoGPT Graph Templates ({systemInfo.templates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'border-amber-500 text-white bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu size={13} className="text-amber-400" />
            <span>Engine &amp; Subsystems</span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-3">
          <span>AutoGPT: <code className="text-zinc-400">integrations/AutoGPT</code></span>
          <span>Platform &amp; Classic Active</span>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: COGNITIVE FEED */}
        {activeTab === 'stream' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Cycle Feed Stream (Left Column) */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {cycles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                  <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-center text-purple-300 mb-4 shadow-xl shadow-purple-900/20">
                    <Brain size={28} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Autonomous Agent Ready</h3>
                  <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-5">
                    Click &quot;Start Autonomous Loop&quot; above to let AutoGPT reason step-by-step, inspect workspace code, plan solutions, and execute edits.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartLoop}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Start Cycle 1</span>
                    </button>
                    <button
                      onClick={handleSingleStep}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Step Once
                    </button>
                  </div>
                </div>
              ) : (
                cycles.map((c) => (
                  <div
                    key={c.cycleNumber}
                    className="border border-zinc-800 bg-[#0e0f17] rounded-xl p-4 space-y-3.5 shadow-lg transition-all"
                  >
                    {/* Cycle Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-950 text-purple-300 font-mono text-xs font-bold flex items-center justify-center border border-purple-800">
                          {c.cycleNumber}
                        </span>
                        <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                          AutoGPT Cognitive Cycle #{c.cycleNumber}
                        </h4>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(c.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Thought & Reasoning Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-black/40 border border-purple-900/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-purple-300 text-xs font-semibold">
                          <Brain size={13} />
                          <span>Thoughts</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {c.thoughts.text}
                        </p>
                      </div>

                      <div className="bg-black/40 border border-cyan-900/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-semibold">
                          <Sparkles size={13} />
                          <span>Reasoning</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {c.thoughts.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Plan Checklist */}
                    <div className="bg-black/40 border border-zinc-800/60 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-400" />
                          <span>AutoGPT Execution Plan</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {c.thoughts.plan?.length || 0} steps
                        </span>
                      </div>
                      <div className="space-y-1 pt-1">
                        {c.thoughts.plan?.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                            <span className="text-emerald-400">✓</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Self-Criticism */}
                    {c.thoughts.criticism && (
                      <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-200/90">
                        <Shield size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-300">Self-Criticism: </span>
                          <span>{c.thoughts.criticism}</span>
                        </div>
                      </div>
                    )}

                    {/* Executed Action */}
                    <div className="bg-[#08080c] border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono uppercase">
                            Action: {c.command.name}
                          </span>
                          {c.command.args?.path && (
                            <span className="text-xs font-mono text-zinc-400">
                              Target: <code className="text-indigo-300">{c.command.args.path}</code>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 size={12} /> Executed
                        </span>
                      </div>

                      {c.output && (
                        <div className="font-mono text-xs text-zinc-400 bg-black/60 p-2 rounded border border-zinc-900">
                          {c.output}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Live Preview Sidebar (Right Column) */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-800/80 bg-[#0e0f17] p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
              <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/40 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-purple-400" />
                  AutoGPT Architecture
                </h4>
                <div className="space-y-1 text-[11px] text-zinc-400">
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span>Engine Mode</span>
                    <span className="font-mono text-indigo-300">Continuous Agent Loop</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span>Active Provider</span>
                    <span className="font-mono text-emerald-400">Local Air-Gapped (Ollama)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span>Repo Path</span>
                    <span className="font-mono text-zinc-300 truncate max-w-[120px]">integrations/AutoGPT</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Templates Available</span>
                    <span className="font-mono text-purple-300">{systemInfo.templates.length}</span>
                  </div>
                </div>
              </div>

              {/* Staged Code Action */}
              {stagedPatch ? (
                <div className="border border-cyan-900/50 rounded-xl p-3 bg-cyan-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 font-mono">⚡ Staged Patch</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{stagedPatch.path}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    AutoGPT synthesized a new code version for this file.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyStagedPatch}
                      className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-all cursor-pointer shadow flex items-center justify-center gap-1"
                    >
                      <Check size={12} /> Apply to Disk
                    </button>
                    <button
                      onClick={() => setActiveTab('patch')}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Inspect Diff
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-500">
                  No code modifications currently staged by AutoGPT.
                </div>
              )}

              {/* Quick Template Launchers */}
              <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/40 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-400" />
                  AutoGPT Quick Presets
                </h4>
                <div className="space-y-1.5">
                  {[
                    'Refactor file to TypeScript strict types',
                    'Write comprehensive test coverage',
                    'Audit for performance bottlenecks',
                    'Generate full API client documentation'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGoal(preset);
                        setNotification({ type: 'info', message: `Preset selected: "${preset}"` });
                      }}
                      className="w-full text-left p-1.5 rounded hover:bg-zinc-800/80 text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer truncate border border-transparent hover:border-zinc-700"
                    >
                      • {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CODE PATCH DIFF INSPECTOR */}
        {activeTab === 'patch' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode size={16} className="text-cyan-400" />
                    <span>AutoGPT Workspace Patch</span>
                    {stagedPatch && <code className="text-xs text-cyan-300 font-mono">({stagedPatch.path})</code>}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Review synthesized code before applying to workspace files or editor.
                  </p>
                </div>
                {stagedPatch && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(stagedPatch.content);
                        setNotification({ type: 'success', message: 'Copied code to clipboard!' });
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy size={13} /> Copy
                    </button>
                    <button
                      onClick={handleApplyStagedPatch}
                      className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
                    >
                      <Download size={13} /> Apply to Workspace
                    </button>
                  </div>
                )}
              </div>

              {stagedPatch ? (
                <div className="flex-1 bg-[#11121a] border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-y-auto">
                  <pre>{stagedPatch.content}</pre>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                  <FileCode size={32} className="text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-400">No patch is staged yet. Run an AutoGPT loop to generate code.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUTOGPT GRAPH TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
            {/* Template List */}
            <div className="w-full md:w-80 border border-zinc-800 rounded-xl bg-[#0e0f17] p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-white">AutoGPT Graph Library</h3>
                <p className="text-[11px] text-zinc-400">Discovered in <code className="text-indigo-300">autogpt_platform/graph_templates</code></p>
              </div>

              <div className="space-y-2">
                {systemInfo.templates.map(tpl => (
                  <div
                    key={tpl.filename}
                    onClick={() => handleLoadTemplate(tpl.filename)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedTemplate?.filename === tpl.filename
                        ? 'bg-purple-950/50 border-purple-600 text-white'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{tpl.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center justify-between">
                      <span>{tpl.filename}</span>
                      <span>{(tpl.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Inspector View */}
            <div className="flex-1 border border-zinc-800 rounded-xl bg-[#11121a] p-4 flex flex-col gap-3 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">
                    {selectedTemplate ? selectedTemplate.filename : 'Select a Template'}
                  </h4>
                  <p className="text-[11px] text-zinc-400">AutoGPT visual graph and workflow definition</p>
                </div>
              </div>

              {selectedTemplate ? (
                <div className="flex-1 bg-black/60 rounded-lg p-3 font-mono text-xs text-zinc-300 overflow-y-auto border border-zinc-900">
                  <pre>{JSON.stringify(selectedTemplate.content, null, 2)}</pre>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                  Click any template on the left to view its node graph.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ENGINE & SUBSYSTEMS */}
        {activeTab === 'system' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="border border-zinc-800 rounded-2xl bg-[#0e0f17] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu size={16} className="text-purple-400" />
                  AutoGPT Environment Diagnostics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">AutoGPT Repository</span>
                    <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Cloned at integrations/AutoGPT
                    </div>
                  </div>

                  <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">Python Runtime</span>
                    <div className="text-xs font-mono text-zinc-200">
                      {systemInfo.pythonVersion || 'Python 3 Available'}
                    </div>
                  </div>

                  <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">Docker Availability</span>
                    <div className="text-xs font-mono text-zinc-200">
                      {systemInfo.hasDocker ? 'Docker Engine Available' : 'Docker CLI not detected (Local Execution Active)'}
                    </div>
                  </div>

                  <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">Offline AI Model</span>
                    <div className="text-xs font-mono text-indigo-300">
                      Ollama Local Air-Gapped / WebGPU
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
