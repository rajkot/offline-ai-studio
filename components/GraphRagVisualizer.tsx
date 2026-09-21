'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, 
  Sparkles, 
  FileCode, 
  Box, 
  Code2, 
  Key, 
  Database, 
  GitFork, 
  Cpu, 
  HardDrive, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ExternalLink,
  Layers,
  CheckCircle2,
  ChevronRight,
  Filter
} from 'lucide-react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'class' | 'function' | 'variable';
  filePath: string;
  line: number;
  description: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'imports' | 'calls' | 'defines' | 'inherits';
}

interface GraphStats {
  totalAstNodes: number;
  verifiedEdges: number;
  lruCacheHitRate: string;
  vectorDbSizeBytes: string;
}

interface GraphRagVisualizerProps {
  onOpenFile?: (filePath: string, line?: number) => void;
}

export default function GraphRagVisualizer({ onOpenFile }: GraphRagVisualizerProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<GraphStats>({
    totalAstNodes: 16,
    verifiedEdges: 15,
    lruCacheHitRate: '94.8%',
    vectorDbSizeBytes: '14.2 MB'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'file' | 'class' | 'function' | 'variable'>('all');

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Position layout calculation
  const layoutCalculated = useRef(false);

  const fetchGraphData = useCallback(async (query: string = '') => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/semantic-graph-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Arrange positions if not already fixed
        const baseNodes: GraphNode[] = data.nodes || [];
        const width = 850;
        const height = 550;
        const centerX = width / 2;
        const centerY = height / 2;

        const positionedNodes = baseNodes.map((n: GraphNode, i: number) => {
          // Cluster by node type
          let radius = 180;
          let angleOffset = 0;
          if (n.type === 'file') {
            radius = 120;
            angleOffset = 0;
          } else if (n.type === 'class') {
            radius = 210;
            angleOffset = Math.PI / 4;
          } else if (n.type === 'function') {
            radius = 260;
            angleOffset = Math.PI / 2;
          } else {
            radius = 320;
            angleOffset = (3 * Math.PI) / 4;
          }

          const angle = angleOffset + (i / Math.max(1, baseNodes.length)) * 2 * Math.PI;
          return {
            ...n,
            x: centerX + radius * Math.cos(angle) + (Math.sin(i * 3) * 20),
            y: centerY + radius * Math.sin(angle) + (Math.cos(i * 2) * 20)
          };
        });

        setNodes(positionedNodes);
        setEdges(data.edges || []);
        if (data.matchedNodeIds) {
          setMatchedIds(data.matchedNodeIds);
        } else {
          setMatchedIds([]);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load semantic graph', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadInitialGraph = async () => {
      try {
        const res = await fetch('/api/rag/semantic-graph-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '' })
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const baseNodes: GraphNode[] = data.nodes || [];
          const width = 850;
          const height = 550;
          const centerX = width / 2;
          const centerY = height / 2;

          const positionedNodes = baseNodes.map((n: GraphNode, i: number) => {
            let radius = 180;
            let angleOffset = 0;
            if (n.type === 'file') {
              radius = 120;
              angleOffset = 0;
            } else if (n.type === 'class') {
              radius = 210;
              angleOffset = Math.PI / 4;
            } else if (n.type === 'function') {
              radius = 260;
              angleOffset = Math.PI / 2;
            } else {
              radius = 320;
              angleOffset = (3 * Math.PI) / 4;
            }

            const angle = angleOffset + (i / Math.max(1, baseNodes.length)) * 2 * Math.PI;
            return {
              ...n,
              x: centerX + radius * Math.cos(angle) + (Math.sin(i * 3) * 20),
              y: centerY + radius * Math.sin(angle) + (Math.cos(i * 2) * 20)
            };
          });

          setNodes(positionedNodes);
          setEdges(data.edges || []);
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error('Initial graph load error', err);
      }
    };
    loadInitialGraph();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchGraphData(searchQuery);
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale * zoomFactor))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    if (onOpenFile && (node.type === 'function' || node.type === 'class' || node.type === 'file')) {
      onOpenFile(node.filePath, node.line);
    }
  };

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'file':
        return {
          fill: '#3b82f6',
          border: '#1d4ed8',
          bgClass: 'bg-blue-500/20 text-blue-400 border-blue-500',
          badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-700'
        };
      case 'class':
        return {
          fill: '#a855f7',
          border: '#7e22ce',
          bgClass: 'bg-purple-500/20 text-purple-400 border-purple-500',
          badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700'
        };
      case 'function':
        return {
          fill: '#10b981',
          border: '#047857',
          bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
        };
      case 'variable':
        return {
          fill: '#eab308',
          border: '#a16207',
          bgClass: 'bg-amber-500/20 text-amber-400 border-amber-500',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700'
        };
      default:
        return {
          fill: '#64748b',
          border: '#334155',
          bgClass: 'bg-slate-500/20 text-slate-400 border-slate-500',
          badgeClass: 'bg-slate-950/80 text-slate-300 border-slate-700'
        };
    }
  };

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'file': return <FileCode size={13} className="text-blue-400" />;
      case 'class': return <Box size={13} className="text-purple-400" />;
      case 'function': return <Code2 size={13} className="text-emerald-400" />;
      case 'variable': return <Key size={13} className="text-amber-400" />;
    }
  };

  // Node Map for fast edge coordinate lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    return nodes.filter(n => n.type === filterType);
  }, [nodes, filterType]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header: Scorecards & Query Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 space-y-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Semantic Graph-RAG & AST Explorer
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  AST v2.4 Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">Interactive neural code dependency and lexical reference topology.</p>
            </div>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('file')}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium ${filterType === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-blue-400'}`}
            >
              <FileCode size={12} /> Files
            </button>
            <button
              onClick={() => setFilterType('class')}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium ${filterType === 'class' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-purple-400'}`}
            >
              <Box size={12} /> Classes
            </button>
            <button
              onClick={() => setFilterType('function')}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium ${filterType === 'function' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-400'}`}
            >
              <Code2 size={12} /> Functions
            </button>
            <button
              onClick={() => setFilterType('variable')}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium ${filterType === 'variable' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-400'}`}
            >
              <Key size={12} /> Variables
            </button>
          </div>
        </div>

        {/* Index Statistics Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Cpu size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Total AST Nodes</div>
              <div className="text-base font-bold text-slate-100 font-mono">{stats.totalAstNodes}</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <GitFork size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Verified Edges</div>
              <div className="text-base font-bold text-slate-100 font-mono">{stats.verifiedEdges}</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">LRU Cache Hit</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{stats.lruCacheHitRate}</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <HardDrive size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Vector DB Size</div>
              <div className="text-base font-bold text-slate-100 font-mono">{stats.vectorDbSizeBytes}</div>
            </div>
          </div>
        </div>

        {/* Semantic Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Query Workspace Semantically via Graph-RAG (e.g. 'streaming pipeline', 'abort controller', 'fix terminal error')..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-24 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchGraphData('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 bg-slate-800 rounded"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? <span className="animate-spin">🌀</span> : <Sparkles size={14} />}
            Semantic Search
          </button>
        </form>
      </div>

      {/* Main Canvas & Inspector View */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* SVG Graph Canvas */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full cursor-grab active:cursor-grabbing relative bg-radial from-slate-900 to-slate-950"
        >
          {/* Background grid dots */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              transform: `translate(${transform.x % 24}px, ${transform.y % 24}px)`
            }}
          />

          <svg
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Render Edges */}
              {edges.map((edge) => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt || !src.x || !src.y || !tgt.x || !tgt.y) return null;

                const isConnectedToSelected = selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);
                const isMatchedEdge = matchedIds.length > 0 && matchedIds.includes(src.id) && matchedIds.includes(tgt.id);

                return (
                  <g key={edge.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isConnectedToSelected || isMatchedEdge ? '#10b981' : '#334155'}
                      strokeWidth={isConnectedToSelected || isMatchedEdge ? 2 : 1.2}
                      strokeDasharray={edge.type === 'calls' ? '4 2' : undefined}
                      markerEnd={isConnectedToSelected || isMatchedEdge ? 'url(#arrow-active)' : 'url(#arrow)'}
                      className="transition-colors duration-300"
                    />
                    {edge.label && (
                      <text
                        x={(src.x + tgt.x) / 2}
                        y={(src.y + tgt.y) / 2 - 4}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        className="font-mono pointer-events-none"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map((node) => {
                if (!node.x || !node.y) return null;
                const colors = getNodeColor(node.type);
                const isSelected = selectedNode?.id === node.id;
                const isMatched = matchedIds.includes(node.id);
                const isDimmed = matchedIds.length > 0 && !isMatched;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => handleNodeClick(node, e)}
                    className="cursor-pointer group"
                    opacity={isDimmed ? 0.35 : 1}
                  >
                    {/* Pulsing ring for search matches */}
                    {isMatched && (
                      <circle
                        r="30"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Outer selection ring */}
                    {isSelected && (
                      <circle
                        r="24"
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Core node circle */}
                    <circle
                      r="16"
                      fill="#0f172a"
                      stroke={isMatched ? '#10b981' : colors.border}
                      strokeWidth="2.5"
                      className="transition-transform group-hover:scale-110"
                    />

                    {/* Node Type Dot */}
                    <circle
                      r="6"
                      fill={isMatched ? '#10b981' : colors.fill}
                    />

                    {/* Node Label */}
                    <text
                      y="28"
                      fill={isMatched ? '#34d399' : isSelected ? '#ffffff' : '#cbd5e1'}
                      fontSize="11"
                      fontWeight={isMatched || isSelected ? 'bold' : 'normal'}
                      textAnchor="middle"
                      className="font-mono transition-colors pointer-events-none drop-shadow-md"
                    >
                      {node.label}
                    </text>

                    {/* Secondary Type Pill in SVG */}
                    <text
                      y="40"
                      fill="#64748b"
                      fontSize="8.5"
                      textAnchor="middle"
                      className="font-mono pointer-events-none uppercase tracking-wider"
                    >
                      {node.type}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Canvas Controls */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-xs">
            <button
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(2.5, prev.scale + 0.2) }))}
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs"
              title="Zoom In"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.4, prev.scale - 0.2) }))}
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs"
              title="Zoom Out"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 text-[11px] space-y-1.5 shadow-xl backdrop-blur-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Node Legend</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> File (Module)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Class / Container</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Function / Method</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Variable / Import</div>
          </div>
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/95 p-4 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold inline-flex items-center gap-1 ${getNodeColor(selectedNode.type).badgeClass}`}>
                    {getNodeIcon(selectedNode.type)} {selectedNode.type}
                  </span>
                  <h4 className="font-bold text-slate-100 text-base font-mono break-all">{selectedNode.label}</h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 bg-slate-800 rounded-md"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-slate-400">File Location:</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-slate-300 break-all">
                  {selectedNode.filePath} <span className="text-indigo-400">:{selectedNode.line}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-slate-400">Semantic Description:</div>
                <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              {/* Related Inbound / Outbound Edges */}
              <div className="space-y-2 text-xs">
                <div className="text-slate-400">Connected Dependencies:</div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map(e => {
                      const isSource = e.source === selectedNode.id;
                      const otherId = isSource ? e.target : e.source;
                      const otherNode = nodeMap.get(otherId);
                      return (
                        <div key={e.id} className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400">{isSource ? '→ calls/imports' : '← invoked by'}</span>
                          <span className="text-indigo-300 font-semibold">{otherNode?.label || otherId}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
              <button
                onClick={() => {
                  if (onOpenFile) {
                    onOpenFile(selectedNode.filePath, selectedNode.line);
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> Open in Monaco Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
