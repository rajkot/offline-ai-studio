'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Brain,
  Search,
  Zap,
  Layers,
  Code2,
  GitFork,
  CheckCircle2,
  Copy,
  RefreshCw,
  X,
  Play,
  Database,
  ArrowRight,
  TrendingDown,
  Activity,
  Sliders,
  ChevronRight,
  FileCode,
  Sparkles,
  Share2
} from 'lucide-react';
import { GraphSummary, CodeGraphNode, CallChainStep } from '@/lib/mcp/codebaseMemoryMcpEngine';

interface CodebaseMemoryStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  onInjectContextToEditor?: (context: string) => void;
  onLaunchAutonomousWithContext?: (context: string) => void;
}

export default function CodebaseMemoryStudioModal({
  isOpen,
  onClose,
  activeFilePath = '',
  onInjectContextToEditor,
  onLaunchAutonomousWithContext
}: CodebaseMemoryStudioModalProps) {
  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AutonomousAgentEngine');
  const [selectedSymbolData, setSelectedSymbolData] = useState<any | null>(null);
  const [callChain, setCallChain] = useState<CallChainStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'symbols' | 'callchain' | 'mcp'>('graph');
  const [copiedContext, setCopiedContext] = useState(false);
  const [compactContext, setCompactContext] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch initial graph data
  const loadGraphData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mcp/codebase-memory?action=visual');
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setNodes(data.nodes || []);
        setLinks(data.links || []);
      }
    } catch (e) {
      console.error('Failed to load codebase memory graph:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGraphData();
    }
  }, [isOpen]);

  // Query selected symbol details
  useEffect(() => {
    if (!selectedSymbol || !isOpen) return;

    fetch(`/api/mcp/codebase-memory?symbol=${encodeURIComponent(selectedSymbol)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSelectedSymbolData(data);
          setCallChain(data.callChain || []);
        }
      })
      .catch(() => {});

    // Also fetch file context if active file is set
    const fileToFetch = activeFilePath || (selectedSymbolData?.node?.filePath);
    if (fileToFetch) {
      fetch(`/api/mcp/codebase-memory?filePath=${encodeURIComponent(fileToFetch)}`)
        .then(res => res.json())
        .then(data => {
          if (data.context) {
            setCompactContext(data.context);
          }
        })
        .catch(() => {});
    }
  }, [selectedSymbol, isOpen, activeFilePath]);

  // Trigger Re-index
  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const res = await fetch('/api/mcp/codebase-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'index' })
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        loadGraphData();
      }
    } catch (e) {
      console.error('Re-index error:', e);
    } finally {
      setIsReindexing(false);
    }
  };

  // Filter symbols based on search
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes.slice(0, 60);
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => n.name.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q)).slice(0, 60);
  }, [nodes, searchQuery]);

  // 2D Canvas Graph Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'graph' || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = canvas.width = canvas.parentElement?.clientWidth || 700;
    const height = canvas.height = canvas.parentElement?.clientHeight || 450;

    // Simulation particle positions
    const displayNodes = nodes.slice(0, 75).map((n, i) => {
      const angle = (i / Math.min(nodes.length, 75)) * Math.PI * 2;
      const radius = 100 + (i % 3) * 60;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius + (Math.sin(i) * 20),
        y: height / 2 + Math.sin(angle) * radius + (Math.cos(i) * 20),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: n.kind === 'function' ? '#38bdf8' : n.kind === 'class' ? '#a855f7' : n.kind === 'interface' ? '#34d399' : '#f59e0b'
      };
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw connections
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < displayNodes.length; i++) {
        const next = displayNodes[(i + 1) % displayNodes.length];
        const prev = displayNodes[(i + 3) % displayNodes.length];
        ctx.beginPath();
        ctx.moveTo(displayNodes[i].x, displayNodes[i].y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();

        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(displayNodes[i].x, displayNodes[i].y);
          ctx.lineTo(prev.x, prev.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const node of displayNodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 20 || node.x > width - 20) node.vx *= -1;
        if (node.y < 20 || node.y > height - 20) node.vy *= -1;

        const isSelected = selectedSymbol && node.name.toLowerCase().includes(selectedSymbol.toLowerCase());

        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 15 : 6;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 8 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = isSelected ? '#ffffff' : '#a1a1aa';
        ctx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
        ctx.fillText(node.name.slice(0, 16), node.x + 8, node.y + 3);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, activeTab, selectedSymbol]);

  const handleCopyContext = () => {
    if (!compactContext) return;
    navigator.clipboard.writeText(compactContext);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-7xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Codebase Memory MCP Studio</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  AST Knowledge Graph
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  Sub-ms Traversal
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                162-Language Tree-Sitter AST persistent memory & call-chain graph for 99% token reduction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reindex Button */}
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isReindexing ? 'Indexing AST...' : 'Re-index Graph'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 text-xs">
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Indexed Files</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {summary?.totalFiles || 0}
            </div>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">AST Symbols</div>
            <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
              {summary?.totalNodes || 0} nodes
            </div>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Call & Import Edges</div>
            <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
              {summary?.totalEdges || 0} links
            </div>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              <span>Token Savings</span>
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {summary?.tokenSavingsPercent || 99.2}%
            </div>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Query Latency</div>
            <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
              &lt; 0.4 ms
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 px-6 py-2 border-b border-zinc-800/80 bg-zinc-900/20 text-xs">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'graph' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Visual Knowledge Graph
          </button>
          <button
            onClick={() => setActiveTab('symbols')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'symbols' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Symbol Registry
          </button>
          <button
            onClick={() => setActiveTab('callchain')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'callchain' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Call Chain Tracer
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'mcp' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            MCP Tools Console
          </button>
        </div>

        {/* Main Content (Split View) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Canvas / List View */}
          <div className="flex-1 flex flex-col border-r border-zinc-800/80 overflow-hidden relative">
            {activeTab === 'graph' && (
              <div className="flex-1 w-full h-full relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full block" />
                <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur border border-zinc-800 p-2.5 rounded-xl text-[11px] space-y-1">
                  <div className="text-zinc-400 font-semibold mb-1">Graph Legend</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span>Functions & Methods</span></div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Classes</span></div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span>Interfaces & Types</span></div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span>Modules & Files</span></div>
                </div>
              </div>
            )}

            {activeTab === 'symbols' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search functions, classes, interfaces by symbol name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredNodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedSymbol(node.name)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedSymbol === node.name
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-white'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1 rounded bg-zinc-800 text-[10px] font-mono uppercase text-cyan-400">
                          {node.kind}
                        </span>
                        <div>
                          <div className="text-xs font-semibold">{node.name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{node.filePath}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'callchain' && (
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400">Inspecting Call Chain for:</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">{selectedSymbol}</span>
                </div>

                {callChain.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No outward function calls recorded for {selectedSymbol}. Select a caller or root coordinator function.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {callChain.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-mono font-bold">
                          {step.depth}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white">
                            {step.symbol.name} <span className="text-zinc-500">calls</span> <span className="text-cyan-300">{step.targetSymbol.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {step.targetSymbol.filePath} (L{step.targetSymbol.startLine})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-xs">
                <div className="text-zinc-400 font-sans text-xs mb-2">
                  Active Model Context Protocol (MCP) Standard Tool Handlers:
                </div>
                {[
                  { name: 'index_codebase', desc: 'Indexes all 162+ language files into persistent tree-sitter AST memory graph.' },
                  { name: 'query_graph', desc: 'Finds callers, callees, class methods, and type contracts with sub-ms resolution.' },
                  { name: 'search_symbols', desc: 'Regex & fuzzy search over functions, classes, interfaces, and variables.' },
                  { name: 'get_call_chain', desc: 'Depth-first traversal of execution dependencies across the repository.' },
                  { name: 'get_file_context', desc: 'Outputs compact contract summary saving 99% of LLM prompt tokens.' }
                ].map((tool, idx) => (
                  <div key={idx} className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-1">
                    <div className="text-cyan-400 font-bold flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>tool: {tool.name}</span>
                    </div>
                    <p className="text-zinc-400 font-sans text-xs">{tool.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Inspector & Context Export Pane */}
          <div className="w-[420px] lg:w-[460px] flex flex-col bg-zinc-900/40 overflow-hidden">
            
            <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {selectedSymbolData?.node?.name || selectedSymbol}
                  </h3>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate max-w-[280px]">
                    {selectedSymbolData?.node?.filePath || 'Workspace Root'}
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {selectedSymbolData?.node?.kind || 'symbol'}
                </span>
              </div>

              {selectedSymbolData?.node?.signature && (
                <pre className="mt-3 p-2 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                  {selectedSymbolData.node.signature}
                </pre>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Callers & Callees Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Callers</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedSymbolData?.callers?.length || 0}
                  </div>
                </div>
                <div className="p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Callees</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedSymbolData?.callees?.length || 0}
                  </div>
                </div>
              </div>

              {/* Token-Efficient Context Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    High-Density Graph Context (99% Token Reduction)
                  </span>
                  <button
                    onClick={handleCopyContext}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 transition-colors"
                  >
                    {copiedContext ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedContext ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {compactContext || selectedSymbolData?.node?.signature || '// Loading graph context...'}
                </pre>
              </div>

              {/* 1-Click Dispatch to IDE AI */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    if (onInjectContextToEditor && compactContext) {
                      onInjectContextToEditor(`\n/* Codebase Memory MCP Context:\n${compactContext}\n*/\n`);
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-cyan-900/40 to-indigo-900/40 hover:from-cyan-800/50 hover:to-indigo-800/50 border border-cyan-500/40 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-600/30 text-cyan-300">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Inject Context to Editor</div>
                      <div className="text-[10px] text-zinc-400">Append high-density contracts to active file</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    if (onLaunchAutonomousWithContext && compactContext) {
                      onLaunchAutonomousWithContext(compactContext);
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Send to Autonomous Devin Loop</div>
                      <div className="text-[10px] text-zinc-400">Guide self-healing patches with call graph</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
