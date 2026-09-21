'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Beaker,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Terminal,
  FileCode,
  Sliders,
  Zap,
  RotateCcw,
  Copy,
  Check,
  Save,
  Rocket,
  Search,
  Filter,
  Layers,
  Cpu,
  TrendingUp,
  Code2,
  Download,
  Sparkles,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export interface TddDashboardProps {
  workspaceFiles?: Record<string, string>;
  activeFilePath?: string;
  onApplyTestFile?: (filePath: string, content: string) => void;
  onSelectFile?: (filePath: string) => void;
}

export type TestFramework = 'jest' | 'vitest' | 'mocha' | 'pytest';

export interface MockConfig {
  happyPath: boolean;
  boundaryExceptions: boolean;
  loadTestInputs: boolean;
  edgeCases: boolean;
  mockServices: boolean;
}

export interface AssertionItem {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  line?: number;
  error?: string;
}

export interface GutterBadge {
  line: number;
  status: string;
  testCount?: number;
  error?: string;
}

export interface TddRunResult {
  success: boolean;
  targetFile: string;
  testFileName: string;
  framework: TestFramework;
  isAiGenerated: boolean;
  testCode: string;
  metrics: {
    successRate: number;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
    durationMs: number;
  };
  assertions: AssertionItem[];
  gutterBadges: GutterBadge[];
  logs: string[];
}

