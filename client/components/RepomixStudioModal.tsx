'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  FileCode,
  ShieldCheck,
  Copy,
  Download,
  X,
  Sparkles,
  Check,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  Code2,
  FileJson,
  Sliders,
  Zap
} from 'lucide-react';
import { RepomixFormat, RepomixPackResult } from '@/lib/ai/repomixEngine';

interface RepomixStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceFiles?: Record<string, string>;
}

export default function RepomixStudioModal({
  isOpen,
  onClose,
  workspaceFiles
}: RepomixStudioModalProps) {
  const [format, setFormat] = useState<RepomixFormat>('xml');
  const [tokenBudget, setTokenBudget] = useState<number>(64000);
  const [redactSecrets, setRedactSecrets] = useState<boolean>(true);
  const [removeComments, setRemoveComments] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [packResult, setPackResult] = useState<RepomixPackResult | null>(null);

  // Trigger packing on open or parameter change
  const handlePack = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/repomix/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          tokenBudget: tokenBudget > 0 ? tokenBudget : undefined,
          redactSecrets,
          removeComments,
          files: workspaceFiles
        })
      });

      const data = await res.json();
      if (data.success) {
        setPackResult(data);
      }
    } catch (err) {
      console.error('Failed to pack workspace with Repomix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !packResult) {
      handlePack();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!packResult?.content) return;
    navigator.clipboard.writeText(packResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!packResult?.content) return;
    const ext = format === 'xml' ? 'xml' : format === 'markdown' ? 'md' : 'json';
    const blob = new Blob([packResult.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repomix-output.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">Repomix Codebase Context Packer</h2>
                <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  yamadashy/repomix
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Packs entire repository into AI-ready, token-counted XML, Markdown, or JSON formats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePack}
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              Re-pack
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/30 text-xs">
          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Format:</span>
            <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
              {(['xml', 'markdown', 'json'] as RepomixFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    setFormat(fmt);
                  }}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                    format === fmt
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Token Budget */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Token Budget:</span>
            <select
              value={tokenBudget}
              onChange={(e) => setTokenBudget(Number(e.target.value))}
              className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={32000}>32k Tokens</option>
              <option value={64000}>64k Tokens</option>
              <option value={128000}>128k Tokens</option>
              <option value={200000}>200k Tokens (Claude Max)</option>
              <option value={0}>Unlimited</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={redactSecrets}
                onChange={(e) => setRedactSecrets(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Redact Secrets
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={removeComments}
                onChange={(e) => setRemoveComments(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              Strip Comments
            </label>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        {packResult && (
          <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Total Files Packed</span>
              <div className="text-base font-bold text-zinc-100 mt-0.5">{packResult.totalFiles}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Estimated Tokens</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {packResult.totalTokens.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Total Characters</span>
              <div className="text-base font-bold text-zinc-100 mt-0.5">
                {(packResult.totalCharacters / 1024).toFixed(1)} KB
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Secrets Redacted</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {packResult.redactedSecretsCount}
              </div>
            </div>
          </div>
        )}

        {/* Truncation Notice */}
        {packResult?.isTruncated && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Token budget reached. Lower priority files were automatically truncated to keep within context limits.</span>
          </div>
        )}

        {/* Content Preview Container */}
        <div className="flex-1 overflow-hidden relative bg-zinc-950/90 font-mono text-xs text-zinc-300">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>Packaging repository files with Repomix...</span>
            </div>
          ) : packResult ? (
            <div className="h-full overflow-auto p-4 select-text">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {packResult.content.slice(0, 15000)}
                {packResult.content.length > 15000 && (
                  <span className="text-zinc-500 italic block mt-4 border-t border-zinc-800 pt-2">
                    ... [Preview truncated in viewer. Full content ({packResult.totalCharacters.toLocaleString()} characters) is preserved on Copy / Download]
                  </span>
                )}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              Click &quot;Re-pack&quot; to generate codebase context.
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-900/60">
          <div className="text-xs text-zinc-400">
            Format: <strong className="text-zinc-200 uppercase">{format}</strong> | Secret Scrubbing: <strong className="text-emerald-400">Active</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              disabled={!packResult}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Context for AI'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!packResult}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Context File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
