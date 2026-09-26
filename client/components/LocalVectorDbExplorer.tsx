'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Database, 
  Search, 
  Sparkles, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  FileCode, 
  Code2, 
  Layers, 
  TrendingUp, 
  Sliders, 
  ExternalLink,
  CheckCircle2,
  Zap,
  Activity,
  Award,
  Filter,
  BarChart2
} from 'lucide-react';
import { 
  vectorDbWorkspace, 
  VectorDbStats, 
  HybridSearchResult, 
  ASTSymbolNode,
  chromaClient,
  ChromaCollection,
  DistanceMetric
} from '@/lib/vectorDbEngine';

interface LocalVectorDbExplorerProps {
  workspaceFiles: Record<string, string>;
  onOpenFile: (filePath: string, line?: number) => void;
}

export default function LocalVectorDbExplorer({ workspaceFiles, onOpenFile }: LocalVectorDbExplorerProps) {
  const [stats, setStats] = useState<VectorDbStats | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'pagerank' | 'symbols' | 'chroma'>('search');

  // Chroma Vector DB State
  const [chromaCollections, setChromaCollections] = useState<{ name: string; id: string; count: number; metadata: any }[]>([]);
  const [selectedColName, setSelectedColName] = useState('offline_ai_workspace');
  const [chromaQuery, setChromaQuery] = useState('');
  const [chromaResults, setChromaResults] = useState<{ id: string; doc: string; meta: any; distance: number | null }[]>([]);
  const [isChromaSearching, setIsChromaSearching] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColMetric, setNewColMetric] = useState<DistanceMetric>('cosine');
  const [newDocId, setNewDocId] = useState('');
  const [newDocText, setNewDocText] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [filterVal, setFilterVal] = useState('');
  
  // Search Hyperparameters
  const [bm25Weight, setBm25Weight] = useState(0.45);
  const [vectorWeight, setVectorWeight] = useState(0.45);
  const [pageRankWeight, setPageRankWeight] = useState(0.10);
  const [symbolFilter, setSymbolFilter] = useState<'all' | 'file' | 'function' | 'class' | 'interface' | 'component'>('all');

  // Trigger Indexing with guard against redundant re-indexes
  const lastIndexedKeyRef = useRef<string>('');
  const runIndexing = useCallback(() => {
    const keys = Object.keys(workspaceFiles);
    const keySig = `${keys.length}:${keys.join(',')}`;
    if (lastIndexedKeyRef.current === keySig) return;
    lastIndexedKeyRef.current = keySig;
    
    setIsIndexing(true);
    setTimeout(() => {
      const newStats = vectorDbWorkspace.indexWorkspace(workspaceFiles);
      setStats(newStats);
      setIsIndexing(false);
    }, 40);
  }, [workspaceFiles]);

  useEffect(() => {
    runIndexing();
  }, [runIndexing]);

  // Perform Hybrid Search
  const executeSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = vectorDbWorkspace.hybridSearch(searchQuery, 10, {
      bm25Weight,
      vectorWeight,
      pageRankWeight
    });
    setSearchResults(results);
    setIsSearching(false);
  }, [bm25Weight, vectorWeight, pageRankWeight]);

  const queryRef = useRef(query);
  queryRef.current = query;

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    executeSearch(searchQuery);
  };

  useEffect(() => {
    if (queryRef.current) {
      executeSearch(queryRef.current);
    }
  }, [executeSearch]);

  const allSymbols = useMemo(() => {
    return vectorDbWorkspace.getSymbols();
  }, [stats]);

  const filteredSymbols = useMemo(() => {
    if (symbolFilter === 'all') return allSymbols;
    return allSymbols.filter(s => s.kind === symbolFilter);
  }, [allSymbols, symbolFilter]);

  const topPageRankFiles = useMemo(() => {
    const fileRanks = vectorDbWorkspace.getFilePageRanks();
    return Object.entries(fileRanks)
      .map(([filePath, score]) => ({ filePath, score }))
      .sort((a, b) => b.score - a.score);
  }, [stats]);

  // Chroma Collection Management
  const refreshChromaCollections = useCallback(() => {
    const cols = chromaClient.listCollections();
    setChromaCollections(cols);
    if (cols.length > 0 && !cols.some(c => c.name === selectedColName)) {
      setSelectedColName(cols[0].name);
    }
  }, [selectedColName]);

  useEffect(() => {
    refreshChromaCollections();
  }, [refreshChromaCollections, stats]);

  const executeChromaQuery = useCallback(() => {
    if (!selectedColName) return;
    setIsChromaSearching(true);
    try {
      const col = chromaClient.getOrCreateCollection({ name: selectedColName });
      const whereClause = filterKey && filterVal ? { [filterKey]: filterVal } : undefined;
      const res = col.query({
        queryTexts: chromaQuery.trim() ? [chromaQuery.trim()] : undefined,
        nResults: 8,
        where: whereClause,
        include: ['documents', 'metadatas', 'distances']
      });

      if (res.ids[0]) {
        const mapped = res.ids[0].map((id, idx) => ({
          id,
          doc: res.documents[0]?.[idx] || '',
          meta: res.metadatas[0]?.[idx] || {},
          distance: res.distances[0]?.[idx] ?? null
        }));
        setChromaResults(mapped);
      } else {
        setChromaResults([]);
      }
    } catch (e) {
      console.error('Chroma query error:', e);
    } finally {
      setIsChromaSearching(false);
    }
  }, [selectedColName, chromaQuery, filterKey, filterVal]);

  useEffect(() => {
    if (activeTab === 'chroma') {
      executeChromaQuery();
    }
  }, [activeTab, selectedColName, executeChromaQuery]);

  const handleCreateCollection = () => {
    if (!newColName.trim()) return;
    chromaClient.getOrCreateCollection({
      name: newColName.trim(),
      metadata: { 'hnsw:space': newColMetric }
    });
    setSelectedColName(newColName.trim());
    setNewColName('');
    refreshChromaCollections();
  };

  const handleAddDocument = () => {
    if (!selectedColName || !newDocText.trim()) return;
    const col = chromaClient.getOrCreateCollection({ name: selectedColName });
    const docId = newDocId.trim() || `doc_${Date.now()}`;
    col.add({
      ids: [docId],
      documents: [newDocText.trim()],
      metadatas: [{ source: 'manual-input', timestamp: Date.now() }]
    });
    setNewDocId('');
    setNewDocText('');
    refreshChromaCollections();
    executeChromaQuery();
  };

  const handleSeedChromaQuickstart = async () => {
    try {
      const res = await fetch('/api/chroma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed-demo' })
      });
      if (res.ok) {
        refreshChromaCollections();
        setSelectedColName('chroma_quickstart');
        setTimeout(() => executeChromaQuery(), 50);
      }
    } catch (_) {}
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0d0e12] text-zinc-200 text-xs overflow-hidden font-sans border-r border-[#27272a]">
      {/* Header Bar */}
      <div className="p-3 border-b border-[#27272a] bg-[#121318] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-sm">
            <Database size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-xs">Local WASM Vector DB</span>
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded text-[10px] font-mono">
                OPFS Engine
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">PageRank Code Graph & Hybrid BM25 Semantic Index</p>
          </div>
        </div>

        <button
          onClick={runIndexing}
          disabled={isIndexing}
          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer disabled:opacity-50"
          title="Recompute AST symbols, embeddings & PageRank"
        >
          <RefreshCw size={11} className={isIndexing ? 'animate-spin text-emerald-400' : ''} />
          <span>{isIndexing ? 'Indexing...' : 'Reindex'}</span>
        </button>
      </div>

      {/* Telemetry Metrics Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#16171d] border-b border-[#27272a] text-[10px] shrink-0 font-mono">
          <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800/70">
            <div className="text-zinc-400 flex items-center gap-1">
              <Layers size={10} className="text-emerald-400" />
              <span>Chunks</span>
            </div>
            <span className="text-zinc-100 font-bold">{stats.totalChunks} indexed</span>
          </div>

          <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800/70">
            <div className="text-zinc-400 flex items-center gap-1">
              <Code2 size={10} className="text-teal-400" />
              <span>Symbols</span>
            </div>
            <span className="text-zinc-100 font-bold">{stats.totalSymbols} AST nodes</span>
          </div>

          <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800/70">
            <div className="text-zinc-400 flex items-center gap-1">
              <TrendingUp size={10} className="text-purple-400" />
              <span>PageRank</span>
            </div>
            <span className="text-zinc-100 font-bold">{stats.totalEdges} edges</span>
          </div>

          <div className="bg-zinc-900/90 p-1.5 rounded border border-zinc-800/70">
            <div className="text-zinc-400 flex items-center gap-1">
              <Zap size={10} className="text-amber-400" />
              <span>Latency</span>
            </div>
            <span className="text-emerald-400 font-bold">{stats.averageQueryLatencyMs} ms</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#27272a] bg-[#121318] px-2 text-[11px] shrink-0">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'search'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Search size={12} />
          <span>Hybrid Search</span>
        </button>

        <button
          onClick={() => setActiveTab('pagerank')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pagerank'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp size={12} />
          <span>PageRank Hubs</span>
        </button>

        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'symbols'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Code2 size={12} />
          <span>AST Symbol Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('chroma')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'chroma'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database size={12} className="text-indigo-400" />
          <span>Chroma Collections</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {activeTab === 'search' && (
          <div className="space-y-3">
            {/* Search Input Box */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search across AST symbols, types, routes, hooks (e.g. 'auth tokens', 'pagerank', 'editor state')..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Hyperparameter Tuner */}
            <div className="p-2.5 bg-zinc-900/60 rounded border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sliders size={12} className="text-emerald-400" />
                  <span>Hybrid Fusion Weights (RRF)</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  BM25: {Math.round(bm25Weight * 100)}% | Vector: {Math.round(vectorWeight * 100)}% | PR: {Math.round(pageRankWeight * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[10px] pt-1">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Sparse BM25</span>
                    <span className="font-mono">{bm25Weight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={bm25Weight}
                    onChange={(e) => setBm25Weight(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Dense Vector</span>
                    <span className="font-mono">{vectorWeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={vectorWeight}
                    onChange={(e) => setVectorWeight(parseFloat(e.target.value))}
                    className="w-full accent-teal-500 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>PageRank Boost</span>
                    <span className="font-mono">{pageRankWeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    value={pageRankWeight}
                    onChange={(e) => setPageRankWeight(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quick Prompt Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500">Suggested Queries:</span>
              {['Monaco Editor mount', 'PageRank computation', 'Diff Hunk LCS', 'GhostText token FIM', 'LSP Go to Definition'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSearch(preset)}
                  className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-[10px] text-zinc-300 rounded transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Search Results List */}
            {query && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Found {searchResults.length} relevant chunks</span>
                  <span className="font-mono text-[10px]">Ranked by Reciprocal Rank Fusion</span>
                </div>

                {searchResults.length === 0 && !isSearching && (
                  <div className="p-6 text-center text-zinc-500 bg-zinc-900/40 rounded border border-dashed border-zinc-800">
                    No matching code chunks found for &quot;{query}&quot;. Try adjusting weights or search terms.
                  </div>
                )}

                {searchResults.map((res, idx) => (
                  <div
                    key={res.chunk.id}
                    className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center font-mono font-bold text-[9px]">
                          #{idx + 1}
                        </span>
                        <button
                          onClick={() => onOpenFile(res.chunk.filePath, res.chunk.startLine)}
                          className="font-medium text-emerald-300 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <FileCode size={12} />
                          <span>{res.chunk.filePath}</span>
                          <span className="text-zinc-500 font-mono text-[10px]">:{res.chunk.startLine}-{res.chunk.endLine}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50" title="Reciprocal Rank Fusion Score">
                          RRF: {res.rrfScore}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-400 border border-teal-800/50" title="Dense Cosine Vector Similarity">
                          Dense: {(res.denseScore * 100).toFixed(0)}%
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-800/50" title="PageRank Graph Score">
                          PR: {res.pageRankBoost}
                        </span>
                      </div>
                    </div>

                    {res.matchedTerms.length > 0 && (
                      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-500">Matches:</span>
                        {res.matchedTerms.map(t => (
                          <span key={t} className="bg-emerald-900/40 text-emerald-300 px-1 py-0.2 rounded text-[9px] font-mono border border-emerald-700/40">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Code Snippet Box */}
                    <div className="bg-black/60 p-2 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-32 custom-scrollbar">
                      <pre className="whitespace-pre">{res.chunk.content}</pre>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => onOpenFile(res.chunk.filePath, res.chunk.startLine)}
                        className="text-[10px] text-zinc-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ExternalLink size={10} />
                        <span>Jump to line {res.chunk.startLine}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pagerank' && (
          <div className="space-y-3">
            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded">
              <div className="flex items-center gap-2 text-purple-300 font-semibold mb-1">
                <TrendingUp size={13} />
                <span>PageRank Hub Prioritization</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Graph centrality computed via iterative random walk simulation ($d=0.85$). Core architecture nodes with high in-degree and import dependencies receive preferential RAG ranking.
              </p>
            </div>

            <div className="space-y-1.5">
              {topPageRankFiles.map((f, i) => (
                <div
                  key={f.filePath}
                  className="p-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => onOpenFile(f.filePath, 1)}
                      className="font-mono text-[11px] text-zinc-200 hover:text-purple-300 truncate text-left cursor-pointer"
                    >
                      {f.filePath}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Visual Bar */}
                    <div className="w-20 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full"
                        style={{ width: `${Math.max(10, Math.min(100, f.score * 100))}%` }}
                      />
                    </div>
                    <span className="font-mono text-purple-400 font-bold text-[11px] w-12 text-right">
                      {f.score.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'symbols' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['all', 'file', 'function', 'class', 'interface', 'component'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSymbolFilter(filter)}
                  className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors cursor-pointer ${
                    symbolFilter === filter
                      ? 'bg-teal-900 text-teal-200 font-bold border border-teal-600'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {filteredSymbols.map(sym => (
                <div
                  key={sym.id}
                  className="p-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                        sym.kind === 'function' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' :
                        sym.kind === 'class' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        sym.kind === 'interface' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                        sym.kind === 'component' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {sym.kind}
                      </span>
                      <button
                        onClick={() => onOpenFile(sym.filePath, sym.line)}
                        className="font-mono font-medium text-zinc-200 hover:text-teal-300 text-[11px] truncate cursor-pointer"
                      >
                        {sym.name}
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5">
                      {sym.filePath}:{sym.line}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                    <span className="text-zinc-400">In:{sym.inDegree} Out:{sym.outDegree}</span>
                    <span className="text-teal-400 font-bold">PR:{sym.pageRank}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chroma' && (
          <div className="space-y-3.5">
            {/* Collection Selector & Controls */}
            <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Database size={13} className="text-indigo-400" />
                  <span>Chroma Vector Collections</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                    v0.6.3
                  </span>
                </div>
                <button
                  onClick={handleSeedChromaQuickstart}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[10px] font-medium transition-colors cursor-pointer border border-zinc-700"
                >
                  ⚡ Seed Demo
                </button>
              </div>

              {/* Collection Dropdown & Info */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedColName}
                  onChange={e => setSelectedColName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  {chromaCollections.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count} records)
                    </option>
                  ))}
                </select>

                <button
                  onClick={refreshChromaCollections}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                  title="Refresh collections"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              {/* Create New Collection Form */}
              <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                <input
                  type="text"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  placeholder="New collection name..."
                  className="flex-1 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newColMetric}
                  onChange={e => setNewColMetric(e.target.value as DistanceMetric)}
                  className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 focus:outline-none"
                >
                  <option value="cosine">Cosine</option>
                  <option value="l2">L2 (Euclidean)</option>
                  <option value="ip">Inner Product</option>
                </select>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newColName.trim()}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Query Vector Space */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={chromaQuery}
                  onChange={e => setChromaQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeChromaQuery()}
                  placeholder={`Search semantic vectors in collection "${selectedColName}"...`}
                  className="w-full pl-8 pr-16 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={executeChromaQuery}
                  disabled={isChromaSearching}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium cursor-pointer transition-colors"
                >
                  {isChromaSearching ? '...' : 'Query'}
                </button>
              </div>

              {/* Metadata Filter */}
              <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800/60 flex items-center gap-2 text-[10px]">
                <Filter size={11} className="text-zinc-500 shrink-0" />
                <span className="text-zinc-400">Where:</span>
                <input
                  type="text"
                  value={filterKey}
                  onChange={e => setFilterKey(e.target.value)}
                  placeholder="Meta key (e.g. category)"
                  className="w-28 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
                />
                <span className="text-zinc-500">=</span>
                <input
                  type="text"
                  value={filterVal}
                  onChange={e => setFilterVal(e.target.value)}
                  placeholder="Value"
                  className="w-24 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
                />
                {(filterKey || filterVal) && (
                  <button
                    onClick={() => { setFilterKey(''); setFilterVal(''); }}
                    className="text-zinc-500 hover:text-zinc-300 ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>Retrieved Documents ({chromaResults.length})</span>
                <span className="font-mono text-zinc-500">Metric: Cosine Distance</span>
              </div>

              {chromaResults.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  No matching documents in this Chroma collection.
                </div>
              ) : (
                chromaResults.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800/80 space-y-1.5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-[11px] truncate max-w-[200px]">
                        {item.id}
                      </span>
                      {item.distance !== null && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                          Dist: {item.distance.toFixed(4)}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans line-clamp-3">
                      {item.doc}
                    </p>

                    {item.meta && Object.keys(item.meta).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/50">
                        {Object.entries(item.meta).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400 text-[9px] font-mono border border-zinc-800"
                          >
                            {k}: <span className="text-zinc-200">{String(v)}</span>
                          </span>
                        ))}
                        {item.meta.filePath && (
                          <button
                            onClick={() => onOpenFile(String(item.meta.filePath), Number(item.meta.startLine) || 1)}
                            className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={10} /> Open
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Document */}
            <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/80 space-y-2">
              <div className="text-[11px] font-semibold text-zinc-300">Add Record to &ldquo;{selectedColName}&rdquo;</div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={newDocId}
                  onChange={e => setNewDocId(e.target.value)}
                  placeholder="Document ID (optional, auto-generated if blank)..."
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <textarea
                  rows={2}
                  value={newDocText}
                  onChange={e => setNewDocText(e.target.value)}
                  placeholder="Document text to embed and store..."
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleAddDocument}
                disabled={!newDocText.trim()}
                className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                + Insert Chroma Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
