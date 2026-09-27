'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  Terminal,
  FileCode,
  Sparkles,
  RefreshCw,
  Cpu,
  Settings,
  HelpCircle,
  Eye,
  Check,
  Ban
} from 'lucide-react';
import { ClineMode, ClineToolCall, ClinePermissionsConfig } from '@/lib/ai/clineProtocolEngine';

interface ClineRooStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityItem {
  id: string;
  type: 'plan' | 'tool_call' | 'approval_required' | 'result' | 'summary';
  title: string;
  detail?: string;
  toolCall?: ClineToolCall;
  status: 'pending' | 'running' | 'success' | 'blocked' | 'rejected';
  timestamp: number;
}

export default function ClineRooStudioModal({ isOpen, onClose }: ClineRooStudioModalProps) {
  const [modes, setModes] = useState<ClineMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('code');
  const [promptInstructions, setPromptInstructions] = useState<string>('');
  const [goalInput, setGoalInput] = useState<string>('Audit project dependencies and synthesize automated test plan');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<string>('idle');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pendingApproval, setPendingApproval] = useState<ActivityItem | null>(null);

  const [permissions, setPermissions] = useState<ClinePermissionsConfig>({
    autoApproveRead: true,
    autoApproveWrite: false,
    autoApproveExecute: false,
    autoApproveBrowser: false,
    autoApproveMcp: false,
    blockedCommands: ['rm -rf /', 'format c:', 'shutdown']
  });

  // Fetch modes on load
  useEffect(() => {
    if (isOpen) {
      fetch('/api/cline?action=modes')
        .then(r => r.json())
        .then(data => {
          if (data.modes) {
            setModes(data.modes);
          }
          if (data.defaultPermissions) {
            setPermissions(data.defaultPermissions);
          }
        })
        .catch(err => console.error('Failed to load Cline modes:', err));
    }
  }, [isOpen]);

  // Fetch mode prompt when mode changes
  useEffect(() => {
    if (selectedMode) {
      fetch(`/api/cline?action=prompt&mode=${selectedMode}`)
        .then(r => r.json())
        .then(data => {
          if (data.prompt) {
            setPromptInstructions(data.prompt);
          }
        })
        .catch(() => {});
    }
  }, [selectedMode]);

  if (!isOpen) return null;

  const currentModeObj = modes.find(m => m.slug === selectedMode) || modes[0];

  const handleStartPlanAndAct = async () => {
    if (!goalInput.trim() || isRunning) return;

    setIsRunning(true);
    setActiveStep('planning');

    const newActivities: ActivityItem[] = [
      {
        id: `act-${Date.now()}-1`,
        type: 'plan',
        title: `Formulating Autonomous Plan in ${currentModeObj?.name || 'Code'} Mode`,
        detail: `Goal: "${goalInput}"`,
        status: 'running',
        timestamp: Date.now()
      }
    ];
    setActivities(newActivities);

    // Simulate multi-turn autonomous loop
    setTimeout(async () => {
      newActivities[0].status = 'success';

      // Step 2: Milestone breakdown
      const inspectToolCall: ClineToolCall = {
        name: 'read_file',
        parameters: { path: 'package.json' },
        rawXml: '<read_file><path>package.json</path></read_file>'
      };

      const step2: ActivityItem = {
        id: `act-${Date.now()}-2`,
        type: 'tool_call',
        title: 'Action: Inspect Dependencies',
        detail: 'read_file(package.json)',
        toolCall: inspectToolCall,
        status: 'running',
        timestamp: Date.now()
      };

      setActivities([...newActivities, step2]);
      setActiveStep('acting');

      // Execute step 2
      try {
        const res = await fetch('/api/cline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute_step',
            toolCall: inspectToolCall,
            permissions
          })
        });
        const resData = await res.json();
        step2.status = resData.success ? 'success' : 'blocked';
        step2.detail = resData.output?.slice(0, 180) + '...';

        // Step 3: Command execution requiring approval (HITL)
        const cmdToolCall: ClineToolCall = {
          name: 'execute_command',
          parameters: { command: 'npm test -- --bail' },
          rawXml: '<execute_command><command>npm test -- --bail</command></execute_command>'
        };

        const step3: ActivityItem = {
          id: `act-${Date.now()}-3`,
          type: permissions.autoApproveExecute ? 'tool_call' : 'approval_required',
          title: 'Action: Execute Test Verification Suite',
          detail: 'execute_command("npm test -- --bail")',
          toolCall: cmdToolCall,
          status: permissions.autoApproveExecute ? 'success' : 'pending',
          timestamp: Date.now()
        };

        const updated = [...newActivities, step2, step3];
        setActivities(updated);

        if (!permissions.autoApproveExecute) {
          setPendingApproval(step3);
          setActiveStep('awaiting_approval');
        } else {
          finishLoop(updated);
        }
      } catch (err: any) {
        step2.status = 'blocked';
        step2.detail = err.message;
        setIsRunning(false);
        setActiveStep('idle');
      }
    }, 1200);
  };

  const handleApprovePending = () => {
    if (!pendingApproval) return;
    const updated = activities.map(act => {
      if (act.id === pendingApproval.id) {
        return { ...act, status: 'success' as const, detail: 'Approved by human operator. Completed successfully.' };
      }
      return act;
    });
    setActivities(updated);
    setPendingApproval(null);
    finishLoop(updated);
  };

  const handleRejectPending = () => {
    if (!pendingApproval) return;
    const updated = activities.map(act => {
      if (act.id === pendingApproval.id) {
        return { ...act, status: 'rejected' as const, detail: 'Rejected by human operator.' };
      }
      return act;
    });
    setActivities(updated);
    setPendingApproval(null);
    setIsRunning(false);
    setActiveStep('idle');
  };

  const finishLoop = (currentActs: ActivityItem[]) => {
    const finalAct: ActivityItem = {
      id: `act-${Date.now()}-final`,
      type: 'summary',
      title: 'Attempt Completion: Goal Satisfied',
      detail: `Autonomous plan executed. Verification complete in ${currentModeObj?.name} mode.`,
      status: 'success',
      timestamp: Date.now()
    };
    setActivities([...currentActs, finalAct]);
    setIsRunning(false);
    setActiveStep('completed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Cpu size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">Cline & Roo Code Protocol</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Autonomous Plan-and-Act
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HITL Guarded
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dynamic Modes, XML Tool Calling Protocols, and Model Context Protocol (MCP) Bus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Mode Switcher Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 overflow-x-auto gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Mode:</span>
            {modes.map(mode => {
              const isSelected = selectedMode === mode.slug;
              return (
                <button
                  key={mode.slug}
                  onClick={() => setSelectedMode(mode.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <span>{mode.icon}</span>
                  <span>{mode.name}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-zinc-400 italic truncate max-w-md hidden md:block">
            {currentModeObj?.description}
          </div>
        </div>

        {/* Content Body: Left Goal & Timeline, Right Permissions & Protocol */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Panel: Plan-and-Act Execution Loop */}
          <div className="lg:col-span-8 flex flex-col p-6 border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto">
            {/* Goal Input Card */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-6">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                🎯 Autonomous Goal / Instructions ({currentModeObj?.name} Mode)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  placeholder="Enter objective for the autonomous agent..."
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleStartPlanAndAct}
                  disabled={isRunning || !goalInput.trim()}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition ${
                    isRunning
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{activeStep === 'planning' ? 'Planning...' : activeStep === 'awaiting_approval' ? 'Waiting HITL' : 'Acting...'}</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>Execute Plan & Act</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Picks */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <span className="text-[11px] text-zinc-500">Quick Picks:</span>
                {[
                  'Audit workspace dependencies & license vulnerabilities',
                  'Draft component architectural blueprint',
                  'Synthesize failing unit test and isolate bug',
                  'Clean unused imports and verify TypeScript build'
                ].map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setGoalInput(qp)}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  >
                    {qp.split(' ')[0]} {qp.split(' ')[1]}...
                  </button>
                ))}
              </div>
            </div>

            {/* Pending HITL Approval Banner */}
            {pendingApproval && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      Human-in-the-Loop Approval Required
                    </h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Tool: <span className="font-mono text-zinc-100">{pendingApproval.toolCall?.name}</span>
                    </p>
                    <div className="font-mono text-xs bg-zinc-950 px-2.5 py-1 rounded mt-1.5 text-zinc-300 border border-zinc-800">
                      {JSON.stringify(pendingApproval.toolCall?.parameters)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={handleRejectPending}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Ban size={13} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={handleApprovePending}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Approve & Continue</span>
                  </button>
                </div>
              </div>
            )}

            {/* Plan-and-Act Activities Timeline */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Execution Timeline & Tool Dispatches
              </h3>

              {activities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                  <Sparkles size={32} className="text-zinc-600 mb-2" />
                  <p className="text-sm">Ready to begin autonomous execution.</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                    Select a mode, enter your goal, and Cline & Roo Code engine will orchestrate the dual-phase Plan-and-Act loop.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3 transition"
                    >
                      <div className="mt-0.5">
                        {act.status === 'running' && <RefreshCw size={16} className="text-blue-400 animate-spin" />}
                        {act.status === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
                        {act.status === 'pending' && <AlertTriangle size={16} className="text-amber-400 animate-bounce" />}
                        {act.status === 'rejected' && <Ban size={16} className="text-rose-400" />}
                        {act.status === 'blocked' && <AlertTriangle size={16} className="text-rose-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-zinc-200">{act.title}</h4>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {new Date(act.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {act.detail && (
                          <p className="text-xs text-zinc-400 mt-1 font-mono break-all bg-zinc-950/60 p-2 rounded border border-zinc-800/60">
                            {act.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Permissions & System Prompt Inspector */}
          <div className="lg:col-span-4 flex flex-col p-6 bg-zinc-950/40 overflow-y-auto">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Shield size={14} className="text-blue-400" />
              <span>Human-In-The-Loop Permissions</span>
            </h3>

            {/* Permissions Toggles */}
            <div className="space-y-2.5 mb-6">
              {[
                { key: 'autoApproveRead', label: 'Auto-Approve File Reads', desc: 'Allows read_file and list_files' },
                { key: 'autoApproveWrite', label: 'Auto-Approve File Writes', desc: 'Allows write_to_file and replace_in_file' },
                { key: 'autoApproveExecute', label: 'Auto-Approve Terminal Commands', desc: 'Allows safe shell commands' },
                { key: 'autoApproveBrowser', label: 'Auto-Approve Browser Actions', desc: 'Allows Playwright page navigations' },
                { key: 'autoApproveMcp', label: 'Auto-Approve MCP Tools', desc: 'Allows dynamic MCP tool invocations' }
              ].map(perm => (
                <div
                  key={perm.key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800"
                >
                  <div className="pr-2">
                    <div className="text-xs font-medium text-zinc-200">{perm.label}</div>
                    <div className="text-[10px] text-zinc-500">{perm.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={(permissions as any)[perm.key]}
                    onChange={e =>
                      setPermissions({
                        ...permissions,
                        [perm.key]: e.target.checked
                      })
                    }
                    className="accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Blocked Commands Card */}
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 mb-6">
              <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 mb-1.5">
                <Ban size={13} />
                <span>Destructive Command Blacklist</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mb-2">
                Hard-coded safety filters abort commands containing:
              </p>
              <div className="flex flex-wrap gap-1">
                {permissions.blockedCommands.map((cmd, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-300 border border-rose-800/60"
                  >
                    {cmd}
                  </span>
                ))}
              </div>
            </div>

            {/* System Prompt Preview */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Mode System Prompt
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {currentModeObj?.name} Mode
                </span>
              </div>
              <textarea
                value={promptInstructions}
                readOnly
                className="flex-1 w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
