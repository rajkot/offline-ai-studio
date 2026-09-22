'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  Zap,
  ArrowRight,
  Sliders,
  ChevronDown,
  Columns,
  AlignJustify,
  FileCode,
  Code2,
  GitBranch,
  Terminal,
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import ContextChipsBar, { ContextChipItem } from './ContextChipsBar';

interface InlineAiDiffTransformerProps {
  isOpen: boolean;
  selectedCode: string;
  selectionRange: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
  filePath: string;
  onAccept: (transformedCode: string) => void;
  onReject: () => void;
  workspaceFiles?: Record<string, string>;
  recentTerminalLogs?: string;
  gitStatusSummary?: string;
}

export default function InlineAiDiffTransformer({
  isOpen,
  selectedCode,
  selectionRange,
  filePath,
  onAccept,
  onReject,
  workspaceFiles = {},
  recentTerminalLogs = '',
  gitStatusSummary = '',
}: InlineAiDiffTransformerProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [transformedCode, setTransformedCode] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'qwen2.5:1.5b' | 'llama3.2:3b' | 'claude-3-5-sonnet' | 'webgpu'>('qwen2.5:1.5b');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  
  // Context Chips State
  const [contextChips, setContextChips] = useState<ContextChipItem[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTransformedCode(null);
      setErrorMsg(null);
      setContextChips([]);
      setShowMentionMenu(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (Ctrl+Enter to Accept, Esc to Reject)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMentionMenu) {
          setShowMentionMenu(false);
          return;
        }
        e.preventDefault();
        onReject();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (transformedCode) {
          onAccept(transformedCode);
        } else if (prompt.trim()) {
          handleTransform();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, transformedCode, prompt, showMentionMenu]);

  if (!isOpen) return null;

  // Handle input change to detect '@' for mention menu
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);

    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx !== -1 && (lastAtIdx === 0 || val[lastAtIdx - 1] === ' ')) {
      const q = val.slice(lastAtIdx + 1);
      if (!q.includes(' ')) {
        setShowMentionMenu(true);
        setMentionSearchQuery(q);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const handleTransform = async () => {
    if (!prompt.trim() || !selectedCode) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      // Build high-context prompt
      let contextBlock = '';
      if (contextChips.length > 0) {
        contextBlock = '\n\nATTACHED PROJECT CONTEXT:\n';
        contextChips.forEach((chip) => {
          if (chip.type === 'file' && chip.data.content) {
            contextBlock += `--- FILE: ${chip.data.filePath} ---\n${chip.data.content.substring(0, 1000)}\n\n`;
          } else if (chip.type === 'symbol') {
            contextBlock += `--- SYMBOL: ${chip.data.symbolName} (${chip.data.symbolKind}) in ${chip.data.filePath} ---\n\n`;
          } else if (chip.type === 'git') {
            contextBlock += `--- GIT STATUS & DIFF ---\n${chip.data.content}\n\n`;
          } else if (chip.type === 'terminal') {
            contextBlock += `--- RECENT TERMINAL LOGS ---\n${chip.data.content}\n\n`;
          }
        });
      }

      const fullInstruction = `You are a Principal Software Engineer performing an inline code transformation in ${filePath}.
TASK: ${prompt}
${contextBlock}
ORIGINAL CODE SNIPPET (Lines ${selectionRange?.startLine || 1} to ${selectionRange?.endLine || 1}):
\`\`\`
${selectedCode}
\`\`\`

REQUIREMENT:
Return ONLY the transformed replacement code for this exact snippet.
Do NOT include markdown code blocks, do NOT write explanations, do NOT wrap with \`\`\` or comments unless part of the code.
Return just the raw clean code.`;

      let generated = '';
      const res = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel === 'webgpu' ? 'qwen2.5:1.5b' : selectedModel,
          prompt: fullInstruction,
          stream: false,
          temperature: 0.2
        })
      });

      if (res.ok) {
        const data = await res.json();
        generated = (data.response || '').trim();
      } else {
        // Fallback to standard generate
        const fallbackRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullInstruction })
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          generated = (fbData.code || fbData.response || '').trim();
        } else {
          throw new Error('Local AI model endpoint unavailable');
        }
      }

      // Strip any markdown backtick formatting if model added it
      generated = generated.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
      setTransformedCode(generated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Transformation failed. Ensure Ollama is running or check model status.');
    } finally {
      setIsGenerating(false);
    }
  };

  const quickPrompts = [
    '⚡ Refactor cleanly',
    '🛡️ Add TypeScript types & JSDoc',
    '🚀 Optimize performance',
    '🧯 Add try/catch & error handling',
    '🧪 Write unit test',
    '💡 Convert to async/await'
  ];

  // Diff stats
  const originalLines = selectedCode.split('\n');
  const transformedLines = (transformedCode || '').split('\n');
  const lineDelta = transformedLines.length - originalLines.length;

  return (
    <div className="fixed inset-x-0 top-14 z-[9999] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-150">
      <div className="w-full max-w-2xl bg-[#14151b]/95 backdrop-blur-xl border-2 border-indigo-500/80 rounded-2xl shadow-2xl shadow-black/95 p-4 pointer-events-auto flex flex-col gap-3 font-sans text-zinc-100 relative">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Sparkles size={16} className="animate-pulse text-indigo-400" />
            <span>Inline AI Code Transformer</span>
            <span className="px-1.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 rounded text-[10px] font-mono">
              Ctrl+K
            </span>
            {selectionRange && (
              <span className="text-[10px] text-zinc-400 font-mono font-normal">
                {filePath} • Lines {selectionRange.startLine}-{selectionRange.endLine}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-[#1c1d25] border border-zinc-700/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="qwen2.5:1.5b">⚡ Qwen 2.5 Coder (Local)</option>
              <option value="llama3.2:3b">🦙 Llama 3.2 3B</option>
              <option value="claude-3-5-sonnet">🌐 Claude 3.5 Sonnet</option>
              <option value="webgpu">💻 WebGPU Offline</option>
            </select>

            <button
              onClick={onReject}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* CONTEXT CHIPS BAR */}
        <div className="relative">
          <ContextChipsBar
            chips={contextChips}
            onAddChip={(c) => setContextChips((prev) => [...prev, c])}
            onRemoveChip={(id) => setContextChips((prev) => prev.filter((c) => c.id !== id))}
            onClearAllChips={() => setContextChips([])}
            isOpen={showMentionMenu}
            onClose={() => setShowMentionMenu(false)}
            searchQuery={mentionSearchQuery}
            onSelectOption={() => {
              const lastAt = prompt.lastIndexOf('@');
              if (lastAt !== -1) {
                setPrompt(prompt.slice(0, lastAt));
              }
              inputRef.current?.focus();
            }}
            workspaceFiles={workspaceFiles}
            recentTerminalLogs={recentTerminalLogs}
            gitStatusSummary={gitStatusSummary}
          />
        </div>

        {/* INPUT PROMPT FIELD */}
        <div className="flex items-center gap-2 bg-[#1c1d25] px-3.5 py-2.5 rounded-xl border border-zinc-700 focus-within:border-indigo-500 transition-colors shadow-inner">
          <input
            ref={inputRef}
            type="text"
            placeholder="What would you like to do? (Type @ for files/symbols, or choose a prompt below)..."
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey && !showMentionMenu) {
                e.preventDefault();
                handleTransform();
              }
            }}
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none flex-1 font-sans"
          />

          <button
            type="button"
            onClick={() => setShowMentionMenu(true)}
            className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded border border-zinc-700/60 transition-colors cursor-pointer"
            title="Attach Context (@file, @symbol, @git, @terminal)"
          >
            @ Context
          </button>

          <button
            onClick={handleTransform}
            disabled={isGenerating || !prompt.trim()}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isGenerating ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
            {isGenerating ? 'Generating...' : 'Transform'}
          </button>
        </div>

        {/* QUICK PROMPT PILLS */}
        {!transformedCode && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 scrollbar-none select-none">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPrompt(p.replace(/^[^\w\s]+/, '').trim());
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 bg-[#1c1d25] hover:bg-indigo-950/40 text-zinc-300 hover:text-indigo-200 border border-zinc-800 hover:border-indigo-600/50 rounded-lg whitespace-nowrap transition-all cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="p-2.5 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer ml-2">
              <X size={13} />
            </button>
          </div>
        )}

        {/* INLINE DIFF PREVIEW IF TRANSFORMED */}
        {transformedCode && (
          <div className="flex flex-col gap-2.5 bg-[#0a0b0e] p-3.5 rounded-xl border border-zinc-800 shadow-xl">
            {/* DIFF HEADER */}
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Proposed Transformation Diff</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${lineDelta >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                  {lineDelta >= 0 ? `+${lineDelta}` : lineDelta} lines
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  title="Toggle Split / Unified View"
                >
                  {viewMode === 'unified' ? <Columns size={12} /> : <AlignJustify size={12} />}
                  <span>{viewMode === 'unified' ? 'Split View' : 'Unified View'}</span>
                </button>
                <span className="text-[10px] text-zinc-500 font-normal font-sans">
                  Ctrl+Enter to Accept • Esc to Reject
                </span>
              </div>
            </div>

            {/* DIFF VIEW CONTAINER */}
            <div className="max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed p-2.5 bg-[#101116] rounded-xl border border-zinc-800/90 custom-scrollbar">
              {viewMode === 'unified' ? (
                <div className="flex flex-col gap-2">
                  {/* ORIGINAL REMOVED */}
                  <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-2">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                      <span>- Original Code ({originalLines.length} lines)</span>
                    </div>
                    <pre className="text-red-300/80 line-through whitespace-pre-wrap font-mono text-[11px] select-text">
                      {selectedCode}
                    </pre>
                  </div>

                  {/* TRANSFORMED ADDED */}
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                      <span>+ Transformed Code ({transformedLines.length} lines)</span>
                    </div>
                    <pre className="text-emerald-300 whitespace-pre-wrap font-mono text-[11px] select-text font-medium">
                      {transformedCode}
                    </pre>
                  </div>
                </div>
              ) : (
                /* SPLIT VIEW */
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-2 overflow-x-auto">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">
                      Original
                    </div>
                    <pre className="text-red-300/80 whitespace-pre font-mono text-[11px]">
                      {selectedCode}
                    </pre>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2 overflow-x-auto">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                      Transformed
                    </div>
                    <pre className="text-emerald-300 whitespace-pre font-mono text-[11px]">
                      {transformedCode}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BANNER */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTransform}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                  Retry
                </button>

                <button
                  onClick={() => setTransformedCode(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Edit Prompt
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onReject}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={13} />
                  Reject (Esc)
                </button>

                <button
                  onClick={() => onAccept(transformedCode)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Check size={14} />
                  Accept Changes (Ctrl+Enter)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
