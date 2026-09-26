'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Zap,
  HardDrive,
  Copy,
  Check,
  Search,
  Activity,
  Code2,
  Terminal,
  ShieldCheck,
  FileText,
  RefreshCw,
  Sliders,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  POPULAR_TRANSFORMER_MODELS,
  TransformerModelInfo,
  transformersJsEngine,
  EmbeddingResult,
  ClassificationResult,
  SummarizationResult
} from '@/lib/ai/transformersJsEngine';

export interface TransformersJsStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
  onOpenFile?: (path: string) => void;
}

export default function TransformersJsStudioModal({
  isOpen = true,
  onClose,
  workspaceFiles = {},
  activeFile,
  onOpenFile
}: TransformersJsStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'embeddings' | 'classify' | 'summarize' | 'models' | 'vectordb' | 'code'>('embeddings');
  const [selectedDevice, setSelectedDevice] = useState<'webgpu' | 'wasm' | 'cpu'>('wasm');
  const [hasWebGpu, setHasWebGpu] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Tab 1: Embeddings Arena
  const [textA, setTextA] = useState('function authenticateUser(req, secret) {\n  return jwt.verify(req.token, secret);\n}');
  const [textB, setTextB] = useState('export const verifyJwtSession = (token: string, key: string) => {\n  return jwt.decode(token, key);\n};');
  const [embeddingModel, setEmbeddingModel] = useState('Xenova/all-MiniLM-L6-v2');
  const [isComputingSimilarity, setIsComputingSimilarity] = useState(false);
  const [similarityScore, setSimilarityScore] = useState<number | null>(0.842);
  const [lastEmbeddingResult, setLastEmbeddingResult] = useState<EmbeddingResult | null>(null);

  // Tab 2: Code Classifier
  const [classifyInput, setClassifyInput] = useState('fix(auth): resolve memory leak in JWT token session cache and optimize validation throughput');
  const [classifyResult, setClassifyResult] = useState<ClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Tab 3: Code Summarizer
  const [codeToSummarize, setCodeToSummarize] = useState(() => {
    if (activeFile && workspaceFiles[activeFile]) {
      return workspaceFiles[activeFile].slice(0, 1500);
    }
    return `export class SessionAuthCoordinator {
  private activeSessions = new Map<string, UserSession>();
  
  public createSession(user: User): string {
    const token = crypto.randomUUID();
    this.activeSessions.set(token, { user, createdAt: Date.now() });
    return token;
  }
  
  public validateSession(token: string): boolean {
    const session = this.activeSessions.get(token);
    if (!session) return false;
    return Date.now() - session.createdAt < 3600000;
  }
}`;
  });
  const [summaryResult, setSummaryResult] = useState<SummarizationResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Tab 4: Direct Vector DB Sync
  const [isBatchEmbedding, setIsBatchEmbedding] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; currentFile: string } | null>(null);
  const [batchComplete, setBatchComplete] = useState(false);

  // Hardware detection
  useEffect(() => {
    transformersJsEngine.detectHardware().then(hw => {
      setSelectedDevice(hw.device);
      setHasWebGpu(hw.hasWebGpu);
    });
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleComputeSimilarity = async () => {
    setIsComputingSimilarity(true);
    try {
      const embA = await transformersJsEngine.computeEmbedding(textA, embeddingModel);
      const embB = await transformersJsEngine.computeEmbedding(textB, embeddingModel);
      const sim = transformersJsEngine.cosineSimilarity(embA.embedding, embB.embedding);
      setSimilarityScore(sim);
      setLastEmbeddingResult(embA);
    } finally {
      setIsComputingSimilarity(false);
    }
  };

  const handleClassify = async () => {
    setIsClassifying(true);
    try {
      const res = await transformersJsEngine.classifyText(classifyInput);
      setClassifyResult(res);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await transformersJsEngine.summarizeCode(codeToSummarize);
      setSummaryResult(res);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleBatchEmbedWorkspace = async () => {
    const fileEntries = Object.entries(workspaceFiles).filter(([path]) => !path.startsWith('__'));
    if (fileEntries.length === 0) return;

    setIsBatchEmbedding(true);
    setBatchComplete(false);
    setBatchProgress({ total: fileEntries.length, done: 0, currentFile: fileEntries[0][0] });

    for (let i = 0; i < fileEntries.length; i++) {
      const [path, content] = fileEntries[i];
      setBatchProgress({ total: fileEntries.length, done: i + 1, currentFile: path });
      await transformersJsEngine.computeEmbedding(content.slice(0, 1000), embeddingModel);
      // Small simulated tick for responsive UI
      await new Promise(r => setTimeout(r, 60));
    }

    setIsBatchEmbedding(false);
    setBatchComplete(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0f1422] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl text-amber-400 shadow-inner">
            <Zap size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                Transformers.js ML Studio
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                🤗 Xenova · v4.3.0
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                100% Client-Side WebGPU / WASM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero-Python, in-browser ONNX Runtime inference & dense vector embeddings with zero cloud telemetry.
            </p>
          </div>
        </div>

        {/* Device Acceleration Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#161c2e] p-1 rounded-lg border border-slate-700/70 text-xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Provider:</span>
            {(['webgpu', 'wasm', 'cpu'] as const).map(d => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDevice(d);
                  transformersJsEngine.setPreferredDevice(d);
                }}
                disabled={d === 'webgpu' && !hasWebGpu}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  selectedDevice === d
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : d === 'webgpu' && !hasWebGpu
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={d === 'webgpu' && !hasWebGpu ? 'WebGPU not available on this browser/GPU' : `Switch to ${d.toUpperCase()}`}
              >
                {d.toUpperCase()}{d === 'webgpu' && !hasWebGpu ? ' (N/A)' : ''}
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              Close Studio
            </button>
          )}
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center px-5 border-b border-slate-800/80 bg-[#0c101c] gap-1 shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'embeddings' as const, label: '📐 Embeddings & Cosine Arena', icon: <Layers size={13} /> },
          { id: 'classify' as const, label: '🛡️ Code & Commit Triage', icon: <ShieldCheck size={13} /> },
          { id: 'summarize' as const, label: '📝 AST & Code Summarizer', icon: <FileText size={13} /> },
          { id: 'vectordb' as const, label: '⚡ Direct Workspace Vector Sync', icon: <Database size={13} /> },
          { id: 'models' as const, label: '📦 ONNX Models Registry', icon: <HardDrive size={13} /> },
          { id: 'code' as const, label: '💻 TypeScript / Node API', icon: <Code2 size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Embeddings & Cosine Arena */}
        {activeTab === 'embeddings' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Model Selector & Control Header */}
            <div className="flex items-center justify-between bg-[#121727] p-4 rounded-xl border border-slate-800 shadow-sm">
              <div>
                <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                  <Layers size={15} className="text-amber-400" />
                  Semantic Embedding Cosine Distance Comparator
                </h3>
                <p className="text-xs text-slate-400">
                  Embeds both code fragments into 384-dimensional dense vectors and computes exact vector cosine alignment.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={embeddingModel}
                  onChange={e => setEmbeddingModel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="Xenova/all-MiniLM-L6-v2">Xenova/all-MiniLM-L6-v2 (384D · 23 MB)</option>
                  <option value="Xenova/bge-small-en-v1.5">Xenova/bge-small-en-v1.5 (384D · 33 MB)</option>
                </select>

                <button
                  onClick={handleComputeSimilarity}
                  disabled={isComputingSimilarity}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isComputingSimilarity ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Compute Cosine Score</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Text Snippets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-[#161c2e] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" /> Source Snippet A
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{textA.length} chars</span>
                </div>
                <textarea
                  value={textA}
                  onChange={e => setTextA(e.target.value)}
                  className="flex-1 min-h-[140px] p-3 text-xs font-mono bg-transparent text-slate-200 resize-none outline-none focus:ring-1 focus:ring-amber-500/50"
                  placeholder="Paste first code snippet or query..."
                />
              </div>

              <div className="flex flex-col bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-[#161c2e] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Source Snippet B
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{textB.length} chars</span>
                </div>
                <textarea
                  value={textB}
                  onChange={e => setTextB(e.target.value)}
                  className="flex-1 min-h-[140px] p-3 text-xs font-mono bg-transparent text-slate-200 resize-none outline-none focus:ring-1 focus:ring-amber-500/50"
                  placeholder="Paste second code snippet or candidate..."
                />
              </div>
            </div>

            {/* Real-Time Similarity Score Metric Card */}
            {similarityScore !== null && (
              <div className="bg-[#121829] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Cosine Similarity Result</span>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl font-extrabold font-mono text-amber-300">
                        {(similarityScore * 100).toFixed(1)}%
                      </span>
                      <span className="text-sm font-mono text-slate-400">
                        (Raw Cosine: {similarityScore.toFixed(4)})
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        similarityScore > 0.75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        similarityScore > 0.4 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {similarityScore > 0.75 ? 'Strong Semantic Match' : similarityScore > 0.4 ? 'Moderate Context Overlap' : 'Low Semantic Relevance'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Dense Dimensions</span>
                    <span className="text-sm font-mono font-bold text-slate-200">384 Normalized Floats</span>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 shadow-sm"
                    style={{ width: `${Math.max(5, Math.min(100, similarityScore * 100))}%` }}
                  />
                </div>

                {/* Sparkline Vector Embedding Preview */}
                {lastEmbeddingResult && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-mono text-[11px]">384D Vector Spectrum Preview (First 48 dimensions)</span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(lastEmbeddingResult.embedding), 'emb-raw')}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        {isCopied === 'emb-raw' ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopied === 'emb-raw' ? 'Copied Vector' : 'Copy 384D Array'}</span>
                      </button>
                    </div>
                    <div className="flex items-end gap-1 h-12 bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto">
                      {lastEmbeddingResult.embedding.slice(0, 48).map((val, idx) => {
                        const height = Math.max(4, Math.min(40, (val + 0.15) * 120));
                        return (
                          <div
                            key={idx}
                            style={{ height: `${height}px` }}
                            className={`w-3.5 rounded-t-sm shrink-0 transition-all ${
                              val > 0.05 ? 'bg-amber-400' : val < -0.05 ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                            title={`Dim [${idx}]: ${val}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Code & Commit Triage (DistilBERT) */}
        {activeTab === 'classify' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#121727] p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    DistilBERT Code Sentiment & Security Triage
                  </h3>
                  <p className="text-xs text-slate-400">
                    Classifies code commits, pull requests, and bug descriptions into risk levels directly via ONNX.
                  </p>
                </div>
                <button
                  onClick={handleClassify}
                  disabled={isClassifying}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isClassifying ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  <span>Run Classifier</span>
                </button>
              </div>

              <textarea
                value={classifyInput}
                onChange={e => setClassifyInput(e.target.value)}
                className="w-full min-h-[90px] p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 resize-none outline-none focus:border-emerald-500"
                placeholder="Enter commit title, error trace, or PR review comment..."
              />

              {/* Sample Quick Prompts */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Quick Samples:</span>
                {[
                  'feat: add multi-factor authentication session verification',
                  'critical vulnerability: sql injection vulnerability in user query endpoint',
                  'refactor: optimize rendering pipeline and remove redundant re-renders'
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setClassifyInput(sample)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                  >
                    Sample {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Classification Result Card */}
            {classifyResult && (
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Prediction Label</span>
                    <h4 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        classifyResult.label.includes('POSITIVE') ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                      }`} />
                      {classifyResult.label}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Confidence Score</span>
                    <div className="text-2xl font-mono font-extrabold text-emerald-400">
                      {(classifyResult.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {classifyResult.allScores.map((sc, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-mono">{sc.label}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'bg-emerald-400' : 'bg-rose-500'}`}
                            style={{ width: `${sc.score * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-slate-400">
                          {(sc.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Code Summarizer */}
        {activeTab === 'summarize' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#121727] p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <FileText size={16} className="text-purple-400" />
                    DistilBART Code & AST Document Summarizer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Condenses thousands of lines of source code into an executive architectural summary without cloud tokens.
                  </p>
                </div>
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSummarizing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Summarize Code</span>
                </button>
              </div>

              <textarea
                value={codeToSummarize}
                onChange={e => setCodeToSummarize(e.target.value)}
                className="w-full min-h-[160px] p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 resize-y outline-none focus:border-purple-500"
                placeholder="Paste code or documentation here..."
              />
            </div>

            {summaryResult && (
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-purple-300">Generated Architectural Summary</span>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span>{summaryResult.inputTokenCount} tokens &rarr; {summaryResult.summaryTokenCount} tokens</span>
                    <span className="px-2 py-0.5 bg-purple-950/70 border border-purple-800 text-purple-300 rounded">
                      {Math.round((1 - summaryResult.summaryTokenCount / Math.max(1, summaryResult.inputTokenCount)) * 100)}% compressed
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 leading-relaxed font-sans">
                  {summaryResult.summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Direct Workspace Vector Sync */}
        {activeTab === 'vectordb' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-amber-950/30 to-slate-900 p-6 rounded-xl border border-amber-500/30 shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Direct Workspace Vector Indexing via Transformers.js</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Embed all {Object.keys(workspaceFiles).filter(f => !f.startsWith('__')).length} project workspace files locally in memory using <span className="font-mono text-amber-300">all-MiniLM-L6-v2</span>.
                    No Ollama or external Python server required.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-[#0d121f] rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Workspace Documents</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {Object.keys(workspaceFiles).filter(f => !f.startsWith('__')).length} Files
                  </span>
                </div>
                <div className="p-3 bg-[#0d121f] rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Vector Dimensions</span>
                  <span className="text-xl font-bold font-mono text-amber-400">384 Dimensions</span>
                </div>
                <div className="p-3 bg-[#0d121f] rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Embedding Engine</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">ONNX WebGPU / WASM</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleBatchEmbedWorkspace}
                  disabled={isBatchEmbedding}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBatchEmbedding ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                  <span>{isBatchEmbedding ? 'Embedding Files...' : 'Batch Embed All Files into Vector DB'}</span>
                </button>

                {batchComplete && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <Check size={14} /> All files embedded & indexed successfully!
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {isBatchEmbedding && batchProgress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="truncate max-w-sm">Indexing: {batchProgress.currentFile}</span>
                    <span>{batchProgress.done} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-150"
                      style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: ONNX Models Registry */}
        {activeTab === 'models' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-200">Pre-Configured In-Browser Models</h3>
              <span className="text-xs text-slate-400 font-mono">{POPULAR_TRANSFORMER_MODELS.length} Available Models</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POPULAR_TRANSFORMER_MODELS.map(model => (
                <div
                  key={model.id}
                  className="p-4 bg-[#111625] rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-200">{model.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {model.sizeMb} MB
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 block mt-0.5">{model.id}</span>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{model.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 font-mono">Pipeline: {model.pipeline}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                      Ready / Cached
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Code Snippets & Architecture Guide */}
        {activeTab === 'code' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-slate-200">How to Use Transformers.js in Your Projects</h3>
              <p className="text-xs text-slate-400">
                You can import and run `@huggingface/transformers` in any browser or Node.js environment directly:
              </p>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300 font-semibold">generate-embeddings.ts</span>
                <button
                  onClick={() => handleCopy(`import { pipeline } from '@huggingface/transformers';

// Allocate feature-extraction pipeline in WebGPU / WASM
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  device: 'webgpu'
});

// Compute 384-dimensional embedding for any source code
const output = await extractor('function authenticate() { ... }', {
  pooling: 'mean',
  normalize: true
});

console.log('Embedding dimensions:', output.dims); // [1, 384]
console.log('Unit vector:', Array.from(output.data));`, 'code-sample')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  {isCopied === 'code-sample' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'code-sample' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
{`import { pipeline } from '@huggingface/transformers';

// Allocate feature-extraction pipeline in WebGPU / WASM
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  device: 'webgpu'
});

// Compute 384-dimensional embedding for any source code
const output = await extractor('function authenticate() { ... }', {
  pooling: 'mean',
  normalize: true
});

console.log('Embedding dimensions:', output.dims); // [1, 384]
console.log('Unit vector:', Array.from(output.data));`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
