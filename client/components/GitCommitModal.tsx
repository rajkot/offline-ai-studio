'use client';

import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  Sparkles,
  Check,
  X,
  RefreshCw,
  GitBranch,
  ArrowUp,
  Layers,
  FileCheck
} from 'lucide-react';

interface GitCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitSuccess?: () => void;
}

export default function GitCommitModal({ isOpen, onClose, onCommitSuccess }: GitCommitModalProps) {
  const [commitMsg, setCommitMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [stageAll, setStageAll] = useState(true);
  const [branch, setBranch] = useState('main');
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCommitMsg('');
      setStatusMsg(null);
      fetchStatus();
      handleGenerateAiMessage();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/git?action=status');
      const data = await res.json();
      if (data.success) {
        setBranch(data.branch || 'main');
        setStagedFiles(data.stagedFiles || []);
      }
    } catch {}
  };

  const handleGenerateAiMessage = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-commit-msg' })
      });
      const data = await res.json();
      if (data.success && data.commitMessage) {
        setCommitMsg(data.commitMessage);
      }
    } catch {
      setCommitMsg('feat: update workspace components');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async (andPush = false) => {
    if (!commitMsg.trim()) return;
    setIsCommitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          message: commitMsg,
          stageAll
        })
      });
      const data = await res.json();
      if (data.success) {
        if (andPush) {
          setStatusMsg('Pushing to remote origin...');
          await fetch('/api/git', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', direction: 'push' })
          });
        }
        setStatusMsg('✓ Commit recorded successfully!');
        if (onCommitSuccess) onCommitSuccess();
        setTimeout(() => onClose(), 900);
      } else {
        throw new Error(data.error || 'Commit failed');
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-[#14151b] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-100">
        {/* HEADER */}
        <div className="px-5 py-3.5 bg-[#1b1c24] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <GitCommit size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Commit Changes</h3>
              <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                <GitBranch size={11} className="text-emerald-400" />
                Branch: {branch}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Commit Message</label>
              <button
                onClick={handleGenerateAiMessage}
                disabled={isGenerating}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Synthesizing...' : 'Regenerate with AI'}
              </button>
            </div>
            <textarea
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="e.g. feat(editor): add real-time git gutters and range staging"
              className="w-full h-24 bg-[#0a0b0e] border border-zinc-700/80 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stageAll}
              onChange={(e) => setStageAll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
            />
            <span>Automatically stage all modified & untracked files (<code className="text-emerald-400 font-mono">git add -A</code>)</span>
          </label>

          {statusMsg && (
            <div className="p-2.5 bg-[#1b1c24] border border-zinc-700 rounded-xl text-xs font-medium text-emerald-300">
              {statusMsg}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3.5 bg-[#1b1c24] border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCommit(false)}
              disabled={isCommitting || !commitMsg.trim()}
              className="px-3.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isCommitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              Commit
            </button>

            <button
              onClick={() => handleCommit(true)}
              disabled={isCommitting || !commitMsg.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUp size={13} />
              Commit &amp; Push
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
