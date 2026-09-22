'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  FileCode,
  AlertTriangle,
  Beaker,
  Check,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  testExplorerEngine,
  TestFileItem,
  TestSuiteItem,
  TestCaseItem,
  TestRunSummary
} from '@/lib/testing/testExplorerEngine';

interface TestExplorerSidebarProps {
  workspaceFiles: Record<string, string>;
  onOpenFile?: (filePath: string, line?: number, column?: number) => void;
  onFixWithAi?: (errorMessage: string, filePath: string, line?: number) => void;
}

export default function TestExplorerSidebar({
  workspaceFiles,
  onOpenFile,
  onFixWithAi
}: TestExplorerSidebarProps) {
  const [testFiles, setTestFiles] = useState<TestFileItem[]>(() => testExplorerEngine.getTestFiles());
  const [summary, setSummary] = useState<TestRunSummary>(() => testExplorerEngine.getSummary());
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [collapsedSuites, setCollapsedSuites] = useState<Record<string, boolean>>({});
  const [expandedErrorTestId, setExpandedErrorTestId] = useState<string | null>(null);

  // Sync test discovery on workspace files update
  useEffect(() => {
    testExplorerEngine.discoverTests(workspaceFiles);
  }, [workspaceFiles]);

  // Subscribe to live engine updates
  useEffect(() => {
    return testExplorerEngine.subscribe(() => {
      setTestFiles(testExplorerEngine.getTestFiles());
      setSummary(testExplorerEngine.getSummary());
    });
  }, []);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles(prev => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  const toggleSuiteCollapse = (suiteId: string) => {
    setCollapsedSuites(prev => ({ ...prev, [suiteId]: !prev[suiteId] }));
  };

  // Filtered files & tests based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return testFiles;
    const q = searchQuery.toLowerCase();

    return testFiles
      .map(file => {
        const matchesFile = file.fileName.toLowerCase().includes(q) || file.filePath.toLowerCase().includes(q);

        const filteredSuites = file.suites
          .map(suite => {
            const matchesSuite = suite.name.toLowerCase().includes(q);
            const matchingTests = suite.tests.filter(t => t.name.toLowerCase().includes(q));
            if (matchesSuite || matchingTests.length > 0) {
              return {
                ...suite,
                tests: matchesSuite ? suite.tests : matchingTests
              };
            }
            return null;
          })
          .filter(Boolean) as TestSuiteItem[];

        const matchingOrphans = file.orphanTests.filter(t => t.name.toLowerCase().includes(q));

        if (matchesFile || filteredSuites.length > 0 || matchingOrphans.length > 0) {
          return {
            ...file,
            suites: filteredSuites,
            orphanTests: matchingOrphans
          };
        }
        return null;
      })
      .filter(Boolean) as TestFileItem[];
  }, [testFiles, searchQuery]);

  const getStatusIcon = (status: TestCaseItem['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
      case 'failed':
        return <XCircle size={13} className="text-rose-500 shrink-0" />;
      case 'running':
        return <RotateCw size={13} className="text-amber-400 animate-spin shrink-0" />;
      case 'skipped':
        return <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" />;
      case 'idle':
      default:
        return <span className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0" />;
    }
  };

  const passPercentage = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 100;

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-300 font-sans text-xs select-none">
      {/* 1. Header Toolbar */}
      <div className="p-2 border-b border-[#27272a] space-y-2 shrink-0 bg-[#121214]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold font-mono text-white text-xs">
            <Beaker size={14} className="text-purple-400" />
            <span>TEST EXPLORER</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Run All Tests */}
            <button
              onClick={() => testExplorerEngine.runAllTests()}
              disabled={summary.isRunning}
              className="p-1 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer disabled:opacity-50 transition-colors"
              title="Run All Tests"
            >
              <Play size={13} className="fill-emerald-400" />
            </button>

            {/* Run Failed Tests */}
            {summary.failed > 0 && (
              <button
                onClick={() => testExplorerEngine.runFailedTests()}
                disabled={summary.isRunning}
                className="p-1 hover:bg-zinc-800 text-rose-400 hover:text-rose-300 rounded cursor-pointer disabled:opacity-50 transition-colors"
                title="Rerun Failed Tests"
              >
                <RotateCw size={13} />
              </button>
            )}

            {/* Refresh Test Discovery */}
            <button
              onClick={() => testExplorerEngine.discoverTests(workspaceFiles)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer transition-colors"
              title="Refresh / Scan Workspace Tests"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tests..."
            className="w-full bg-[#18181b] border border-zinc-800 focus:border-purple-500 rounded pl-6 pr-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Pass/Fail Progress Bar & Summary Metrics */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{summary.passed} Passed</span>
              {summary.failed > 0 && (
                <span className="text-rose-400 font-bold ml-1">{summary.failed} Failed</span>
              )}
              <span className="text-zinc-500">({summary.total} total)</span>
            </span>
            <span>{summary.durationMs}ms</span>
          </div>

          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${passPercentage}%` }}
              className={`h-full transition-all duration-300 ${
                summary.failed > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            {summary.failed > 0 && (
              <div
                style={{ width: `${Math.round((summary.failed / summary.total) * 100)}%` }}
                className="h-full bg-rose-500 transition-all duration-300"
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Test Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="text-center text-zinc-500 text-xs py-8 space-y-2">
            <Beaker size={24} className="mx-auto text-zinc-600 opacity-50" />
            <p>No tests found in workspace</p>
            <p className="text-[10px] text-zinc-600 font-mono">Create *.test.ts or *.spec.tsx files</p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isFileCollapsed = collapsedFiles[file.filePath];

            return (
              <div key={file.filePath} className="border border-zinc-800/80 rounded-lg bg-zinc-950/40 overflow-hidden mb-1">
                {/* File Header */}
                <div
                  onClick={() => toggleFileCollapse(file.filePath)}
                  className="px-2 py-1.5 hover:bg-zinc-900 flex items-center justify-between cursor-pointer group transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-zinc-500">
                      {isFileCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </span>
                    {getStatusIcon(file.status)}
                    <FileCode size={13} className="text-indigo-400 shrink-0" />
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenFile) onOpenFile(file.filePath, 1);
                      }}
                      className="font-medium text-zinc-200 hover:text-white truncate font-mono text-[11px]"
                      title={file.filePath}
                    >
                      {file.fileName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded font-mono uppercase">
                      {file.framework}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testExplorerEngine.runTestFile(file.filePath);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-800 rounded text-emerald-400 hover:text-emerald-300 transition-opacity"
                      title="Run File Tests"
                    >
                      <Play size={11} className="fill-emerald-400" />
                    </button>
                  </div>
                </div>

                {/* Suites and Test Items */}
                {!isFileCollapsed && (
                  <div className="pl-3 pr-1 py-1 space-y-1 border-t border-zinc-800/50">
                    {/* Suites */}
                    {file.suites.map((suite) => {
                      const isSuiteCollapsed = collapsedSuites[suite.id];

                      return (
                        <div key={suite.id} className="space-y-0.5">
                          <div
                            onClick={() => toggleSuiteCollapse(suite.id)}
                            className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-zinc-800/60 cursor-pointer group text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-zinc-500">
                                {isSuiteCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                              </span>
                              {getStatusIcon(suite.status)}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenFile) onOpenFile(suite.filePath, suite.line);
                                }}
                                className="font-semibold text-zinc-300 hover:text-white truncate"
                              >
                                {suite.name}
                              </span>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              {suite.tests.length} tests
                            </span>
                          </div>

                          {!isSuiteCollapsed && (
                            <div className="pl-4 space-y-0.5">
                              {suite.tests.map((test) => (
                                <div key={test.id} className="space-y-1">
                                  <div
                                    onClick={() => {
                                      if (onOpenFile) onOpenFile(test.filePath, test.line, test.column);
                                    }}
                                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-800/80 cursor-pointer group text-[11px] font-mono text-zinc-300 hover:text-white"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {getStatusIcon(test.status)}
                                      <span className="truncate">{test.name}</span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {test.durationMs !== undefined && (
                                        <span className="text-[9px] text-zinc-500">{test.durationMs}ms</span>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          testExplorerEngine.runSingleTestById(test.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded text-emerald-400 transition-opacity"
                                        title="Run this test"
                                      >
                                        <Play size={10} className="fill-emerald-400" />
                                      </button>
                                      {test.error && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedErrorTestId(prev => prev === test.id ? null : test.id);
                                          }}
                                          className="text-rose-400 hover:text-rose-300 p-0.5"
                                          title="View failure details"
                                        >
                                          <AlertTriangle size={11} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Inline Failure Callout with AI Fix Option */}
                                  {test.status === 'failed' && test.error && expandedErrorTestId === test.id && (
                                    <div className="ml-4 mr-1 p-2 bg-rose-950/40 border border-rose-800/60 rounded-md text-[10.5px] font-mono space-y-1.5 animate-in fade-in">
                                      <div className="text-rose-300 font-semibold">{test.error.message}</div>
                                      {test.error.stack && (
                                        <pre className="text-zinc-400 text-[9.5px] whitespace-pre-wrap font-mono max-h-24 overflow-y-auto custom-scrollbar bg-black/40 p-1.5 rounded">
                                          {test.error.stack}
                                        </pre>
                                      )}
                                      {onFixWithAi && (
                                        <button
                                          onClick={() => onFixWithAi(test.error!.message, test.filePath, test.line)}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-sans font-bold shadow cursor-pointer"
                                        >
                                          <Sparkles size={10} />
                                          <span>Fix with AI</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Orphan Tests (tests outside of describe block) */}
                    {file.orphanTests.map((test) => (
                      <div
                        key={test.id}
                        onClick={() => {
                          if (onOpenFile) onOpenFile(test.filePath, test.line, test.column);
                        }}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-800/80 cursor-pointer group text-[11px] font-mono text-zinc-300 hover:text-white"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getStatusIcon(test.status)}
                          <span className="truncate">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {test.durationMs !== undefined && (
                            <span className="text-[9px] text-zinc-500">{test.durationMs}ms</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              testExplorerEngine.runSingleTestById(test.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded text-emerald-400 transition-opacity"
                            title="Run this test"
                          >
                            <Play size={10} className="fill-emerald-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
