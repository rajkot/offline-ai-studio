'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  FolderGit2,
  Download,
  Folder,
  Globe,
  Sparkles,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  HardDrive,
  RefreshCw,
  Check
} from 'lucide-react';

export interface ClonedRepoResult {
  repoName: string;
  files: Record<string, string>;
  primaryFile?: string;
  branch?: string;
  commits?: any[];
  targetDir?: string;
}

interface CloneRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyClonedRepo: (data: ClonedRepoResult) => void;
}

interface LocalCandidate {
  name: string;
  path: string;
  hasGit: boolean;
  description?: string;
}

const STARTER_TEMPLATES = [
  {
    name: 'React 19 + Vite + TypeScript',
    repoUrl: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts',
    fallbackLocal: 'react-vite-ts',
    desc: 'Ultra-fast Vite modern SPA starter with TypeScript and React 19',
    tag: 'Frontend'
  },
  {
    name: 'Next.js 15 Full-Stack App Router',
    repoUrl: 'https://github.com/vercel/next-learn/tree/main/dashboard/starter-example',
    fallbackLocal: 'nextjs-dashboard',
    desc: 'Next.js 15 App Router with server actions, Tailwind CSS & SQLite',
    tag: 'Full-Stack'
  },
  {
    name: 'Python FastAPI Async Microservice',
    repoUrl: 'https://github.com/tiangolo/full-stack-fastapi-template',
    fallbackLocal: 'fastapi-service',
    desc: 'High-concurrency Python backend with Pydantic v2 and OpenAPI docs',
    tag: 'Backend'
  },
  {
    name: 'Autonomous Multi-Agent AI Swarm',
    repoUrl: 'https://github.com/rajkot/offline-ai-studio.git',
    fallbackLocal: 'offline-ai-swarm',
    desc: 'Self-healing agent loop with AST PageRank and offline GGUF inference',
    tag: 'AI / Agent'
  },
  {
    name: 'AI4Bharat IndicNLP Corpus & Vectors',
    repoUrl: 'https://github.com/ai4bharat/indicnlp_corpus.git',
    fallbackLocal: 'indicnlp_corpus',
    desc: 'General-domain corpora, 300D FastText vectors, and tokenizers for 12 Indian languages',
    tag: 'NLP / Dataset'
  },
  {
    name: 'Chroma AI Vector Database',
    repoUrl: 'https://github.com/chroma-core/chroma.git',
    fallbackLocal: 'chroma',
    desc: 'The open-source AI vector database for embeddings, collections, and semantic search',
    tag: 'Vector DB'
  },
  {
    name: 'Hugging Face Candle (Rust ML & WASM)',
    repoUrl: 'https://github.com/huggingface/candle.git',
    fallbackLocal: 'candle',
    desc: 'Minimalist ML framework for Rust: zero-Python serverless inference, WebAssembly SIMD, Whisper & BERT',
    tag: 'Rust / WASM / ML'
  },
  {
    name: 'Andrej Karpathy nanoGPT (Subject AI Model Engine)',
    repoUrl: 'https://github.com/karpathy/nanoGPT.git',
    fallbackLocal: 'nanogpt',
    desc: 'The simplest, fastest repository for training / fine-tuning medium-sized GPTs with pure PyTorch',
    tag: 'PyTorch / LLM Training'
  },
  {
    name: 'Aider AI Pair Programmer (Repo Map & Edit Engine)',
    repoUrl: 'https://github.com/aider-ai/aider.git',
    fallbackLocal: 'aider',
    desc: 'AI pair programming with universal AST repo maps, PageRank symbol graphs, and SEARCH/REPLACE edit blocks',
    tag: 'AI / Pair Programming'
  },
  {
    name: 'Hugging Face Transformers.js (WebGPU ML Engine)',
    repoUrl: 'https://github.com/xenova/transformers.js.git',
    fallbackLocal: 'transformers.js',
    desc: 'State-of-the-art client-side ML in the browser & Electron via ONNX Runtime Web: embeddings, NER, and summarization',
    tag: 'WebGPU / ONNX / NLP'
  },
  {
    name: 'Outlines (FSM Guided Generation & Structured Output)',
    repoUrl: 'https://github.com/outlines-dev/outlines.git',
    fallbackLocal: 'outlines',
    desc: 'Fast, robust structured text generation with local models: JSON Schema, Regex, and Grammar logit masking',
    tag: 'AI / Structured Output'
  },
  {
    name: 'llama.cpp (Ultra-Fast Standalone C/C++ GGUF Engine)',
    repoUrl: 'https://github.com/ggerganov/llama.cpp.git',
    fallbackLocal: 'llama.cpp',
    desc: 'Cutting-edge LLM inference in pure C/C++ with minimal RAM, full GPU offloading (CUDA/Metal/Vulkan), and continuous batching',
    tag: 'C++ / GGUF / Inference'
  },
  {
    name: 'BurntSushi ripgrep (High-Performance Code Search)',
    repoUrl: 'https://github.com/BurntSushi/ripgrep.git',
    fallbackLocal: 'ripgrep',
    desc: 'Ultra-fast line-oriented search tool combining regex performance with ignore files (.gitignore), contextual lines, and multi-threading',
    tag: 'Rust / Search / CLI'
  },
  {
    name: 'ast-grep (AST Structural Code Search & Rewriter)',
    repoUrl: 'https://github.com/ast-grep/ast-grep.git',
    fallbackLocal: 'ast-grep',
    desc: 'Fast and polyglot tool for code searching, linting, and rewriting at AST level with meta-variables ($VAR, $$$ARGS)',
    tag: 'Rust / AST / Refactoring'
  },
  {
    name: 'LanceDB (Serverless Embedded Vector Database)',
    repoUrl: 'https://github.com/lancedb/lancedb.git',
    fallbackLocal: 'lancedb',
    desc: 'Developer-friendly, serverless vector database written in Rust. Apache Arrow columnar persistence, hybrid search (ANN + BM25), and zero-cloud RAG',
    tag: 'Rust / Vector DB / RAG'
  },
  {
    name: 'Chonkie (High-Performance AST & Semantic Chunking)',
    repoUrl: 'https://github.com/chonkie-inc/chonkie.git',
    fallbackLocal: 'chonkie',
    desc: 'The no-nonsense, ultra-lightweight RAG chunking library. Tree-sitter CodeChunker preserving intact AST syntax and direct LanceDB ingestion',
    tag: 'RAG / Tree-sitter / Chunking'
  },
  {
    name: 'TabbyML Tabby (Self-Hosted FIM Code Completion)',
    repoUrl: 'https://github.com/TabbyML/tabby.git',
    fallbackLocal: 'tabby',
    desc: 'Self-hosted, air-gapped code completion server. Sub-50ms Fill-in-the-Middle (FIM) inline ghost-text autocomplete for Monaco editor',
    tag: 'FIM / Autocomplete / Privacy'
  }
];

