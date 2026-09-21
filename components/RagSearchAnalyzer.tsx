'use client';
import { useState, useEffect } from 'react';
import { Search, Loader2, Database, Zap, GitMerge, FileText } from 'lucide-react';

interface SearchResult {
  id: string;
  file: string;
  chunk: string;
  score: string;
}

interface RagSearchAnalyzerProps {
  onOpenFile?: (filePath: string) => void;
}

export default function RagSearchAnalyzer({ onOpenFile }: RagSearchAnalyzerProps = {}) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sparseResults, setSparseResults] = useState<SearchResult[]>([]);
  const [denseResults, setDenseResults] = useState<SearchResult[]>([]);
  const [fusedResults, setFusedResults] = useState<SearchResult[]>([]);
  
  const [keywordWeight, setKeywordWeight] = useState(0.5);
  const [vectorWeight, setVectorWeight] = useState(0.5);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedRagSettings = localStorage.getItem('rag_settings');
        if (savedRagSettings) {
          const parsed = JSON.parse(savedRagSettings);
          setKeywordWeight(parsed.keywordWeight ?? 0.5);
          setVectorWeight(parsed.vectorWeight ?? 0.5);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/hybrid-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 3, keywordWeight, vectorWeight })
      });
      if (res.ok) {
        const data = await res.json();
        setSparseResults(data.sparse);
        setDenseResults(data.dense);
        setFusedResults(data.fused);
      }
    } catch (e) {
      console.error('Hybrid search failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  const getFileColor = (file: string) => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (file.endsWith('.css')) return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    if (file.endsWith('json')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  const ResultCard = ({ result, highlightQuery }: { result: SearchResult, highlightQuery?: boolean }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={() => onOpenFile?.(result.file)}
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getFileColor(result.file)} flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer`}
          title={`Open ${result.file} in editor`}
        >
          <FileText size={10} />
          {result.file}
        </button>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
          {result.score}
        </span>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">
        {highlightQuery && query ? (
          result.chunk.split(new RegExp(`(${query.split(' ')[0]})`, 'gi')).map((part, i) => 
            part.toLowerCase() === query.split(' ')[0]?.toLowerCase() 
              ? <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark> 
              : part
          )
        ) : (
          result.chunk
        )}
      </p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 font-sans overflow-hidden">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
          <Search size={20} className="text-indigo-600" />
          RAG Search Analyzer
        </h2>
        <p className="text-xs text-slate-500">
          Visualize how Reciprocal Rank Fusion (RRF) combines Sparse (Keyword) and Dense (Vector) search results.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across codebase (e.g. 'authentication logic')"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Analyze Search
        </button>
      </form>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Sparse Results */}
        <div className="flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
              <Database size={16} className="text-blue-500" />
              Sparse Matches
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">BM25</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-lg" />)}
              </div>
            ) : sparseResults.length > 0 ? (
              sparseResults.map(res => <ResultCard key={res.id} result={res} highlightQuery />)
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No results</div>
            )}
          </div>
        </div>

        {/* Dense Results */}
        <div className="flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
              <Zap size={16} className="text-amber-500" />
              Dense Matches
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Vector</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-lg" />)}
              </div>
            ) : denseResults.length > 0 ? (
              denseResults.map(res => <ResultCard key={res.id} result={res} />)
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No results</div>
            )}
          </div>
        </div>

        {/* Fused Results */}
        <div className="flex flex-col h-full bg-indigo-50/50 rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
          <div className="p-3 border-b border-indigo-100 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-sm text-indigo-900 flex items-center gap-1.5">
              <GitMerge size={16} className="text-indigo-600" />
              Fused & Re-Ranked
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">RRF Score</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-indigo-100 animate-pulse rounded-lg" />)}
              </div>
            ) : fusedResults.length > 0 ? (
              fusedResults.map(res => <ResultCard key={res.id} result={res} highlightQuery />)
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No results</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
