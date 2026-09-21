'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Rocket,
  FolderTree,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Terminal,
  Layers,
  Copy,
  Check,
  Globe,
  Zap,
  ArrowRight,
  Code2
} from 'lucide-react';
import JSZip from 'jszip';
import { ONLINE_PROVIDERS, OnlineAiProvider } from '@/lib/ai/onlineAiEngine';

interface ProjectScaffolderProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToWorkspace: (files: Record<string, string>, primaryFile: string) => void;
}

const PRESETS = [
  {
    title: 'Full-Stack Next.js SaaS Platform',
    type: 'Next.js 15 App Router',
    prompt: 'Full-stack SaaS dashboard with authentication, subscription tier selector, billing analytics, and Tailwind CSS'
  },
  {
    title: 'Real-Time Crypto & Stock Tracker',
    type: 'React + Vite SPA',
    prompt: 'Real-time cryptocurrency price dashboard with interactive charts, portfolio value calculator, and live market metrics'
  },
  {
    title: 'Python FastAPI Async Microservice',
    type: 'Python FastAPI',
    prompt: 'High-performance Python FastAPI REST server with Pydantic validation, SQLite database CRUD endpoints, and auto Swagger docs'
  },
  {
    title: 'Interactive Kanban Project Board',
    type: 'React + Tailwind',
    prompt: 'Interactive Kanban project management board with drag-and-drop cards, priority badges, search filter, and localStorage sync'
  },
  {
    title: 'Node.js Express + SQLite REST API',
    type: 'Node.js Express API',
    prompt: 'Express backend API with CORS, SQLite database migration, JWT auth middleware, and comprehensive unit tests'
  },
  {
    title: 'Modern Developer Portfolio & Studio',
    type: 'HTML5 + Tailwind',
    prompt: 'Sleek dark-mode personal engineering portfolio with project showcases, terminal resume viewer, and contact form'
  }
];

