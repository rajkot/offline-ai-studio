'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Save,
  Clock,
  Folder,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  Code2,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  Layers,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  FileJson,
  Zap
} from 'lucide-react';
import {
  apiClientEngine,
  HttpMethod,
  BodyType,
  AuthType,
  ApiRequestItem,
  ApiResponseData,
  ApiCollection,
  ApiClientHistoryItem,
  KeyValuePair
} from '@/lib/apiClient/apiClientEngine';

interface ApiStudioPanelProps {
  className?: string;
  initialRequest?: Partial<ApiRequestItem>;
  onClose?: () => void;
}

export default function ApiStudioPanel({
  className = '',
  initialRequest,
  onClose
}: ApiStudioPanelProps) {
  // Collections & History from engine
  const [collections, setCollections] = useState<ApiCollection[]>(() => apiClientEngine.getCollections());
  const [history, setHistory] = useState<ApiClientHistoryItem[]>(() => apiClientEngine.getHistory());
  const [activeSidebarView, setActiveSidebarView] = useState<'collections' | 'history'>('collections');
  const [isCollectionsCollapsed, setIsCollectionsCollapsed] = useState(false);

  // Active Request State
  const [request, setRequest] = useState<ApiRequestItem>(() => ({
    id: `req-${Date.now()}`,
    name: 'New Request',
    method: (initialRequest?.method as HttpMethod) || 'GET',
    url: initialRequest?.url || '/api/git?action=status',
    queryParams: initialRequest?.queryParams || [{ id: '1', key: 'action', value: 'status', enabled: true }],
    headers: initialRequest?.headers || [
      { id: '1', key: 'Accept', value: 'application/json', enabled: true },
      { id: '2', key: 'Content-Type', value: 'application/json', enabled: true }
    ],
    auth: initialRequest?.auth || { type: 'none' },
    bodyType: initialRequest?.bodyType || 'json',
    rawBody: initialRequest?.rawBody || '{\n  "query": "status"\n}',
    graphqlQuery: initialRequest?.graphqlQuery || 'query {\n  continents {\n    code\n    name\n  }\n}',
    graphqlVariables: initialRequest?.graphqlVariables || '{\n}',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  // Active Tab inside Request Panel
  const [activeReqTab, setActiveReqTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params');
  // Active Tab inside Response Panel
  const [activeResTab, setActiveResTab] = useState<'body' | 'headers' | 'raw'>('body');

  // Request Execution & Response States
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponseData | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('New Request');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  // Subscribe to Engine changes
  useEffect(() => {
    return apiClientEngine.subscribe(() => {
      setCollections(apiClientEngine.getCollections());
      setHistory(apiClientEngine.getHistory());
    });
  }, []);

  // Update default selected collection ID
  useEffect(() => {
    if (collections.length > 0 && !selectedCollectionId) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  // Execute the active request
  const handleSend = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await apiClientEngine.executeRequest(request);
      setResponse(res);
    } catch (err: any) {
      console.error('API Send Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [request, isLoading]);

  // Hotkey: Ctrl+Enter to send request
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  // Select request from collection or history
  const handleSelectRequest = (item: ApiRequestItem) => {
    setRequest({ ...item });
    setSaveNameInput(item.name);
    setResponse(null);
  };

  // Add param row
  const handleAddParam = () => {
    setRequest(prev => ({
      ...prev,
      queryParams: [...prev.queryParams, { id: `q-${Date.now()}`, key: '', value: '', enabled: true }]
    }));
  };

  // Update param row
  const handleUpdateParam = (id: string, updates: Partial<KeyValuePair>) => {
    setRequest(prev => ({
      ...prev,
      queryParams: prev.queryParams.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  // Delete param row
  const handleDeleteParam = (id: string) => {
    setRequest(prev => ({
      ...prev,
      queryParams: prev.queryParams.filter(q => q.id !== id)
    }));
  };

  // Add header row
  const handleAddHeader = () => {
    setRequest(prev => ({
      ...prev,
      headers: [...prev.headers, { id: `h-${Date.now()}`, key: '', value: '', enabled: true }]
    }));
  };

  // Update header row
  const handleUpdateHeader = (id: string, updates: Partial<KeyValuePair>) => {
    setRequest(prev => ({
      ...prev,
      headers: prev.headers.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  };

  // Delete header row
  const handleDeleteHeader = (id: string) => {
    setRequest(prev => ({
      ...prev,
      headers: prev.headers.filter(h => h.id !== id)
    }));
  };

  // Format JSON body
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(request.rawBody);
      setRequest(prev => ({ ...prev, rawBody: JSON.stringify(parsed, null, 2) }));
    } catch {
      // ignore syntax error
    }
  };

  // Copy response
  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.rawText);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Save request to collection
  const handleSaveToCollection = () => {
    if (!selectedCollectionId) return;
    const reqToSave = { ...request, name: saveNameInput.trim() || request.name };
    apiClientEngine.saveRequestToCollection(selectedCollectionId, reqToSave);
    setRequest(reqToSave);
    setSaveModalOpen(false);
  };

  const getMethodBadgeColor = (m: HttpMethod) => {
    switch (m) {
      case 'GET': return 'text-emerald-400 bg-emerald-950/80 border-emerald-700/60';
      case 'POST': return 'text-indigo-400 bg-indigo-950/80 border-indigo-700/60';
      case 'PUT': return 'text-amber-400 bg-amber-950/80 border-amber-700/60';
      case 'DELETE': return 'text-rose-400 bg-rose-950/80 border-rose-700/60';
      case 'PATCH': return 'text-purple-400 bg-purple-950/80 border-purple-700/60';
      default: return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const getStatusBadgeColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950 border-emerald-600/70';
    if (status >= 300 && status < 400) return 'text-cyan-400 bg-cyan-950 border-cyan-600/70';
    if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-950 border-amber-600/70';
    return 'text-rose-400 bg-rose-950 border-rose-600/70';
  };

  return (
    <div className={`flex flex-row h-full w-full bg-[#090d16] text-slate-200 overflow-hidden font-sans select-none ${className}`}>
      {/* 1. Left Collections / History Drawer (240px) */}
      <div className={`border-r border-slate-800 bg-[#070a12] flex flex-col shrink-0 transition-all duration-200 ${
        isCollectionsCollapsed ? 'w-10' : 'w-64'
      }`}>
        {/* Drawer Header */}
        <div className="h-10 px-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          {!isCollectionsCollapsed && (
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">API Studio</span>
            </div>
          )}
          <button
            onClick={() => setIsCollectionsCollapsed(prev => !prev)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isCollectionsCollapsed ? "Expand Collections" : "Collapse Drawer"}
          >
            {isCollectionsCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {!isCollectionsCollapsed && (
          <>
            {/* View Switcher Tabs (Collections vs History) */}
            <div className="flex items-center p-1.5 gap-1 border-b border-slate-800/80 bg-slate-950/40">
              <button
                onClick={() => setActiveSidebarView('collections')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSidebarView === 'collections'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Folder size={11} />
                <span>Collections</span>
              </button>
              <button
                onClick={() => setActiveSidebarView('history')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSidebarView === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Clock size={11} />
                <span>History</span>
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-2 custom-scrollbar">
              {activeSidebarView === 'collections' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Saved Endpoints</span>
                    <button
                      onClick={() => {
                        const name = prompt('Enter new collection name:', 'New Collection');
                        if (name) apiClientEngine.createCollection(name);
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-indigo-400 hover:text-indigo-300"
                      title="New Collection"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {collections.map(col => (
                    <div key={col.id} className="border border-slate-800/80 rounded-lg bg-slate-950/50 overflow-hidden">
                      <div className="px-2 py-1.5 bg-slate-900/60 flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span className="truncate">{col.name}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-mono">
                          {col.requests.length}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/40">
                        {col.requests.map(reqItem => (
                          <div
                            key={reqItem.id}
                            onClick={() => handleSelectRequest(reqItem)}
                            className={`px-2 py-1.5 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between text-[11px] group transition-colors ${
                              request.id === reqItem.id ? 'bg-indigo-950/70 border-l-2 border-indigo-500' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded border ${getMethodBadgeColor(reqItem.method)}`}>
                                {reqItem.method}
                              </span>
                              <span className="truncate text-slate-300 group-hover:text-white">{reqItem.name}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                apiClientEngine.deleteRequest(col.id, reqItem.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                              title="Delete Request"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* History List */
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Recent Activity</span>
                    <button
                      onClick={() => apiClientEngine.clearHistory()}
                      className="text-[10px] text-slate-500 hover:text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <div className="text-slate-500 text-center text-xs py-8">No requests yet</div>
                  ) : (
                    history.map(hist => (
                      <div
                        key={hist.id}
                        onClick={() => handleSelectRequest(hist.request)}
                        className="p-1.5 rounded-lg border border-slate-800/60 hover:bg-slate-900 cursor-pointer transition-colors space-y-1 group"
                      >
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className={`font-bold font-mono text-[9px] px-1 py-0.2 rounded border ${getMethodBadgeColor(hist.request.method)}`}>
                            {hist.request.method}
                          </span>
                          <span className={`text-[9.5px] font-mono font-bold px-1 rounded ${
                            hist.response.status >= 200 && hist.response.status < 300 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {hist.response.status || 'ERR'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300 truncate">{hist.request.url}</div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500">
                          <span>{hist.response.durationMs}ms</span>
                          <span>{new Date(hist.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 2. Main Request & Response Workbench */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Request Bar: Method Selector + URL Input + Send Button */}
        <div className="p-3 border-b border-slate-800 bg-[#090d16] flex items-center gap-2 shrink-0">
          {/* Method Pill Selector */}
          <div className="relative">
            <select
              value={request.method}
              onChange={(e) => setRequest(prev => ({ ...prev, method: e.target.value as HttpMethod }))}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs border cursor-pointer focus:outline-none transition-colors ${getMethodBadgeColor(request.method)}`}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="OPTIONS">OPTIONS</option>
              <option value="HEAD">HEAD</option>
            </select>
          </div>

          {/* URL Input */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={request.url}
              onChange={(e) => setRequest(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://api.example.com/v1/resource or /api/git?action=status"
              className="w-full bg-[#111827] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-950 cursor-pointer disabled:opacity-50 transition-all"
          >
            {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Send</span>
            <kbd className="text-[9px] bg-black/40 px-1 rounded font-mono hidden sm:inline">Ctrl+Enter</kbd>
          </button>

          {/* Save to Collection Button */}
          <button
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Save to Collection"
          >
            <Save size={13} />
            <span className="hidden md:inline">Save</span>
          </button>
        </div>

        {/* Split Panels: Top Request Editor & Bottom Response Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* LEFT: Request Configuration Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#070b13]">
            {/* Request Tabs Header */}
            <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0 text-xs font-medium">
              <div className="flex items-center gap-1">
                {[
                  { id: 'params' as const, label: `Params (${request.queryParams.filter(q => q.enabled).length})` },
                  { id: 'headers' as const, label: `Headers (${request.headers.filter(h => h.enabled).length})` },
                  { id: 'auth' as const, label: `Auth (${request.auth.type !== 'none' ? '✓' : '•'})` },
                  { id: 'body' as const, label: `Body (${request.bodyType})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReqTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      activeReqTab === tab.id
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Body Format Switcher (shown when Body tab active) */}
              {activeReqTab === 'body' && (
                <div className="flex items-center gap-2">
                  <select
                    value={request.bodyType}
                    onChange={(e) => setRequest(prev => ({ ...prev, bodyType: e.target.value as BodyType }))}
                    className="bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 rounded px-2 py-0.5 focus:outline-none"
                  >
                    <option value="json">JSON</option>
                    <option value="graphql">GraphQL</option>
                    <option value="x-www-form-urlencoded">Form URL Encoded</option>
                    <option value="raw">Raw Text</option>
                    <option value="none">None</option>
                  </select>

                  {request.bodyType === 'json' && (
                    <button
                      onClick={handleFormatJson}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Format
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Request Tabs Content Viewport */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {/* TAB 1: Query Params */}
              {activeReqTab === 'params' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-400 font-mono">Query String Parameters</span>
                    <button
                      onClick={handleAddParam}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold"
                    >
                      <Plus size={12} /> Add Param
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 bg-slate-950/40">
                    {request.queryParams.map((param) => (
                      <div key={param.id} className="flex items-center gap-2 p-1.5 text-xs font-mono">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => handleUpdateParam(param.id, { enabled: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer ml-1"
                        />
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => handleUpdateParam(param.id, { key: e.target.value })}
                          placeholder="Key"
                          className="flex-1 bg-transparent px-2 py-1 rounded text-white focus:bg-slate-900 border border-transparent focus:border-slate-700 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleUpdateParam(param.id, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 bg-transparent px-2 py-1 rounded text-slate-300 focus:bg-slate-900 border border-transparent focus:border-slate-700 focus:outline-none"
                        />
                        <button
                          onClick={() => handleDeleteParam(param.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Headers */}
              {activeReqTab === 'headers' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-400 font-mono">HTTP Request Headers</span>
                    <button
                      onClick={handleAddHeader}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold"
                    >
                      <Plus size={12} /> Add Header
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 bg-slate-950/40">
                    {request.headers.map((hdr) => (
                      <div key={hdr.id} className="flex items-center gap-2 p-1.5 text-xs font-mono">
                        <input
                          type="checkbox"
                          checked={hdr.enabled}
                          onChange={(e) => handleUpdateHeader(hdr.id, { enabled: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer ml-1"
                        />
                        <input
                          type="text"
                          value={hdr.key}
                          onChange={(e) => handleUpdateHeader(hdr.id, { key: e.target.value })}
                          placeholder="Header Name (e.g. Authorization)"
                          className="flex-1 bg-transparent px-2 py-1 rounded text-white focus:bg-slate-900 border border-transparent focus:border-slate-700 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={hdr.value}
                          onChange={(e) => handleUpdateHeader(hdr.id, { value: e.target.value })}
                          placeholder="Header Value"
                          className="flex-1 bg-transparent px-2 py-1 rounded text-slate-300 focus:bg-slate-900 border border-transparent focus:border-slate-700 focus:outline-none"
                        />
                        <button
                          onClick={() => handleDeleteHeader(hdr.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Auth */}
              {activeReqTab === 'auth' && (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Authentication Type</label>
                    <select
                      value={request.auth.type}
                      onChange={(e) => setRequest(prev => ({
                        ...prev,
                        auth: { ...prev.auth, type: e.target.value as AuthType }
                      }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth (Username / Password)</option>
                      <option value="apiKey">API Key</option>
                    </select>
                  </div>

                  {request.auth.type === 'bearer' && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-mono">Token</label>
                      <input
                        type="text"
                        value={request.auth.bearerToken || ''}
                        onChange={(e) => setRequest(prev => ({
                          ...prev,
                          auth: { ...prev.auth, bearerToken: e.target.value }
                        }))}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {request.auth.type === 'basic' && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-mono">Username</label>
                        <input
                          type="text"
                          value={request.auth.basicUser || ''}
                          onChange={(e) => setRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, basicUser: e.target.value }
                          }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-mono">Password</label>
                        <input
                          type="password"
                          value={request.auth.basicPassword || ''}
                          onChange={(e) => setRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, basicPassword: e.target.value }
                          }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {request.auth.type === 'apiKey' && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-mono">Key Name</label>
                        <input
                          type="text"
                          value={request.auth.apiKeyName || ''}
                          onChange={(e) => setRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyName: e.target.value }
                          }))}
                          placeholder="x-api-key"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-mono">Value</label>
                        <input
                          type="text"
                          value={request.auth.apiKeyValue || ''}
                          onChange={(e) => setRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyValue: e.target.value }
                          }))}
                          placeholder="secret_key_123"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-mono">Add to</label>
                        <select
                          value={request.auth.apiKeyAddTo || 'header'}
                          onChange={(e) => setRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyAddTo: e.target.value as 'header' | 'query' }
                          }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="header">Header</option>
                          <option value="query">Query Parameter</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Body */}
              {activeReqTab === 'body' && (
                <div className="h-full flex flex-col min-h-0 space-y-2">
                  {request.bodyType === 'graphql' ? (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex-1 flex flex-col min-h-[140px]">
                        <span className="text-xs text-slate-400 font-mono mb-1">GraphQL Query / Mutation</span>
                        <textarea
                          value={request.graphqlQuery}
                          onChange={(e) => setRequest(prev => ({ ...prev, graphqlQuery: e.target.value }))}
                          className="flex-1 w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-emerald-300 focus:outline-none resize-none leading-relaxed"
                          rows={8}
                        />
                      </div>
                      <div className="h-28 flex flex-col">
                        <span className="text-xs text-slate-400 font-mono mb-1">Query Variables (JSON)</span>
                        <textarea
                          value={request.graphqlVariables}
                          onChange={(e) => setRequest(prev => ({ ...prev, graphqlVariables: e.target.value }))}
                          className="flex-1 w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 focus:outline-none resize-none leading-relaxed"
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : request.bodyType === 'none' ? (
                    <div className="text-slate-500 text-xs py-8 text-center">This request does not have a body</div>
                  ) : (
                    <textarea
                      value={request.rawBody}
                      onChange={(e) => setRequest(prev => ({ ...prev, rawBody: e.target.value }))}
                      placeholder='{\n  "name": "Jane",\n  "role": "developer"\n}'
                      className="flex-1 w-full min-h-[220px] bg-[#030712] border border-slate-800 rounded-lg p-3 font-mono text-xs text-indigo-200 focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Real-Time Response Viewer Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050811]">
            {/* Response Status Bar */}
            <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Response</span>
                {response && (
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${getStatusBadgeColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                )}
                {response && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {response.durationMs} ms
                  </span>
                )}
                {response && response.sizeBytes > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(response.sizeBytes / 1024).toFixed(2)} KB
                  </span>
                )}
              </div>

              {/* Right Response Actions */}
              {response && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedResponse ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Response Sub-tabs Header */}
            {response && (
              <div className="px-3 py-1 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2 text-xs">
                {(['body', 'headers', 'raw'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveResTab(tab)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                      activeResTab === tab ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Response Body Content */}
            <div className="flex-1 overflow-auto p-3 font-mono text-xs custom-scrollbar">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw size={20} className="animate-spin text-indigo-400" />
                  <span className="text-xs">Sending HTTP request...</span>
                </div>
              ) : !response ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Send size={24} className="text-slate-600" />
                  <span>Hit Send or press Ctrl+Enter to test endpoint</span>
                </div>
              ) : activeResTab === 'body' ? (
                <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed select-text font-mono text-[11.5px]">
                  {typeof response.data === 'object'
                    ? JSON.stringify(response.data, null, 2)
                    : response.rawText}
                </pre>
              ) : activeResTab === 'headers' ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex p-2 text-xs">
                      <span className="w-1/3 text-slate-400 font-semibold truncate">{k}</span>
                      <span className="flex-1 text-slate-200 truncate select-text">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-slate-300 whitespace-pre-wrap select-text">{response.rawText}</pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Save Request Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-xl max-w-sm w-full p-4 space-y-3 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-sm text-white">Save Request</h4>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Request Name</label>
              <input
                type="text"
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Target Collection</label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToCollection}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
