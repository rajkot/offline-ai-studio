"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Play,
  Copy,
  Check,
  RefreshCw,
  X,
  Sparkles,
  Layers,
  Terminal,
  MousePointer,
  Gauge,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  Activity,
  Maximize2
} from "lucide-react";
import { JevSnapshotResult, JevActionElement, JevPlanStep } from "@/lib/ai/jevUltraFastEngine";

interface JevUltraFastStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteInBrowser?: (action: JevPlanStep) => void;
}

export const JevUltraFastStudioModal: React.FC<JevUltraFastStudioModalProps> = ({
  isOpen,
  onClose,
  onExecuteInBrowser
}) => {
  const [targetUrl, setTargetUrl] = useState<string>("http://localhost:3000");
  const [goal, setGoal] = useState<string>("Click 'Run Agent' and search codebase");
  const [snapshot, setSnapshot] = useState<JevSnapshotResult | null>(null);
  const [plan, setPlan] = useState<JevPlanStep | null>(null);
  const [selectedElement, setSelectedElement] = useState<JevActionElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"actions" | "plan" | "tokens" | "script">("actions");

  useEffect(() => {
    if (isOpen) {
      handleSnapshot();
    }
  }, [isOpen]);

  const handleSnapshot = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/jev-ultrafast?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        if (data.snapshot.actions.length > 0) {
          setSelectedElement(data.snapshot.actions[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch JEV snapshot:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanStep = async () => {
    if (!goal.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/jev-ultrafast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          url: targetUrl,
          goal
        })
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setActiveTab("plan");
      }
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch (err) {
      console.error("Failed to plan JEV step:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[88vh] bg-[#14141e] border border-[#2b2b3f] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262638] bg-[#0f0f17]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-yellow-400 shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-amber-200 to-orange-300 bg-clip-text text-transparent">
                  JEV Ultra-Fast DOM & Browser Agent
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  Browser-Use × TypeSafe
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Single-roundtrip speculative action space with 95%+ token context reduction (&lt;10ms snapshot)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSnapshot}
              title="Refresh DOM Snapshot"
              className="p-2 rounded-lg bg-[#1f1f2e] hover:bg-[#2a2a3e] text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1f1f2e] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Goal & Input Bar */}
        <div className="px-6 py-3 bg-[#181824] border-b border-[#262638] flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 font-mono">GOAL:</span>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Find one-way flights to London on Sep 20 or Click 'Run Agent'"
              className="flex-1 px-3 py-1.5 bg-[#101018] border border-[#2b2b3e] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <button
            onClick={handlePlanStep}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Speculate Step (1 Roundtrip)
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Indexed Action Element Table */}
          <div className="w-[460px] border-r border-[#262638] bg-[#111119] flex flex-col overflow-hidden">
            {/* Action Bar */}
            <div className="p-3 border-b border-[#20202e] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Indexed Action Space ({snapshot?.actions.length || 0})
              </span>
              <button
                onClick={() => {
                  if (snapshot?.formattedActionTable) {
                    navigator.clipboard.writeText(snapshot.formattedActionTable);
                    setCopiedTable(true);
                    setTimeout(() => setCopiedTable(false), 2000);
                  }
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-[#1e1e2c] hover:bg-[#28283a] text-slate-300 flex items-center gap-1 transition-colors"
              >
                {copiedTable ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedTable ? "Copied" : "Copy Table"}
              </button>
            </div>

            {/* Element List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {snapshot?.actions.map((act) => {
                const isSelected = selectedElement?.id === act.id;
                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedElement(act)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border font-mono ${
                      isSelected
                        ? "bg-amber-950/40 border-amber-500/60 text-white shadow-sm"
                        : "bg-[#161622]/60 border-transparent hover:bg-[#1e1e2d] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                          [{act.id}]
                        </span>
                        <span className="text-[11px] text-amber-200/90 font-semibold">{act.role}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222233] text-slate-400">
                        {act.kind}
                      </span>
                    </div>
                    <div className="text-xs font-sans text-slate-200 mt-1 truncate">
                      {act.label}
                    </div>
                    {act.value && (
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        value: {act.value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Decision Panel & Visual Metrics */}
          <div className="flex-1 flex flex-col bg-[#14141e] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#262638] bg-[#12121b] px-4">
              <button
                onClick={() => setActiveTab("actions")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "actions"
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Element Inspector
              </button>
              <button
                onClick={() => setActiveTab("plan")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "plan"
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Decision & Reasoning
              </button>
              <button
                onClick={() => setActiveTab("tokens")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "tokens"
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Token Efficiency (95% Savings)
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === "actions" && selectedElement && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#191926] border border-[#2b2b3e]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-amber-400">Target Element [{selectedElement.id}]</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono">
                        {selectedElement.role}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-2">
                      <strong>Label:</strong> {selectedElement.label}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono text-slate-300">
                      <div className="p-3 bg-[#11111a] rounded-lg border border-[#242436]">
                        <span className="text-slate-500 block">Operation Kind:</span>
                        <span className="text-amber-300 font-bold">{selectedElement.kind}</span>
                      </div>
                      <div className="p-3 bg-[#11111a] rounded-lg border border-[#242436]">
                        <span className="text-slate-500 block">Bounding Box:</span>
                        <span>{selectedElement.rect.w}×{selectedElement.rect.h} at ({selectedElement.rect.x}, {selectedElement.rect.y})</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#191926] border border-[#2b2b3e]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      JEV Action Space Formatted Spec:
                    </h4>
                    <pre className="p-3 bg-[#0d0d15] rounded-lg border border-[#222234] text-xs font-mono text-amber-200/90 whitespace-pre-wrap">
{`[${selectedElement.id}] ${selectedElement.role.padEnd(10)} ${selectedElement.label}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === "plan" && (
                <div className="space-y-4">
                  {plan ? (
                    <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-[#191926] border border-amber-500/50">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
                          OPERATION: {plan.operation}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {(plan.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-sm font-semibold text-white">
                          Speculative Target: <span className="text-amber-300 font-mono">{plan.speculativeTarget}</span>
                        </div>
                        {plan.textToType && (
                          <div className="text-xs text-slate-300 font-mono p-2 bg-[#12121b] rounded-md border border-[#28283c]">
                            Text to type: <span className="text-emerald-300">"{plan.textToType}"</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed mt-2">
                          <strong>Decision Reasoning:</strong> {plan.reasoning}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#313146] flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          ⚡ Resolved in 1 single network roundtrip (&lt;15ms)
                        </span>
                        {onExecuteInBrowser && (
                          <button
                            onClick={() => onExecuteInBrowser(plan)}
                            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                          >
                            Execute in Browser <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Enter a goal above and click "Speculate Step" to generate the single-roundtrip decision.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tokens" && snapshot && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#191926] border border-[#2b2b3e]">
                      <span className="text-xs text-slate-400 block">Raw HTML Size</span>
                      <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                        {(snapshot.rawHtmlByteSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#191926] border border-[#2b2b3e]">
                      <span className="text-xs text-slate-400 block">JEV Action Space</span>
                      <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                        {(snapshot.jevPayloadByteSize / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-tr from-amber-950/50 to-orange-950/40 border border-amber-500/40">
                      <span className="text-xs text-amber-300 block font-bold">Token Reduction</span>
                      <span className="text-xl font-bold font-mono text-amber-200 mt-1 block">
                        ~{snapshot.tokenSavingsPercent}% Saved
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#191926] border border-[#2b2b3e]">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Why JEV is 10x Faster:
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                      <li><strong>No screenshots in the default agent loop:</strong> JEV feeds structured, pre-indexed action space directly to the LLM.</li>
                      <li><strong>Single network roundtrip:</strong> Operation and target decisions share the same observed state.</li>
                      <li><strong>Atomic snapshotting:</strong> Reads visible controls, names, values, and text in one atomic execution.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
