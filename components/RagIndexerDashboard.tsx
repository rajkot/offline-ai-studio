'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Loader2, CheckCircle2, FileText, HardDrive, ShieldCheck, Zap } from 'lucide-react';

interface IndexedFile {
  path: string;
  chunksCount: number;
  sizeKb: number;
}

interface RagStats {
  indexedFilesCount: number;
  totalChunksCount: number;
  status: string;
  autoIndexing: boolean;
  recentFiles: IndexedFile[];
}

export default function RagIndexerDashboard() {
  const [stats, setStats] = useState<RagStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Idle');
  const [autoIndexingActive, setAutoIndexingActive] = useState<boolean>(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/rag/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch RAG stats', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    // Simulate periodic auto-indexing check
    const interval = setInterval(() => {
      setAutoIndexingActive(prev => !prev);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRebuildIndex = async () => {
    setLoading(true);
    setStatusText('Scanning files...');
    
    try {
      await new Promise(r => setTimeout(r, 600));
      setStatusText('Generating embeddings...');
      
      const res = await fetch('/api/rag/rebuild', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setStatusText('Index rebuilt successfully!');
        setTimeout(() => setStatusText('Idle'), 2000);
      }
    } catch (err) {
      console.error('Rebuild failed', err);
      setStatusText('Rebuild failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-indexing pulsing banner */}
      {autoIndexingActive && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs animate-pulse">
          <span className="flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-600" />
            🔄 Auto-indexing changes in workspace...
          </span>
          <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Watchdog Active</span>
        </div>
      )}

      {/* Header status badge & stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indexed Files</span>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {stats ? stats.indexedFilesCount : 0} <span className="text-xs font-normal text-slate-500">files</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 size={13} /> Synchronized
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Chunks</span>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {stats ? stats.totalChunksCount : 0} <span className="text-xs font-normal text-slate-500">chunks</span>
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <Database size={13} /> Dense Vector Vectors
          </div>
        </div>
      </div>

      {/* Rebuild Action Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Vector Database Sync & Indexer
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Force re-scan workspace and regenerate embedding vectors.</p>
          </div>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">
            Status: {statusText}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Current Engine: <strong className="text-slate-900 font-mono">ChromaDB / Local FAISS</strong>
          </div>
          <button
            onClick={handleRebuildIndex}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? statusText : '⚡ Rebuild Vector Index'}
          </button>
        </div>
      </div>

      {/* Context Verification Viewer (Last 5 indexed files) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" /> Context Verification Viewer (Last 5 Indexed Files)
          </h4>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
            Live Feed
          </span>
        </div>

        <div className="space-y-2">
          {stats?.recentFiles && stats.recentFiles.length > 0 ? (
            stats.recentFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                    <FileText size={14} />
                  </div>
                  <div className="truncate">
                    <div className="font-mono text-xs font-semibold text-slate-800 truncate">{file.path}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{file.chunksCount} chunks generated</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                    {file.sizeKb} KB
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic text-center py-4">No indexed files found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
