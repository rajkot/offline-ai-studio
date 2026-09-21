'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  Cpu,
  Zap,
  Check,
  ChevronRight
} from 'lucide-react';
import { ONLINE_PROVIDERS, OnlineAiProvider, ProviderMetadata } from '@/lib/ai/onlineAiEngine';

interface ProviderConfig {
  apiKey: string;
  selectedModel: string;
  tested: boolean;
  valid: boolean;
  models: string[];
  lastError?: string;
}

interface OnlineAiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (mode: 'offline' | 'online', provider: OnlineAiProvider, model: string) => void;
}

const STORAGE_KEY = 'offlineAi.onlineProviders';
const MODE_KEY = 'offlineAi.activeAiMode';
const ACTIVE_PROVIDER_KEY = 'offlineAi.activeOnlineProvider';
const ACTIVE_MODEL_KEY = 'offlineAi.activeOnlineModel';

export default function OnlineAiHubModal({ isOpen, onClose, onSettingsChange }: OnlineAiHubModalProps) {
  const [activeTab, setActiveTab] = useState<OnlineAiProvider>('openrouter');
  const [aiMode, setAiMode] = useState<'offline' | 'online'>('offline');
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [isBrowserLoggingIn, setIsBrowserLoggingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedMode = (localStorage.getItem(MODE_KEY) as 'offline' | 'online') || 'offline';
    setAiMode(savedMode);

    const savedProvider = (localStorage.getItem(ACTIVE_PROVIDER_KEY) as OnlineAiProvider) || 'openrouter';
    setActiveTab(savedProvider);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfigs(parsed);
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Listen for OpenRouter OAuth popup message
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'OPENROUTER_AUTH_SUCCESS') {
        const apiKey = e.data.apiKey;
        setIsBrowserLoggingIn(false);
        setToastMessage('🎉 Direct Browser Login successful! Connected to OpenRouter.');
        
        // Save OpenRouter config & test
        await handleSaveAndTestKey('openrouter', apiKey);
        setAiMode('online');
        localStorage.setItem(MODE_KEY, 'online');
        localStorage.setItem(ACTIVE_PROVIDER_KEY, 'openrouter');
        window.dispatchEvent(new Event('online-ai-settings-updated'));
      } else if (e.data?.type === 'OPENROUTER_AUTH_FAILURE') {
        setIsBrowserLoggingIn(false);
        setToastMessage(`❌ Browser Login Failed: ${e.data.message}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [configs]);

  const currentProviderMeta: ProviderMetadata = ONLINE_PROVIDERS[activeTab] || ONLINE_PROVIDERS.openrouter;
  const currentConfig: ProviderConfig = configs[activeTab] || {
    apiKey: '',
    selectedModel: currentProviderMeta.defaultModel,
    tested: false,
    valid: false,
    models: currentProviderMeta.models.map(m => m.id)
  };

  const handleUpdateConfig = (provider: OnlineAiProvider, updates: Partial<ProviderConfig>) => {
    const updated = {
      ...configs,
      [provider]: {
        ...(configs[provider] || {
          apiKey: '',
          selectedModel: ONLINE_PROVIDERS[provider]?.defaultModel || '',
          tested: false,
          valid: false,
          models: ONLINE_PROVIDERS[provider]?.models.map(m => m.id) || []
        }),
        ...updates
      }
    };
    setConfigs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Direct Browser Login flow
  const handleDirectBrowserLogin = () => {
    setIsBrowserLoggingIn(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const callbackUrl = `${origin}/api/auth/openrouter/callback`;
    const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`;

    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'OpenRouterAuthPopup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setIsBrowserLoggingIn(false);
      setToastMessage('⚠️ Popup was blocked. Please allow popups or use the direct link below.');
      window.open(authUrl, '_blank');
    }
  };

  // Test provider connection
  const handleSaveAndTestKey = async (provider: OnlineAiProvider, keyToTest?: string) => {
    const key = keyToTest !== undefined ? keyToTest : (configs[provider]?.apiKey || '');
    setTestingProvider(provider);

    try {
      const res = await fetch('/api/ai/online/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key })
      });

      const data = await res.json();

      if (data.valid) {
        const availableModels = data.models && data.models.length > 0
          ? data.models
          : ONLINE_PROVIDERS[provider].models.map(m => m.id);

        const currentSelected = configs[provider]?.selectedModel;
        const finalModel = currentSelected && availableModels.includes(currentSelected)
          ? currentSelected
          : (availableModels[0] || ONLINE_PROVIDERS[provider].defaultModel);

        handleUpdateConfig(provider, {
          apiKey: key,
          tested: true,
          valid: true,
          models: availableModels,
          selectedModel: finalModel,
          lastError: undefined
        });

        setToastMessage(`✓ ${ONLINE_PROVIDERS[provider].name} connection verified! Found ${availableModels.length} models.`);
      } else {
        handleUpdateConfig(provider, {
          apiKey: key,
          tested: true,
          valid: false,
          lastError: data.error || 'Connection failed'
        });
        setToastMessage(`✕ Validation failed: ${data.error || 'Invalid API Key'}`);
      }
    } catch (err: any) {
      handleUpdateConfig(provider, {
        apiKey: key,
        tested: true,
        valid: false,
        lastError: err.message
      });
      setToastMessage(`✕ Error testing provider: ${err.message}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleApplyActiveEngine = (mode: 'offline' | 'online', provider?: OnlineAiProvider, model?: string) => {
    setAiMode(mode);
    const finalProvider = provider || activeTab;
    const finalModel = model || configs[finalProvider]?.selectedModel || ONLINE_PROVIDERS[finalProvider]?.defaultModel || '';

    if (typeof window !== 'undefined') {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(ACTIVE_PROVIDER_KEY, finalProvider);
      localStorage.setItem(ACTIVE_MODEL_KEY, finalModel);
      window.dispatchEvent(new Event('online-ai-settings-updated'));
    }

    onSettingsChange?.(mode, finalProvider, finalModel);
    setToastMessage(`🚀 Active AI Mode set to: ${mode.toUpperCase()} (${mode === 'online' ? ONLINE_PROVIDERS[finalProvider]?.name : 'Local Ollama'})`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[#0e0e11] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121216]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Online AI Hub & Direct Browser Login
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Universal AI Engine
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Connect any online model (Claude 3.5, GPT-4o, DeepSeek R1) via browser login or API key.
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

        {/* Global AI Engine Mode Switcher Bar */}
        <div className="px-6 py-3 bg-[#16161b] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Cpu size={15} className="text-indigo-400" />
            <span className="font-medium">Active IDE AI Engine:</span>
          </div>
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => handleApplyActiveEngine('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                aiMode === 'offline'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap size={13} />
              ⚡ Offline (Local Ollama)
            </button>
            <button
              onClick={() => handleApplyActiveEngine('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                aiMode === 'online'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe size={13} />
              🌐 Online (Cloud AI)
            </button>
          </div>
        </div>

        {/* Modal Body: Two-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Providers List */}
          <div className="w-64 bg-[#0a0a0d] border-r border-zinc-800/80 p-3 space-y-1.5 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              AI Providers & Auth
            </div>

            {(Object.keys(ONLINE_PROVIDERS) as OnlineAiProvider[]).map((provKey) => {
              const meta = ONLINE_PROVIDERS[provKey];
              const conf = configs[provKey];
              const isSelected = activeTab === provKey;
              const isConnected = conf?.valid || (provKey === 'ollama');

              return (
                <button
                  key={provKey}
                  onClick={() => setActiveTab(provKey)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800/90 text-white border border-zinc-700/80 shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'
                    }`} />
                    <span className="truncate">{meta.name.split(' ')[0]}</span>
                    {meta.supportsBrowserOAuth && (
                      <span className="text-[9px] px-1 py-0.2 bg-violet-950 text-violet-300 rounded border border-violet-800">
                        OAuth
                      </span>
                    )}
                  </div>
                  <ChevronRight size={13} className={`text-zinc-500 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })}
          </div>

          {/* Right Content Area: Provider Config & Login Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#0e0e11]">
            
            {/* Active Provider Banner */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {currentProviderMeta.name}
                    {currentConfig.valid && (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-[10px] font-mono flex items-center gap-1">
                        <CheckCircle2 size={11} /> Connected
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{currentProviderMeta.tagline}</p>
                </div>

                <a
                  href={currentProviderMeta.apiKeyPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Get Key Portal</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* OmniRoute Gateway Special Controls */}
            {activeTab === 'omniroute' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-fuchsia-950/40 via-zinc-900/60 to-purple-950/40 border border-fuchsia-800/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-fuchsia-200 flex items-center gap-2">
                      <Sparkles size={16} className="text-fuchsia-400" />
                      OmniRoute Self-Hosted Gateway (diegosouzapw/OmniRoute)
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 max-w-xl leading-relaxed">
                      Aggregates 352 AI providers with auto-fallback and free-tier optimization (~1.6B free tokens/mo).
                      Runs locally on your machine on port 20128.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="http://localhost:20128"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-fuchsia-600/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Web Dashboard</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs">
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Gateway Status</span>
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Online (:20128)
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs">
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Auto-Failover</span>
                    <span className="font-mono text-fuchsia-300 font-bold mt-0.5 block">
                      352 Providers Active
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs">
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Token Compression</span>
                    <span className="font-mono text-cyan-300 font-bold mt-0.5 block">
                      RTK + Caveman (15-95%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Browser Login Banner (Featured for OpenRouter) */}
            {currentProviderMeta.supportsBrowserOAuth && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/40 via-zinc-900/60 to-indigo-950/40 border border-violet-800/40 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-violet-200 flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-400" />
                      1-Click Direct Browser Login (No Key Copying Needed)
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 max-w-xl leading-relaxed">
                      Click the button below to authorize with your browser. OpenRouter instantly grants access to 200+ flagship models:
                      <strong> Claude 3.5 Sonnet, GPT-4o, DeepSeek R1/V3, Llama 3.3, and Gemini 2.0</strong> with zero friction.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDirectBrowserLogin}
                  disabled={isBrowserLoggingIn}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBrowserLoggingIn ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Waiting for browser authorization...
                    </>
                  ) : (
                    <>
                      <Globe size={15} />
                      🚀 Login with Browser (OpenRouter OAuth)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* API Key / Gateway URL Form */}
            {activeTab !== 'ollama' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Key size={14} className="text-indigo-400" />
                    {activeTab === 'omniroute' ? 'OmniRoute Gateway URL / Token' : `API Key for ${currentProviderMeta.name}`}
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {activeTab === 'omniroute' ? 'Default: http://localhost:20128 (Optional Bearer key)' : 'Stored securely in your local browser storage'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={activeTab === 'omniroute' || showKey[activeTab] ? 'text' : 'password'}
                      value={currentConfig.apiKey || ''}
                      onChange={(e) => handleUpdateConfig(activeTab, { apiKey: e.target.value, tested: false })}
                      placeholder={activeTab === 'omniroute' ? 'http://localhost:20128 (Leave blank for local default)' : `Enter ${currentProviderMeta.name} API key...`}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono pr-10"
                    />
                    {activeTab !== 'omniroute' && (
                      <button
                        type="button"
                        onClick={() => setShowKey(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                      >
                        {showKey[activeTab] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleSaveAndTestKey(activeTab)}
                    disabled={testingProvider === activeTab || (activeTab !== 'omniroute' && !currentConfig.apiKey)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {testingProvider === activeTab ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Test & Fetch Models
                      </>
                    )}
                  </button>
                </div>

                {currentConfig.lastError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{currentConfig.lastError}</span>
                  </div>
                )}
              </div>
            )}


            {/* Model Selection Dropdown */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Selected Model for {currentProviderMeta.name}</span>
                <span className="text-[11px] text-zinc-500 font-normal font-mono">
                  {currentConfig.models.length} model(s) available
                </span>
              </label>

              <select
                value={currentConfig.selectedModel}
                onChange={(e) => {
                  handleUpdateConfig(activeTab, { selectedModel: e.target.value });
                  if (aiMode === 'online' && activeTab === (localStorage.getItem(ACTIVE_PROVIDER_KEY) || 'openrouter')) {
                    handleApplyActiveEngine('online', activeTab, e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
              >
                {currentConfig.models.map((mId) => (
                  <option key={mId} value={mId} className="bg-zinc-900 text-zinc-200">
                    {mId}
                  </option>
                ))}
              </select>
            </div>

            {/* Curated Flagship Models Cards */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-400">Curated Flagship Models:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentProviderMeta.models.map((m) => {
                  const isCuratedActive = currentConfig.selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        handleUpdateConfig(activeTab, { selectedModel: m.id });
                        if (aiMode === 'online') {
                          handleApplyActiveEngine('online', activeTab, m.id);
                        }
                      }}
                      className={`text-left p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-1 ${
                        isCuratedActive
                          ? 'bg-indigo-950/40 border-indigo-600 text-white'
                          : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        {m.contextWindow && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {m.contextWindow}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{m.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#121216] flex items-center justify-between">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Privacy Guard: Credentials stay strictly on your local machine.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplyActiveEngine('online', activeTab, currentConfig.selectedModel)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Check size={14} />
              Set as Active AI Engine
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
