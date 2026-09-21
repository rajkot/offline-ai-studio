'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Loader2,
  Database,
  Search,
  BookOpen,
  RefreshCw,
  FolderOpen,
  Calendar,
  HardDrive,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
  Eye,
  Plus,
  Hash,
  ArrowUpDown
} from 'lucide-react';

export interface RAGDocument {
  id: string;
  name: string;
  sizeBytes: number;
  type: 'pdf' | 'md' | 'txt' | 'json';
  status: 'scanned' | 'indexing';
  chunkCount: number;
  uploadedAt: string;
  vectorDimensions: number;
}

export default function KnowledgeVault() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'md' | 'txt' | 'json'>('all');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStep, setRebuildStep] = useState<string | null>(null);
  const [rebuildProgress, setRebuildProgress] = useState(0);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<RAGDocument | null>(null);

  const [documents, setDocuments] = useState<RAGDocument[]>([
    {
      id: 'doc-1',
      name: 'api_developer_manual.pdf',
      sizeBytes: 2508800, // 2.4 MB
      type: 'pdf',
      status: 'scanned',
      chunkCount: 142,
      uploadedAt: '2026-08-20',
      vectorDimensions: 768
    },
    {
      id: 'doc-2',
      name: 'system_architecture_spec.md',
      sizeBytes: 327680, // 320 KB
      type: 'md',
      status: 'scanned',
      chunkCount: 38,
      uploadedAt: '2026-08-22',
      vectorDimensions: 768
    },
    {
      id: 'doc-3',
      name: 'endpoint_contracts.json',
      sizeBytes: 184320, // 180 KB
      type: 'json',
      status: 'scanned',
      chunkCount: 24,
      uploadedAt: '2026-08-23',
      vectorDimensions: 768
    },
    {
      id: 'doc-4',
      name: 'offline_runtime_invariants.txt',
      sizeBytes: 94208, // 92 KB
      type: 'txt',
      status: 'scanned',
      chunkCount: 16,
      uploadedAt: '2026-08-24',
      vectorDimensions: 768
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset file input value so the same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const supportedExtensions = ['pdf', 'md', 'txt', 'json'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && supportedExtensions.includes(ext)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert('Unsupported file format. Please upload .pdf, .md, .txt, or .json files.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadingFileName(validFiles.length === 1 ? validFiles[0].name : `${validFiles.length} files`);

    // Create temporary entries in "indexing" status
    const newDocEntries: RAGDocument[] = validFiles.map((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'md' | 'txt' | 'json';
      return {
        id: `doc-${Date.now()}-${idx}`,
        name: file.name,
        sizeBytes: file.size || 128000,
        type: ext,
        status: 'indexing', // Initial state: 🟡 Indexing...
        chunkCount: Math.max(4, Math.floor((file.size || 100000) / 12000)),
        uploadedAt: new Date().toISOString().split('T')[0],
        vectorDimensions: 768
      };
    });

    // Add to table immediately with "indexing" status
    setDocuments(prev => [...newDocEntries, ...prev]);

    // Stream upload & vectorization progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            setUploadingFileName('');
            // Transition new files to "scanned" status (🟢 Scanned)
            setDocuments(current =>
              current.map(d =>
                newDocEntries.some(nd => nd.id === d.id) ? { ...d, status: 'scanned' } : d
              )
            );
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleRemoveDocument = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDocForPreview?.id === id) {
      setSelectedDocForPreview(null);
    }
  };

  // 🔄 Rebuild RAG Index handler
  const handleRebuildIndex = () => {
    if (isRebuilding) return;
    setIsRebuilding(true);
    setRebuildProgress(15);
    setRebuildStep('Extracting semantic AST & token chunks...');

    // Mark all documents as "indexing" during rebuild
    setDocuments(prev => prev.map(doc => ({ ...doc, status: 'indexing' })));

    setTimeout(() => {
      setRebuildProgress(45);
      setRebuildStep('Generating 768-dim embeddings via text-embedding-004...');
    }, 1000);

    setTimeout(() => {
      setRebuildProgress(75);
      setRebuildStep('Re-indexing HNSW vector graph & cosine similarity weights...');
    }, 2200);

    setTimeout(() => {
      setRebuildProgress(100);
      setRebuildStep('Index sync complete! 100% vectors grounded.');
    }, 3200);

    setTimeout(() => {
      setIsRebuilding(false);
      setRebuildStep(null);
      setRebuildProgress(0);
      // All documents marked as "scanned" (🟢 Scanned)
      setDocuments(prev => prev.map(doc => ({ ...doc, status: 'scanned' })));
    }, 3900);
  };

  const getFileBadge = (type: RAGDocument['type']) => {
    switch (type) {
      case 'pdf':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded">
            <FileText size={11} /> PDF
          </span>
        );
      case 'md':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
            <FileText size={11} /> MD
          </span>
        );
      case 'json':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
            <FileJson size={11} /> JSON
          </span>
        );
      case 'txt':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-1.5 py-0.5 rounded">
            <FileText size={11} /> TXT
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
            <FileCode size={11} /> DOC
          </span>
        );
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  const totalChunks = useMemo(() => {
    return documents.reduce((acc, doc) => acc + doc.chunkCount, 0);
  }, [documents]);

  const totalSizeFormatted = useMemo(() => {
    const totalBytes = documents.reduce((acc, doc) => acc + doc.sizeBytes, 0);
    return formatFileSize(totalBytes);
  }, [documents]);

  return (
    <div
      id="knowledge-vault-panel"
      className="flex flex-col h-full bg-[#0b0c10] text-zinc-200 font-sans select-none overflow-hidden"
    >
      {/* Header Panel */}
      <div className="p-3.5 bg-[#10121a] border-b border-zinc-850 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-950/80 border border-indigo-700/80 rounded-lg text-indigo-400">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                Knowledge Base &amp; Vault
              </h2>
              <p className="text-[10px] text-zinc-400">
                Vector grounding for LLM inference &amp; RAG search
              </p>
            </div>
          </div>

          {/* 🔄 Rebuild RAG Index Button */}
          <button
            id="btn-rebuild-rag-index"
            onClick={handleRebuildIndex}
            disabled={isRebuilding || isUploading}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:text-zinc-500 text-white text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
            title="Trigger full semantic re-indexing of all ingested files"
          >
            <RefreshCw
              size={12}
              className={isRebuilding ? 'animate-spin text-indigo-300' : 'text-white'}
            />
            <span>🔄 Rebuild RAG Index</span>
          </button>
        </div>

        {/* Global Storage Quick Stats Banner */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-zinc-850/80 text-[10px] font-mono">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-1.5 flex flex-col">
            <span className="text-zinc-500 text-[9px]">DOCUMENTS</span>
            <span className="text-zinc-200 font-bold">{documents.length} Files</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-1.5 flex flex-col">
            <span className="text-zinc-500 text-[9px]">TOTAL CHUNKS</span>
            <span className="text-indigo-400 font-bold">{totalChunks} Embeddings</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-1.5 flex flex-col">
            <span className="text-zinc-500 text-[9px]">INDEX SIZE</span>
            <span className="text-emerald-400 font-bold">{totalSizeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Rebuild In-Flight Live Progress Stream Banner */}
      {isRebuilding && (
        <div className="bg-indigo-950/40 border-b border-indigo-800/60 p-3 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
            <span className="text-indigo-300 font-bold flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-indigo-400" />
              Rebuilding HNSW Vector Index...
            </span>
            <span className="text-indigo-400 font-bold">{rebuildProgress}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-linear-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${rebuildProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">{rebuildStep}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
        {/* Dashed-Border Drag & Drop Zone */}
        <div
          id="rag-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
            isDragging
              ? 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/40'
              : 'border-zinc-750 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.md,.txt,.json"
            onChange={handleFileSelect}
            multiple
          />

          {isUploading ? (
            <div className="w-full py-2 flex flex-col items-center space-y-2">
              <Loader2 size={22} className="text-indigo-400 animate-spin" />
              <div className="text-center">
                <p className="text-xs font-bold text-zinc-200">
                  Ingesting {uploadingFileName}...
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Extracting semantic token chunks &amp; vectors
                </p>
              </div>

              <div className="w-full max-w-[240px] bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">
                {uploadProgress}% Processed
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 py-1">
              <div className="p-2 bg-indigo-950/80 border border-indigo-700/60 rounded-xl text-indigo-400 shadow-sm">
                <UploadCloud size={20} />
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-100">
                  Drag &amp; Drop Documents Here
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  or <span className="text-indigo-400 underline font-semibold">browse local files</span>
                </p>
              </div>

              {/* Supported file type tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-rose-300">
                  .pdf
                </span>
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-emerald-300">
                  .md
                </span>
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-cyan-300">
                  .txt
                </span>
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-amber-300">
                  .json
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-500 pointer-events-none">
              <Search size={13} />
            </span>
            <input
              type="text"
              placeholder="Filter by name or extension..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg outline-none text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 font-sans transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 text-[10px] font-mono overflow-x-auto pb-0.5 custom-scrollbar">
            {(['all', 'pdf', 'md', 'txt', 'json'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded transition-colors uppercase font-bold shrink-0 cursor-pointer ${
                  typeFilter === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Uploaded Documents Table */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1 font-bold uppercase tracking-wider">
            <span>Ingested File Registry</span>
            <span>{filteredDocuments.length} files</span>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 border border-zinc-850 rounded-xl bg-zinc-900/20 text-zinc-500 text-xs font-sans">
              <Database size={20} className="mx-auto mb-1.5 text-zinc-600" />
              <p>No knowledge base documents match your filter.</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Drop .pdf, .md, .txt, or .json files to populate.
              </p>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-2 px-3 font-semibold">File Name</th>
                      <th className="py-2 px-2.5 font-semibold">Size</th>
                      <th className="py-2 px-2.5 font-semibold">Status</th>
                      <th className="py-2 px-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {filteredDocuments.map(doc => {
                      const isIndexing = doc.status === 'indexing';

                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-zinc-900/60 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDocForPreview(doc)}
                        >
                          {/* File Name & Format Badge */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                {getFileBadge(doc.type)}
                                <span
                                  className="font-bold text-xs text-zinc-200 truncate max-w-[140px] sm:max-w-[170px]"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
                                {doc.chunkCount} chunks • {doc.uploadedAt}
                              </span>
                            </div>
                          </td>

                          {/* File Size */}
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                            {formatFileSize(doc.sizeBytes)}
                          </td>

                          {/* Indexing Status */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            {isIndexing ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80 animate-pulse"
                                title="Generating semantic embeddings"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                🟡 Indexing...
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80"
                                title="Vectors compiled and active in RAG index"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                🟢 Scanned
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <button
                              onClick={e => handleRemoveDocument(doc.id, e)}
                              className="text-zinc-500 hover:text-rose-400 p-1.5 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                              title="Delete document from knowledge base"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Selected Document Details Drawer (Optional inspection) */}
        {selectedDocForPreview && (
          <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Info size={11} /> File Metadata
              </span>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="font-mono text-[11px] space-y-1 text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
              <div className="flex justify-between">
                <span className="text-zinc-500">File:</span>
                <span className="text-zinc-200 font-bold truncate max-w-[180px]">
                  {selectedDocForPreview.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Semantic Chunks:</span>
                <span className="text-indigo-300 font-bold">
                  {selectedDocForPreview.chunkCount} vector slices
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Embedding Vector:</span>
                <span className="text-emerald-300 font-bold">
                  {selectedDocForPreview.vectorDimensions} Dimensions
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Indexing State:</span>
                <span
                  className={
                    selectedDocForPreview.status === 'scanned'
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {selectedDocForPreview.status === 'scanned' ? '🟢 Scanned' : '🟡 Indexing...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
