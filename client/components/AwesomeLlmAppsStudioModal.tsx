"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Search,
  Code2,
  FolderOpen,
  Play,
  Copy,
  Check,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Terminal,
  Cpu,
  Bot,
  Zap,
  BookOpen,
  Mic,
  MonitorPlay
} from "lucide-react";

interface AwesomeApp {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  path: string;
  description: string;
  primaryFile?: string;
  framework?: string;
  requirements?: string[];
  features?: string[];
  tags: string[];
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

interface AwesomeLlmAppsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile?: (path: string) => void;
  onRunInTerminal?: (command: string) => void;
}

export const AwesomeLlmAppsStudioModal: React.FC<AwesomeLlmAppsStudioModalProps> = ({
  isOpen,
  onClose,
  onOpenFile,
  onRunInTerminal
}) => {
  const [apps, setApps] = useState<AwesomeApp[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState<AwesomeApp | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isScaffolding, setIsScaffolding] = useState<boolean>(false);
  const [scaffoldTarget, setScaffoldTarget] = useState<string>("");
  const [scaffoldStatus, setScaffoldStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/awesome-llm-apps?type=catalog");
      const data = await res.json();
      if (data.apps) {
        setApps(data.apps);
        setCategories(data.categories || []);
        if (data.apps.length > 0 && !selectedApp) {
          selectApp(data.apps[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load awesome llm apps catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectApp = async (app: AwesomeApp) => {
    setSelectedApp(app);
    setScaffoldTarget(`apps/${app.id}`);
    setScaffoldStatus(null);
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/awesome-llm-apps?type=preview&appId=${encodeURIComponent(app.id)}`);
      const data = await res.json();
      setPreviewContent(data.content || "# No preview available");
    } catch (err) {
      setPreviewContent("# Failed to load file preview");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleScaffold = async () => {
    if (!selectedApp) return;
    setIsScaffolding(true);
    setScaffoldStatus(null);
    try {
      const targetDir = scaffoldTarget.trim() || `apps/${selectedApp.id}`;
      const res = await fetch("/api/awesome-llm-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scaffold",
          appId: selectedApp.id,
          targetDir
        })
      });
      const data = await res.json();
      if (data.success) {
        setScaffoldStatus(`✅ Successfully scaffolded to ${targetDir}!`);
        if (onOpenFile && data.primaryFile) {
          onOpenFile(`${targetDir}/${data.primaryFile}`);
        }
      } else {
        setScaffoldStatus(`❌ Error: ${data.error || "Scaffold failed"}`);
      }
    } catch (err: any) {
      setScaffoldStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsScaffolding(false);
    }
  };

  const handleRunLocally = () => {
    if (!selectedApp) return;
    const targetDir = scaffoldTarget.trim() || `apps/${selectedApp.id}`;
    const runCmd = selectedApp.framework === "Streamlit"
      ? `streamlit run ${selectedApp.primaryFile || "app.py"}`
      : `python ${selectedApp.primaryFile || "main.py"}`;

    const fullCmd = `cd "${targetDir}" && pip install -r requirements.txt && ${runCmd}`;
    if (onRunInTerminal) {
      onRunInTerminal(fullCmd);
      onClose();
    } else {
      navigator.clipboard.writeText(fullCmd);
      setScaffoldStatus("📋 Command copied to clipboard! Paste into Terminal.");
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesQuery = !searchQuery.trim() ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case "advanced_ai_agents": return <Bot className="w-4 h-4 text-purple-400" />;
      case "rag_tutorials": return <Layers className="w-4 h-4 text-emerald-400" />;
      case "mcp_ai_agents": return <Cpu className="w-4 h-4 text-amber-400" />;
      case "generative_ui_agents": return <MonitorPlay className="w-4 h-4 text-sky-400" />;
      case "voice_ai_agents": return <Mic className="w-4 h-4 text-rose-400" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[90vh] bg-[#181824] border border-[#2e2e42] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e42] bg-[#13131c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-purple-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  Awesome LLM Apps Storefront
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {apps.length}+ Production Apps
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore, Scaffold & Run Multi-Agent Teams, Agentic RAG, MCP Agents, Generative UI & Voice AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadCatalog}
              title="Refresh Apps"
              className="p-2 rounded-lg bg-[#222233] hover:bg-[#2c2c44] text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#222233] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Categories & App List */}
          <div className="w-[420px] flex flex-col border-r border-[#2e2e42] bg-[#14141e]">
            {/* Search Bar */}
            <div className="p-3 border-b border-[#252536]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search agents, RAG, frameworks, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1b1b28] border border-[#2d2d42] rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="p-3 border-b border-[#252536] flex gap-1.5 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-[#1f1f2e] text-slate-400 hover:text-slate-200 hover:bg-[#28283d]"
                }`}
              >
                All ({apps.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-[#1f1f2e] text-slate-400 hover:text-slate-200 hover:bg-[#28283d]"
                  }`}
                >
                  {getCategoryIcon(cat.id)}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Apps List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredApps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No applications found matching your criteria.
                </div>
              ) : (
                filteredApps.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => selectApp(app)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-950/70 to-purple-950/60 border-indigo-500/50 shadow-md"
                          : "bg-[#191926]/60 border-transparent hover:bg-[#212133] hover:border-[#32324a]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                          {getCategoryIcon(app.category)}
                          <span className="line-clamp-1">{app.name}</span>
                        </div>
                        {app.framework && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2b2b3f] text-slate-300 font-mono">
                            {app.framework}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {app.categoryName}
                        </span>
                        {app.tags.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Content: App Details & Code Preview */}
          <div className="flex-1 flex flex-col bg-[#161622] overflow-hidden">
            {selectedApp ? (
              <>
                {/* App Detail Header Bar */}
                <div className="p-6 border-b border-[#2e2e42] bg-[#1a1a27] flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedApp.name}
                      </h3>
                      {selectedApp.framework && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {selectedApp.framework}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                      {selectedApp.description}
                    </p>

                    {/* Meta info tags */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                        {selectedApp.path}
                      </span>
                      {selectedApp.primaryFile && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                          Entry: {selectedApp.primaryFile}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scaffolding & Run Action Area */}
                  <div className="flex flex-col gap-2 min-w-[280px]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={scaffoldTarget}
                        onChange={(e) => setScaffoldTarget(e.target.value)}
                        placeholder="Target Directory (e.g. apps/my-rag)"
                        className="flex-1 px-3 py-1.5 bg-[#12121b] border border-[#2d2d42] rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleScaffold}
                        disabled={isScaffolding}
                        className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                      >
                        {isScaffolding ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <FolderOpen className="w-4 h-4" />
                        )}
                        Scaffold to Project
                      </button>
                      <button
                        onClick={handleRunLocally}
                        className="px-4 py-2 rounded-xl bg-[#28283e] hover:bg-[#343452] text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-[#3e3e5e] transition-colors"
                        title="Run in IDE Terminal"
                      >
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        Run Terminal
                      </button>
                    </div>

                    {scaffoldStatus && (
                      <div className="text-[11px] p-2 rounded-lg bg-[#1e1e2d] border border-indigo-500/30 text-indigo-200 animate-in fade-in">
                        {scaffoldStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Preview Pane */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#111119]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#171723] border-b border-[#252536] text-xs text-slate-400">
                    <div className="flex items-center gap-2 font-mono">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      <span>{selectedApp.primaryFile || "Source Code Preview"}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewContent);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#242436] hover:bg-[#2f2f47] text-slate-300 hover:text-white transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy Source"}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
                    {isLoadingPreview ? (
                      <div className="flex items-center justify-center h-full gap-2 text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading application source code...</span>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap">{previewContent}</pre>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Sparkles className="w-12 h-12 text-slate-600" />
                <p>Select an app from the list to preview and scaffold.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