export default function OnlineProjectScaffolderModal({
  isOpen,
  onClose,
  onApplyToWorkspace
}: ProjectScaffolderProps) {
  const [prompt, setPrompt] = useState('Full-stack real-time collaboration tool with Tailwind CSS and responsive UI');
  const [projectType, setProjectType] = useState('React + Vite SPA');
  const [activeProvider, setActiveProvider] = useState<OnlineAiProvider>('openrouter');
  const [activeModel, setActiveModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Result State
  const [generatedResult, setGeneratedResult] = useState<{
    projectName: string;
    summary: string;
    architecture: string;
    primaryFile: string;
    files: Record<string, string>;
    fileDescriptions: Record<string, string>;
    setupCommands: string[];
  } | null>(null);

  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string | null>(null);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Sync with localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedMode = localStorage.getItem('offlineAi.activeAiMode') || 'offline';
    const savedProvider = (localStorage.getItem('offlineAi.activeOnlineProvider') as OnlineAiProvider) || (savedMode === 'offline' ? 'ollama' : 'openrouter');
    setActiveProvider(savedProvider);

    try {
      const configs = JSON.parse(localStorage.getItem('offlineAi.onlineProviders') || '{}');
      const conf = configs[savedProvider];
      if (conf) {
        setApiKey(conf.apiKey || '');
        setActiveModel(conf.selectedModel || ONLINE_PROVIDERS[savedProvider]?.defaultModel || '');
      } else {
        setActiveModel(ONLINE_PROVIDERS[savedProvider]?.defaultModel || '');
      }
    } catch {
      setActiveModel(ONLINE_PROVIDERS[savedProvider]?.defaultModel || '');
    }
  }, [isOpen]);

  const handleStartGeneration = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setProgressPercent(15);
    setGenerationStep(`Connecting to ${ONLINE_PROVIDERS[activeProvider]?.name || 'AI Engine'}...`);

    try {
      await new Promise(r => setTimeout(r, 400));
      setProgressPercent(35);
      setGenerationStep(`Architecting file structure for [${projectType}]...`);

      const res = await fetch('/api/ai/project/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectType,
          provider: activeProvider,
          model: activeModel,
          apiKey
        })
      });

      setProgressPercent(70);
      setGenerationStep('Writing complete production source code for all files...');

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Generation failed: ${errTxt}`);
      }

      const data = await res.json();
      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      setProgressPercent(100);
      setGenerationStep('Finalizing project structure...');
      await new Promise(r => setTimeout(r, 300));

      setGeneratedResult(data);
      const filesList = Object.keys(data.files || {});
      setSelectedPreviewFile(data.primaryFile || filesList[0] || null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during project generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyNow = () => {
    if (!generatedResult || !generatedResult.files) return;
    onApplyToWorkspace(generatedResult.files, generatedResult.primaryFile);
    onClose();
  };

  const handleDownloadZip = async () => {
    if (!generatedResult || !generatedResult.files) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder(generatedResult.projectName || 'ai-project');

      Object.entries(generatedResult.files).forEach(([filePath, content]) => {
        folder?.file(filePath, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedResult.projectName || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (zipErr) {
      console.error('Failed to create zip bundle:', zipErr);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCommands = () => {
    if (!generatedResult) return;
    const text = (generatedResult.setupCommands || ['npm install', 'npm run dev']).join(' && ');
    navigator.clipboard.writeText(text);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-[#0c0c0f] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121216]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Rocket size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Universal AI Project Scaffolder & Architect
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Online & Offline AI
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Architect and generate complete, production-ready multi-file codebases for any framework.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!generatedResult ? (
            /* Input Form Screen */
            <div className="space-y-6">
              
              {/* AI Engine & Model Indicator Banner */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-indigo-400" />
                  <span className="text-zinc-400">Using AI Engine:</span>
                  <select
                    value={activeProvider}
                    onChange={(e) => {
                      const newProv = e.target.value as OnlineAiProvider;
                      setActiveProvider(newProv);
                      try {
                        const configs = JSON.parse(localStorage.getItem('offlineAi.onlineProviders') || '{}');
                        const conf = configs[newProv];
                        setApiKey(conf?.apiKey || '');
                        setActiveModel(conf?.selectedModel || ONLINE_PROVIDERS[newProv]?.defaultModel || '');
                      } catch {
                        setActiveModel(ONLINE_PROVIDERS[newProv]?.defaultModel || '');
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-100 font-semibold focus:outline-none cursor-pointer"
                  >
                    {(Object.keys(ONLINE_PROVIDERS) as OnlineAiProvider[]).map((pKey) => (
                      <option key={pKey} value={pKey} className="bg-zinc-900 text-zinc-200">
                        {ONLINE_PROVIDERS[pKey].name}
                      </option>
                    ))}
                  </select>
                  <span className="font-mono text-indigo-300 text-[11px]">({activeModel || ONLINE_PROVIDERS[activeProvider]?.defaultModel})</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Configure keys & models in <strong className="text-indigo-300">Online AI Hub</strong>
                </div>
              </div>

              {/* Project Prompt Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  Describe the Project you want to build:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Next.js SaaS dashboard with payment tiers, real-time analytics, user auth, and dark mode UI..."
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition leading-relaxed resize-none"
                />
              </div>

              {/* Quick Presets Grid */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400">Or Select a Quick Architecture Blueprint:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.title}
                      onClick={() => {
                        setPrompt(preset.prompt);
                        setProjectType(preset.type);
                      }}
                      className="text-left p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-indigo-600/70 hover:bg-zinc-900/40 transition cursor-pointer flex flex-col justify-between space-y-1 group"
                    >
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition">
                        {preset.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{preset.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framework / Tech Stack Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Target Framework / Stack:</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-sans"
                  >
                    <option value="Next.js 15 App Router">Next.js 15 Full-Stack (App Router + Tailwind)</option>
                    <option value="React + Vite SPA">React 18 + Vite SPA (TypeScript + Tailwind)</option>
                    <option value="Python FastAPI">Python FastAPI REST Microservice (Pydantic + Async)</option>
                    <option value="Node.js Express API">Node.js Express + SQLite REST API</option>
                    <option value="HTML5 + Tailwind">HTML5 + Tailwind CSS Modern Static Landing</option>
                    <option value="Vue 3 + Vite">Vue 3 Single File Components + Pinia</option>
                    <option value="Universal Fullstack">Universal Fullstack (Frontend + Backend + DB)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Target Output Location:</label>
                  <div className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center justify-between">
                    <span className="font-mono text-indigo-400">Offline AI IDE Workspace</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">Virtual In-Memory + Disk Export</span>
                  </div>
                </div>
              </div>

              {/* Generation Progress Bar / Log */}
              {isGenerating && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-3">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-indigo-400" />
                      {generationStep}
                    </span>
                    <span className="font-mono font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="block font-semibold">Generation Failed:</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Results Screen */
            <div className="space-y-6">
              {/* Project Summary Banner */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{generatedResult.projectName}</h3>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-[10px] font-mono">
                      ✓ {Object.keys(generatedResult.files).length} Files Generated
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{generatedResult.summary}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{generatedResult.architecture}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isZipping ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>Download ZIP</span>
                  </button>
                  <button
                    onClick={() => setGeneratedResult(null)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    New Architecture
                  </button>
                </div>
              </div>

              {/* Generated Files Explorer & Code Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-800 rounded-2xl overflow-hidden bg-[#09090b]">
                {/* File Tree Column */}
                <div className="p-3 border-r border-zinc-800 space-y-1 max-h-80 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Generated Files</span>
                    <span>{Object.keys(generatedResult.files).length}</span>
                  </div>
                  {Object.keys(generatedResult.files).map((filePath) => {
                    const isSelected = selectedPreviewFile === filePath;
                    const isPrimary = generatedResult.primaryFile === filePath;

                    return (
                      <button
                        key={filePath}
                        onClick={() => setSelectedPreviewFile(filePath)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                        }`}
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <FileCode size={13} className={isSelected ? 'text-white' : 'text-indigo-400'} />
                          {filePath}
                        </span>
                        {isPrimary && (
                          <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-zinc-800 text-zinc-400'}`}>
                            Main
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Code Preview Column */}
                <div className="col-span-2 p-3 bg-zinc-950 max-h-80 overflow-y-auto flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs text-zinc-400">
                    <span className="font-mono text-indigo-300 font-semibold">{selectedPreviewFile}</span>
                    <span className="text-[11px] text-zinc-500">
                      {generatedResult.fileDescriptions[selectedPreviewFile || ''] || 'Source code'}
                    </span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">
                    {selectedPreviewFile ? generatedResult.files[selectedPreviewFile] : '// Select a file to inspect'}
                  </pre>
                </div>
              </div>

              {/* Setup Commands Box */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Terminal size={14} className="text-emerald-400" />
                  <span className="text-zinc-500">$</span>
                  <span>{(generatedResult.setupCommands || ['npm install', 'npm run dev']).join(' && ')}</span>
                </div>
                <button
                  onClick={handleCopyCommands}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedCommands ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCommands ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#121216] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {generatedResult ? (
              <span>All files are ready to inject directly into your IDE workspace.</span>
            ) : (
              <span>Supports React, Next.js, Python FastAPI, Express, Vue, & custom CLI scripts.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!generatedResult ? (
              <button
                onClick={handleStartGeneration}
                disabled={isGenerating || !prompt.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Generating Project...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Architect & Generate Project
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyNow}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Zap size={15} />
                ⚡ Apply to IDE Workspace & Open
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
