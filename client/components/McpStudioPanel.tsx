'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Database,
  Brain,
  Folder,
  Globe,
  Radio,
  Sliders,
  FileCode,
  BookOpen,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Code2,
  Copy,
  Check,
  GitBranch,
  Search,
  Download,
  Power,
  ShieldCheck,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  mcpHub,
  McpServerState,
  McpTool,
  McpResource,
  McpPrompt,
  McpCallLog,
  McpServerConfig
} from '@/lib/mcp/McpClient';
import { MCP_SERVERS_REGISTRY, McpMarketplaceServer } from '@/app/api/mcp/registry/route';

interface McpStudioPanelProps {
  workspaceFiles: Record<string, string>;
  onUpdateFile?: (path: string, content: string) => void;
  onOpenFile?: (path: string) => void;
}

export default function McpStudioPanel({
  workspaceFiles,
  onUpdateFile,
  onOpenFile
}: McpStudioPanelProps) {
  const [servers, setServers] = useState<McpServerState[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('filesystem-mcp');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'tools' | 'resources' | 'prompts' | 'config' | 'logs'>('marketplace');
  
  // Tool Execution state
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgsJson, setToolArgsJson] = useState<string>('{}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [callLogs, setCallLogs] = useState<McpCallLog[]>([]);
  const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
  const [resourceContent, setResourceContent] = useState<string | null>(null);
  const [isLoadingResource, setIsLoadingResource] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // MCP Marketplace state
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [marketplaceList, setMarketplaceList] = useState<McpMarketplaceServer[]>(MCP_SERVERS_REGISTRY);
  const [spawningServerId, setSpawningServerId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // mcp_config.json editor state
  const [configJsonText, setConfigJsonText] = useState<string>('{}');
  const [configPath, setConfigPath] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configStatusMsg, setConfigStatusMsg] = useState<string | null>(null);

  // Sync workspace files to McpHub
  useEffect(() => {
    mcpHub.setWorkspaceContext(() => workspaceFiles, onUpdateFile);
  }, [workspaceFiles, onUpdateFile]);

  // Subscribe to McpHub state updates
  useEffect(() => {
    const unsub = mcpHub.subscribe((newStates) => {
      setServers(newStates);
      setCallLogs([...mcpHub.getCallLogs()]);
    });
    return unsub;
  }, []);

  // Fetch mcp_config.json on mount
  useEffect(() => {
    fetch('/api/mcp/spawn?action=get-config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfigJsonText(JSON.stringify(data.config, null, 2));
          setConfigPath(data.path || 'mcp_config.json');
        }
      })
      .catch(() => {});
  }, []);

  // Filter marketplace
  useEffect(() => {
    const filtered = MCP_SERVERS_REGISTRY.filter(s => {
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      const matchQ = !marketplaceQuery ||
        s.name.toLowerCase().includes(marketplaceQuery.toLowerCase()) ||
        s.displayName.toLowerCase().includes(marketplaceQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(marketplaceQuery.toLowerCase()) ||
        s.author.toLowerCase().includes(marketplaceQuery.toLowerCase());
      return matchCat && matchQ;
    });
    setMarketplaceList(filtered);
  }, [marketplaceQuery, selectedCategory]);

  const activeServer = servers.find(s => s.config.id === selectedServerId) || servers[0];

  useEffect(() => {
    if (activeServer && activeServer.tools.length > 0 && (!selectedTool || selectedTool.serverId !== activeServer.config.id)) {
      handleSelectTool(activeServer.tools[0]);
    }
  }, [selectedServerId, activeServer?.config.id]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    setToolResult(null);
    const initialArgs: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, val]: [string, any]) => {
        if (val.default !== undefined) {
          initialArgs[key] = val.default;
        } else if (val.type === 'string') {
          initialArgs[key] = '';
        } else if (val.type === 'number' || val.type === 'integer') {
          initialArgs[key] = 0;
        } else if (val.type === 'boolean') {
          initialArgs[key] = false;
        } else if (val.type === 'array') {
          initialArgs[key] = [];
        } else if (val.type === 'object') {
          initialArgs[key] = {};
        }
      });
    }
    setToolArgsJson(JSON.stringify(initialArgs, null, 2));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setIsExecutingTool(true);
    setToolResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsJson);
      } catch (e: any) {
        throw new Error(`Invalid JSON arguments: ${e.message}`);
      }
      const serverId = selectedTool.serverId || 'filesystem-mcp';
      const res = await mcpHub.callTool(serverId, selectedTool.name, parsedArgs);
      setToolResult(res);
      showToast('success', `Tool ${selectedTool.name} executed successfully`);
    } catch (err: any) {
      setToolResult({ isError: true, error: err.message || String(err) });
      showToast('error', `Execution error: ${err.message}`);
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Launch / Install MCP server
  const handleLaunchServer = async (server: McpMarketplaceServer) => {
    setSpawningServerId(server.id);
    showToast('info', `Spawning ${server.displayName}...`);

    try {
      if (server.transport === 'in-memory') {
        // Already built-in virtual adapter
        setSelectedServerId(server.id);
        setActiveTab('tools');
        showToast('success', `✓ Connected to ${server.displayName}`);
      } else {
        // Spawn stdio process via backend API
        const res = await fetch('/api/mcp/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            serverId: server.id,
            command: server.command || 'npx',
            args: server.args || [],
            env: server.env || {}
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', `✓ Spawned ${server.displayName} (PID: ${data.pid || 'Active'})`);
          setSelectedServerId(server.id);
          setActiveTab('tools');
        } else {
          throw new Error(data.error || 'Failed to spawn server');
        }
      }
    } catch (err: any) {
      showToast('error', `Error launching ${server.displayName}: ${err.message}`);
    } finally {
      setSpawningServerId(null);
    }
  };

  // Save mcp_config.json
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigStatusMsg(null);
    try {
      const parsed = JSON.parse(configJsonText);
      const res = await fetch('/api/mcp/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-config', config: parsed })
      });
      const data = await res.json();
      if (data.success) {
        setConfigStatusMsg('✓ Successfully saved mcp_config.json');
        setTimeout(() => setConfigStatusMsg(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setConfigStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const categories = ['All', 'System', 'Database', 'Web & Browser', 'DevOps & SCM', 'Cloud & Productivity', 'AI & Reasoning'];

  const getServerIcon = (cat: string) => {
    switch (cat) {
      case 'System': return <Folder size={15} className="text-amber-400" />;
      case 'Database': return <Database size={15} className="text-emerald-400" />;
      case 'Web & Browser': return <Globe size={15} className="text-cyan-400" />;
      case 'DevOps & SCM': return <GitBranch size={15} className="text-orange-400" />;
      case 'AI & Reasoning': return <Brain size={15} className="text-purple-400" />;
      default: return <Server size={15} className="text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0b0e] text-zinc-100 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-5 py-3.5 bg-[#121318] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
            <Radio size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Model Context Protocol (MCP) Studio</h1>
              <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-700/60 px-2 py-0.5 rounded-full font-mono">
                MCP Spec 2024-11
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Universal tool, prompt, and resource protocol bridging Claude, OpenAI, Ollama, and local environments.
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center bg-[#1b1c24] border border-zinc-700/60 rounded-lg p-1 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'marketplace' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe size={13} />
            Marketplace ({marketplaceList.length})
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tools' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            Tools & Execution
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resources' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Folder size={13} />
            Resources
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode size={13} />
            mcp_config.json
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity size={13} />
            Logs ({callLogs.length})
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {actionMessage && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b animate-in fade-in duration-150 ${
          actionMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800' :
          actionMessage.type === 'error' ? 'bg-red-950/80 text-red-200 border-red-800' :
          'bg-purple-950/80 text-purple-200 border-purple-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
            {actionMessage.type === 'error' && <AlertCircle size={14} className="text-red-400" />}
            {actionMessage.type === 'info' && <RefreshCw size={14} className="text-purple-400 animate-spin" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-zinc-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* CONTENT BODY */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* TAB 1: MCP MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-4">
            {/* SEARCH AND FILTER BAR */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#121318] p-3 rounded-xl border border-zinc-800/80">
              <div className="flex items-center gap-2.5 bg-[#1b1c24] px-3.5 py-2 rounded-lg border border-zinc-700/60 flex-1 w-full max-w-md">
                <Search size={15} className="text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search MCP servers (Filesystem, PostgreSQL, Puppeteer, GitHub, Brave)..."
                  value={marketplaceQuery}
                  onChange={(e) => setMarketplaceQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
                />
              </div>

              {/* CATEGORY FILTER */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-[11px] pb-1 md:pb-0 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-medium ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#1b1c24] text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* SERVER CARDS GRID */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {marketplaceList.map(server => {
                  const isSpawning = spawningServerId === server.id;
                  const isConnected = servers.some(s => s.config.id === server.id && s.status === 'connected');

                  return (
                    <div
                      key={server.id}
                      className="bg-[#121318] border border-zinc-800/80 hover:border-purple-500/50 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-purple-950/20 group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-700/50 flex items-center justify-center shrink-0">
                              {getServerIcon(server.category)}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-1">
                                {server.displayName}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                <span>{server.author}</span>
                                {server.official && (
                                  <span className="text-purple-400 text-[10px] bg-purple-950 px-1 rounded border border-purple-800 font-medium">Official</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b1c24] text-zinc-400 border border-zinc-800 shrink-0">
                            {server.category}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                          {server.description}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-3">
                          <span className="bg-[#1b1c24] px-2 py-0.5 rounded border border-zinc-800 text-purple-300 font-mono text-[10px]">
                            {server.toolsCount} Tools
                          </span>
                          <span className="bg-[#1b1c24] px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono text-[10px]">
                            {server.transport}
                          </span>
                        </div>

                        {server.command && (
                          <div className="bg-[#0b0c10] p-2 rounded-lg border border-zinc-800 font-mono text-[10px] text-zinc-400 mb-3 flex items-center justify-between">
                            <span className="truncate">{server.command} {server.args?.join(' ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 gap-2">
                        <button
                          onClick={() => {
                            setSelectedServerId(server.id);
                            setActiveTab('tools');
                          }}
                          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          View Tools <ChevronRight size={13} />
                        </button>

                        <button
                          onClick={() => handleLaunchServer(server)}
                          disabled={isSpawning}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isConnected
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : isSpawning
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
                          }`}
                        >
                          {isSpawning ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              Launching...
                            </>
                          ) : isConnected ? (
                            <>
                              <Check size={12} />
                              Connected
                            </>
                          ) : (
                            <>
                              <Play size={12} />
                              Launch & Connect
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOOLS & EXECUTION */}
        {activeTab === 'tools' && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* SERVER & TOOLS SIDEBAR */}
            <div className="w-80 bg-[#121318] border-r border-zinc-800 flex flex-col min-h-0 shrink-0">
              <div className="p-3 border-b border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Connected MCP Servers</span>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {servers.map(s => (
                    <button
                      key={s.config.id}
                      onClick={() => setSelectedServerId(s.config.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        selectedServerId === s.config.id
                          ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-semibold'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      }`}
                    >
                      <span className="truncate">{s.config.name}</span>
                      <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                        {s.tools.length} tools
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TOOLS LIST */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Available Tools ({activeServer?.tools.length || 0})
                </span>
                <div className="space-y-1">
                  {activeServer?.tools.map(tool => (
                    <button
                      key={tool.name}
                      onClick={() => handleSelectTool(tool)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors block ${
                        selectedTool?.name === tool.name && selectedTool?.serverId === activeServer.config.id
                          ? 'bg-purple-600 text-white font-semibold shadow-sm'
                          : 'text-zinc-300 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="font-mono text-xs">{tool.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">{tool.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TOOL RUNNER ARENA */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5 gap-4 bg-[#0a0b0e]">
              {selectedTool ? (
                <>
                  <div className="bg-[#121318] p-4 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-purple-400">{selectedTool.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {selectedTool.serverId}
                        </span>
                      </div>
                      <button
                        onClick={handleExecuteTool}
                        disabled={isExecutingTool}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isExecutingTool ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                        Execute Tool
                      </button>
                    </div>
                    <p className="text-xs text-zinc-300">{selectedTool.description}</p>
                  </div>

                  {/* ARGUMENTS INPUT JSON */}
                  <div className="flex-1 flex flex-col min-h-0 bg-[#121318] p-4 rounded-xl border border-zinc-800/80">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                      Tool Arguments (JSON Schema)
                    </span>
                    <textarea
                      value={toolArgsJson}
                      onChange={(e) => setToolArgsJson(e.target.value)}
                      className="flex-1 min-h-[160px] bg-[#0b0c10] border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* EXECUTION RESULT */}
                  {toolResult && (
                    <div className="bg-[#121318] p-4 rounded-xl border border-zinc-800/80">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                        Execution Output
                      </span>
                      <pre className="p-3 bg-[#0b0c10] rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto max-h-64">
                        {JSON.stringify(toolResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                  Select a tool on the left to inspect its schema and run it.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RESOURCES */}
        {activeTab === 'resources' && (
          <div className="flex-1 flex flex-col min-h-0 p-5 overflow-y-auto">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">
              Server Resources ({activeServer?.resources?.length || 0})
            </span>
            {activeServer?.resources && activeServer.resources.length > 0 ? (
              <div className="space-y-2">
                {activeServer.resources.map(res => (
                  <div key={res.uri} className="bg-[#121318] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-purple-300 font-bold">{res.name}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{res.uri}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{res.mimeType || 'text/plain'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-500 text-xs">
                No resources registered for this server.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MCP_CONFIG.JSON EDITOR */}
        {activeTab === 'config' && (
          <div className="flex-1 flex flex-col min-h-0 p-5 gap-3 bg-[#0a0b0e]">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-bold text-white">mcp_config.json Editor</h2>
                <p className="text-xs text-zinc-400">
                  Directly edit, load, and persist host MCP configuration compatible with Claude Desktop and VS Code.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {configStatusMsg && (
                  <span className="text-xs text-emerald-400 font-medium">{configStatusMsg}</span>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingConfig ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
                  Save mcp_config.json
                </button>
              </div>
            </div>

            <textarea
              value={configJsonText}
              onChange={(e) => setConfigJsonText(e.target.value)}
              className="flex-1 min-h-[300px] bg-[#121318] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>
        )}

        {/* TAB 5: LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col min-h-0 p-5 overflow-y-auto">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">
              Real-time JSON-RPC Traffic Log ({callLogs.length})
            </span>
            {callLogs.length > 0 ? (
              <div className="space-y-2">
                {callLogs.slice().reverse().map(log => (
                  <div key={log.id} className="bg-[#121318] p-3 rounded-xl border border-zinc-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                      <span className="text-purple-400 font-bold">{log.toolName}</span>
                      <span>{log.durationMs}ms</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">Args: {JSON.stringify(log.arguments)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-500 text-xs">
                No execution logs recorded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
