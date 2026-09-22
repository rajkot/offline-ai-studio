'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  Zap,
  ArrowRight,
  Sliders,
  ChevronDown
} from 'lucide-react';

interface InlineAiDiffTransformerProps {
  isOpen: boolean;
  selectedCode: string;
  selectionRange: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
  filePath: string;
  onAccept: (transformedCode: string) => void;
  onReject: () => void;
}

export default function InlineAiDiffTransformer({
  isOpen,
  selectedCode,
  selectionRange,
  filePath,
  onAccept,
  onReject
}: InlineAiDiffTransformerProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [transformedCode, setTransformedCode] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'qwen2.5:1.5b' | 'claude-3-5-sonnet' | 'webgpu'>('qwen2.5:1.5b');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTransformedCode(null);
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (Ctrl+Enter to Accept, Esc to Reject)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [isOpen, transformedCode, prompt]);

  if (!isOpen) return null;

  const handleTransform = async () => {
    if (!prompt.trim() || !selectedCode) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const fullInstruction = `You are a staff software engineer performing an inline code refactoring / transformation in ${filePath}.
TASK: ${prompt}

ORIGINAL CODE SNIPPET:
\`\`\`
${selectedCode}
\`\`\`

REQUIREMENT:
Return ONLY the clean replacement code for this exact snippet. Do NOT include markdown code blocks, do NOT include explanations, do NOT wrap with \`\`\` or comments unless requested. Return just the raw code replacement.`;

      // Call Ollama local inference first
      const res = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel === 'webgpu' ? 'qwen2.5:1.5b' : selectedModel,
          prompt: fullInstruction
        })
      });

      if (res.ok) {
        const data = await res.json();
        let cleaned = (data.response || '').trim();
        // Remove markdown triple backticks if model wrapped them
        cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
        setTransformedCode(cleaned);
      } else {
        throw new Error('Failed to generate inline code');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transformation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const quickPrompts = [
    'Refactor cleanly',
    'Add TypeScript types',
    'Optimize performance',
    'Add error handling',
    'Write unit test'
  ];

  return (
    <div className="fixed inset-x-0 top-16 z-[9999] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-150">
      <div className="w-full max-w-2xl bg-[#14151b] border-2 border-indigo-500/80 rounded-2xl shadow-2xl shadow-black/90 p-4 pointer-events-auto flex flex-col gap-3 font-sans text-zinc-100">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Sparkles size={15} className="animate-pulse" />
            <span>Inline AI Code Transformer (Cursor Ctrl+K)</span>
            {selectionRange && (
              <span className="text-[10px] text-zinc-500 font-mono font-normal">
                Lines {selectionRange.startLine}-{selectionRange.endLine}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-[#1c1d25] border border-zinc-700/80 rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="qwen2.5:1.5b">⚡ Qwen 2.5 Coder (Local)</option>
              <option value="claude-3-5-sonnet">🌐 Claude 3.5 Sonnet</option>
              <option value="webgpu">💻 WebGPU Shaders</option>
            </select>

            <button onClick={onReject} className="text-zinc-400 hover:text-white p-1 rounded cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* INPUT PROMPT FIELD */}
        <div className="flex items-center gap-2 bg-[#1c1d25] px-3.5 py-2.5 rounded-xl border border-zinc-700 focus-within:border-indigo-500 transition-colors">
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. Refactor to use useCallback with memoization, or add JSDoc..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey) {
                e.preventDefault();
                handleTransform();
              }
            }}
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none flex-1"
          />

          <button
            onClick={handleTransform}
            disabled={isGenerating || !prompt.trim()}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            Transform
          </button>
        </div>

        {/* QUICK PROMPT PILLS */}
        {!transformedCode && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 scrollbar-none">
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => {
                  setPrompt(p);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 bg-[#1c1d25] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="p-2 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* INLINE DIFF PREVIEW IF TRANSFORMED */}
        {transformedCode && (
          <div className="flex flex-col gap-2 bg-[#0a0b0e] p-3 rounded-xl border border-zinc-800">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Proposed Transformation Diff</span>
              <span className="text-[10px] text-zinc-500 font-normal">Ctrl+Enter to Accept • Esc to Reject</span>
            </div>

            <div className="max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed p-2 bg-[#121318] rounded-lg border border-zinc-800/80">
              {/* REMOVED (ORIGINAL) */}
              <div className="opacity-60 mb-2 border-b border-zinc-800 pb-2">
                <div className="text-[10px] text-red-400 font-bold uppercase mb-1">- Original Code:</div>
                <pre className="text-red-300 line-through whitespace-pre-wrap">{selectedCode}</pre>
              </div>

              {/* ADDED (NEW) */}
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">+ Transformed Code:</div>
                <pre className="text-emerald-300 whitespace-pre-wrap">{transformedCode}</pre>
              </div>
            </div>

            {/* ACTION BANNER */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                onClick={handleTransform}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                Retry
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onReject}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={13} />
                  Reject (Esc)
                </button>

                <button
                  onClick={() => onAccept(transformedCode)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
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
