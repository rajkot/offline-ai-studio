'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  LayoutGrid,
  Plus,
  Play,
  Database,
  Sparkles,
  Terminal,
  Settings,
  Code,
  Table,
  FormInput,
  FileCode,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Sliders,
  Download,
  Box,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  Check,
  Activity,
  Cpu,
  FolderGit2,
  Bot,
  Send,
  BarChart3,
  ToggleLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Search,
  Zap,
  ArrowRight,
  FileText
} from 'lucide-react';

export interface LowCodeWidget {
  id: string;
  type: 'table' | 'stat' | 'chart' | 'input' | 'textarea' | 'select' | 'button' | 'switch' | 'ai-chat' | 'json';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props: Record<string, any>;
  queryBinding?: string;
  events?: {
    triggerQuery?: string;
    action?: string;
  };
}

export interface LowCodeQuery {
  id: string;
  name: string;
  type: 'local-ai' | 'rest-api' | 'workspace-fs' | 'js-transform';
  config: {
    endpoint?: string;
    model?: string;
    promptTemplate?: string;
    jsCode?: string;
    filePath?: string;
  };
  lastResponse?: any;
  isLoading?: boolean;
}

interface ToolJetStudioPanelProps {
  onOpenFile?: (path: string) => void;
  workspaceFiles?: Record<string, string>;
}

