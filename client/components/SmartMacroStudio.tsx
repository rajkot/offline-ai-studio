'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Play,
  RotateCcw,
  Upload,
  FileJson,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  ExternalLink,
  Table,
  Zap,
  Check,
  Copy,
  ChevronRight
} from 'lucide-react';
import { SmartMacroDefinition, SmartMacroStep, DOMElementCandidate } from '@/lib/automation/smartMacroEngine';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface SmartMacroStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialMacro?: SmartMacroDefinition;
}

export default function SmartMacroStudio({
  isOpen,
  onClose,
  initialMacro
}: SmartMacroStudioProps) {
  const [macro, setMacro] = useState<SmartMacroDefinition>(
    initialMacro || {
      id: 'custom-crm-macro',
      name: 'Custom Web & CRM Auto-Filler',
      description: 'Zero-coordinate semantic form automation with NanoJev parallel decision heads.',
      targetUrl: 'https://crm.zoho.in/crm/leads/add',
      mode: 'browser',
      steps: [
        {
          id: 'step-1',
          action: 'navigate',
          targetIntent: 'Open CRM Lead Form',
          options: { timeoutMs: 12000 }
        },
        {
          id: 'step-2',
          action: 'smartFill',
          targetIntent: 'Full Name or Contact Person',
          csvField: 'name',
          value: '{{csv.name}}',
          options: { delayAfterMs: 40 }
        },
        {
          id: 'step-3',
          action: 'smartFill',
          targetIntent: 'Customer Mobile Phone',
          csvField: 'phone',
          value: '{{csv.phone}}',
          options: { delayAfterMs: 40 }
        },
        {
          id: 'step-4',
          action: 'smartClick',
          targetIntent: 'Save Lead Button',
          options: { confirmDialog: true, delayAfterMs: 1500 }
        }
      ],
      csvData: [
        { name: 'Rajesh Patel', phone: '9825012345', city: 'Surat' },
        { name: 'Amit Sharma', phone: '9819054321', city: 'Mumbai' }
      ]
    }
  );

  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(macro, null, 2));
  const [activeTab, setActiveTab] = useState<'steps' | 'dataset' | 'candidates'>('steps');
  const [templates, setTemplates] = useState<SmartMacroDefinition[]>([]);
  const [candidates, setCandidates] = useState<DOMElementCandidate[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const [copied, setCopied] = useState(false);

  // Fetch starter templates
  useEffect(() => {
    fetch('/api/automation/macro/templates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch((err) => console.error('Failed to load templates:', err));
  }, []);

  // Sync Macro state to Monaco JSON
  const updateMacro = (newMacro: SmartMacroDefinition) => {
    setMacro(newMacro);
    setJsonText(JSON.stringify(newMacro, null, 2));
  };

  // Sync Monaco JSON to Macro state
  const handleMonacoChange = (val: string | undefined) => {
    if (!val) return;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed && parsed.steps && parsed.targetUrl) {
        setMacro(parsed);
      }
    } catch {}
  };

  // Inspect page elements
  const handleInspectPage = async () => {
    if (!macro.targetUrl) return;
    setIsInspecting(true);
    addLog(`Inspecting live page: ${macro.targetUrl}...`, 'info');

    try {
      const res = await fetch('/api/automation/macro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inspect', url: macro.targetUrl })
      });
      const data = await res.json();
      if (data.elements) {
        setCandidates(data.elements);
        setActiveTab('candidates');
        addLog(`Successfully extracted ${data.elements.length} interactive elements via Playwright.`, 'success');
      } else {
        addLog(`Inspect completed: 0 interactive elements detected.`, 'warn');
      }
    } catch (err: any) {
      addLog(`Failed to inspect page: ${err.message}`, 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  // Add Step
  const handleAddStep = (action: SmartMacroStep['action']) => {
    const newStep: SmartMacroStep = {
      id: `step-${Date.now().toString().slice(-4)}`,
      action,
      targetIntent: action === 'smartFill' ? 'Input Field Intent' : action === 'smartClick' ? 'Submit Button' : '',
      value: action === 'smartFill' ? '{{csv.field}}' : '',
      options: { delayAfterMs: 40 }
    };
    updateMacro({
      ...macro,
      steps: [...macro.steps, newStep]
    });
    addLog(`Added step "${action}" to macro.`, 'info');
  };

  // Remove Step
  const handleRemoveStep = (index: number) => {
    const updated = [...macro.steps];
    updated.splice(index, 1);
    updateMacro({ ...macro, steps: updated });
  };

  // Run Macro Batch
  const handleRunBatch = async () => {
    setIsRunning(true);
    addLog(`Initiating macro run for ${macro.name}...`, 'info');

    try {
      const res = await fetch('/api/automation/macro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', macro })
      });
      const result = await res.json();

      if (result.success) {
        addLog(`Batch completed successfully! ${result.totalProcessed} records processed.`, 'success');
      } else {
        const errorMsg = (result.errors || []).join(', ') || result.error || 'Execution encountered errors';
        addLog(`Execution finished with errors: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      addLog(`Execution failed: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, msg, type }, ...prev.slice(0, 49)]);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-7xl h-[92vh] bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">Smart Macro Studio</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> NanoJev 15ms Decision Heads
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Zero-coordinate semantic form auto-filler & CRM automation workbench
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Template Selector */}
            <select
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800/90 border border-zinc-700/80 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              onChange={(e) => {
                const selected = templates.find((t) => t.id === e.target.value);
                if (selected) {
                  updateMacro(selected);
                  addLog(`Loaded template: "${selected.name}"`, 'info');
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Load Starter Template...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* URL Target Bar */}
        <div className="flex items-center gap-3 px-6 py-2.5 bg-zinc-900/30 border-b border-zinc-800/60">
          <Globe className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={macro.targetUrl}
            onChange={(e) => updateMacro({ ...macro, targetUrl: e.target.value })}
            placeholder="Target Web or CRM URL (e.g. https://crm.zoho.in/crm/leads/add)"
            className="flex-1 bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            onClick={handleInspectPage}
            disabled={isInspecting}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/70 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            {isInspecting ? 'Inspecting DOM...' : 'Inspect Page'}
          </button>
        </div>

        {/* Main Split Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Visual Runner & Timeline */}
          <div className="w-1/2 flex flex-col border-r border-zinc-800/80 bg-zinc-950/50">
            {/* Tabs */}
            <div className="flex items-center justify-between px-6 pt-3 border-b border-zinc-800/60">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('steps')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition border-b-2 ${
                    activeTab === 'steps'
                      ? 'border-cyan-500 text-cyan-400 bg-zinc-900/50'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Automation Steps ({macro.steps.length})
                </button>
                <button
                  onClick={() => setActiveTab('dataset')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition border-b-2 ${
                    activeTab === 'dataset'
                      ? 'border-cyan-500 text-cyan-400 bg-zinc-900/50'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  CSV Dataset ({macro.csvData?.length || 0} rows)
                </button>
                {candidates.length > 0 && (
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition border-b-2 ${
                      activeTab === 'candidates'
                        ? 'border-cyan-500 text-cyan-400 bg-zinc-900/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Detected Nodes ({candidates.length})
                  </button>
                )}
              </div>

              {/* Add Step Dropdown / Action */}
              {activeTab === 'steps' && (
                <div className="flex items-center gap-1.5 pb-2">
                  <button
                    onClick={() => handleAddStep('smartFill')}
                    className="px-2.5 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 text-cyan-400" /> Fill
                  </button>
                  <button
                    onClick={() => handleAddStep('smartClick')}
                    className="px-2.5 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 text-indigo-400" /> Click
                  </button>
                  <button
                    onClick={() => handleAddStep('wait')}
                    className="px-2.5 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 text-amber-400" /> Wait
                  </button>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {activeTab === 'steps' && (
                <>
                  {macro.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${
                              step.action === 'smartFill'
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                : step.action === 'smartClick'
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : step.action === 'navigate'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {step.action}
                          </span>
                          <span className="text-xs font-medium text-zinc-200">
                            {step.targetIntent || step.id}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveStep(idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Step Configuration Form Inputs */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Target Intent</label>
                          <input
                            type="text"
                            value={step.targetIntent || ''}
                            onChange={(e) => {
                              const updated = [...macro.steps];
                              updated[idx] = { ...step, targetIntent: e.target.value };
                              updateMacro({ ...macro, steps: updated });
                            }}
                            placeholder="e.g. Customer Phone"
                            className="w-full text-xs px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">
                            {step.action === 'smartFill' ? 'Value / CSV Key' : 'Options'}
                          </label>
                          <input
                            type="text"
                            value={step.value || ''}
                            onChange={(e) => {
                              const updated = [...macro.steps];
                              updated[idx] = { ...step, value: e.target.value };
                              updateMacro({ ...macro, steps: updated });
                            }}
                            placeholder={step.action === 'smartFill' ? '{{csv.phone}}' : 'Optional params'}
                            className="w-full text-xs px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'dataset' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      Loaded records will be sequentially processed through the macro.
                    </span>
                    <button
                      onClick={() => {
                        const sampleRow = { name: 'New Lead', phone: '9900000000', city: 'Delhi' };
                        updateMacro({
                          ...macro,
                          csvData: [...(macro.csvData || []), sampleRow]
                        });
                      }}
                      className="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-cyan-400" /> Add Row
                    </button>
                  </div>

                  {macro.csvData && macro.csvData.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="p-2">#</th>
                            {Object.keys(macro.csvData[0]).map((key) => (
                              <th key={key} className="p-2 font-medium uppercase tracking-wider text-[10px]">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {macro.csvData.map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-900/40">
                              <td className="p-2 text-zinc-500 text-[10px]">{i + 1}</td>
                              {Object.values(row).map((val, vIdx) => (
                                <td key={vIdx} className="p-2">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                      No CSV records uploaded yet. Click &quot;Add Row&quot; or import a CSV file.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'candidates' && (
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 block mb-2">
                    Found {candidates.length} DOM elements. Click &quot;Use as Step&quot; to auto-generate a smart step.
                  </span>
                  {candidates.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-cyan-400">[{c.tagName}]</span>{' '}
                        <span className="text-zinc-200">{c.placeholder || c.ariaLabel || c.name || c.text || 'Unnamed Node'}</span>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          type=&quot;{c.type}&quot; selector=&quot;{c.selector}&quot;
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const isBtn = c.tagName === 'button' || c.type === 'submit';
                          handleAddStep(isBtn ? 'smartClick' : 'smartFill');
                        }}
                        className="px-2 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      >
                        + Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Execution Bar */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  Total Steps: <strong className="text-zinc-200">{macro.steps.length}</strong> | Rows: <strong className="text-zinc-200">{macro.csvData?.length || 0}</strong>
                </span>
              </div>
              <button
                onClick={handleRunBatch}
                disabled={isRunning}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {isRunning ? 'Running Macro Batch...' : 'Run Macro Batch'}
              </button>
            </div>
          </div>

          {/* Right Pane: Live Editable Monaco Editor + Realtime Logs */}
          <div className="w-1/2 flex flex-col bg-zinc-950">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-medium text-zinc-200">
                  {macro.id || 'macro'}.macro.json
                </span>
              </div>
              <button
                onClick={handleCopyJson}
                className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {/* Monaco Editor Component */}
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="json"
                theme="vs-dark"
                value={jsonText}
                onChange={handleMonacoChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  tabSize: 2
                }}
              />
            </div>

            {/* Realtime Event Stream Console */}
            <div className="h-44 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col">
              <div className="px-4 py-1.5 border-b border-zinc-800/60 bg-zinc-900/30 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400" /> Execution Console & Audit Log
                </span>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-1 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <span className="text-zinc-600 text-xs italic">
                    Ready. Click &quot;Run Macro Batch&quot; or &quot;Inspect Page&quot; to see real-time output.
                  </span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-zinc-500 text-[10px] flex-shrink-0">[{log.time}]</span>
                      <span
                        className={
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'error'
                            ? 'text-red-400 font-semibold'
                            : log.type === 'warn'
                            ? 'text-amber-400'
                            : 'text-zinc-300'
                        }
                      >
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
