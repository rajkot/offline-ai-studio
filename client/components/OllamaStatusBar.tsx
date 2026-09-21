'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, AlertCircle, ChevronDown, 
  Cpu, HardDrive, Play, Zap, Database, ArrowRight, Search, Check
} from 'lucide-react';

export interface OllamaModelSimple {
  name: string;
  size: number;
  parameter_size?: string;
  quantization?: string;
  modified_at?: string;
}

export default function OllamaStatusBar({ onModelSelect }: { onModelSelect?: (model: string) => void }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [models, setModels] = useState<OllamaModelSimple[]>([]);
  const [activeModel, setActiveModel] = useState<string>('qwen2.5:1.5b');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newModelNotification, setNewModelNotification] = useState<string | null>(null);

  const prevModelNamesRef = useRef<Set<string>>(new Set());
  const initialCheckDoneRef = useRef(false);

  // Fetch status and models, with optional autoStart parameter
  const fetchOllamaStatus = useCallback(async (autoStart = false) => {
    setIsRefreshing(true);
    try {
      const url = autoStart ? '/api/ollama/status?autoStart=true' : '/api/ollama/status';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOnline(data.online);

        if (data.online && Array.isArray(data.models)) {
          const simplified: OllamaModelSimple[] = data.models.map((m: any) => ({
            name: m.name,
            size: m.size || 0,
            parameter_size: m.details?.parameter_size || '',
            quantization: m.details?.quantization_level || '',
            modified_at: m.modified_at,
          }));

          setModels(simplified);

          // Check for newly downloaded models
          const currentNames = new Set(simplified.map(m => m.name));
          if (initialCheckDoneRef.current && prevModelNamesRef.current.size > 0) {
            const newlyAdded = simplified.filter(m => !prevModelNamesRef.current.has(m.name));
            if (newlyAdded.length > 0) {
              const latest = newlyAdded[0].name;
              setNewModelNotification(latest);
              // Broadcast update to the entire application
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ollama-models-updated', { 
                  detail: { models: simplified, newlyAdded: latest } 
                }));
              }
            }
          }
          prevModelNamesRef.current = currentNames;
          initialCheckDoneRef.current = true;

          // Check active model alignment
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('offlineAi.ollamaModel');
            if (saved && currentNames.has(saved)) {
              setActiveModel(saved);
            } else if (data.defaultModel && currentNames.has(data.defaultModel)) {
              setActiveModel(data.defaultModel);
              localStorage.setItem('offlineAi.ollamaModel', data.defaultModel);
            } else if (simplified.length > 0 && (!saved || !currentNames.has(saved))) {
              const firstModel = simplified[0].name;
              setActiveModel(firstModel);
              localStorage.setItem('offlineAi.ollamaModel', firstModel);
            }
          }
        } else if (!data.online && autoStart) {
          // If still offline after autoStart attempt
          setOnline(false);
        }
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    } finally {
      setIsRefreshing(false);
      setIsStarting(false);
    }
  }, []);

  // Explicit daemon launch action
  const handleStartDaemon = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/ollama/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          setOnline(true);
          await fetchOllamaStatus(false);
        }
      }
    } catch (e) {
      console.warn('Failed to start daemon:', e);
    } finally {
      setIsStarting(false);
    }
  };

  // Mount effect: Auto-start daemon on IDE launch and listen to events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offlineAi.ollamaModel');
      if (saved) setActiveModel(saved);
    }

    // Auto-run Ollama daemon on IDE initialization
    fetchOllamaStatus(true);

    // Reactive polling every 6 seconds while IDE is active to detect newly downloaded models
    const interval = setInterval(() => {
      fetchOllamaStatus(false);
    }, 6000);

    // Instant refresh when user switches back to IDE (e.g. from terminal where they pulled a model)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOllamaStatus(false);
      }
    };
    const handleFocus = () => {
      fetchOllamaStatus(false);
    };

    // Listen to global model changes or downloads from other components
    const handleExternalModelChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setActiveModel(customEvent.detail);
      }
    };

    const handleExternalModelsUpdated = () => {
      fetchOllamaStatus(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('ollama-model-changed', handleExternalModelChange);
    window.addEventListener('ollama-models-updated', handleExternalModelsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ollama-model-changed', handleExternalModelChange);
      window.removeEventListener('ollama-models-updated', handleExternalModelsUpdated);
    };
  }, [fetchOllamaStatus]);

  // Model selection handler
  const handleSelectModel = (modelName: string) => {
    setActiveModel(modelName);
    setDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('offlineAi.ollamaModel', modelName);
      window.dispatchEvent(new CustomEvent('ollama-model-changed', { detail: modelName }));
    }
    if (onModelSelect) {
      onModelSelect(modelName);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.parameter_size && m.parameter_size.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative inline-flex items-center text-xs font-mono select-none">
      {/* Toast Notification when a new model is downloaded & detected */}
      {newModelNotification && (
        <div className="fixed top-12 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-[#18181b] border border-emerald-500/60 rounded-xl shadow-2xl p-3 flex items-center gap-3 text-zinc-100 max-w-md">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800">
              <Cpu size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span>✨ New Offline Model Ready</span>
              </div>
              <div className="text-[11px] text-zinc-300 font-mono truncate">
                {newModelNotification}
              </div>
            </div>
            <button
              onClick={() => {
                handleSelectModel(newModelNotification);
                setNewModelNotification(null);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold cursor-pointer shrink-0"
            >
              Use Now
            </button>
            <button
              onClick={() => setNewModelNotification(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Status Bar Button */}
      <div 
        onClick={() => setDropdownOpen(prev => !prev)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
          online 
            ? 'bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-500/60 text-emerald-300' 
            : isStarting
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-300 animate-pulse'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
        }`}
        title={
          online 
            ? `Ollama Daemon Online (${models.length} models installed). Active: ${activeModel}` 
            : isStarting
            ? 'Launching Ollama Daemon in background...'
            : 'Ollama is offline. Click to launch or view models.'
        }
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              online ? 'bg-emerald-500' : isStarting ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
            }`} />
          </span>
          <span className="font-semibold flex items-center gap-1 text-[11px]">
            🦙 Ollama:
          </span>
          <span className="text-zinc-200 font-bold max-w-[130px] truncate text-[11px] flex items-center gap-1">
            {online && activeModel.toLowerCase().startsWith('hf.co/') && (
              <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono shrink-0">
                HF
              </span>
            )}
            <span className="truncate">
              {online ? activeModel.replace(/^hf\.co\//i, '').replace(/:latest$/, '') : isStarting ? 'Starting...' : 'Offline'}
            </span>
          </span>
          {online && models.length > 0 && (
            <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-1 rounded font-mono">
              {models.length}
            </span>
          )}
        </div>

        <ChevronDown size={12} className={`transition-transform text-zinc-400 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-72 bg-[#121216] border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-1 py-1 border-b border-zinc-800 pb-2 mb-2">
            <div>
              <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                <Cpu size={13} className="text-purple-400" /> Offline Ollama Models
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {models.length} model{models.length === 1 ? '' : 's'} available
              </span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                fetchOllamaStatus(false);
              }}
              disabled={isRefreshing}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer transition-colors"
              title="Refresh installed models"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Quick Search if 3+ models */}
          {models.length > 3 && (
            <div className="relative mb-2">
              <Search size={11} className="absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-7 pr-2 py-1 bg-zinc-900/90 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          )}

          {/* Models List */}
          <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
            {models.length > 0 ? (
              filteredModels.map((m) => {
                const isSelected = m.name === activeModel;
                return (
                  <button
                    key={m.name}
                    onClick={() => handleSelectModel(m.name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-900/40 text-purple-200 border border-purple-700/50 shadow-sm'
                        : 'text-zinc-300 hover:bg-zinc-800/80 border border-transparent'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-[11px] truncate text-zinc-200 flex items-center gap-1.5">
                        {m.name.toLowerCase().startsWith('hf.co/') && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono shrink-0">
                            HF
                          </span>
                        )}
                        <span className="truncate">{m.name.replace(/^hf\.co\//i, '').replace(/:latest$/, '')}</span>
                        {isSelected && (
                          <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded font-mono shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-zinc-500 flex items-center gap-2 font-mono mt-0.5">
                        {m.parameter_size && <span>{m.parameter_size}</span>}
                        {m.quantization && <span>{m.quantization}</span>}
                        {m.size > 0 && <span>{formatSize(m.size)}</span>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={13} className="text-purple-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-zinc-500">
                {online ? (
                  <div>
                    <p className="mb-1 text-zinc-400">No models detected.</p>
                    <p className="text-[10px] text-zinc-500">Pull a model in terminal or via Catalog.</p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-zinc-400">Ollama daemon is offline.</p>
                    <button
                      onClick={handleStartDaemon}
                      disabled={isStarting}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Play size={11} /> {isStarting ? 'Starting...' : 'Start Ollama'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with daemon launch or download action */}
          <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 px-1 flex justify-between items-center font-mono">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {online ? '127.0.0.1:11434' : 'Daemon Offline'}
            </span>
            {!online && !isStarting && (
              <button
                onClick={handleStartDaemon}
                className="text-purple-400 hover:text-purple-300 underline text-[10px] cursor-pointer"
              >
                Launch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
