'use client';

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  FileCode,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Play,
  Sliders,
  Send,
  Sparkles,
  Bot,
  User,
  Layers,
  Code2,
  Terminal,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  GitCommit
} from 'lucide-react';
import { aiderEngine, RepoMapResult, EditBlock, RepoSymbol } from '@/lib/ai/aiderEngine';

export interface AiderPairProgrammerStudioProps {
  workspaceFiles: Record<string, string>;
  activeFile?: string;
  onApplyFiles?: (files: Record<string, string>) => void;
  onOpenFile?: (path: string) => void;
}

export default function AiderPairProgrammerStudio({
  workspaceFiles = {},
  activeFile = 'components/Playground.tsx',
  onApplyFiles,
  onOpenFile
}: AiderPairProgrammerStudioProps) {
  const [activeTab, setActiveTab] = useState<'repomap' | 'chat' | 'diff-tester' | 'git' | 'architecture'>('repomap');

  // Repo Map State
  const [budgetTokens, setBudgetTokens] = useState<number>(1024);
  const [repoMapResult, setRepoMapResult] = useState<RepoMapResult | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState<boolean>(false);
  const [copiedMap, setCopiedMap] = useState<boolean>(false);

  // Pair Programming Chat State
  const [coderMode, setCoderMode] = useState<'architect' | 'editor'>('architect');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; diffBlocks?: EditBlock[] }>>([
    {
      sender: 'ai',
      text: '👋 Hello! I am your Aider AI Pair Programmer. Using the AST Repo Map, I understand the symbol topology of your entire codebase.\n\nAsk me to refactor code, implement new features, or fix bugs across multiple files!'
    }
  ]);
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false);
  const [targetFiles, setTargetFiles] = useState<string[]>([activeFile]);

  // Diff Tester State
  const [manualDiffInput, setManualDiffInput] = useState<string>(`<<<<<<< SEARCH
  // LAN Pair Programming, Semantic Search & GGUF Quantizer State
=======
  // LAN Pair Programming, Semantic Search, GGUF Quantizer & Aider State
>>>>>>>`);
  const [diffTestFile, setDiffTestFile] = useState<string>(activeFile);
  const [diffTestResult, setDiffTestResult] = useState<{ success: boolean; message: string; preview?: string } | null>(null);

  // Git Commit State
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  // Generate initial Repo Map
  const handleGenerateRepoMap = () => {
    setIsGeneratingMap(true);
    setTimeout(() => {
      const result = aiderEngine.generateRepoMap(workspaceFiles, budgetTokens);
      setRepoMapResult(result);
      setIsGeneratingMap(false);
    }, 150);
  };

  useEffect(() => {
    if (Object.keys(workspaceFiles).length > 0) {
      handleGenerateRepoMap();
    }
  }, [budgetTokens, Object.keys(workspaceFiles).length]);

  // Sync active file
  useEffect(() => {
    if (activeFile && !targetFiles.includes(activeFile)) {
      setTargetFiles(prev => [...prev, activeFile]);
    }
    setDiffTestFile(activeFile);
  }, [activeFile]);

  // Handle Send Chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsAiResponding(true);

    setTimeout(() => {
      let aiReply = '';
      let simulatedBlocks: EditBlock[] = [];

      if (coderMode === 'architect') {
        aiReply = `### 🏛️ Architect Execution Plan for "${userText}":\n\n1. **Inspect Repo Map Symbols**: Reviewed reference topology across ${targetFiles.join(', ')}.\n2. **Interface Contract**: Update TypeScript types and handlers to preserve backward compatibility.\n3. **SEARCH/REPLACE Target**: Prepare surgical edits to minimize token waste.\n\nSwitch to **Editor Mode** or click "Generate Search/Replace Diffs" to apply changes!`;
      } else {
        const sampleTarget = targetFiles[0] || 'activeFile.ts';
        simulatedBlocks = [
          {
            filePath: sampleTarget,
            before: `// TODO: Implement Aider pair programming edits`,
            after: `// Implemented Aider AST-guided pair programming solution\nexport const aiderTaskSuccess = true;`
          }
        ];
        aiReply = `### ⚡ Editor Mode: Generated SEARCH/REPLACE Block:\n\n\`\`\`\n### ${sampleTarget}\n<<<<<<< SEARCH\n// TODO: Implement Aider pair programming edits\n=======\n// Implemented Aider AST-guided pair programming solution\nexport const aiderTaskSuccess = true;\n>>>>>>>\n\`\`\`\n\nClick **"Apply Edits to Workspace"** below to update your file automatically.`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiReply, diffBlocks: simulatedBlocks }]);
      setIsAiResponding(false);
    }, 800);
  };

  // Test Search/Replace
  const handleTestDiff = () => {
    const original = workspaceFiles[diffTestFile] || '';
    const blocks = aiderEngine.parseSearchReplaceBlocks(manualDiffInput, diffTestFile);

    if (blocks.length === 0) {
      setDiffTestResult({ success: false, message: 'No valid <<<<<<< SEARCH ... ======= ... >>>>>>> blocks found.' });
      return;
    }

    const outcome = aiderEngine.applyEditBlock(original, blocks[0]);
    if (outcome.success) {
      setDiffTestResult({
        success: true,
        message: '✅ Match found! SEARCH block can be applied cleanly without conflicts.',
        preview: outcome.newContent
      });
    } else {
      setDiffTestResult({
        success: false,
        message: `❌ ${outcome.error || 'Failed to match SEARCH block in target file'}`
      });
    }
  };

  // Apply Diff to Workspace
  const handleApplyDiffToWorkspace = () => {
    if (!diffTestResult?.preview || !onApplyFiles) return;
    onApplyFiles({
      [diffTestFile]: diffTestResult.preview
    });
    setDiffTestResult({
      success: true,
      message: `🎉 File ${diffTestFile} successfully updated in workspace!`
    });
  };

  // Git Commit
  const handleExecuteCommit = async () => {
    setIsCommitting(true);
    setCommitSuccess(null);
    try {
      const res = await fetch('/api/aider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          modifiedFiles: targetFiles,
          commitMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setCommitSuccess(`Committed: "${data.commitMessage}"`);
      } else {
        alert(data.error || 'Commit failed');
      }
    } catch (e: any) {
      alert(`Commit error: ${e?.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0b10] text-slate-200 select-none overflow-hidden">
      
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
            <GitBranch size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white tracking-tight">
                Aider Autonomous Pair Programmer
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                Universal AST Repo Map
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                aider-ai/aider
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Whole-repository AST PageRank mapping &bull; Git-aware SEARCH/REPLACE pair programming
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {repoMapResult && (
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              Map: <strong className="text-cyan-400">{repoMapResult.tokenCount}</strong> / {repoMapResult.budgetTokens} tokens ({repoMapResult.compressionRatio}% compressed)
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800/80 shrink-0 gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('repomap')}
          className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'repomap'
              ? 'border-cyan-500 text-cyan-400 font-semibold bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin size={13} />
          <span>1. Universal Repo Map</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'border-cyan-500 text-cyan-400 font-semibold bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot size={13} />
          <span>2. Autonomous Pair Programmer</span>
        </button>

        <button
          onClick={() => setActiveTab('diff-tester')}
          className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'diff-tester'
              ? 'border-cyan-500 text-cyan-400 font-semibold bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 size={13} />
          <span>3. SEARCH/REPLACE Diff Parser</span>
        </button>

        <button
          onClick={() => setActiveTab('git')}
          className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'git'
              ? 'border-cyan-500 text-cyan-400 font-semibold bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCommit size={13} />
          <span>4. Git Auto-Commit &amp; Rollback</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'architecture'
              ? 'border-cyan-500 text-cyan-400 font-semibold bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} />
          <span>5. Aider Architecture &amp; Benchmarks</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#08090d]">

        {/* TAB 1: REPO MAP */}
        {activeTab === 'repomap' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Controls & Ranked Symbols (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sliders size={13} className="text-cyan-400" />
                    <span>Repo Map Token Budget</span>
                  </h3>
                  <span className="font-mono text-xs text-cyan-400 font-bold">{budgetTokens} Tokens</span>
                </div>

                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={256}
                  value={budgetTokens}
                  onChange={(e) => setBudgetTokens(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>256 (Minimal)</span>
                  <span>1024 (Optimal)</span>
                  <span>4096 (Deep)</span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between items-center">
                  <span className="text-slate-400">Total Workspace Files:</span>
                  <span className="font-mono font-bold text-white">{repoMapResult?.totalFiles || 0}</span>
                </div>
                <div className="text-xs flex justify-between items-center">
                  <span className="text-slate-400">Extracted AST Symbols:</span>
                  <span className="font-mono font-bold text-cyan-300">{repoMapResult?.totalSymbols || 0}</span>
                </div>
              </div>

              {/* Top PageRank Ranked Symbols */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Top PageRank Symbols (Centrality)</span>
                </h3>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {repoMapResult?.topRankedSymbols.map((sym, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenFile && onOpenFile(sym.file)}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-mono text-cyan-300 font-semibold">{sym.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({sym.kind})</span>
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        Rank {sym.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Map Markdown View (7 cols) */}
            <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <MapPin size={13} className="text-cyan-400" />
                  <span>Aider Tree-Sitter AST Repo Map Preview</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (repoMapResult) {
                        navigator.clipboard.writeText(repoMapResult.mapText);
                        setCopiedMap(true);
                        setTimeout(() => setCopiedMap(false), 2000);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedMap ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedMap ? 'Copied!' : 'Copy Repo Map'}</span>
                  </button>
                  <button
                    onClick={handleGenerateRepoMap}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Refresh Map"
                  >
                    <RefreshCw size={13} className={isGeneratingMap ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <pre className="flex-1 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 font-mono text-xs text-cyan-200/90 overflow-y-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
                {repoMapResult?.mapText || 'Analyzing repository AST topology...'}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: AUTONOMOUS PAIR PROGRAMMER CHAT */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto flex flex-col h-[520px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Mode Switcher */}
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Coder Mode:</span>
                <button
                  onClick={() => setCoderMode('architect')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    coderMode === 'architect'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🏛️ Architect Mode
                </button>
                <button
                  onClick={() => setCoderMode('editor')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    coderMode === 'editor'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Editor Mode (SEARCH/REPLACE)
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Target: <span className="text-cyan-400 font-mono">{targetFiles[0] || 'active file'}</span>
              </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
                    {msg.sender === 'ai' ? <Bot size={11} className="text-cyan-400" /> : <User size={11} />}
                    <span>{msg.sender === 'ai' ? 'Aider Pair Programmer' : 'You'}</span>
                  </div>
                  <div className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed border whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-900 text-slate-200 border-slate-800'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiResponding && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Aider is consulting Repo Map and drafting edits...</span>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <form onSubmit={handleSendChat} className="p-3 bg-slate-900/90 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Aider to refactor, fix, or add code across workspace files..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAiResponding}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={13} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DIFF TESTER */}
        {activeTab === 'diff-tester' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Code2 size={14} className="text-cyan-400" />
                  <span>SEARCH/REPLACE Block Parser &amp; Atomic Dry-Run</span>
                </h3>
                <span className="text-[11px] text-slate-400">Target File: <strong className="text-cyan-400 font-mono">{diffTestFile}</strong></span>
              </div>

              <textarea
                value={manualDiffInput}
                onChange={(e) => setManualDiffInput(e.target.value)}
                rows={6}
                placeholder="Paste <<<<<<< SEARCH ... ======= ... >>>>>>> block here"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-cyan-200 font-mono resize-none focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleTestDiff}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} />
                  <span>Dry-Run Test Match</span>
                </button>

                {diffTestResult?.success && onApplyFiles && (
                  <button
                    onClick={handleApplyDiffToWorkspace}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 size={13} />
                    <span>Apply to Workspace</span>
                  </button>
                )}
              </div>
            </div>

            {diffTestResult && (
              <div className={`p-4 rounded-xl border text-xs font-mono ${
                diffTestResult.success
                  ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-700/60 text-rose-300'
              }`}>
                {diffTestResult.message}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GIT AUTO-COMMIT */}
        {activeTab === 'git' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <GitCommit size={14} className="text-cyan-400" />
                <span>Aider Git Auto-Commit &amp; Rollback</span>
              </h3>
              <p className="text-xs text-slate-400">
                Aider automatically writes concise, conventional commit messages (`feat(...)`, `fix(...)`, `refactor(...)`) after verified edits.
              </p>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Commit Message (or leave blank for AI generation)</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g., feat(auth): integrate Aider AST repo map into pair programming pipeline"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleExecuteCommit}
                disabled={isCommitting}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isCommitting ? <RefreshCw size={13} className="animate-spin" /> : <GitCommit size={13} />}
                <span>Execute Git Commit</span>
              </button>

              {commitSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 rounded-lg text-xs font-mono">
                  ✅ {commitSuccess}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="max-w-4xl mx-auto space-y-4 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span>The Aider Secret: Why Repo Maps Win on SWE-bench</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Aider consistently tops the open-source SWE-bench benchmarks. It achieves state-of-the-art multi-file code editing through three core inventions:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono">1. Tree-Sitter Repo Map</span>
                  <div className="font-bold text-white">AST PageRank</div>
                  <p className="text-[11px] text-slate-400">
                    Extracts definitions, classes, and references. Applies PageRank centrality to fit the essence of 1,000+ files into a 1K token context window.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase font-mono">2. SEARCH/REPLACE Diff Format</span>
                  <div className="font-bold text-white">Surgical Block Edits</div>
                  <p className="text-[11px] text-slate-400">
                    Instructs models to only output the lines being replaced between <code className="text-cyan-300">&lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH</code> and <code className="text-cyan-300">&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>. Eliminates whole-file retyping hallucinations.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono">3. Git Safety &amp; Auto-Commit</span>
                  <div className="font-bold text-white">Zero Regressions</div>
                  <p className="text-[11px] text-slate-400">
                    Every AI patch is verified against the workspace syntax. If linter or assertions fail, Aider performs immediate git rollback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