export default function CloneRepositoryModal({
  isOpen,
  onClose,
  onApplyClonedRepo
}: CloneRepositoryModalProps) {
  const [activeTab, setActiveTab] = useState<'remote' | 'local' | 'templates'>('remote');

  // Remote Form State
  const [remoteUrl, setRemoteUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [shallowClone, setShallowClone] = useState(true);

  // Local Form State
  const [localPath, setLocalPath] = useState('');
  const [localCandidates, setLocalCandidates] = useState<LocalCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // Execution & Progress State
  const [isCloning, setIsCloning] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clonedSuccessData, setClonedSuccessData] = useState<ClonedRepoResult | null>(null);

  // Infer target directory name from remote URL
  useEffect(() => {
    if (!remoteUrl.trim()) return;
    try {
      const clean = remoteUrl.trim().replace(/\/+$/, '').replace(/\.git$/i, '');
      const parts = clean.split(/[/\\]/);
      const inferred = parts[parts.length - 1];
      if (inferred && !targetName) {
        setTargetName(inferred);
      }
    } catch {}
  }, [remoteUrl]);

  // Load sibling local candidate repositories
  const fetchLocalCandidates = async () => {
    setIsLoadingCandidates(true);
    try {
      const res = await fetch('/api/git?action=local-candidates');
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && Array.isArray(data.candidates)) {
          setLocalCandidates(data.candidates);
        }
      }
    } catch {
      // Ignore candidate fetch error
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setClonedSuccessData(null);
      setIsCloning(false);
      setTerminalLogs([]);
      fetchLocalCandidates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStartClone = async (urlOrPath: string, customBranch?: string, customName?: string) => {
    const finalUrl = urlOrPath.trim();
    if (!finalUrl) {
      setErrorMsg('Please enter a valid Git URL or local folder path');
      return;
    }

    setErrorMsg(null);
    setIsCloning(true);
    setTerminalLogs([]);
    setClonedSuccessData(null);

    const isLocal = !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('git@');

    addLog(`Initiating clone operation for: ${finalUrl}`);
    setProgressStep('Connecting to repository source...');

    // Progress animations
    setTimeout(() => {
      addLog(isLocal ? `Analyzing local directory structure...` : `Contacting remote Git host...`);
      setProgressStep('Receiving repository objects...');
    }, 600);

    setTimeout(() => {
      addLog(`Resolving deltas and compiling branch refs...`);
      setProgressStep('Parsing AST and workspace tree...');
    }, 1400);

    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone',
          repoUrl: finalUrl,
          branch: (customBranch || branchName).trim() || undefined,
          depth: shallowClone ? 1 : undefined,
          targetName: (customName || targetName).trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to clone repository');
      }

      addLog(`Successfully extracted ${data.fileCount} workspace files`);
      addLog(`Active branch: ${data.branch || 'main'}`);
      if (data.commits && data.commits.length > 0) {
        addLog(`Loaded ${data.commits.length} commit history entries into Git DAG`);
      }
      addLog(`Primary entrypoint: ${data.primaryFile}`);
      setProgressStep('Repository successfully integrated!');

      const result: ClonedRepoResult = {
        repoName: data.repoName,
        files: data.files,
        primaryFile: data.primaryFile,
        branch: data.branch,
        commits: data.commits,
        targetDir: data.targetDir
      };

      setClonedSuccessData(result);
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      setErrorMsg(err.message || 'Clone failed. Please verify repository path and network access.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleApplyNow = () => {
    if (clonedSuccessData) {
      onApplyClonedRepo(clonedSuccessData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#101117] border border-zinc-700/80 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col text-zinc-200 font-sans max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#161722] border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
              <Download size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Clone Git Repository</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 font-mono font-medium">
                  Air-Gapped &amp; Remote
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Clone from GitHub, GitLab, any Git URL, or import sibling local folders into the active IDE workspace.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-[#12131b] px-4 pt-2 gap-2 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('remote')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'remote'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe size={14} className={activeTab === 'remote' ? 'text-indigo-400' : 'text-zinc-500'} />
            Remote Git URL
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive size={14} className={activeTab === 'local' ? 'text-emerald-400' : 'text-zinc-500'} />
            Local Disk Repository
            {localCandidates.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
                {localCandidates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'templates' ? 'text-amber-400' : 'text-zinc-500'} />
            Starter Presets
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* TAB 1: REMOTE GIT URL */}
          {activeTab === 'remote' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Repository URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repository.git"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    disabled={isCloning}
                    className="w-full bg-[#181924] border border-zinc-700/80 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono shadow-inner"
                  />
                  {remoteUrl && (
                    <button
                      onClick={() => setRemoteUrl('')}
                      className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Supports public GitHub, GitLab, Gitea, Bitbucket, or internal Git HTTP/HTTPS endpoints.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Target Workspace Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. my-cloned-app"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    disabled={isCloning}
                    className="w-full bg-[#181924] border border-zinc-700/80 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Specific Branch or Tag (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="main / master / v1.0.0"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      disabled={isCloning}
                      className="w-full bg-[#181924] border border-zinc-700/80 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono"
                    />
                    <GitBranch size={13} className="absolute right-3 top-2.5 text-zinc-500" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shallowCloneCheck"
                  checked={shallowClone}
                  onChange={(e) => setShallowClone(e.target.checked)}
                  disabled={isCloning}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="shallowCloneCheck" className="text-xs text-zinc-300 cursor-pointer select-none">
                  Shallow Clone (<span className="font-mono text-indigo-400">--depth 1</span>) for ultra-fast download and bandwidth conservation
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL DISK REPOSITORY */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Local Folder Path or Sibling Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. e:/offilne ide/jigsi-karia-search or ../my-repo"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    disabled={isCloning}
                    className="flex-1 bg-[#181924] border border-zinc-700/80 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Loads real code files and Git history directly from local disk into the active IDE editor without requiring internet.
                </p>
              </div>

              {/* Sibling Local Repos Quick Pick */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <FolderGit2 size={13} className="text-emerald-400" /> Detected Sibling Repositories on Disk
                  </span>
                  <button
                    onClick={fetchLocalCandidates}
                    disabled={isLoadingCandidates}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={isLoadingCandidates ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {localCandidates.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#14151e] border border-zinc-800 text-center text-xs text-zinc-500">
                    No sibling repositories automatically detected in parent directory.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {localCandidates.map((cand) => (
                      <div
                        key={cand.path}
                        onClick={() => {
                          setLocalPath(cand.path);
                          setTargetName(cand.name);
                        }}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          localPath === cand.path
                            ? 'bg-indigo-950/40 border-indigo-500 text-white'
                            : 'bg-[#151620] hover:bg-[#1b1c2b] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${cand.hasGit ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-zinc-800 text-zinc-400'}`}>
                            {cand.hasGit ? <GitBranch size={14} /> : <Folder size={14} />}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                              <span>{cand.name}</span>
                              {cand.hasGit && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 font-mono">
                                  git
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">{cand.path}</div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartClone(cand.path, undefined, cand.name);
                          }}
                          disabled={isCloning}
                          className="shrink-0 px-2.5 py-1 text-[11px] font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Clone
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STARTER TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400">
                Quick-start with popular modern templates pre-configured for offline development:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.name}
                    className="p-3.5 rounded-lg bg-[#14151e] border border-zinc-800 hover:border-indigo-600/70 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {tmpl.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                        {tmpl.desc}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStartClone(tmpl.repoUrl, 'main', tmpl.fallbackLocal)}
                      disabled={isCloning}
                      className="w-full py-1.5 px-2 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/60 text-indigo-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={12} />
                      1-Click Clone
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-Time Terminal Progress Output */}
          {(isCloning || terminalLogs.length > 0) && (
            <div className="rounded-lg bg-[#0c0d12] border border-zinc-800 p-3 font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-zinc-400 text-xs">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-indigo-400" />
                  Clone Session Console
                </span>
                {isCloning ? (
                  <span className="flex items-center gap-1.5 text-indigo-400 animate-pulse text-[10px]">
                    <Loader2 size={11} className="animate-spin" />
                    {progressStep || 'Running...'}
                  </span>
                ) : clonedSuccessData ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                    <CheckCircle2 size={11} /> Ready
                  </span>
                ) : null}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 text-zinc-300 custom-scrollbar">
                {terminalLogs.map((log, i) => (
                  <div key={i} className={log.includes('ERROR') ? 'text-rose-400 font-semibold' : log.includes('Successfully') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/60 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Clone Failed</p>
                <p className="text-[11px] text-rose-300 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {clonedSuccessData && (
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-600/70 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">
                    Repository "{clonedSuccessData.repoName}" Cloned Successfully!
                  </p>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    {Object.keys(clonedSuccessData.files).length} files ready to mount into Offline AI Studio.
                  </p>
                </div>
              </div>

              <button
                onClick={handleApplyNow}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Apply to Workspace</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#141520] border-t border-zinc-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-500">
            {activeTab === 'remote' ? 'Git CLI / HTTP clone fallback' : activeTab === 'local' ? '100% offline air-gapped import' : 'Curated starters'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isCloning}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {!clonedSuccessData ? (
              <button
                onClick={() => {
                  if (activeTab === 'remote') {
                    handleStartClone(remoteUrl);
                  } else if (activeTab === 'local') {
                    handleStartClone(localPath);
                  }
                }}
                disabled={isCloning || (activeTab === 'remote' && !remoteUrl.trim()) || (activeTab === 'local' && !localPath.trim())}
                className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md ${
                  isCloning || (activeTab === 'remote' && !remoteUrl.trim()) || (activeTab === 'local' && !localPath.trim())
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20'
                }`}
              >
                {isCloning ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Cloning...</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Clone &amp; Integrate</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyNow}
                className="px-4 py-1.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>Open in Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
