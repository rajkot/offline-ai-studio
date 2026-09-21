'use client';
import { useState, useEffect } from 'react';
import { Settings, X, Database, Check, ShieldAlert, ToggleLeft, ToggleRight, Gauge, ShieldCheck, DollarSign, Activity, Keyboard, RefreshCw, Edit2, RotateCcw, Package } from 'lucide-react';
import RagIndexerDashboard from '@/components/RagIndexerDashboard';
import VramControlPanel from '@/client/components/VramControlPanel';
import ComplianceShield from '@/components/ComplianceShield';
import FinOpsDashboard from '@/components/FinopsDashboard';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import DesktopBuildDashboard from '@/components/DesktopBuildDashboard';
import DiagnosticsDashboard from '@/components/DiagnosticsDashboard';
import ModelCatalogStorefront from '@/client/components/ModelCatalogStorefront';
import OllamaSettingsTab from '@/client/components/OllamaSettingsTab';
import { COMMAND_METADATA, DEFAULT_KEYBINDINGS, getActiveKeybindings } from '@/components/CommandPalette';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'ollama' | 'security' | 'rag' | 'optimizer' | 'finops' | 'performance' | 'keybindings' | 'desktop' | 'diagnostics' | 'models';
}

export default function SettingsModal({ isOpen, onClose, initialTab = 'general' }: SettingsProps) {
  const [clearedToast, setClearedToast] = useState(false);
  const [cacheResetTrigger, setCacheResetTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'ollama' | 'security' | 'rag' | 'optimizer' | 'finops' | 'performance' | 'keybindings' | 'desktop' | 'diagnostics' | 'models'>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const [redactEmails, setRedactEmails] = useState(true);
  const [maskCreditCards, setMaskCreditCards] = useState(true);
  const [hideApiKeys, setHideApiKeys] = useState(true);
  const [filterPrivateIp, setFilterPrivateIp] = useState(true);
  const [enablePromptInjectionDefense, setEnablePromptInjectionDefense] = useState(true);
  
  const [keywordWeight, setKeywordWeight] = useState(0.5);
  const [vectorWeight, setVectorWeight] = useState(0.5);

  // Keybindings State
  const [keybindings, setKeybindings] = useState<Record<string, string>>(DEFAULT_KEYBINDINGS);
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [keybindingToast, setKeybindingToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setKeybindings(getActiveKeybindings());
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setKeybindings(getActiveKeybindings());
    };

    if (isOpen && mounted) {
      const timer = setTimeout(handleSync, 0);
      window.addEventListener('keybindings-updated', handleSync);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keybindings-updated', handleSync);
      };
    }
  }, [isOpen, mounted]);

  // Key combination listener when editing a keybinding
  useEffect(() => {
    if (!editingCommandId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return; // wait for full key combo
      }

      if (e.key === 'Escape') {
        setEditingCommandId(null);
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      let keyStr = e.key;
      if (keyStr === ' ') keyStr = 'Space';
      else if (keyStr.length === 1) keyStr = keyStr.toUpperCase();

      parts.push(keyStr);
      const newCombo = parts.join('+');

      setKeybindings(prev => {
        const next = { ...prev, [editingCommandId]: newCombo };
        if (typeof window !== 'undefined') {
          localStorage.setItem('offlineAi.keybindings', JSON.stringify(next));
          window.dispatchEvent(new Event('keybindings-updated'));
        }
        return next;
      });

      const cmdName = COMMAND_METADATA.find(c => c.command === editingCommandId)?.name || editingCommandId;
      setKeybindingToast(`Updated shortcut for ${cmdName} to ${newCombo}`);
      setTimeout(() => setKeybindingToast(null), 3000);
      setEditingCommandId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingCommandId]);

  const handleResetAllKeybindings = () => {
    setKeybindings(DEFAULT_KEYBINDINGS);
    if (typeof window !== 'undefined') {
      localStorage.setItem('offlineAi.keybindings', JSON.stringify(DEFAULT_KEYBINDINGS));
      window.dispatchEvent(new Event('keybindings-updated'));
    }
    setKeybindingToast('Reset all keybindings to defaults!');
    setTimeout(() => setKeybindingToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('security_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setRedactEmails(parsed.redactEmails ?? true);
          setMaskCreditCards(parsed.maskCreditCards ?? true);
          setHideApiKeys(parsed.hideApiKeys ?? true);
          setFilterPrivateIp(parsed.filterPrivateIp ?? true);
          setEnablePromptInjectionDefense(parsed.enablePromptInjectionDefense ?? true);
        }
        
        const savedRagSettings = localStorage.getItem('rag_settings');
        if (savedRagSettings) {
          const parsed = JSON.parse(savedRagSettings);
          setKeywordWeight(parsed.keywordWeight ?? 0.5);
          setVectorWeight(parsed.vectorWeight ?? 0.5);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('security_settings', JSON.stringify({
        redactEmails,
        maskCreditCards,
        hideApiKeys,
        filterPrivateIp,
        enablePromptInjectionDefense
      }));
    }
  }, [redactEmails, maskCreditCards, hideApiKeys, filterPrivateIp, enablePromptInjectionDefense]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag_settings', JSON.stringify({
        keywordWeight,
        vectorWeight
      }));
    }
  }, [keywordWeight, vectorWeight]);


  if (!isOpen) return null;

  const cacheCount = typeof window !== 'undefined' 
    ? Object.keys(localStorage).filter(k => k.startsWith('sem-cache-')).length 
    : 0;

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sem-cache-')) localStorage.removeItem(k);
      });
      setCacheResetTrigger(prev => prev + 1);
      setClearedToast(true);
      setTimeout(() => setClearedToast(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-zinc-950 p-6 rounded-2xl w-full ${(activeTab === 'security' || activeTab === 'models' || activeTab === 'finops' || activeTab === 'performance') ? 'max-w-4xl' : 'max-w-2xl'} shadow-2xl border border-gray-100 dark:border-zinc-900 flex flex-col max-h-[92vh] transition-all duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Settings & Security Center</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto pb-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('ollama')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'ollama' ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <span className="text-base">🦙</span>
            Ollama AI
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'models' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Database size={15} className="text-indigo-500" />
            📥 GGUF Models
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'security' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck size={15} className="text-emerald-500" />
            🛡️ Security Shield
          </button>
          <button 
            onClick={() => setActiveTab('finops')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'finops' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <DollarSign size={15} className="text-emerald-500" />
            📊 Token &amp; Budget
          </button>
          <button 
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'performance' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Activity size={15} className="text-indigo-500" />
            📊 Performance Profile
          </button>
          <button 
            onClick={() => setActiveTab('optimizer')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'optimizer' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Gauge size={15} />
            ⚡ VRAM &amp; Optimizer
          </button>
          <button 
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'rag' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            🔍 RAG Config
          </button>
          <button 
            onClick={() => setActiveTab('keybindings')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'keybindings' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Keyboard size={15} className="text-purple-500" />
            ⌨️ Keybindings
          </button>
          <button 
            onClick={() => setActiveTab('desktop')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'desktop' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package size={15} className="text-cyan-500" />
            📦 Desktop Release
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'diagnostics' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Activity size={15} className="text-emerald-500" />
            🎓 Onboarding & Help
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {activeTab === 'general' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Local Ollama / Tunnel URL
                </label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-zinc-100" 
                  placeholder="http://localhost:11434" 
                />
              </div>

              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-1.5">
                  <Database size={16} className="text-indigo-600 dark:text-indigo-400"/> 
                  Knowledge Base & Cache Management
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                  Locally indexed file chunks and prompt-response semantic vectors stored in browser IndexedDB/LocalStorage.
                </p>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 mb-3">
                  <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Cached Vector Pairs</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
                    {cacheCount} items
                  </span>
                </div>

                {clearedToast && (
                  <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium animate-in fade-in">
                    <Check size={14} className="text-emerald-600" />
                    Semantic cache cleared successfully!
                  </div>
                )}

                <button 
                  onClick={clearCache} 
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs p-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ⚡ Clear Semantic Cache
                </button>
              </div>
            </>
          )}
          
          {activeTab === 'security' && (
            <ComplianceShield />
          )}

          {activeTab === 'finops' && (
            <div className="rounded-xl overflow-hidden border border-slate-800 max-h-[600px] flex flex-col">
              <FinOpsDashboard />
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="rounded-xl overflow-hidden border border-slate-800 max-h-[600px] flex flex-col">
              <PerformanceDashboard />
            </div>
          )}

          {activeTab === 'optimizer' && (
            <VramControlPanel />
          )}

          {activeTab === 'rag' && (
            <div className="space-y-6">
              <RagIndexerDashboard />

              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">Hybrid Search Weights</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Adjust the balance between keyword matching (BM25) and semantic vector search (Dense) used in Reciprocal Rank Fusion.</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Keyword (BM25) Weight</label>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">{keywordWeight.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.05" 
                      value={keywordWeight} 
                      onChange={e => setKeywordWeight(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Vector (Dense) Weight</label>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">{vectorWeight.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.05" 
                      value={vectorWeight} 
                      onChange={e => setVectorWeight(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'keybindings' && (
            <div className="space-y-4 text-zinc-900 dark:text-zinc-200">
              <div className="flex justify-between items-center bg-purple-50/70 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-200 dark:border-purple-900/40">
                <div>
                  <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                    <Keyboard size={16} className="text-purple-600" /> Keyboard Shortcuts Matrix
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                    Customize hotkeys for system actions. Rebindings persist automatically in localStorage.
                  </p>
                </div>
                <button
                  onClick={handleResetAllKeybindings}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-900 hover:bg-purple-100 dark:hover:bg-zinc-800 border border-purple-300 dark:border-purple-800 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset Defaults</span>
                </button>
              </div>

              {keybindingToast && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in">
                  <Check size={15} className="text-emerald-600" />
                  <span>{keybindingToast}</span>
                </div>
              )}

              {editingCommandId && (
                <div className="p-3 bg-amber-500/10 border-2 border-amber-500 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 font-medium animate-pulse">
                  <div className="flex items-center gap-2">
                    <Keyboard size={16} className="text-amber-600 animate-bounce" />
                    <span>
                      Listening for new key combination for <strong>{COMMAND_METADATA.find(c => c.command === editingCommandId)?.name}</strong>...
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingCommandId(null)}
                    className="text-amber-700 hover:text-amber-900 font-bold underline"
                  >
                    Cancel (Esc)
                  </button>
                </div>
              )}

              <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 font-semibold border-b border-gray-200 dark:border-zinc-800">
                      <th className="p-3">Command / Action</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Active Shortcut</th>
                      <th className="p-3">Default</th>
                      <th className="p-3 text-right">Customize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                    {COMMAND_METADATA.map(cmd => {
                      const activeShortcut = keybindings[cmd.command] || DEFAULT_KEYBINDINGS[cmd.command] || '';
                      const defaultShortcut = DEFAULT_KEYBINDINGS[cmd.command] || '';
                      const isEditingThis = editingCommandId === cmd.command;

                      return (
                        <tr key={cmd.command} className={isEditingThis ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-gray-50/80 dark:hover:bg-zinc-900/30 transition-colors'}>
                          <td className="p-3">
                            <div className="font-bold text-gray-900 dark:text-zinc-100">{cmd.name}</div>
                            <div className="text-[11px] text-gray-500 dark:text-zinc-400">{cmd.description}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded border border-gray-200 dark:border-zinc-700 font-semibold">
                              {cmd.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded border shadow-xs ${
                              isEditingThis
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 border-amber-450'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40'
                            }`}>
                              {isEditingThis ? 'Press keys...' : activeShortcut}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400 dark:text-zinc-500 font-mono text-[11px]">
                            {defaultShortcut}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setEditingCommandId(cmd.command)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit2 size={12} />
                              <span>{isEditingThis ? 'Listening...' : '✏️ Edit'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'ollama' && (
            <div className="space-y-4">
              <OllamaSettingsTab />
            </div>
          )}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <DesktopBuildDashboard />
            </div>
          )}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <ModelCatalogStorefront />
            </div>
          )}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <DiagnosticsDashboard />
            </div>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-zinc-800">
          <button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm p-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
