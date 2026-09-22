'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Zap,
  Bug,
  Sparkles,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileCode,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { PreCommitAuditIssue, PreCommitReviewResponse } from '@/app/api/git/pre-commit-review/route';

interface PreCommitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitApplied?: (commitMessage: string) => void;
  customDiff?: string;
}

export default function PreCommitReviewModal({
  isOpen,
  onClose,
  onCommitApplied,
  customDiff
}: PreCommitReviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reviewData, setReviewData] = useState<PreCommitReviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'security' | 'performance' | 'reliability' | 'diff'>('all');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReview = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/git/pre-commit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff: customDiff || '' })
      });
      const data: PreCommitReviewResponse = await res.json();
      setReviewData(data);
      if (data.commitMessage) {
        setCommitMessage(data.commitMessage);
      }
    } catch (err: any) {
      setErrorMsg('Failed to run AI pre-commit code audit: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReview();
    }
  }, [isOpen, customDiff]);

  const handleCommit = async (andPush = false) => {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          message: commitMessage.trim(),
          stageAll: true
        })
      });
      const data = await res.json();
      if (data.success) {
        if (andPush) {
          await fetch('/api/git', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', direction: 'push' })
          });
        }
        if (onCommitApplied) onCommitApplied(commitMessage);
        onClose();
      } else {
        throw new Error(data.error || 'Commit failed');
      }
    } catch (err: any) {
      setErrorMsg(`Commit error: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(commitMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const score = reviewData?.score ?? 100;
  const issues = reviewData?.issues || [];
  const securityIssues = issues.filter(i => i.category === 'security');
  const performanceIssues = issues.filter(i => i.category === 'performance');
  const reliabilityIssues = issues.filter(i => i.category === 'reliability');

  const displayedIssues =
    activeTab === 'all'
      ? issues
      : activeTab === 'security'
      ? securityIssues
      : activeTab === 'performance'
      ? performanceIssues
      : activeTab === 'reliability'
      ? reliabilityIssues
      : [];

  const getScoreColor = (sc: number) => {
    if (sc >= 85) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
    if (sc >= 65) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    return 'text-rose-400 border-rose-500/50 bg-rose-950/30';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c0d13] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans text-zinc-100">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#14151e] border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI Pre-Commit Code Reviewer</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  Staged Diff Audit
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated security leak detection, memory & performance audit, and bug prevention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReview}
              disabled={isLoading}
              title="Re-run AI Pre-Commit Audit"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-indigo-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCORECARD BAR */}
        <div className="px-6 py-3.5 bg-[#0f1017] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Score Circle & Verdict */}
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${getScoreColor(score)}`}>
              <span className="text-xl font-extrabold font-mono">{score}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">/ 100 Safe</span>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                {reviewData?.verdict === 'SAFE_TO_COMMIT' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Passed AI Security & Reliability Checks
                  </span>
                ) : reviewData?.verdict === 'NEEDS_ATTENTION' ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={14} /> Warning: Potential Issues Detected
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle size={14} /> Blocked: Critical Security/Reliability Findings
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 max-w-lg truncate mt-0.5">
                {reviewData?.summary || 'Analyzing code modifications...'}
              </div>
            </div>
          </div>

          {/* Diff Stats Chips */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300">
              {reviewData?.stats.filesChanged ?? 0} file(s)
            </span>
            <span className="px-2 py-1 bg-emerald-950/60 border border-emerald-700/50 rounded-md text-emerald-400">
              +{reviewData?.stats.additions ?? 0}
            </span>
            <span className="px-2 py-1 bg-rose-950/60 border border-rose-700/50 rounded-md text-rose-400">
              -{reviewData?.stats.deletions ?? 0}
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 bg-[#11121a] border-b border-zinc-800 flex items-center gap-1 text-xs shrink-0 select-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Findings ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'security' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield size={13} className={securityIssues.length > 0 ? 'text-rose-400' : 'text-zinc-500'} />
            Security & Secrets ({securityIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'performance' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap size={13} className={performanceIssues.length > 0 ? 'text-amber-400' : 'text-zinc-500'} />
            Performance & Leaks ({performanceIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('reliability')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reliability' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bug size={13} className={reliabilityIssues.length > 0 ? 'text-cyan-400' : 'text-zinc-500'} />
            Bugs & Edge Cases ({reliabilityIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'diff' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode size={13} className="text-zinc-400" />
            Raw Diff
          </button>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw size={28} className="animate-spin text-indigo-400" />
              <p className="text-xs font-semibold">Running security heuristics & deep model code analysis...</p>
            </div>
          ) : activeTab === 'diff' ? (
            <div className="bg-[#08090d] border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed select-text">
              {reviewData?.diff ? (
                reviewData.diff.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+') && !line.startsWith('+++');
                  const isDel = line.startsWith('-') && !line.startsWith('---');
                  const isHeader = line.startsWith('@@') || line.startsWith('diff --git');
                  return (
                    <div
                      key={idx}
                      className={`${
                        isAdd
                          ? 'bg-emerald-950/40 text-emerald-300'
                          : isDel
                          ? 'bg-rose-950/40 text-rose-300'
                          : isHeader
                          ? 'text-indigo-400 font-bold'
                          : 'text-zinc-400'
                      } px-1.5 py-0.5 whitespace-pre`}
                    >
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="text-zinc-500 italic">No diff content available.</div>
              )}
            </div>
          ) : displayedIssues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
              <h4 className="text-sm font-bold text-zinc-200">No issues flagged in this category</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                The staged diff complies with security, performance, and reliability policies.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedIssues.map((issue, idx) => {
                const isCrit = issue.severity === 'critical';
                const isWarn = issue.severity === 'warning';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isCrit
                        ? 'bg-rose-950/20 border-rose-800/60 shadow-sm'
                        : isWarn
                        ? 'bg-amber-950/20 border-amber-800/60 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded font-mono ${
                            isCrit
                              ? 'bg-rose-900/80 text-rose-200 border border-rose-600/50'
                              : isWarn
                              ? 'bg-amber-900/80 text-amber-200 border border-amber-600/50'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <h4 className="text-xs font-bold text-white">{issue.title}</h4>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 shrink-0">
                        <FileCode size={11} className="text-zinc-500" />
                        <span>{issue.filePath}</span>
                        {issue.line && <span className="text-indigo-400">:{issue.line}</span>}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{issue.description}</p>

                    {issue.suggestion && (
                      <div className="mt-2.5 p-2.5 bg-black/40 border border-zinc-800/80 rounded-lg text-xs flex items-start gap-2">
                        <Sparkles size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-zinc-300">Suggested Resolution:</span>{' '}
                          <span className="text-zinc-400">{issue.suggestion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ERROR MESSAGE NOTIFICATION */}
        {errorMsg && (
          <div className="px-6 py-2 bg-rose-950 border-t border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* FOOTER: COMMIT SYNTHESIS & ACTIONS */}
        <div className="p-5 bg-[#12131b] border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="flex-1 w-full flex items-center gap-2 bg-[#181922] border border-zinc-700 rounded-xl px-3 py-1.5">
            <GitCommit size={15} className="text-indigo-400 shrink-0" />
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Conventional commit message (e.g. feat: implement...)"
              className="flex-1 bg-transparent border-none text-xs text-zinc-200 focus:outline-none placeholder-zinc-500 font-mono"
            />
            <button
              onClick={handleCopyMessage}
              title="Copy commit message"
              className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => handleCommit(false)}
              disabled={isCommitting || !commitMessage.trim()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <GitCommit size={14} />
              {isCommitting ? 'Committing...' : 'Commit Changes'}
            </button>
            <button
              onClick={() => handleCommit(true)}
              disabled={isCommitting || !commitMessage.trim()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight size={14} />
              Commit & Push
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
