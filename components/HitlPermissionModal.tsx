'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileCode,
  Database,
  GitBranch,
  Terminal,
  Check,
  X,
  Lock,
  Radio
} from 'lucide-react';
import {
  agentToolPipeline,
  HitlPermissionRequest
} from '@/lib/ai/AgentToolPipeline';

export default function HitlPermissionModal() {
  const [requests, setRequests] = useState<HitlPermissionRequest[]>([]);

  useEffect(() => {
    const unsub = agentToolPipeline.subscribeHitlRequests((newReqs) => {
      setRequests([...newReqs]);
    });
    return unsub;
  }, []);

  if (requests.length === 0) return null;

  const currentReq = requests[0];

  const handleApprove = () => {
    agentToolPipeline.resolveHitlRequest(currentReq.id, true);
  };

  const handleReject = () => {
    agentToolPipeline.resolveHitlRequest(currentReq.id, false);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'file_write':
      case 'file_delete':
        return <FileCode className="text-amber-400" size={20} />;
      case 'db_mutation':
        return <Database className="text-rose-400" size={20} />;
      case 'git_reset':
        return <GitBranch className="text-orange-400" size={20} />;
      default:
        return <Terminal className="text-indigo-400" size={20} />;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700/70 rounded uppercase font-mono">CRITICAL RISK</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/70 rounded uppercase font-mono">HIGH RISK</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-700/70 rounded uppercase font-mono">MEDIUM RISK</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700/70 rounded uppercase font-mono">ACTION REVIEW</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-150">
      <div className="w-full max-w-lg bg-[#141218] border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-rose-950/80 border-b border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400">
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-wide text-zinc-100 uppercase">Human-In-The-Loop (HITL) Gate</span>
                {getRiskBadge(currentReq.riskLevel)}
              </div>
              <p className="text-[11px] text-amber-200/80">Permission required for autonomous MCP tool execution</p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded border border-zinc-800">
            Queue: {requests.length}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 bg-[#121016]">
          <div className="flex items-start gap-3 p-3 bg-neutral-900/90 border border-zinc-800 rounded-lg">
            {getActionIcon(currentReq.actionType)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-zinc-200">{currentReq.toolName}()</span>
                <span className="text-[10px] text-zinc-500 font-mono">Tool Call ID: {currentReq.id.slice(0, 12)}</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1">{currentReq.description}</p>
            </div>
          </div>

          {/* Arguments payload JSON inspector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400">Tool Parameters Payload:</span>
            </div>
            <pre className="p-2.5 bg-[#0a080e] border border-zinc-800 rounded-lg text-[11px] font-mono text-emerald-400 max-h-48 overflow-y-auto select-text">
              {JSON.stringify(currentReq.arguments, null, 2)}
            </pre>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-950/30 border border-amber-800/30 rounded-lg text-[11px] text-amber-300/90">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <span>
              Autonomous agent has paused execution. Approve to proceed with mutation or reject to safeguard workspace state.
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 bg-[#17141d] border-t border-zinc-800/80 flex items-center justify-between gap-3">
          <button
            onClick={handleReject}
            className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg font-medium text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X size={14} className="text-rose-400" />
            <span>Reject &amp; Abort</span>
          </button>

          <button
            onClick={handleApprove}
            className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-xs shadow-lg shadow-amber-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check size={14} />
            <span>Approve &amp; Execute Tool</span>
          </button>
        </div>
      </div>
    </div>
  );
}
