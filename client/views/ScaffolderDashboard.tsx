'use client';

import React, { useState, useEffect } from 'react';
import OnlineProjectScaffolderModal from '@/client/components/OnlineProjectScaffolderModal';
import {
  Rocket,
  FolderPlus,
  Layers,
  CheckCircle2,
  Cpu,
  Database,
  Layout,
  Sparkles,
  Loader2,
  FileCode,
  Folder,
  Check,
  ChevronRight,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Zap,
  Play,
  Languages,
  Info
} from 'lucide-react';

export interface ProposedFile {
  path: string;
  category: 'config' | 'frontend' | 'backend' | 'database' | 'devops' | 'testing' | 'docs';
  required: boolean;
  desc: string;
}

export interface TechStackConfig {
  frontend: string;
  backend: string;
  database: string;
  features: string[];
}

interface ScaffolderDashboardProps {
  onScaffoldComplete?: (files: Record<string, string>, primaryFile: string) => void;
  onOpenInEditor?: (filename: string) => void;
}

export default function ScaffolderDashboard({
  onScaffoldComplete,
  onOpenInEditor
}: ScaffolderDashboardProps) {
  // Wizard Steps: 1 = Describe, 2 = Tech Stack, 3 = Review Tree
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isOnlineAiScaffolderOpen, setIsOnlineAiScaffolderOpen] = useState<boolean>(false);

  // Step 1 State
  const [appDescription, setAppDescription] = useState<string>(
    'Real-time Task & Project Management App with Auth & SQLite'
  );

  // Step 2 State
  const [techStack, setTechStack] = useState<TechStackConfig>({
    frontend: 'React',
    backend: 'Express',
    database: 'SQLite',
    features: ['Tailwind CSS', 'TypeScript', 'Dockerfile', 'Unit Tests']
  });

  // Step 3 State
  const [proposedFiles, setProposedFiles] = useState<ProposedFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);

  // Scaffolding Execution State
  const [isScaffolding, setIsScaffolding] = useState<boolean>(false);
  const [scaffoldProgress, setScaffoldProgress] = useState<number>(0);
  const [activeLogStep, setActiveLogStep] = useState<string>('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [scaffoldResult, setScaffoldResult] = useState<{
    success: boolean;
    primaryFile: string;
    totalFiles: number;
  } | null>(null);

  // Preset Template Quick Selectors
  const PRESET_TEMPLATES = [
    {
      label: 'Full-Stack React + Express + SQLite',
      gujaratiLabel: 'રિએક્ટ + એક્સપ્રેસ + SQL ડેમો',
      desc: 'Robust relational CRUD backend with lightweight React frontend',
      stack: { frontend: 'React', backend: 'Express', database: 'SQLite', features: ['Tailwind CSS', 'TypeScript'] },
      prompt: 'Full-stack task manager with SQLite database and REST API'
    },
    {
      label: 'E-Commerce Marketplace in Vue + FastAPI',
      gujaratiLabel: 'ઈ-કોમર્સ વ્યુ એન્ડ પાયથોન સ્ટોર',
      desc: 'Python FastAPI high-performance microservice with Vue 3 UI',
      stack: { frontend: 'Vue', backend: 'FastAPI', database: 'MongoDB', features: ['Tailwind CSS', 'Dockerfile'] },
      prompt: 'એક ઇ-કોમર્સ શોપિંગ કાર્ટ અને યુઝર ઓથેન્ટિકેશન સાથેની એપ'
    },
    {
      label: 'SaaS Starter with Next.js & Mongoose',
      gujaratiLabel: 'SaaS નેક્સ્ટ એસ એસ સ્ટાર્ટર',
      desc: 'Modern App Router Next.js full-stack framework with MongoDB',
      stack: { frontend: 'Next.js', backend: 'None', database: 'MongoDB', features: ['Tailwind CSS', 'TypeScript', 'Unit Tests'] },
      prompt: 'Modern SaaS landing page with lead capture form and analytics dashboard'
    }
  ];

  // Fetch proposed file structure checklist tree
  const fetchStructurePlan = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await fetch('/api/scaffolder/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: appDescription,
          techStack
        })
      });

      if (res.ok) {
        const data = await res.json();
        const files: ProposedFile[] = data.proposedFiles || [];
        setProposedFiles(files);
        setSelectedPaths(new Set(files.map(f => f.path)));
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchStructurePlan();
  }, [techStack, activeStep]);

  const toggleFilePath = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  const toggleFeature = (feature: string) => {
    setTechStack(prev => {
      const has = prev.features.includes(feature);
      return {
        ...prev,
        features: has ? prev.features.filter(f => f !== feature) : [...prev.features, feature]
      };
    });
  };

  // 🏗️ Scaffold Project Now Action
  const handleScaffoldProjectNow = async () => {
    setIsScaffolding(true);
    setScaffoldProgress(0);
    setExecutionLogs([]);
    setScaffoldResult(null);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setExecutionLogs([...logs]);
      setActiveLogStep(msg);
    };

    addLog('🚀 Initializing Workspace Architecture Planner...');
    setScaffoldProgress(10);

    await new Promise(r => setTimeout(r, 300));
    addLog(`📁 Creating root directory tree structure for [${techStack.frontend} + ${techStack.backend}]...`);
    setScaffoldProgress(25);

    await new Promise(r => setTimeout(r, 400));
    addLog('📝 Generating package.json & build configuration manifests...');
    setScaffoldProgress(45);

    try {
      const selectedList = Array.from(selectedPaths);
      const res = await fetch('/api/scaffolder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: appDescription,
          techStack,
          selectedFiles: selectedList
        })
      });

      await new Promise(r => setTimeout(r, 300));
      addLog('⚡ Writing application entrypoints & component modules...');
      setScaffoldProgress(70);

      if (res.ok) {
        const data = await res.json();
        const files: Record<string, string> = data.files || {};
        const primaryFile: string = data.primaryFile || 'src/App.tsx';

        await new Promise(r => setTimeout(r, 300));
        addLog(`✅ Verified ${Object.keys(files).length} files. Refreshing Workspace File Explorer tree...`);
        setScaffoldProgress(100);

        setScaffoldResult({
          success: true,
          primaryFile,
          totalFiles: Object.keys(files).length
        });

        // Trigger Live Workspace Directory Refresh in Playground
        if (onScaffoldComplete) {
          onScaffoldComplete(files, primaryFile);
        }
      } else {
        addLog('❌ Failed to scaffold project files. Server returned an error.');
      }
    } catch (err) {
      addLog('❌ Exception encountered during scaffolding execution.');
    } finally {
      setIsScaffolding(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-y-auto">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-950/60 text-white">
            <Rocket size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">🚀 Project Scaffolder &amp; Architecture Planner</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full uppercase tracking-wider">
                Automated Wizard
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify plain English or Gujarati instructions, customize your tech stack, review file trees, and scaffold full workspaces in 1-click.
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOnlineAiScaffolderOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} className="text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
            <span>✨ Online AI Architect</span>
          </button>

          {/* Wizard Step Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveStep(1)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              activeStep === 1
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/50 flex items-center justify-center text-[10px] font-mono">1</span>
            <span>Describe</span>
          </button>
          <ChevronRight size={14} className="text-slate-600" />

          <button
            onClick={() => setActiveStep(2)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              activeStep === 2
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/50 flex items-center justify-center text-[10px] font-mono">2</span>
            <span>Tech Stack</span>
          </button>
          <ChevronRight size={14} className="text-slate-600" />

          <button
            onClick={() => setActiveStep(3)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              activeStep === 3
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/50 flex items-center justify-center text-[10px] font-mono">3</span>
            <span>Review Tree</span>
          </button>
        </div>
        </div>
      </div>

      {/* Main Wizard Content Body */}
      <div className="p-6 max-w-5xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* Preset Templates Banner */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sparkles size={14} className="text-indigo-400" /> Quick Preset Architectures (ગુજરાતી / English Templates)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESET_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAppDescription(tmpl.prompt);
                  setTechStack(tmpl.stack);
                  setActiveStep(3);
                }}
                className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/80 hover:bg-slate-900 transition-all group flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 flex items-center justify-between">
                    <span>{tmpl.label}</span>
                    <span className="text-[10px] text-slate-500">{tmpl.gujaratiLabel}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{tmpl.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-indigo-400 font-mono">
                  <span>Apply Stack</span> <ChevronRight size={10} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 1: Describe Your App */}
        {activeStep === 1 && (
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs border border-indigo-800">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Step 1: Describe Your Application</h3>
                  <p className="text-xs text-slate-400">Provide instructions in plain English or Gujarati.</p>
                </div>
              </div>
              <span className="text-xs text-indigo-400 font-mono flex items-center gap-1">
                <Languages size={14} /> Multilingual Input Supported
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Application Requirements / Prompt Description:</span>
                <span className="text-[11px] text-slate-500">Gujarati: પ્રોમ્પ્ટ વર્ણન</span>
              </label>
              <textarea
                value={appDescription}
                onChange={e => setAppDescription(e.target.value)}
                placeholder="e.g. એક ઇ-કોમર્સ શોપિંગ કાર્ટ અને યુઝર ઓથેન્ટિકેશન સાથેની એપ..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-100 p-4 rounded-xl focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none shadow-inner"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveStep(2)}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all"
              >
                <span>Proceed to Tech Stack</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Tech Stack */}
        {activeStep === 2 && (
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs border border-indigo-800">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Step 2: Select Tech Stack</h3>
                  <p className="text-xs text-slate-400">Configure your frontend, backend, database, and feature modules.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Frontend Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Layout size={15} /> Frontend Framework
                </label>
                <select
                  value={techStack.frontend}
                  onChange={e => setTechStack({ ...techStack, frontend: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="React">React (Vite + TSX)</option>
                  <option value="Next.js">Next.js 15 (App Router)</option>
                  <option value="Vue">Vue 3 (Vite + SFC)</option>
                  <option value="HTML">HTML5 / Tailwind CDN</option>
                </select>
              </div>

              {/* Backend Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Cpu size={15} /> Backend API Engine
                </label>
                <select
                  value={techStack.backend}
                  onChange={e => setTechStack({ ...techStack, backend: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="Express">Express.js (Node REST API)</option>
                  <option value="FastAPI">FastAPI (Python Microservice)</option>
                  <option value="Node">Node.js HTTP Server</option>
                  <option value="None">None (Client-Side SPA)</option>
                </select>
              </div>

              {/* Database Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Database size={15} /> Database Persistence
                </label>
                <select
                  value={techStack.database}
                  onChange={e => setTechStack({ ...techStack, database: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="SQLite">SQLite (Better-SQLite3)</option>
                  <option value="MongoDB">MongoDB (Mongoose Schema)</option>
                  <option value="PostgreSQL">PostgreSQL (Drizzle ORM)</option>
                  <option value="None">None (Local State / Memory)</option>
                </select>
              </div>
            </div>

            {/* Extra Feature Toggles */}
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300">Enabled Architecture Features:</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Tailwind CSS', 'TypeScript', 'Auth Middleware', 'Dockerfile', 'Unit Tests', 'API Client'].map(feat => {
                  const isChecked = techStack.features.includes(feat);
                  return (
                    <button
                      key={feat}
                      onClick={() => toggleFeature(feat)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-indigo-950/80 border-indigo-600 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{feat}</span>
                      {isChecked ? <CheckCircle2 size={14} className="text-indigo-400" /> : <div className="w-3.5 h-3.5 rounded border border-slate-700" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl"
              >
                Back to Description
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all"
              >
                <span>Review File Structure Checklist</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review File Structure Tree */}
        {activeStep === 3 && (
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs border border-indigo-800">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Step 3: Review File Structure Tree Checklist</h3>
                  <p className="text-xs text-slate-400">
                    Check or uncheck specific generated files before scaffolding your directory.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-300 font-mono font-bold bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                  {selectedPaths.size} / {proposedFiles.length} Selected
                </span>
                <button
                  onClick={fetchStructurePlan}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
                  title="Refresh Plan"
                >
                  <RefreshCw size={13} className={isLoadingPlan ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Checklist Tree Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 grid grid-cols-12 gap-2">
                <span className="col-span-5">File Path</span>
                <span className="col-span-2">Category</span>
                <span className="col-span-5">Purpose / Description</span>
              </div>

              <div className="divide-y divide-slate-850 max-h-72 overflow-y-auto">
                {isLoadingPlan ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                    <span className="text-xs">Planning file architecture...</span>
                  </div>
                ) : proposedFiles.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No files generated for this stack. Try updating Step 2.
                  </div>
                ) : (
                  proposedFiles.map(file => {
                    const isChecked = selectedPaths.has(file.path);
                    return (
                      <div
                        key={file.path}
                        onClick={() => toggleFilePath(file.path)}
                        className={`px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center cursor-pointer transition-colors ${
                          isChecked ? 'bg-slate-900/40 hover:bg-slate-900/80' : 'opacity-50 bg-slate-950'
                        }`}
                      >
                        <div className="col-span-5 flex items-center gap-2 font-mono font-semibold text-slate-200 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <FileCode size={14} className="text-indigo-400 shrink-0" />
                          <span className="truncate">{file.path}</span>
                        </div>

                        <div className="col-span-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              file.category === 'frontend'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : file.category === 'backend'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : file.category === 'database'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {file.category}
                          </span>
                        </div>

                        <div className="col-span-5 text-slate-400 truncate text-[11px]">
                          {file.desc}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* One-Click Scaffolding Action Button */}
            <div className="pt-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl"
                >
                  Back to Tech Stack
                </button>

                <button
                  onClick={handleScaffoldProjectNow}
                  disabled={isScaffolding || selectedPaths.size === 0}
                  className="px-6 py-3 text-sm font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl flex items-center gap-2.5 shadow-xl shadow-indigo-950/80 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {isScaffolding ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Rocket size={18} />
                  )}
                  <span>🏗️ Scaffold Project Now</span>
                </button>
              </div>

              {/* Progress & Live Execution Logs Console */}
              {(isScaffolding || executionLogs.length > 0) && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" /> Active Scaffolding Progress Logs
                    </span>
                    <span className="font-mono text-indigo-400">{scaffoldProgress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${scaffoldProgress}%` }}
                    />
                  </div>

                  {/* Execution Logs list */}
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1 max-h-36 overflow-y-auto">
                    {executionLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-slate-600 select-none">&gt;</span>
                        <span className={log.includes('✅') ? 'text-emerald-300 font-semibold' : ''}>{log}</span>
                      </div>
                    ))}
                  </div>

                  {/* Success Result Banner */}
                  {scaffoldResult && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg flex items-center justify-between text-emerald-200 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span>
                          <strong>Scaffolding Complete!</strong> Generated {scaffoldResult.totalFiles} files. Primary file:{' '}
                          <code className="text-white font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded">{scaffoldResult.primaryFile}</code>
                        </span>
                      </div>

                      {onOpenInEditor && (
                        <button
                          onClick={() => onOpenInEditor(scaffoldResult.primaryFile)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow"
                        >
                          Open in Monaco Editor <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Universal Online AI Project Scaffolder Modal */}
      <OnlineProjectScaffolderModal
        isOpen={isOnlineAiScaffolderOpen}
        onClose={() => setIsOnlineAiScaffolderOpen(false)}
        onApplyToWorkspace={(files, primary) => {
          if (onScaffoldComplete) {
            onScaffoldComplete(files, primary);
          }
        }}
      />
    </div>
  );
}