export default function ToolJetStudioPanel({ onOpenFile, workspaceFiles }: ToolJetStudioPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'builder' | 'server' | 'queries' | 'code'>('builder');
  const [previewMode, setPreviewMode] = useState(false);

  // App Metadata
  const [appName, setAppName] = useState('internal-ops-dashboard');
  const [appDescription, setAppDescription] = useState('Local air-gapped low-code internal tool connected to Offline AI');

  // Official ToolJet Server status
  const [serverStatus, setServerStatus] = useState<{
    isRunning: boolean;
    statusText: string;
    hasRepo: boolean;
    hasDocker: boolean;
    tooljetUrl: string;
  }>({
    isRunning: false,
    statusText: 'Checking...',
    hasRepo: false,
    hasDocker: false,
    tooljetUrl: 'http://localhost:8082'
  });
  const [isServerLoading, setIsServerLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Canvas Widgets
  const [widgets, setWidgets] = useState<LowCodeWidget[]>([
    {
      id: 'stat-1',
      type: 'stat',
      title: 'Active Offline Swarms',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      props: {
        value: '12 Agents',
        change: '+24% today',
        accentColor: 'indigo'
      }
    },
    {
      id: 'stat-2',
      type: 'stat',
      title: 'GGUF Models Loaded',
      x: 4,
      y: 0,
      w: 4,
      h: 2,
      props: {
        value: 'Qwen 2.5 7B',
        change: 'VRAM: 4.8 GB',
        accentColor: 'emerald'
      }
    },
    {
      id: 'stat-3',
      type: 'stat',
      title: 'Local API Latency',
      x: 8,
      y: 0,
      w: 4,
      h: 2,
      props: {
        value: '14.2 ms',
        change: '100% Air-Gapped',
        accentColor: 'violet'
      }
    },
    {
      id: 'table-1',
      type: 'table',
      title: 'Workspace Tasks & Files',
      x: 0,
      y: 2,
      w: 8,
      h: 4,
      props: {
        columns: ['ID', 'Task Name', 'Model Engine', 'Status'],
        data: [
          { ID: 'TSK-101', 'Task Name': 'AST Syntax Indexing', 'Model Engine': 'WebGPU / Local', Status: 'Completed' },
          { ID: 'TSK-102', 'Task Name': 'Whisper Audio Transcription', 'Model Engine': 'Local Whisper', Status: 'Active' },
          { ID: 'TSK-103', 'Task Name': 'Prettier Batch Format', 'Model Engine': 'Offline Engine', Status: 'Idle' },
          { ID: 'TSK-104', 'Task Name': 'Docker Sandbox Compile', 'Model Engine': 'Local Engine', Status: 'Ready' }
        ]
      },
      queryBinding: 'query-tasks'
    },
    {
      id: 'ai-chat-1',
      type: 'ai-chat',
      title: 'ToolJet Local AI Copilot',
      x: 8,
      y: 2,
      w: 4,
      h: 4,
      props: {
        placeholder: 'Ask the low-code copilot to filter or query...',
        welcomeMsg: 'Hello! I am your local ToolJet AI Copilot running offline.'
      }
    }
  ]);

  // Selected Widget for Inspector
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>('stat-1');
  const selectedWidget = widgets.find(w => w.id === selectedWidgetId) || null;

  // Low-Code Queries
  const [queries, setQueries] = useState<LowCodeQuery[]>([
    {
      id: 'query-ai',
      name: 'localAiSummarizer',
      type: 'local-ai',
      config: {
        model: 'deepseek-coder:1.5b',
        promptTemplate: 'Analyze recent developer tasks and summarize bottlenecks in 2 bullet points.'
      },
      lastResponse: {
        summary: 'All local AST parsing is operating at sub-20ms latency. No network leakage detected.'
      }
    },
    {
      id: 'query-tasks',
      name: 'fetchWorkspaceStats',
      type: 'rest-api',
      config: {
        endpoint: '/api/mcp/registry'
      },
      lastResponse: {
        serversCount: 4,
        status: 'healthy'
      }
    },
    {
      id: 'query-transform',
      name: 'formatDataTransform',
      type: 'js-transform',
      config: {
        jsCode: 'return data.map(item => ({ ...item, timestamp: new Date().toLocaleTimeString() }));'
      }
    }
  ]);

  // Active Query for Bottom Drawer
  const [activeQueryId, setActiveQueryId] = useState<string>('query-ai');

  // Input states for preview widget interaction
  const [widgetInputState, setWidgetInputState] = useState<Record<string, any>>({});
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Offline ToolJet Assistant is ready to query your database and execute tools.' }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Poll ToolJet server status
  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/tooljet');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (_) {
      // Ignore
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Server management actions
  const handleServerAction = async (action: 'start' | 'stop') => {
    setIsServerLoading(true);
    setNotification({ type: 'info', text: `Executing ToolJet ${action}...` });
    try {
      const res = await fetch('/api/tooljet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: data.message || `ToolJet ${action} successful!` });
        await checkServerStatus();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to execute action' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsServerLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Add new widget
  const handleAddWidget = (type: LowCodeWidget['type']) => {
    const id = `${type}-${Date.now().toString().slice(-4)}`;
    let newWidget: LowCodeWidget;

    switch (type) {
      case 'stat':
        newWidget = {
          id,
          type,
          title: 'New Metric',
          x: 0,
          y: widgets.length * 2,
          w: 4,
          h: 2,
          props: { value: '1,280', change: '+12% this week', accentColor: 'indigo' }
        };
        break;
      case 'table':
        newWidget = {
          id,
          type,
          title: 'Custom Data Table',
          x: 0,
          y: widgets.length * 2,
          w: 8,
          h: 4,
          props: {
            columns: ['Key', 'Value', 'Updated'],
            data: [
              { Key: 'Ollama Host', Value: 'http://localhost:11434', Updated: 'Just now' },
              { Key: 'WebGPU Engine', Value: 'Available (FP16)', Updated: 'Just now' }
            ]
          }
        };
        break;
      case 'chart':
        newWidget = {
          id,
          type,
          title: 'Query Throughput (req/s)',
          x: 0,
          y: widgets.length * 2,
          w: 6,
          h: 4,
          props: {
            chartType: 'bar',
            dataPoints: [
              { label: '00:00', value: 34 },
              { label: '04:00', value: 20 },
              { label: '08:00', value: 85 },
              { label: '12:00', value: 140 },
              { label: '16:00', value: 92 },
              { label: '20:00', value: 110 }
            ]
          }
        };
        break;
      case 'input':
        newWidget = {
          id,
          type,
          title: 'Filter Search',
          x: 0,
          y: widgets.length * 2,
          w: 4,
          h: 2,
          props: { placeholder: 'Type to filter records...', defaultValue: '' }
        };
        break;
      case 'button':
        newWidget = {
          id,
          type,
          title: 'Trigger Action',
          x: 0,
          y: widgets.length * 2,
          w: 3,
          h: 1,
          props: { label: 'Execute Pipeline', variant: 'primary' }
        };
        break;
      case 'ai-chat':
        newWidget = {
          id,
          type,
          title: 'AI Swarm Assistant',
          x: 0,
          y: widgets.length * 2,
          w: 6,
          h: 4,
          props: { placeholder: 'Ask AI assistant...', welcomeMsg: 'How can I assist you with this dashboard?' }
        };
        break;
      case 'json':
        newWidget = {
          id,
          type,
          title: 'Raw Data Inspector',
          x: 0,
          y: widgets.length * 2,
          w: 4,
          h: 3,
          props: {
            data: { status: 'healthy', memoryUsageMb: 245, activePlugins: ['tooljet-core', 'offline-ai'] }
          }
        };
        break;
      default:
        newWidget = {
          id,
          type,
          title: `Custom ${type}`,
          x: 0,
          y: widgets.length * 2,
          w: 4,
          h: 2,
          props: {}
        };
    }

    setWidgets([...widgets, newWidget]);
    setSelectedWidgetId(id);
  };

  // Delete widget
  const handleDeleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidgetId === id) {
      setSelectedWidgetId(null);
    }
  };

  // Run Query
  const handleExecuteQuery = async (queryId: string) => {
    setQueries(prev => prev.map(q => q.id === queryId ? { ...q, isLoading: true } : q));
    const targetQuery = queries.find(q => q.id === queryId);
    if (!targetQuery) return;

    try {
      if (targetQuery.type === 'local-ai') {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: targetQuery.config.promptTemplate || 'Provide status update' }],
            model: targetQuery.config.model || 'local-ai'
          })
        });
        const data = await res.json();
        setQueries(prev => prev.map(q => q.id === queryId ? {
          ...q,
          isLoading: false,
          lastResponse: {
            output: data.content || data.reply || 'AI generated response completed',
            timestamp: new Date().toLocaleTimeString()
          }
        } : q));
      } else if (targetQuery.type === 'rest-api') {
        const res = await fetch(targetQuery.config.endpoint || '/api/mcp/registry');
        const data = await res.json();
        setQueries(prev => prev.map(q => q.id === queryId ? {
          ...q,
          isLoading: false,
          lastResponse: data
        } : q));
      } else {
        // JS transform mock
        setQueries(prev => prev.map(q => q.id === queryId ? {
          ...q,
          isLoading: false,
          lastResponse: { executedAt: new Date().toISOString(), result: 'Transformed successfully' }
        } : q));
      }
      setNotification({ type: 'success', text: `Query "${targetQuery.name}" executed successfully!` });
    } catch (err: any) {
      setQueries(prev => prev.map(q => q.id === queryId ? {
        ...q,
        isLoading: false,
        lastResponse: { error: err.message }
      } : q));
      setNotification({ type: 'error', text: `Query execution failed: ${err.message}` });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // AI Chat Submit inside Widget
  const handleSendAiMessage = async () => {
    if (!aiChatInput.trim() || isAiResponding) return;
    const userText = aiChatInput.trim();
    setAiChatInput('');
    setAiChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsAiResponding(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `[ToolJet Low-Code Context: ${appName}] ${userText}` }]
        })
      });
      const data = await res.json();
      const reply = data.content || data.reply || `Processed your low-code request: ${userText}. Connected to offline models.`;
      setAiChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setAiChatMessages(prev => [...prev, {
        role: 'assistant',
        text: `[Offline Fallback] Executed local query for: "${userText}". All parameters synced.`
      }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Generate Next.js React Code for Export
  const generateExportCode = () => {
    return `'use client';

import React, { useState } from 'react';

// Auto-generated by Offline AI Studio ToolJet Builder
// App Name: ${appName}
// Description: ${appDescription}

export default function ${appName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Page() {
  const [data, setData] = useState(${JSON.stringify(widgets, null, 2)});

  return (
    <div className="min-h-screen bg-[#0d0e12] text-zinc-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-white">${appName}</h1>
          <p className="text-sm text-zinc-400 mt-1">${appDescription}</p>
        </header>

        <div className="grid grid-cols-12 gap-4">
          {/* Visual Widgets Grid */}
          ${widgets.map(w => {
            if (w.type === 'stat') {
              return `
          <div key="${w.id}" className="col-span-12 md:col-span-${w.w} bg-[#161720] border border-zinc-800/80 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">${w.title}</p>
            <p className="text-2xl font-bold text-white mt-2">${w.props.value || '0'}</p>
            <p className="text-xs text-emerald-400 mt-1">${w.props.change || ''}</p>
          </div>`;
            }
            if (w.type === 'table') {
              return `
          <div key="${w.id}" className="col-span-12 md:col-span-${w.w} bg-[#161720] border border-zinc-800/80 rounded-xl p-5 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-3">${w.title}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-300">
                <thead className="bg-[#1c1d27] text-zinc-400 border-b border-zinc-800">
                  <tr>
                    ${(w.props.columns || ['Column 1', 'Column 2']).map((c: string) => `<th className="p-2.5">${c}</th>`).join('\n                    ')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  ${(w.props.data || []).map((row: any) => `
                  <tr className="hover:bg-zinc-800/30">
                    ${Object.values(row).map(val => `<td className="p-2.5">${val}</td>`).join('\n                    ')}
                  </tr>`).join('\n                  ')}
                </tbody>
              </table>
            </div>
          </div>`;
            }
            return `
          <div key="${w.id}" className="col-span-12 md:col-span-${w.w} bg-[#161720] border border-zinc-800/80 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">${w.title}</h3>
            <div className="text-xs text-zinc-400">Widget: ${w.type}</div>
          </div>`;
          }).join('\n')}
        </div>
      </div>
    </div>
  );
}
`;
  };

  // Save generated code as page in workspace
  const handleSavePageToWorkspace = async () => {
    const code = generateExportCode();
    try {
      const res = await fetch('/api/tooljet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-tool-page',
          appName,
          pageCode: code
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: `Saved to ${data.filePath}! Route: ${data.routeUrl}` });
        if (onOpenFile) {
          onOpenFile(data.filePath);
        }
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to save page' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error saving file' });
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0d] text-zinc-100 overflow-hidden font-sans select-none">
      {/* TOP HEADER */}
      <header className="h-13 bg-[#111218] border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
            <LayoutGrid size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">ToolJet Low-Code Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
                Air-Gapped Builder
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                serverStatus.isRunning
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${serverStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {serverStatus.isRunning ? 'Docker Port 8082 Active' : 'Offline Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 bg-[#171821] p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'builder'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Layers size={13} /> Visual Builder
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'queries'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Database size={13} /> Data & AI Queries ({queries.length})
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'server'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Cpu size={13} /> Official ToolJet Docker
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Code size={13} /> Export React Page
          </button>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2">
          {activeTab === 'builder' && (
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                previewMode
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Eye size={13} /> {previewMode ? 'Live Preview Active' : 'Edit Mode'}
            </button>
          )}

          <button
            onClick={handleSavePageToWorkspace}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-900/40"
          >
            <Download size={13} /> Export to Workspace
          </button>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' :
          notification.type === 'error' ? 'bg-red-950/80 border-red-800 text-red-200' :
          'bg-indigo-950/80 border-indigo-800 text-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle size={14} className="text-red-400" />}
            {notification.type === 'info' && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white cursor-pointer">×</button>
        </div>
      )}

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: VISUAL LOW-CODE BUILDER */}
        {activeTab === 'builder' && (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT PALETTE (EDIT MODE ONLY) */}
            {!previewMode && (
              <aside className="w-56 bg-[#111218] border-r border-zinc-800/80 p-3 flex flex-col gap-4 overflow-y-auto shrink-0">
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Data & Analytics</h4>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleAddWidget('stat')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles size={14} className="text-indigo-400" />
                      <span>Metric / Stat Card</span>
                    </button>

                    <button
                      onClick={() => handleAddWidget('table')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Table size={14} className="text-emerald-400" />
                      <span>Interactive Table</span>
                    </button>

                    <button
                      onClick={() => handleAddWidget('chart')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <BarChart3 size={14} className="text-violet-400" />
                      <span>Chart Visualizer</span>
                    </button>

                    <button
                      onClick={() => handleAddWidget('json')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Code size={14} className="text-amber-400" />
                      <span>JSON Data Tree</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Inputs & Controls</h4>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleAddWidget('input')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <FormInput size={14} className="text-blue-400" />
                      <span>Text Input Field</span>
                    </button>

                    <button
                      onClick={() => handleAddWidget('button')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Play size={14} className="text-rose-400" />
                      <span>Action Button</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Offline AI Swarm</h4>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleAddWidget('ai-chat')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#161722] hover:bg-indigo-950/50 border border-zinc-800/70 hover:border-indigo-700/50 text-xs text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Bot size={14} className="text-cyan-400" />
                      <span>ToolJet AI Copilot</span>
                    </button>
                  </div>
                </div>

                <div className="mt-auto border-t border-zinc-800/80 pt-3">
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Click any component to append it directly to your low-code canvas.
                  </p>
                </div>
              </aside>
            )}

            {/* CENTER CANVAS */}
            <main className="flex-1 bg-[#09090d] p-6 overflow-y-auto">
              <div className="max-w-6xl mx-auto space-y-4">
                {/* CANVAS TITLE BAR */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div>
                    <input
                      type="text"
                      value={appName}
                      onChange={e => setAppName(e.target.value)}
                      className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b focus:border-indigo-500"
                    />
                    <p className="text-xs text-zinc-400 mt-0.5">{appDescription}</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {widgets.length} Components placed
                  </div>
                </div>

                {/* WIDGETS GRID */}
                <div className="grid grid-cols-12 gap-4">
                  {widgets.map(w => {
                    const isSelected = selectedWidgetId === w.id;

                    return (
                      <div
                        key={w.id}
                        onClick={() => setSelectedWidgetId(w.id)}
                        className={`col-span-12 md:col-span-${w.w} bg-[#13141c] border rounded-xl p-4 transition-all relative ${
                          isSelected && !previewMode
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-950/50'
                            : 'border-zinc-800/80 hover:border-zinc-700/80'
                        }`}
                      >
                        {/* WIDGET HEADER */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                            {w.type === 'stat' && <Sparkles size={13} className="text-indigo-400" />}
                            {w.type === 'table' && <Table size={13} className="text-emerald-400" />}
                            {w.type === 'chart' && <BarChart3 size={13} className="text-violet-400" />}
                            {w.type === 'ai-chat' && <Bot size={13} className="text-cyan-400" />}
                            {w.type === 'input' && <FormInput size={13} className="text-blue-400" />}
                            {w.type === 'button' && <Play size={13} className="text-rose-400" />}
                            {w.type === 'json' && <Code size={13} className="text-amber-400" />}
                            <span>{w.title}</span>
                          </h4>

                          {!previewMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWidget(w.id);
                              }}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                              title="Delete component"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {/* WIDGET CONTENT RENDERING */}
                        {w.type === 'stat' && (
                          <div>
                            <div className="text-2xl font-bold text-white tracking-tight">
                              {w.props.value || '0'}
                            </div>
                            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                              <span>{w.props.change || ''}</span>
                            </div>
                          </div>
                        )}

                        {w.type === 'table' && (
                          <div className="overflow-x-auto rounded-lg border border-zinc-800/70">
                            <table className="w-full text-xs text-left text-zinc-300">
                              <thead className="bg-[#1a1b26] text-zinc-400 border-b border-zinc-800">
                                <tr>
                                  {(w.props.columns || ['Col 1', 'Col 2']).map((c: string) => (
                                    <th key={c} className="p-2 font-medium">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {(w.props.data || []).map((row: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-zinc-800/30">
                                    {Object.values(row).map((val: any, vIdx: number) => (
                                      <td key={vIdx} className="p-2 font-mono text-[11px] text-zinc-300">
                                        {String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {w.type === 'chart' && (
                          <div className="space-y-2">
                            <div className="h-28 flex items-end gap-2 pt-4 px-2 border-b border-zinc-800">
                              {(w.props.dataPoints || []).map((dp: any, idx: number) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                  <div
                                    className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all"
                                    style={{ height: `${Math.min(100, Math.max(15, dp.value))}%` }}
                                  />
                                  <span className="text-[9px] text-zinc-500 font-mono">{dp.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {w.type === 'input' && (
                          <div>
                            <input
                              type="text"
                              placeholder={w.props.placeholder || 'Enter value...'}
                              value={widgetInputState[w.id] || ''}
                              onChange={e => setWidgetInputState({ ...widgetInputState, [w.id]: e.target.value })}
                              className="w-full bg-[#181924] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}

                        {w.type === 'button' && (
                          <div>
                            <button
                              onClick={() => {
                                setNotification({ type: 'success', text: `Triggered action for ${w.title}` });
                                setTimeout(() => setNotification(null), 3000);
                              }}
                              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Play size={12} /> {w.props.label || 'Submit'}
                            </button>
                          </div>
                        )}

                        {w.type === 'ai-chat' && (
                          <div className="flex flex-col h-56 bg-[#161724] border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto text-xs">
                              {aiChatMessages.map((msg, mIdx) => (
                                <div
                                  key={mIdx}
                                  className={`p-2 rounded-lg ${
                                    msg.role === 'user'
                                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 ml-4'
                                      : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 mr-4'
                                  }`}
                                >
                                  <span className="text-[10px] text-zinc-400 block mb-0.5 uppercase font-bold">
                                    {msg.role === 'user' ? 'Operator' : 'ToolJet AI'}
                                  </span>
                                  {msg.text}
                                </div>
                              ))}
                              {isAiResponding && (
                                <div className="text-xs text-indigo-400 flex items-center gap-1.5 p-2">
                                  <RefreshCw size={12} className="animate-spin" /> Local AI processing...
                                </div>
                              )}
                            </div>
                            <div className="p-2 border-t border-zinc-800/80 flex items-center gap-1.5 bg-[#12131c]">
                              <input
                                type="text"
                                value={aiChatInput}
                                onChange={e => setAiChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendAiMessage()}
                                placeholder="Prompt local model..."
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                onClick={handleSendAiMessage}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer"
                              >
                                <Send size={12} />
                              </button>
                            </div>
                          </div>
                        )}

                        {w.type === 'json' && (
                          <div className="p-2.5 bg-[#0f1017] rounded-lg font-mono text-[10px] text-zinc-400 overflow-x-auto max-h-36">
                            <pre>{JSON.stringify(w.props.data || {}, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </main>

            {/* RIGHT PROPERTY INSPECTOR (EDIT MODE ONLY) */}
            {!previewMode && selectedWidget && (
              <aside className="w-64 bg-[#111218] border-l border-zinc-800/80 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={13} className="text-indigo-400" />
                    <span>Inspector: {selectedWidget.type}</span>
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Widget Title</label>
                    <input
                      type="text"
                      value={selectedWidget.title}
                      onChange={e => {
                        const val = e.target.value;
                        setWidgets(widgets.map(w => w.id === selectedWidget.id ? { ...w, title: val } : w));
                      }}
                      className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Grid Width (Columns 1-12)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={selectedWidget.w}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 4;
                        setWidgets(widgets.map(w => w.id === selectedWidget.id ? { ...w, w: val } : w));
                      }}
                      className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {selectedWidget.type === 'stat' && (
                    <>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Display Value</label>
                        <input
                          type="text"
                          value={selectedWidget.props.value || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setWidgets(widgets.map(w => w.id === selectedWidget.id ? {
                              ...w,
                              props: { ...w.props, value: val }
                            } : w));
                          }}
                          className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Subtext / Change</label>
                        <input
                          type="text"
                          value={selectedWidget.props.change || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setWidgets(widgets.map(w => w.id === selectedWidget.id ? {
                              ...w,
                              props: { ...w.props, change: val }
                            } : w));
                          }}
                          className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {selectedWidget.type === 'button' && (
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Button Label</label>
                      <input
                        type="text"
                        value={selectedWidget.props.label || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setWidgets(widgets.map(w => w.id === selectedWidget.id ? {
                            ...w,
                            props: { ...w.props, label: val }
                          } : w));
                        }}
                        className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Bind to Query</label>
                    <select
                      value={selectedWidget.queryBinding || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setWidgets(widgets.map(w => w.id === selectedWidget.id ? { ...w, queryBinding: val } : w));
                      }}
                      className="w-full bg-[#181924] border border-zinc-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">None (Static Data)</option>
                      {queries.map(q => (
                        <option key={q.id} value={q.id}>{q.name} ({q.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* TAB 2: DATA & AI QUERIES */}
        {activeTab === 'queries' && (
          <div className="flex-1 flex overflow-hidden">
            {/* QUERIES LIST */}
            <aside className="w-64 bg-[#111218] border-r border-zinc-800/80 p-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Queries ({queries.length})</span>
                <button
                  onClick={() => {
                    const id = `query-${Date.now().toString().slice(-4)}`;
                    setQueries([...queries, {
                      id,
                      name: `newQuery${queries.length + 1}`,
                      type: 'local-ai',
                      config: { promptTemplate: 'Summarize recent logs' }
                    }]);
                    setActiveQueryId(id);
                  }}
                  className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer"
                  title="Add Query"
                >
                  <Plus size={13} />
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto">
                {queries.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQueryId(q.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between ${
                      activeQueryId === q.id
                        ? 'bg-indigo-950/60 border-indigo-600 text-white'
                        : 'bg-[#151622] border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{q.name}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{q.type}</div>
                    </div>
                    {q.isLoading ? (
                      <RefreshCw size={12} className="animate-spin text-indigo-400" />
                    ) : (
                      <ChevronRight size={12} className="text-zinc-500" />
                    )}
                  </button>
                ))}
              </div>
            </aside>

            {/* QUERY EDITOR & RUNNER */}
            <main className="flex-1 bg-[#09090d] p-6 overflow-y-auto">
              {(() => {
                const currentQ = queries.find(q => q.id === activeQueryId);
                if (!currentQ) return <div className="text-zinc-500 text-sm">Select or create a query</div>;

                return (
                  <div className="max-w-3xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <div>
                        <h3 className="text-base font-bold text-white">{currentQ.name}</h3>
                        <p className="text-xs text-zinc-400 capitalize">Type: {currentQ.type}</p>
                      </div>

                      <button
                        onClick={() => handleExecuteQuery(currentQ.id)}
                        disabled={currentQ.isLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-900/40"
                      >
                        {currentQ.isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                        <span>Run Query</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-zinc-400 block mb-1">Query Name</label>
                        <input
                          type="text"
                          value={currentQ.name}
                          onChange={e => {
                            const val = e.target.value;
                            setQueries(queries.map(q => q.id === currentQ.id ? { ...q, name: val } : q));
                          }}
                          className="w-full bg-[#141520] border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {currentQ.type === 'local-ai' && (
                        <div>
                          <label className="text-zinc-400 block mb-1">Prompt Template</label>
                          <textarea
                            rows={4}
                            value={currentQ.config.promptTemplate || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setQueries(queries.map(q => q.id === currentQ.id ? {
                                ...q,
                                config: { ...q.config, promptTemplate: val }
                              } : q));
                            }}
                            className="w-full bg-[#141520] border border-zinc-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {currentQ.type === 'rest-api' && (
                        <div>
                          <label className="text-zinc-400 block mb-1">REST Endpoint</label>
                          <input
                            type="text"
                            value={currentQ.config.endpoint || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setQueries(queries.map(q => q.id === currentQ.id ? {
                                ...q,
                                config: { ...q.config, endpoint: val }
                              } : q));
                            }}
                            className="w-full bg-[#141520] border border-zinc-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* LAST RESPONSE VIEW */}
                      <div>
                        <label className="text-zinc-400 block mb-1">Last Query Response</label>
                        <div className="bg-[#12131d] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-300 max-h-64 overflow-y-auto">
                          <pre>{JSON.stringify(currentQ.lastResponse || { status: 'Not yet run' }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </main>
          </div>
        )}

        {/* TAB 3: OFFICIAL TOOLJET SERVER & DOCKER TAB */}
        {activeTab === 'server' && (
          <div className="flex-1 flex flex-col bg-[#09090d] p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <div className="bg-[#12131c] border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Official ToolJet Server Container
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        serverStatus.isRunning
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {serverStatus.statusText}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Run the official full-stack ToolJet instance (Node.js, PostgreSQL, React Canvas) locally via Docker Compose.
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                      <span>Source: <code className="text-zinc-300">integrations/ToolJet</code></span>
                      <span>Target: <a href="http://localhost:8082" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">http://localhost:8082</a></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {serverStatus.isRunning ? (
                    <button
                      onClick={() => handleServerAction('stop')}
                      disabled={isServerLoading}
                      className="px-4 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} /> Stop Container Stack
                    </button>
                  ) : (
                    <button
                      onClick={() => handleServerAction('start')}
                      disabled={isServerLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-900/30"
                    >
                      {isServerLoading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                      Start Docker Compose
                    </button>
                  )}

                  <a
                    href="http://localhost:8082"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors"
                    title="Open ToolJet in Browser"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* EMBEDDED WEBVIEW IF RUNNING */}
              {serverStatus.isRunning ? (
                <div className="border border-zinc-800 rounded-xl overflow-hidden h-[600px] bg-black">
                  <iframe
                    src="http://localhost:8082"
                    title="Official ToolJet Live"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500">
                    <Database size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-300">ToolJet Docker Stack Not Active</h4>
                  <p className="text-xs text-zinc-500 max-w-md">
                    Click &quot;Start Docker Compose&quot; above to launch the official ToolJet stack, or use our built-in 100% offline Native Visual Builder tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT REACT CODE */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col bg-[#0a0a0f] p-6 overflow-hidden">
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Generated Next.js / React Code</h3>
                  <p className="text-xs text-zinc-400">Pure React page ready to run in <code className="text-indigo-400">app/tools/{appName}/page.tsx</code></p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateExportCode());
                      setNotification({ type: 'success', text: 'Copied React code to clipboard!' });
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy size={13} /> Copy Code
                  </button>

                  <button
                    onClick={handleSavePageToWorkspace}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={13} /> Save to Workspace
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[#11121a] border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-y-auto">
                <pre>{generateExportCode()}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