export default function TddDashboard({
  workspaceFiles = {},
  activeFilePath = '',
  onApplyTestFile,
  onSelectFile
}: TddDashboardProps) {
  // Available Workspace Files
  const availableFiles = Object.keys(workspaceFiles).length > 0
    ? Object.keys(workspaceFiles).filter(f => !f.startsWith('__') && !f.includes('node_modules'))
    : [
        'src/utils/calculator.ts',
        'components/Playground.tsx',
        'lib/languages.ts',
        'app/api/prompts/route.ts'
      ];

  // Config State
  const [targetFile, setTargetFile] = useState<string>(
    activeFilePath && !activeFilePath.startsWith('__') ? activeFilePath : availableFiles[0] || 'src/utils/calculator.ts'
  );
  const [framework, setFramework] = useState<TestFramework>('vitest');
  const [configs, setConfigs] = useState<MockConfig>({
    happyPath: true,
    boundaryExceptions: true,
    loadTestInputs: false,
    edgeCases: true,
    mockServices: true
  });
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<TddRunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  // Filter & Search State
  const [assertionFilter, setAssertionFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'split' | 'code' | 'logs' | 'source'>('split');

  const logConsoleRef = useRef<HTMLDivElement>(null);

  // Sync targetFile if activeFilePath changes
  useEffect(() => {
    if (activeFilePath && !activeFilePath.startsWith('__') && availableFiles.includes(activeFilePath)) {
      setTargetFile(activeFilePath);
    }
  }, [activeFilePath]);

  // Auto scroll console logs to bottom when run completes
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [runResult, isRunning]);

  // Main Test Runner API Call
  const handleRunTddSuite = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setHasApplied(false);

    const sourceCode = workspaceFiles[targetFile] || `// Default target source code for ${targetFile}\nexport function processData(input: number): number {\n  if (input < 0) throw new Error("Negative numbers not allowed");\n  return input * 2;\n}`;

    try {
      const response = await fetch('/api/tdd/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetFile,
          sourceCode,
          framework,
          configs,
          customInstructions
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute TDD suite');
      }

      setRunResult(data);
    } catch (err: any) {
      console.error('TDD execution error:', err);
      setErrorMsg(err?.message || 'Error communicating with TDD runner backend');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCode = () => {
    if (runResult?.testCode) {
      navigator.clipboard.writeText(runResult.testCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveTestFile = () => {
    if (runResult && onApplyTestFile) {
      const savePath = `tests/${runResult.testFileName}`;
      onApplyTestFile(savePath, runResult.testCode);
      setHasApplied(true);
    }
  };

  // Filtered assertions list
  const filteredAssertions = (runResult?.assertions || []).filter(item => {
    if (assertionFilter === 'passed' && item.status !== 'passed') return false;
    if (assertionFilter === 'failed' && item.status !== 'failed') return false;
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-950 text-white">
            <Beaker size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">🧪 TDD Studio &amp; Automated Test Runner</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full uppercase">
                {framework}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated unit test generation, assertion coverage matrix, and real-time TDD runner console.
            </p>
          </div>
        </div>

        {/* Quick Stats Header Cards */}
        {runResult && (
          <div className="flex items-center gap-3">
            {/* Success Rate Gauge */}
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8 transform -rotate-90">
                  <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="3" className="text-slate-800" fill="transparent" />
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={runResult.metrics.successRate >= 90 ? 'text-emerald-400' : runResult.metrics.successRate >= 70 ? 'text-amber-400' : 'text-rose-400'}
                    fill="transparent"
                    strokeDasharray={81.6}
                    strokeDashoffset={81.6 - (81.6 * runResult.metrics.successRate) / 100}
                  />
                </svg>
                <span className="absolute text-[9px] font-bold text-white">{Math.round(runResult.metrics.successRate)}%</span>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-medium">Success Rate</div>
                <div className="text-xs font-bold text-white">{runResult.metrics.passed}/{runResult.metrics.totalTests} Passed</div>
              </div>
            </div>

            {/* Code Coverage Metric */}
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
              <div className="p-1.5 bg-cyan-950 text-cyan-400 rounded-lg">
                <TrendingUp size={14} />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-medium">Coverage</div>
                <div className="text-xs font-bold text-cyan-300">{runResult.metrics.coverage}%</div>
              </div>
            </div>

            {/* Execution Duration Metric */}
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
              <div className="p-1.5 bg-purple-950 text-purple-400 rounded-lg">
                <Clock size={14} />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-medium">Duration</div>
                <div className="text-xs font-bold text-purple-300">{runResult.metrics.durationMs} ms</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANEL: TDD Suite Configurator */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sliders size={14} />
            <span>Interactive TDD Suite Configurator</span>
          </div>

          {/* 1. Target Code Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Target Source File:</span>
              <span className="text-[10px] text-slate-400 font-mono">{availableFiles.length} available</span>
            </label>
            <div className="relative">
              <select
                value={targetFile}
                onChange={e => setTargetFile(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-xl font-mono focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                {availableFiles.map(file => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
              <FileCode size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* 2. Test Framework Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Test Framework:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'vitest', name: 'Vitest (Vite/TS)', icon: '⚡' },
                { id: 'jest', name: 'Jest (React/JS)', icon: '🃏' },
                { id: 'mocha', name: 'Mocha + Chai', icon: '☕' },
                { id: 'pytest', name: 'PyTest (Python)', icon: '🐍' }
              ].map(fw => (
                <button
                  key={fw.id}
                  onClick={() => setFramework(fw.id as TestFramework)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    framework === fw.id
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">{fw.icon}</span>
                  <span className="text-xs">{fw.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Mock Data Generator Configurator */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Mock &amp; Scenario Generators:</span>
              <span className="text-[10px] text-indigo-400">Coverage Injection</span>
            </label>
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configs.happyPath}
                  onChange={e => setConfigs({ ...configs, happyPath: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="font-semibold text-emerald-300">Happy Path Valid Inputs</span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configs.boundaryExceptions}
                  onChange={e => setConfigs({ ...configs, boundaryExceptions: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="font-semibold text-amber-300">Boundary &amp; Exceptions Matrix</span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configs.edgeCases}
                  onChange={e => setConfigs({ ...configs, edgeCases: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="font-semibold text-cyan-300">Edge Cases &amp; Zero State Safeguards</span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configs.mockServices}
                  onChange={e => setConfigs({ ...configs, mockServices: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="font-semibold text-purple-300">Mock Services &amp; Third-Party Stubs</span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configs.loadTestInputs}
                  onChange={e => setConfigs({ ...configs, loadTestInputs: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="font-semibold text-indigo-300">High-Throughput Load Parameter Matrix</span>
              </label>
            </div>
          </div>

          {/* 4. Custom Prompts / Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Custom Test Prompts (Optional):</label>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="e.g. Test auth token expiration, check rate-limit headers..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-sans"
            />
          </div>

          {/* ACTION BUTTON: Generate & Run Tests */}
          <button
            onClick={handleRunTddSuite}
            disabled={isRunning}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-all transform active:scale-98"
          >
            {isRunning ? (
              <RotateCcw size={16} className="animate-spin text-indigo-200" />
            ) : (
              <Rocket size={16} />
            )}
            <span>{isRunning ? 'Synthesizing & Executing Tests...' : '🚀 Generate & Run Tests'}</span>
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Split-Pane Code View & Real-Time Terminal Console */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          {/* Action Navigation Tabs */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'split' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={13} /> Split View
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'code' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={13} /> Test Code
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'logs' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal size={13} /> Assertion Logs
              </button>
            </div>

            {/* Assertion Search & Filter Buttons */}
            {runResult && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter assertions..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1 rounded-lg focus:outline-none focus:border-indigo-500 w-36 md:w-48 font-sans"
                  />
                  <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setAssertionFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] ${assertionFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                  >
                    All ({runResult.assertions.length})
                  </button>
                  <button
                    onClick={() => setAssertionFilter('passed')}
                    className={`px-2 py-0.5 rounded text-[11px] ${assertionFilter === 'passed' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-slate-400'}`}
                  >
                    Passed ({runResult.metrics.passed})
                  </button>
                  <button
                    onClick={() => setAssertionFilter('failed')}
                    className={`px-2 py-0.5 rounded text-[11px] ${assertionFilter === 'failed' ? 'bg-rose-950 text-rose-300 font-bold' : 'text-slate-400'}`}
                  >
                    Failed ({runResult.metrics.failed})
                  </button>
                </div>
              </div>
            )}

            {/* Save / Apply to Project Controls */}
            {runResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Test Code'}</span>
                </button>

                <button
                  onClick={handleSaveTestFile}
                  disabled={hasApplied}
                  className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition-all ${
                    hasApplied
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/80'
                  }`}
                >
                  {hasApplied ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  <span>{hasApplied ? 'Saved to tests/' : 'Save Test to Project'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Content Pane */}
          <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-950">
            {/* LEFT PANE: Generated Test Code */}
            {(activeTab === 'split' || activeTab === 'code') && (
              <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono">
                <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-indigo-300 font-bold">
                    <FileCode size={14} /> {runResult ? runResult.testFileName : `*.test.ts`}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[10px]">
                    {framework.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-950 text-xs leading-relaxed text-slate-200">
                  {runResult ? (
                    <pre className="font-mono selection:bg-indigo-900 whitespace-pre-wrap">{runResult.testCode}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-6">
                      <Beaker size={36} className="mb-2 text-indigo-500/40 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-400">No tests generated yet.</p>
                      <p className="text-xs text-slate-500 mt-1">Select target file and click "🚀 Generate &amp; Run Tests".</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT PANE: Live Terminal Assertion Logs & Gutter Line Badges */}
            {(activeTab === 'split' || activeTab === 'logs') && (
              <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono">
                <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Terminal size={14} /> Live Terminal Assertion Logs
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-Scroll Enabled</span>
                </div>

                {/* Individual Assertion List Badges */}
                {runResult && filteredAssertions.length > 0 && (
                  <div className="p-3 bg-slate-950/80 border-b border-slate-800 max-h-48 overflow-y-auto space-y-1.5">
                    {filteredAssertions.map(assertItem => (
                      <div
                        key={assertItem.id}
                        className={`p-2 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                          assertItem.status === 'passed'
                            ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                            : 'bg-rose-950/50 border-rose-800 text-rose-200 animate-pulse'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {assertItem.status === 'passed' ? (
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-semibold">{assertItem.name}</div>
                            {assertItem.error && (
                              <div className="text-[11px] text-rose-300 mt-1 font-mono bg-rose-950/80 p-1.5 rounded border border-rose-800/80">
                                {assertItem.error}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{assertItem.duration} ms</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw Terminal Output Console */}
                <div
                  ref={logConsoleRef}
                  className="flex-1 overflow-auto p-4 bg-slate-950 text-xs text-slate-300 space-y-1 leading-relaxed font-mono"
                >
                  {runResult ? (
                    runResult.logs.map((logLine, idx) => {
                      const isPass = logLine.includes('✓') || logLine.includes('passed');
                      const isFail = logLine.includes('✕') || logLine.includes('failed') || logLine.includes('Error');
                      const isHeader = logLine.includes('Starting') || logLine.includes('RUNS');

                      return (
                        <div
                          key={idx}
                          className={
                            isPass
                              ? 'text-emerald-400 font-medium'
                              : isFail
                              ? 'text-rose-400 font-bold bg-rose-950/30 p-1 rounded border-l-2 border-rose-500'
                              : isHeader
                              ? 'text-indigo-300 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {logLine}
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                      Terminal waiting for test runner process execution...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
