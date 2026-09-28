"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  X,
  Code2,
  ArrowRight,
  ExternalLink,
  Bug,
  Zap,
  Lock,
  Flame,
  Check,
  Copy,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";
import { OcrReviewResult, OcrFinding, OcrSeverity } from "@/lib/ai/openCodeReviewEngine";

interface OpenCodeReviewStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  activeFileCode?: string;
  onApplyFixToEditor?: (line: number, replacement: string) => void;
  onJumpToLine?: (line: number) => void;
  onLaunchAutonomousFix?: (findingsPrompt: string) => void;
}

export const OpenCodeReviewStudioModal: React.FC<OpenCodeReviewStudioModalProps> = ({
  isOpen,
  onClose,
  activeFilePath = "components/Playground.tsx",
  activeFileCode = "",
  onApplyFixToEditor,
  onJumpToLine,
  onLaunchAutonomousFix
}) => {
  const [reviewResult, setReviewResult] = useState<OcrReviewResult | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedFinding, setSelectedFinding] = useState<OcrFinding | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      runReview();
    }
  }, [isOpen, activeFilePath, activeFileCode]);

  const runReview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/open-code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: activeFilePath,
          code: activeFileCode
        })
      });
      const data = await res.json();
      if (data.review) {
        setReviewResult(data.review);
        if (data.review.findings.length > 0) {
          setSelectedFinding(data.review.findings[0]);
        }
      }
    } catch (err) {
      console.error("Failed to execute Open Code Review:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityBadge = (sev: OcrSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950/80 text-red-300 border border-red-800/80">CRITICAL</span>;
      case "MAJOR":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">MAJOR</span>;
      case "MINOR":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-950/80 text-blue-300 border border-blue-800/80">MINOR</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">INFO</span>;
    }
  };

  const filteredFindings = reviewResult?.findings.filter(f => {
    const matchesSev = selectedSeverity === "ALL" || f.severity === selectedSeverity;
    const matchesCat = selectedCategory === "ALL" || f.category === selectedCategory;
    return matchesSev && matchesCat;
  }) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[88vh] bg-[#13131c] border border-[#262638] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222233] bg-[#0d0d15]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-600 to-amber-500 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-rose-300 bg-clip-text text-transparent">
                  Alibaba Open Code Review (OCR)
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  Static + LLM Hybrid Guard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Line-level security audits, NPE detection, race condition prevention & architectural compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runReview}
              title="Re-run Code Review"
              className="p-2 rounded-lg bg-[#1c1c28] hover:bg-[#262638] text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1c1c28] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scorecard Bar */}
        {reviewResult && (
          <div className="px-6 py-3 bg-[#171723] border-b border-[#222233] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Target File:</span>
                <span className="text-xs font-mono font-bold text-amber-300">{reviewResult.filePath}</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Health Score:</span>
                <span className={`text-sm font-mono font-bold ${
                  reviewResult.summary.healthScore >= 90 ? 'text-emerald-400' :
                  reviewResult.summary.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {reviewResult.summary.healthScore}/100
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Verdict:</span>
              {reviewResult.summary.overallVerdict === 'PASS' ? (
                <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASS
                </span>
              ) : reviewResult.summary.overallVerdict === 'PASS_WITH_WARNINGS' ? (
                <span className="px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> WARNINGS DETECTED
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> REJECT RISK
                </span>
              )}
            </div>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Findings List & Filters */}
          <div className="w-[440px] border-r border-[#222233] bg-[#0f0f18] flex flex-col overflow-hidden">
            {/* Severity Filter Chips */}
            <div className="p-3 border-b border-[#1f1f2e] flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              {["ALL", "CRITICAL", "MAJOR", "MINOR", "INFO"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedSeverity === sev
                      ? "bg-rose-600 text-white font-bold"
                      : "bg-[#181824] text-slate-400 hover:text-white"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Findings List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
              {filteredFindings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {reviewResult?.findings.length === 0
                    ? "✨ Zero defects found! Code passes all Alibaba review rulesets."
                    : "No findings match the selected filter."}
                </div>
              ) : (
                filteredFindings.map((f) => {
                  const isSelected = selectedFinding?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-rose-950/40 border-rose-500/60 shadow-md"
                          : "bg-[#151520]/60 border-transparent hover:bg-[#1d1d2c]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(f.severity)}
                          <span className="text-xs font-mono font-bold text-slate-300">
                            Line {f.line}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{f.ruleId}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1.5 line-clamp-1">
                        {f.ruleTitle}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {f.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Finding Deep Dive & Fix Panel */}
          <div className="flex-1 flex flex-col bg-[#111119] overflow-hidden">
            {selectedFinding ? (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5">
                {/* Rule Title Bar */}
                <div className="p-4 rounded-xl bg-[#171723] border border-[#242436] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(selectedFinding.severity)}
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {selectedFinding.ruleId}
                      </span>
                    </div>
                    {onJumpToLine && (
                      <button
                        onClick={() => {
                          onJumpToLine(selectedFinding.line);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-[#222234] hover:bg-[#2c2c44] text-slate-300 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        Jump to Line {selectedFinding.line}
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {selectedFinding.ruleTitle}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedFinding.description}
                  </p>
                </div>

                {/* Bad Code vs Suggested Fix */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                      ⚠️ Detected Line {selectedFinding.line}:
                    </span>
                    <pre className="p-2.5 bg-black/40 rounded-lg text-xs font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap">
                      {selectedFinding.badSnippet}
                    </pre>
                  </div>

                  {selectedFinding.suggestedFix && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                          ✨ Alibaba Recommended Fix:
                        </span>
                        <button
                          onClick={() => {
                            if (selectedFinding.suggestedFix) {
                              navigator.clipboard.writeText(selectedFinding.suggestedFix);
                              setCopiedId(selectedFinding.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-[#1f1f2e] text-slate-300 hover:text-white flex items-center gap-1"
                        >
                          {copiedId === selectedFinding.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === selectedFinding.id ? "Copied" : "Copy Fix"}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-black/40 rounded-lg text-xs font-mono text-emerald-200 overflow-x-auto whitespace-pre-wrap">
                        {selectedFinding.suggestedFix}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-4 border-t border-[#222233] flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-mono">
                    Confidence: {(selectedFinding.confidence * 100).toFixed(0)}%
                  </span>

                  <div className="flex items-center gap-2">
                    {onLaunchAutonomousFix && (
                      <button
                        onClick={() => {
                          onLaunchAutonomousFix(
                            `Fix Alibaba Code Review finding in ${activeFilePath} on Line ${selectedFinding.line}: ${selectedFinding.ruleTitle} - ${selectedFinding.description}`
                          );
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Autonomous Self-Healing Fix
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Select a code review finding on the left to inspect line details and apply fixes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
