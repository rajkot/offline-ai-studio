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
  GitBranch
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
  const [activeTab, setActiveTab] = useState<'tools' | 'resources' | 'prompts' | 'logs' | 'add-server'>('tools');
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgsJson, setToolArgsJson] = useState<string>('{}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [callLogs, setCallLogs] = useState<McpCallLog[]>([]);
  const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
  const [resourceContent, setResourceContent] = useState<string | null>(null);
  const [isLoadingResource, setIsLoadingResource] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New server modal state
  const [newServerId, setNewServerId] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [newServerTransport, setNewServerTransport] = useState<'sse' | 'websocket'>('sse');
  const [newServerUrl, setNewServerUrl] = useState('http://localhost:3001/sse');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [newServerError, setNewServerError] = useState<string | null>(null);

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

  const activeServer = servers.find(s => s.config.id === selectedServerId) || servers[0];

  useEffect(() => {
    if (activeServer && activeServer.tools.length > 0 && (!selectedTool || selectedTool.serverId !== activeServer.config.id)) {
      handleSelectTool(activeServer.tools[0]);
    }
  }, [selectedServerId, activeServer?.config.id]);

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    setToolResult(null);
    const initialArgs: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, val]) => {
        if (val.default !== undefined) initialArgs[key] = val.default;
        else if (val.type === 'string') {
          if (key === 'path' && Object.keys(workspaceFiles).length > 0) {
            initialArgs[key] = Object.keys(workspaceFiles)[0];
          } else if (key === 'query') {
            initialArgs[key] = 'React';
          } else if (key === 'url') {
            initialArgs[key] = 'https://api.github.com/zen';
          } else {
            initialArgs[key] = '';
          }
        } else if (val.type === 'number') initialArgs[key] = 0;
        else if (val.type === 'boolean') initialArgs[key] = false;
        else if (val.type === 'array') initialArgs[key] = [];
        else initialArgs[key] = {};
      });
    }
    setToolArgsJson(JSON.stringify(initialArgs, null, 2));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || !activeServer) return;
    setIsExecutingTool(true);
    setToolResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsJson);
      } catch (e: any) {
        setToolResult({ isError: true, content: [{ type: 'text', text: `Invalid JSON Arguments: ${e.message}` }] });
        setIsExecutingTool(false);
        return;
      }

      const res = await mcpHub.callTool(activeServer.config.id, selectedTool.name, parsedArgs);
      setToolResult(res);
      setCallLogs([...mcpHub.getCallLogs()]);
    } catch (err: any) {
      setToolResult({ isError: true, content: [{ type: 'text', text: err.message || 'Execution error' }] });
    } finally {
      setIsExecutingTool(false);
    }
  };

  const handleReadResource = async (res: McpResource) => {
    setSelectedResource(res);
    setIsLoadingResource(true);
    setResourceContent(null);
    try {
      const contents = await mcpHub.readResource(res.serverId || activeServer.config.id, res.uri);
      if (contents && contents.length > 0) {
        setResourceContent(contents[0].text || contents[0].blob || '(Empty resource)');
      } else {
        setResourceContent('(No content returned)');
      }
    } catch (err: any) {
      setResourceContent(`Error reading resource: ${err.message}`);
    } finally {
      setIsLoadingResource(false);
    }
  };

  const handleAddNewServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewServerError(null);
    if (!newServerId.trim() || !newServerName.trim() || !newServerUrl.trim()) {
      setNewServerError('All required fields must be filled');
      return;
    }

    const config: McpServerConfig = {
      id: newServerId.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: newServerName.trim(),
      version: '1.0.0',
      transport: newServerTransport,
      url: newServerUrl.trim(),
      description: newServerDesc.trim() || `${newServerTransport.toUpperCase()} MCP Server`,
      enabled: true
    };

    try {
      await mcpHub.addServer(config);
      setSelectedServerId(config.id);
      setActiveTab('tools');
      setNewServerId('');
      setNewServerName('');
      setNewServerDesc('');
    } catch (err: any) {
      setNewServerError(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getServerIcon = (id: string) => {
    if (id.includes('file')) return <Folder size={16} className="text-amber-400" />;
    if (id.includes('git')) return <GitBranch size={16} className="text-orange-400" />;
    if (id.includes('postgres') || id.includes('sqlite') || id.includes('db')) return <Database size={16} className="text-emerald-400" />;
    if (id.includes('fetch') || id.includes('http')) return <Globe size={16} className="text-cyan-400" />;
    if (id.includes('puppeteer') || id.includes('browser')) return <Terminal size={16} className="text-pink-400" />;
    if (id.includes('memory')) return <Brain size={16} className="text-purple-400" />;
    return <Server size={16} className="text-indigo-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0e12] text-zinc-200 overflow-hidden select-none font-sans">
      {/* Header Bar */}
      <div className="h-12 border-b border-zinc-800 bg-[#121318] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-950/80 border border-indigo-700/60 rounded-lg text-indigo-400">
            <Radio size={16} className="animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-wide text-zinc-100">Model Context Protocol (MCP) Hub</span>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-900/60 text-indigo-300 font-mono rounded-full border border-indigo-700/50">
                JSON-RPC 2.0
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Universal multi-transport tool calling & resource provider runtime</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              servers.forEach(s => mcpHub.connectServer(s.config.id));
            }}
            className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reconnect and ping all MCP servers"
          >
            <RefreshCw size={12} />
            <span>Sync All</span>
          </button>
          <button
            onClick={() => setActiveTab('add-server')}
            className="px-3 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md flex items-center gap-1.5 shadow-sm shadow-indigo-950 transition-all cursor-pointer"
          >
            <Plus size={12} />
            <span>Attach Remote Server</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Server List Navigation Sidebar */}
        <div className="w-64 border-r border-zinc-800/80 bg-[#101116] flex flex-col shrink-0">
          <div className="p-2.5 border-b border-zinc-800/60 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
            <span className="uppercase tracking-wider text-[10px]">Registered Servers ({servers.length})</span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {servers.map((s) => {
              const isSelected = s.config.id === selectedServerId;
              const isConnected = s.status === 'connected';

              return (
                <div
                  key={s.config.id}
                  onClick={() => {
                    setSelectedServerId(s.config.id);
                    if (activeTab === 'add-server') setActiveTab('tools');
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800/90 border-indigo-500/80 shadow-md'
                      : 'bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {getServerIcon(s.config.id)}
                      <span className="font-semibold text-xs text-zinc-200 truncate">{s.config.name}</span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                        isConnected
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : s.status === 'connecting'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 line-clamp-1 mb-2">{s.config.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span className="capitalize">{s.config.transport}</span>
                    <div className="flex items-center gap-2">
                      <span>{s.tools.length} tools</span>
                      {s.latencyMs !== undefined && s.latencyMs > 0 && (
                        <span className="text-zinc-400">{s.latencyMs}ms</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Quick Status */}
          <div className="p-3 border-t border-zinc-800/80 bg-[#0d0e12] text-[10px] text-zinc-400 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity size={12} className="text-indigo-400" />
              <span>{callLogs.length} RPC Calls Logged</span>
            </span>
            <button
              onClick={() => {
                mcpHub.clearCallLogs();
                setCallLogs([]);
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Clear Call Logs"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Center & Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0e0f14]">
          {/* Navigation Tabs */}
          <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between bg-[#121318] shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('tools')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'tools'
                    ? 'bg-zinc-800 text-indigo-300 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Terminal size={13} />
                <span>Tools ({activeServer?.tools.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'resources'
                    ? 'bg-zinc-800 text-indigo-300 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <BookOpen size={13} />
                <span>Resources ({activeServer?.resources.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'prompts'
                    ? 'bg-zinc-800 text-indigo-300 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Brain size={13} />
                <span>Prompts ({activeServer?.prompts.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-zinc-800 text-indigo-300 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Activity size={13} />
                <span>Call Logs ({callLogs.length})</span>
              </button>
            </div>

            {activeServer && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  {activeServer.serverInfo?.name || activeServer.config.name} v
                  {activeServer.serverInfo?.version || activeServer.config.version}
                </span>
                {!activeServer.config.isPreset && (
                  <button
                    onClick={() => mcpHub.removeServer(activeServer.config.id)}
                    className="p-1 text-rose-400 hover:bg-rose-950/60 rounded transition-colors"
                    title="Remove custom server"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'tools' && (
              <div className="h-full flex gap-4 overflow-hidden">
                {/* Tools Selector Column */}
                <div className="w-72 border border-zinc-800/80 rounded-xl bg-[#121318] flex flex-col overflow-hidden shrink-0">
                  <div className="p-3 border-b border-zinc-800 text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Available Tools</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{activeServer?.tools.length} tools</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {(!activeServer || activeServer.tools.length === 0) ? (
                      <div className="p-4 text-center text-xs text-zinc-500">No tools declared on this server.</div>
                    ) : (
                      activeServer.tools.map((t) => {
                        const isSelected = selectedTool?.name === t.name;
                        return (
                          <button
                            key={t.name}
                            onClick={() => handleSelectTool(t)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-xs text-indigo-300">{t.name}</span>
                              <ChevronRight size={12} className={isSelected ? 'text-indigo-400' : 'text-zinc-600'} />
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-2">{t.description}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Tool Testing & Execution Sandbox */}
                <div className="flex-1 border border-zinc-800/80 rounded-xl bg-[#121318] flex flex-col overflow-hidden">
                  {selectedTool ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* Tool Header */}
                      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-emerald-400">{selectedTool.name}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 font-mono rounded">
                              {activeServer.config.name}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1">{selectedTool.description}</p>
                        </div>
                        <button
                          onClick={handleExecuteTool}
                          disabled={isExecutingTool}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
                        >
                          <Play size={13} className={isExecutingTool ? 'animate-spin' : ''} />
                          <span>{isExecutingTool ? 'Executing...' : 'Call Tool'}</span>
                        </button>
                      </div>

                      {/* Tool Schema & Input Editor */}
                      <div className="flex-1 grid grid-cols-2 gap-3 p-3 overflow-hidden min-h-0">
                        {/* Parameters input */}
                        <div className="flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-[#0d0e12]">
                          <div className="p-2 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between bg-zinc-900/60">
                            <span>Input Arguments (JSON)</span>
                            <button
                              onClick={() => setToolArgsJson('{}')}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300"
                            >
                              Reset
                            </button>
                          </div>
                          <textarea
                            value={toolArgsJson}
                            onChange={(e) => setToolArgsJson(e.target.value)}
                            className="flex-1 p-3 bg-transparent font-mono text-xs text-emerald-300 resize-none outline-hidden"
                            spellCheck={false}
                          />
                        </div>

                        {/* Result Output */}
                        <div className="flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-[#0d0e12]">
                          <div className="p-2 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between bg-zinc-900/60">
                            <span>Execution Result</span>
                            {toolResult && (
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(toolResult, null, 2), 'tool-result')}
                                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                              >
                                {copiedId === 'tool-result' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>Copy</span>
                              </button>
                            )}
                          </div>
                          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
                            {!toolResult ? (
                              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs text-center">
                                <Terminal size={24} className="mb-2 opacity-50" />
                                <span>Click "Call Tool" to execute JSON-RPC request</span>
                              </div>
                            ) : (
                              <div>
                                {toolResult.content?.map((c: any, i: number) => (
                                  <pre key={i} className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                    {c.text || JSON.stringify(c, null, 2)}
                                  </pre>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                      <span>Select a tool on the left to inspect and execute.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="h-full flex gap-4 overflow-hidden">
                <div className="w-80 border border-zinc-800 rounded-xl bg-[#121318] flex flex-col overflow-hidden shrink-0">
                  <div className="p-3 border-b border-zinc-800 text-xs font-bold text-zinc-300">
                    Declared Resources ({activeServer?.resources.length || 0})
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {activeServer?.resources.map((res) => (
                      <button
                        key={res.uri}
                        onClick={() => handleReadResource(res)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selectedResource?.uri === res.uri
                            ? 'bg-indigo-950/60 border-indigo-600 text-white'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold text-indigo-300 truncate">{res.name}</div>
                        <div className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">{res.uri}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 border border-zinc-800 rounded-xl bg-[#121318] flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-zinc-800 text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Resource Inspector</span>
                    {selectedResource && (
                      <span className="font-mono text-[10px] text-zinc-400">{selectedResource.uri}</span>
                    )}
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-xs bg-[#0d0e12]">
                    {isLoadingResource ? (
                      <div className="text-zinc-500">Reading resource from MCP server...</div>
                    ) : resourceContent ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap">{resourceContent}</pre>
                    ) : (
                      <div className="text-zinc-600">Select a resource to read contents.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="h-full border border-zinc-800 rounded-xl bg-[#121318] p-4 overflow-y-auto">
                <div className="text-sm font-bold text-zinc-200 mb-3">Declared Prompt Templates</div>
                {activeServer?.prompts.length === 0 ? (
                  <div className="text-xs text-zinc-500">No prompt templates exposed on this server.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {activeServer?.prompts.map((p) => (
                      <div key={p.name} className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/60">
                        <div className="font-mono font-bold text-xs text-indigo-300">{p.name}</div>
                        <p className="text-xs text-zinc-400 mt-1">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="h-full border border-zinc-800 rounded-xl bg-[#121318] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-300 bg-zinc-900/60">
                  <span>JSON-RPC 2.0 Telemetry Stream</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{callLogs.length} events</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs bg-[#0d0e12]">
                  {callLogs.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600">No calls executed yet.</div>
                  ) : (
                    callLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400 font-bold">{log.toolName}</span>
                            <span className="text-[10px] text-zinc-500">[{log.serverName}]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400">{log.durationMs}ms</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                log.status === 'success'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-400 mb-1">
                          Args: <span className="text-zinc-300">{JSON.stringify(log.arguments)}</span>
                        </div>
                        {log.error ? (
                          <div className="text-[11px] text-rose-400">Error: {log.error}</div>
                        ) : (
                          <div className="text-[11px] text-emerald-400/90 truncate">
                            Result: {JSON.stringify(log.result)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'add-server' && (
              <div className="max-w-xl mx-auto border border-zinc-800 rounded-2xl bg-[#121318] p-6 shadow-2xl">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800 mb-5">
                  <div className="p-2 bg-indigo-950 border border-indigo-700 rounded-xl text-indigo-400">
                    <Server size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">Attach Custom MCP Server</h3>
                    <p className="text-xs text-zinc-400">Connect to external SSE or WebSocket Model Context Protocol daemons</p>
                  </div>
                </div>

                {newServerError && (
                  <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{newServerError}</span>
                  </div>
                )}

                <form onSubmit={handleAddNewServer} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">Server Identifier (ID)</label>
                    <input
                      type="text"
                      value={newServerId}
                      onChange={(e) => setNewServerId(e.target.value)}
                      placeholder="e.g. github-mcp"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      placeholder="e.g. GitHub Repository Integrator"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">Transport Protocol</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewServerTransport('sse')}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          newServerTransport === 'sse'
                            ? 'bg-indigo-950/60 border-indigo-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold text-xs">SSE / HTTP POST</div>
                        <div className="text-[10px] text-zinc-500">Server-Sent Events streaming</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewServerTransport('websocket')}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          newServerTransport === 'websocket'
                            ? 'bg-indigo-950/60 border-indigo-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold text-xs">WebSocket</div>
                        <div className="text-[10px] text-zinc-500">Bi-directional socket connection</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">Endpoint URL</label>
                    <input
                      type="text"
                      value={newServerUrl}
                      onChange={(e) => setNewServerUrl(e.target.value)}
                      placeholder={newServerTransport === 'sse' ? 'http://localhost:3001/sse' : 'ws://localhost:8080'}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">Description (Optional)</label>
                    <input
                      type="text"
                      value={newServerDesc}
                      onChange={(e) => setNewServerDesc(e.target.value)}
                      placeholder="Brief note on what tools this server provides"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tools')}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md shadow-indigo-950 cursor-pointer"
                    >
                      Connect Server
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
