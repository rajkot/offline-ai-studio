'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  FileCode,
  Terminal,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { TerminalErrorContext, PatchProposal, terminalAutoPatcher } from '@/lib/ai/terminalAutoPatcher';

interface TerminalAiFixModalProps {
  isOpen: boolean;
  errorContext: TerminalErrorContext | null;
  workspaceFiles: Record<string, string>;
  onClose: () => void;
  onApplyFix: (filePath: string, updatedContent: string) => void;
  onRerunCommand?: (command: string) => void;
}

export default function TerminalAiFixModal({
  isOpen,
  errorContext,
  workspaceFiles,
  onClose,
  onApplyFix,
  onRerunCommand
}: TerminalAiFixModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [patchProposal, setPatchProposal] = useState<PatchProposal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('split');

  useEffect(() => {
    if (isOpen && errorContext) {
      handleGeneratePatch();
    } else {
      setPatchProposal(null);
      setErrorMsg(null);
    }
  }, [isOpen, errorContext]);

  if (!isOpen || !errorContext) return null;

  const originalFileContent = workspaceFiles[errorContext.targetFile] || '';

  const handleGeneratePatch = async () => {
    if (!originalFileContent) {
      setErrorMsg(`Source file "${errorContext.targetFile}" not found in workspace.`);
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const proposal = await terminalAutoPatcher.generateAutoFix(errorContext, originalFileContent);
      setPatchProposal(proposal);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to synthesize AI fix');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (patchProposal) {
      onApplyFix(patchProposal.targetFile, patchProposal.patchedCode);
      onClose();
    }
  };

  const handleApplyAndRerun = () => {
    if (patchProposal) {
      onApplyFix(patchProposal.targetFile, patchProposal.patchedCode);
      if (onRerunCommand && errorContext.command) {
        onRerunCommand(errorContext.command);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0e1017] border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-950/40 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141724] border-b border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-purple-200 font-mono">Terminal AI Auto-Patcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                  Cursor &amp; Windsurf Style
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <Terminal size={11} className="text-slate-500" />
                <span>{errorContext.command}</span>
                <span>&bull;</span>
                <FileCode size={11} className="text-slate-500" />
                <span className="text-purple-300 font-semibold">{errorContext.targetFile}:{errorContext.line}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Error Trace Banner */}
        <div className="px-5 py-3 bg-rose-950/25 border-b border-rose-900/40 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <AlertTriangle size={13} className="text-rose-400" />
            <span>Failing Error Trace:</span>
          </div>
          <div className="text-rose-200/90 text-[11px] whitespace-pre-wrap max-h-24 overflow-y-auto font-mono bg-black/40 p-2 rounded border border-rose-900/30">
            {errorContext.stackSnippet || errorContext.errorMessage}
          </div>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[350px] flex flex-col space-y-3">
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-purple-400" />
              <div className="text-sm font-semibold text-purple-200">Synthesizing Automated Patch...</div>
              <div className="text-xs text-slate-500 font-mono">
                Analyzing runtime trace &bull; Pinpointing line {errorContext.line} &bull; Generating AST fix
              </div>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3">
              <div className="p-3 rounded-full bg-rose-900/30 text-rose-400 border border-rose-700/40">
                <AlertTriangle size={24} />
              </div>
              <div className="text-sm font-semibold text-rose-300">{errorMsg}</div>
              <button
                onClick={handleGeneratePatch}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                Retry AI Patching
              </button>
            </div>
          ) : patchProposal ? (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
                <span className="font-semibold text-emerald-400">Proposed Code Patch Preview:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDiffMode('split')}
                    className={`px-2 py-0.5 rounded text-[10px] ${diffMode === 'split' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setDiffMode('unified')}
                    className={`px-2 py-0.5 rounded text-[10px] ${diffMode === 'unified' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Unified
                  </button>
                </div>
              </div>

              {/* Side-by-Side Diff Comparison */}
              {diffMode === 'split' ? (
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-[250px] max-h-[400px]">
                  {/* Original */}
                  <div className="flex flex-col rounded-lg border border-rose-900/40 bg-[#07090e] overflow-hidden">
                    <div className="px-3 py-1.5 bg-rose-950/40 border-b border-rose-900/30 text-[11px] font-mono text-rose-300 font-semibold flex items-center justify-between">
                      <span>Original Code (Failing)</span>
                      <span className="text-[10px] text-rose-400">Line {errorContext.line}</span>
                    </div>
                    <pre className="flex-1 p-3 text-[11px] font-mono text-rose-200/80 overflow-y-auto whitespace-pre-wrap selection:bg-rose-900/60">
                      {patchProposal.originalCode}
                    </pre>
                  </div>

                  {/* Patched */}
                  <div className="flex flex-col rounded-lg border border-emerald-900/40 bg-[#07090e] overflow-hidden">
                    <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-900/30 text-[11px] font-mono text-emerald-300 font-semibold flex items-center justify-between">
                      <span>AI Patched Code (Fixed)</span>
                      <span className="text-[10px] text-emerald-400">✓ Ready to Apply</span>
                    </div>
                    <pre className="flex-1 p-3 text-[11px] font-mono text-emerald-200 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-900/60">
                      {patchProposal.patchedCode}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-lg border border-slate-800 bg-[#07090e] overflow-hidden max-h-[400px] flex flex-col">
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-300 font-semibold">
                    Unified Replacement Code ({patchProposal.targetFile})
                  </div>
                  <pre className="flex-1 p-3 text-[11px] font-mono text-emerald-300 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-900/60">
                    {patchProposal.patchedCode}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#12141d] border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {patchProposal && onRerunCommand && errorContext.command && (
              <button
                onClick={handleApplyAndRerun}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer"
              >
                <Terminal size={13} />
                <span>Apply &amp; Re-run Command</span>
              </button>
            )}

            <button
              onClick={handleApply}
              disabled={!patchProposal || isGenerating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-mono font-bold shadow-lg shadow-purple-900/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check size={14} />
              <span>Apply Fix to {errorContext.targetFile.split('/').pop()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
