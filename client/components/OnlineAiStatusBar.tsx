'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { ONLINE_PROVIDERS, OnlineAiProvider } from '@/lib/ai/onlineAiEngine';

interface OnlineAiStatusBarProps {
  onOpenHub: () => void;
}

export default function OnlineAiStatusBar({ onOpenHub }: OnlineAiStatusBarProps) {
  const [aiMode, setAiMode] = useState<'offline' | 'online'>('offline');
  const [activeProvider, setActiveProvider] = useState<OnlineAiProvider>('openrouter');
  const [activeModel, setActiveModel] = useState<string>('anthropic/claude-3.5-sonnet');
  const [hasValidKey, setHasValidKey] = useState<boolean>(false);

  const syncState = () => {
    if (typeof window === 'undefined') return;
    const mode = (localStorage.getItem('offlineAi.activeAiMode') as 'offline' | 'online') || 'offline';
    setAiMode(mode);

    const prov = (localStorage.getItem('offlineAi.activeOnlineProvider') as OnlineAiProvider) || 'openrouter';
    setActiveProvider(prov);

    try {
      const configs = JSON.parse(localStorage.getItem('offlineAi.onlineProviders') || '{}');
      const conf = configs[prov];
      if (conf) {
        setActiveModel(conf.selectedModel || ONLINE_PROVIDERS[prov]?.defaultModel || '');
        setHasValidKey(Boolean(conf.valid || conf.apiKey));
      } else {
        setActiveModel(ONLINE_PROVIDERS[prov]?.defaultModel || '');
        setHasValidKey(false);
      }
    } catch {
      setActiveModel(ONLINE_PROVIDERS[prov]?.defaultModel || '');
      setHasValidKey(false);
    }
  };

  useEffect(() => {
    syncState();
    window.addEventListener('online-ai-settings-updated', syncState);
    return () => window.removeEventListener('online-ai-settings-updated', syncState);
  }, []);

  const providerMeta = ONLINE_PROVIDERS[activeProvider] || ONLINE_PROVIDERS.openrouter;
  const shortModel = activeModel.includes('/') ? activeModel.split('/')[1] : activeModel;

  return (
    <button
      onClick={onOpenHub}
      title="Configure Online AI Models (Claude, GPT-4o, DeepSeek) & Direct Browser Login"
      className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
        aiMode === 'online'
          ? 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border-indigo-700/80 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
          : 'bg-[#18181b] hover:bg-[#222227] text-zinc-300 border-[#27272a] hover:border-zinc-700'
      }`}
    >
      {aiMode === 'online' ? (
        <>
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <Globe size={12} className="text-indigo-400" />
          <span className="font-semibold text-white truncate max-w-[120px]">
            {shortModel || providerMeta.name.split(' ')[0]}
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 bg-indigo-900/60 rounded text-indigo-300">
            Online
          </span>
        </>
      ) : (
        <>
          <Globe size={12} className="text-zinc-400" />
          <span className="text-zinc-300">Online AI</span>
          {hasValidKey ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Key Configured" />
          ) : (
            <span className="text-[9px] px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded">
              Connect
            </span>
          )}
        </>
      )}
      <ChevronDown size={11} className="text-zinc-500 ml-0.5" />
    </button>
  );
}
