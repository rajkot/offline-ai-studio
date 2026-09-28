import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  FileCode2,
  Eye,
  Save,
  Cpu,
  Users,
  Brain,
  Share2,
  Globe,
  LayoutTemplate,
  Sparkles,
  Calculator,
  GitBranch,
  BookOpen,
  Network,
  FolderPlus,
  RefreshCw,
  Copy,
  Check,
  Code2,
  Settings2,
  Zap
} from 'lucide-react';
import { StrandsToolDefinition, StrandsToolCategory, strandsToolsEngine } from '@/lib/tools/strandsToolsEngine';

interface StrandsToolsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool?: (tool: StrandsToolDefinition) => void;
}

export const StrandsToolsStudioModal: React.FC<StrandsToolsStudioModalProps> = ({
  isOpen,
  onClose,
  onSelectTool
}) => {
  const [tools, setTools] = useState<StrandsToolDefinition[]>([]);
  const [categories, setCategories] = useState<{ id: StrandsToolCategory; label: string; color: string; count: number }[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('calculator');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'playground' | 'schema' | 'agent_attach'>('playground');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadTools();
    }
  }, [isOpen]);

  const loadTools = async () => {
    try {
      const res = await fetch('/api/strands-tools');
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools || []);
        setCategories(data.categories || []);
      } else {
        setTools(strandsToolsEngine.getAllTools());
        setCategories(strandsToolsEngine.getCategories());
      }
    } catch {
      setTools(strandsToolsEngine.getAllTools());
      setCategories(strandsToolsEngine.getCategories());
    }
  };

  const selectedTool = tools.find(t => t.id === selectedToolId) || tools[0];

  useEffect(() => {
    if (selectedTool) {
      // Set initial defaults from first example or param defaults
      const defaults: Record<string, any> = {};
      if (selectedTool.examples && selectedTool.examples.length > 0) {
        Object.assign(defaults, selectedTool.examples[0]);
      } else {
        selectedTool.params.forEach(p => {
          defaults[p.name] = p.default !== undefined ? p.default : '';
        });
      }
      setParamValues(defaults);
      setExecutionResult(null);
    }
  }, [selectedToolId]);

  if (!isOpen) return null;

  const filteredTools = tools.filter(tool => {
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesQuery = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleExecute = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/strands-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          toolId: selectedTool.id,
          args: paramValues
        })
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({
        toolId: selectedTool.id,
        success: false,
        error: err.message || 'Execution failed'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleTool = async (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/strands-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', toolId })
      });
      if (res.ok) {
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, isEnabled: !t.isEnabled } : t));
      }
    } catch {
      strandsToolsEngine.toggleTool(toolId);
      setTools([...strandsToolsEngine.getAllTools()]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getToolIcon = (iconName: string, color: string) => {
    const size = 15;
    switch (iconName) {
      case 'FileCode2': return <FileCode2 size={size} style={{ color }} />;
      case 'Eye': return <Eye size={size} style={{ color }} />;
      case 'Save': return <Save size={size} style={{ color }} />;
      case 'TerminalSquare':
      case 'Terminal': return <Terminal size={size} style={{ color }} />;
      case 'Clock': return <Clock size={size} style={{ color }} />;
      case 'Cpu': return <Cpu size={size} style={{ color }} />;
      case 'Users': return <Users size={size} style={{ color }} />;
      case 'Brain': return <Brain size={size} style={{ color }} />;
      case 'Share2': return <Share2 size={size} style={{ color }} />;
      case 'Globe': return <Globe size={size} style={{ color }} />;
      case 'LayoutTemplate': return <LayoutTemplate size={size} style={{ color }} />;
      case 'Sparkles': return <Sparkles size={size} style={{ color }} />;
      case 'Calculator': return <Calculator size={size} style={{ color }} />;
      case 'GitBranch': return <GitBranch size={size} style={{ color }} />;
      case 'BookOpen': return <BookOpen size={size} style={{ color }} />;
      case 'Network': return <Network size={size} style={{ color }} />;
      case 'FolderPlus': return <FolderPlus size={size} style={{ color }} />;
      default: return <Wrench size={size} style={{ color }} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg shadow-inner">
              <Wrench size={18} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Strands Agents Tools Studio</h2>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono font-medium">
                  {tools.length} Universal Tools
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                  MCP Compatible
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Actionable tool execution harness, dynamic runtime loader & function calling for autonomous AI agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTools}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Tools"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content Split Pane */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar: Tool Categories & Tool List */}
          <div className="w-80 border-r border-zinc-800/80 bg-[#141417] flex flex-col shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-zinc-800/80">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search 18+ Strands tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/60 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1 mt-2.5 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'all' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({tools.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat.id 
                        ? 'bg-zinc-700 text-white border border-zinc-500' 
                        : 'bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label.split(' ')[0]} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Tool List Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {filteredTools.map(tool => {
                const isSelected = selectedTool?.id === tool.id;
                return (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedToolId(tool.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between group ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
                        : 'bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 shrink-0 mt-0.5">
                        {getToolIcon(tool.icon, tool.categoryColor)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-200' : 'text-zinc-200'}`}>
                            {tool.name}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 line-clamp-1 mt-0.5">
                          {tool.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span 
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium"
                            style={{ backgroundColor: `${tool.categoryColor}15`, color: tool.categoryColor, border: `1px solid ${tool.categoryColor}30` }}
                          >
                            {tool.id}
                          </span>
                          {tool.isNative && (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded font-mono">
                              Native
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleTool(tool.id, e)}
                      title={tool.isEnabled ? 'Disable Tool' : 'Enable Tool'}
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-1 cursor-pointer transition-colors ${
                        tool.isEnabled 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-zinc-800 border-zinc-600 text-transparent hover:border-zinc-400'
                      }`}
                    >
                      {tool.isEnabled && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Bar */}
            <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-900/60 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Active Tools: <strong className="text-zinc-200">{tools.filter(t => t.isEnabled).length}</strong> / {tools.length}</span>
              <button
                onClick={() => {
                  const allActive = tools.every(t => t.isEnabled);
                  tools.forEach(t => strandsToolsEngine.toggleTool(t.id, !allActive));
                  setTools([...strandsToolsEngine.getAllTools()]);
                }}
                className="text-amber-400 hover:text-amber-300 text-[10.5px] cursor-pointer"
              >
                Toggle All
              </button>
            </div>
          </div>

          {/* Right Content Area: Tool Configuration, Live Playground, Schema & Logs */}
          <div className="flex-1 flex flex-col bg-[#101012] overflow-hidden">
            
            {/* Tool Detail Header */}
            {selectedTool && (
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                    {getToolIcon(selectedTool.icon, selectedTool.categoryColor)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{selectedTool.name}</h3>
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded font-mono font-medium"
                        style={{ backgroundColor: `${selectedTool.categoryColor}20`, color: selectedTool.categoryColor, border: `1px solid ${selectedTool.categoryColor}40` }}
                      >
                        {selectedTool.categoryLabel}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                        id: {selectedTool.id}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">{selectedTool.description}</p>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setActiveTab('playground')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'playground'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Play size={12} />
                    <span>Live Test</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'schema'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Code2 size={12} />
                    <span>JSON Schema</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('agent_attach')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'agent_attach'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Zap size={12} />
                    <span>Agent Wire</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Tab Views */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
              
              {/* TAB 1: PLAYGROUND & LIVE EXECUTION */}
              {activeTab === 'playground' && selectedTool && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  
                  {/* Left Column: Parameter Form */}
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Settings2 size={13} className="text-amber-400" />
                        Tool Arguments ({selectedTool.params.length})
                      </h4>
                      {selectedTool.examples && selectedTool.examples.length > 0 && (
                        <button
                          onClick={() => setParamValues({ ...selectedTool.examples[0] })}
                          className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Load Example Preset
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {selectedTool.params.map(param => (
                        <div key={param.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
                              {param.name}
                              {param.required && <span className="text-amber-400">*</span>}
                            </label>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-1 rounded">
                              {param.type}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-zinc-400">{param.description}</p>

                          {param.enum ? (
                            <select
                              value={paramValues[param.name] ?? param.default ?? ''}
                              onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
                              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
                            >
                              {param.enum.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : param.type === 'number' ? (
                            <input
                              type="number"
                              value={paramValues[param.name] ?? ''}
                              onChange={(e) => setParamValues({ ...paramValues, [param.name]: Number(e.target.value) })}
                              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
                            />
                          ) : param.type === 'boolean' ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                checked={!!paramValues[param.name]}
                                onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.checked })}
                                className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0"
                              />
                              <span className="text-xs text-zinc-300">Enabled</span>
                            </div>
                          ) : (
                            <textarea
                              rows={param.name.includes('code') || param.name.includes('content') || param.name.includes('elements') ? 4 : 2}
                              value={typeof paramValues[param.name] === 'object' ? JSON.stringify(paramValues[param.name], null, 2) : (paramValues[param.name] ?? '')}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (param.type === 'object' || param.type === 'array') {
                                  try {
                                    val = JSON.parse(val);
                                  } catch {}
                                }
                                setParamValues({ ...paramValues, [param.name]: val });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500/60"
                              placeholder={`Enter ${param.name}...`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleExecute}
                      disabled={executing}
                      className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        executing
                          ? 'bg-amber-600/50 text-zinc-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-lg shadow-amber-500/20'
                      }`}
                    >
                      {executing ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Executing Tool ({selectedTool.id})...</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>Execute Tool Live</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Execution Output */}
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Execution Output
                        </h4>
                        {executionResult && (
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono flex items-center gap-1 ${
                            executionResult.success 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {executionResult.success ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {executionResult.success ? 'Success' : 'Failed'}
                          </span>
                        )}
                      </div>

                      {executionResult && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {executionResult.durationMs}ms
                          </span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(executionResult, null, 2))}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
                            title="Copy Output"
                          >
                            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                      {executionResult ? (
                        <pre className="text-emerald-300/90 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(executionResult, null, 2)}
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center p-4">
                          <Terminal size={24} className="mb-2 opacity-50" />
                          <p className="text-xs">Configure arguments on the left and click "Execute Tool Live".</p>
                          <p className="text-[10px] text-zinc-600 mt-1">Output, errors, stdout, and durations will stream here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: JSON SCHEMA */}
              {activeTab === 'schema' && selectedTool && (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        OpenAI & Ollama Function Tool Schema
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Compatible with Ollama native tools, LangChain, LlamaIndex, and Autogen harnesses.
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(strandsToolsEngine.generateOllamaToolSchemas([selectedTool.id])[0], null, 2))}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Copy JSON Schema</span>
                    </button>
                  </div>

                  <pre className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg font-mono text-xs text-amber-200/90 overflow-x-auto">
                    {JSON.stringify(strandsToolsEngine.generateOllamaToolSchemas([selectedTool.id])[0], null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB 3: AGENT ATTACH & INTEGRATIONS */}
              {activeTab === 'agent_attach' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-950/20 to-orange-950/20 border border-amber-500/30 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-400" />
                      Automatic IDE Agent Tool Injection
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1">
                      All enabled Strands Tools are automatically injected into our <strong>Autonomous Agent Loop</strong>, <strong>302 Agency Personas</strong>, and <strong>Agentic Composer</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-purple-400" />
                        <h5 className="text-xs font-bold text-white">Agency Agents (302)</h5>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Specialized roles invoke Strands tools directly matching their domain skills.
                      </p>
                      <span className="inline-block px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded text-[9px] font-mono">
                        Active & Synced
                      </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Share2 size={16} className="text-cyan-400" />
                        <h5 className="text-xs font-bold text-white">Codebase Memory MCP</h5>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Strands tools can query the AST symbol graph via <code className="text-cyan-300">mcp_client</code>.
                      </p>
                      <span className="inline-block px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[9px] font-mono">
                        Port MCP-stdio
                      </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Terminal size={16} className="text-emerald-400" />
                        <h5 className="text-xs font-bold text-white">Interactive PTY Shell</h5>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Native Node child process execution with full stdout streaming and timeout defense.
                      </p>
                      <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono">
                        Zero Latency
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
