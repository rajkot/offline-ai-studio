'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Search,
  Copy,
  Check,
  ExternalLink,
  Code2,
  MessageSquare,
  Sliders,
  Layers,
  Database,
  RefreshCw,
  X,
  Flame,
  Wand2,
  Eye,
  Info
} from 'lucide-react';
import { NanoBananaPrompt, EnrichmentOptions } from '@/lib/ai/nanoBananaEngine';

interface NanoBananaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoEditor?: (codeSnippet: string) => void;
  onSendToChat?: (promptText: string) => void;
}

const GRADIENTS = [
  ['#e94560', '#ff6b6b'],
  ['#0f3460', '#16213e'],
  ['#ffa726', '#ff7043'],
  ['#42a5f5', '#7c4dff'],
  ['#66bb6a', '#26a69a'],
  ['#ec407a', '#ab47bc'],
];

export const NanoBananaStudioModal: React.FC<NanoBananaStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertIntoEditor,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'live-html' | 'remixer' | 'dataset'>('grid');
  const [prompts, setPrompts] = useState<NanoBananaPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<NanoBananaPrompt | null>(null);

  // Remixer state
  const [remixBase, setRemixBase] = useState('');
  const [remixTheme, setRemixTheme] = useState('Cyberpunk Neon');
  const [remixOptions, setRemixOptions] = useState<EnrichmentOptions>({
    aspectRatio: '16:9',
    stylePreset: 'photorealistic',
    lighting: 'volumetric-fog',
    cameraAngle: 'wide-angle',
    negativePromptEnabled: true,
  });
  const [remixedResult, setRemixedResult] = useState<{ enriched: string; negative?: string } | null>(null);

  // Load prompts
  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/nano-banana-prompts.json');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error('[NanoBananaStudioModal] Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && prompts.length === 0) {
      loadPrompts();
    }
  }, [isOpen, prompts.length, loadPrompts]);

  // Handle postMessage from embedded live HTML iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'INSERT_IN_EDITOR' && e.data.prompt) {
        onInsertIntoEditor?.(e.data.prompt.content);
      } else if (e.data.type === 'INSERT_IN_CHAT' && e.data.prompt) {
        onSendToChat?.(e.data.prompt.content);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onInsertIntoEditor, onSendToChat]);

  // Filtering
  const categories = useMemo(() => {
    const map: Record<string, number> = { All: prompts.length };
    prompts.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return prompts.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    });
  }, [prompts, searchQuery, selectedCategory]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const executeEnrichment = async () => {
    if (!remixBase.trim()) return;
    try {
      const res = await fetch('/api/nano-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich',
          content: remixBase,
          options: remixOptions,
        }),
      });
      const data = await res.json();
      if (data.success && data.enrichment) {
        setRemixedResult({
          enriched: data.enrichment.enrichedPrompt,
          negative: data.enrichment.negativePrompt,
        });
      }
    } catch (err) {
      console.error('Enrichment failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0c0d12] border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🍌</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-amber-200 to-orange-400 bg-clip-text text-transparent">
                  Nano Banana Pro AI Prompt Studio
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  2,500 Curated Prompts
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  100% Offline Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Explore, search, copy, remix, and inject 2,500 state-of-the-art AI image prompts directly into your IDE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher tabs */}
            <div className="flex bg-zinc-900 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'grid'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Prompt Grid
              </button>
              <button
                onClick={() => setActiveTab('live-html')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'live-html'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live HTML Gallery
              </button>
              <button
                onClick={() => setActiveTab('remixer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'remixer'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Prompt Remixer
              </button>
              <button
                onClick={() => setActiveTab('dataset')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'dataset'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Dataset Architecture
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'grid' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filter and Search Bar */}
              <div className="p-4 border-b border-white/5 bg-zinc-950/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 2,500 prompts (e.g. cyberpunk, watercolor, portrait, logo, 3d)..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {Object.entries(categories).map(([cat, count]) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <span className="text-5xl animate-bounce">🍌</span>
                    <p className="text-sm text-zinc-400">Loading 2,500 prompts database...</p>
                  </div>
                ) : filteredPrompts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="text-4xl mb-2">🔍</span>
                    <p className="text-base font-semibold text-zinc-300">No prompts found</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      No results matching "{searchQuery}" in {selectedCategory}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPrompts.slice(0, 150).map((prompt) => {
                      const grad = GRADIENTS[prompt.id % GRADIENTS.length];
                      return (
                        <div
                          key={prompt.id}
                          className="group relative bg-zinc-900/60 border border-white/10 hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
                        >
                          {/* Image preview with fallback */}
                          <div className="relative h-40 bg-zinc-950 overflow-hidden">
                            <img
                              src={prompt.image}
                              alt={prompt.title}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const fb = (e.target as HTMLElement).nextElementSibling;
                                if (fb) (fb as HTMLElement).style.display = 'flex';
                              }}
                            />
                            <div
                              className="w-full h-full hidden flex-col items-center justify-center gap-1 text-white font-bold"
                              style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                            >
                              <span className="text-3xl">🍌</span>
                              <span className="text-[10px] uppercase tracking-wider text-white/80">
                                {prompt.category}
                              </span>
                            </div>
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-black/60 backdrop-blur-md text-amber-400 border border-white/10">
                              {prompt.category}
                            </span>
                            <span className="absolute bottom-2 left-2 text-[10px] text-zinc-400 font-mono bg-black/50 px-2 py-0.5 rounded">
                              #{prompt.id} • {prompt.content.length} chars
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col gap-2">
                            <h3 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {prompt.title || 'Untitled Prompt'}
                            </h3>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {prompt.description}
                            </p>
                            <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-[10px] text-zinc-300 font-mono line-clamp-3 select-all">
                              {prompt.content}
                            </div>

                            {/* Actions */}
                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-1.5">
                              <button
                                onClick={() => setSelectedPrompt(prompt)}
                                className="px-2 py-1 text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center gap-1 transition-all"
                                title="Inspect details"
                              >
                                <Eye className="w-3 h-3" />
                                Inspect
                              </button>

                              <div className="flex items-center gap-1">
                                {onInsertIntoEditor && (
                                  <button
                                    onClick={() => onInsertIntoEditor(prompt.content)}
                                    className="px-2 py-1 text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center gap-1 transition-all"
                                    title="Insert in active Monaco Editor file"
                                  >
                                    <Code2 className="w-3 h-3" />
                                    Editor
                                  </button>
                                )}

                                {onSendToChat && (
                                  <button
                                    onClick={() => onSendToChat(prompt.content)}
                                    className="px-2 py-1 text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center gap-1 transition-all"
                                    title="Send to AI Assistant prompt composer"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    Chat
                                  </button>
                                )}

                                <button
                                  onClick={() => handleCopy(prompt.id, prompt.content)}
                                  className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded flex items-center gap-1 transition-all shadow-sm shadow-amber-500/20"
                                >
                                  {copiedId === prompt.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-950" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'live-html' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-black">
              <div className="px-4 py-2 bg-zinc-950 border-b border-white/10 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Standalone Web Gallery Frame (`/nano-banana/index.html`)</span>
                </div>
                <a
                  href="/nano-banana/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-amber-400 hover:underline"
                >
                  Open in New Tab <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <iframe
                src="/nano-banana/index.html"
                title="Nano Banana Pro Live Web Gallery"
                className="w-full flex-1 border-0"
              />
            </div>
          )}

          {activeTab === 'remixer' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                  <Wand2 className="w-4 h-4" />
                  AI Prompt Remixer & Parametric Enricher
                </div>
                <p className="text-xs text-zinc-300">
                  Transform raw or short prompts into cinematic, hyper-detailed image generation descriptions with
                  negative prompts, camera descriptors, lighting parameters, and aspect ratios.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">Base Prompt or Subject</label>
                <textarea
                  rows={3}
                  value={remixBase}
                  onChange={(e) => setRemixBase(e.target.value)}
                  placeholder="Enter a prompt or concept (e.g. A solitary cyberpunk hacker looking at a futuristic neon Tokyo skyline in rain)..."
                  className="w-full p-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Style Preset</label>
                  <select
                    value={remixOptions.stylePreset}
                    onChange={(e) =>
                      setRemixOptions((prev) => ({
                        ...prev,
                        stylePreset: e.target.value as any,
                      }))
                    }
                    className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="photorealistic">Photorealistic Hasselblad 8k</option>
                    <option value="cyberpunk">Cyberpunk Neon Octane Render</option>
                    <option value="anime">Anime Makoto Shinkai & Ghibli</option>
                    <option value="cinematic">Cinematic 35mm Arri Alexa</option>
                    <option value="oil-painting">Classical Master Oil Painting</option>
                    <option value="concept-art">Unreal Engine 5 Concept Art</option>
                    <option value="3d-render">Blender 4.0 Cycles 3D</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Lighting</label>
                  <select
                    value={remixOptions.lighting}
                    onChange={(e) =>
                      setRemixOptions((prev) => ({
                        ...prev,
                        lighting: e.target.value as any,
                      }))
                    }
                    className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white"
                  >
                    <option value="golden-hour">Warm Golden Hour</option>
                    <option value="volumetric-fog">Volumetric Rays & Fog</option>
                    <option value="neon-glow">Neon Edge Glow & Bloom</option>
                    <option value="studio-dramatic">Studio 3-Point Dramatic</option>
                    <option value="bioluminescent">Ethereal Bioluminescence</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Aspect Ratio</label>
                  <select
                    value={remixOptions.aspectRatio}
                    onChange={(e) =>
                      setRemixOptions((prev) => ({
                        ...prev,
                        aspectRatio: e.target.value as any,
                      }))
                    }
                    className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white font-mono"
                  >
                    <option value="16:9">16:9 (Landscape Cinematic)</option>
                    <option value="9:16">9:16 (Vertical Portrait)</option>
                    <option value="1:1">1:1 (Square Album)</option>
                    <option value="4:3">4:3 (Classic Academy)</option>
                    <option value="21:9">21:9 (Ultrawide Anamorphic)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remixOptions.negativePromptEnabled}
                    onChange={(e) =>
                      setRemixOptions((prev) => ({
                        ...prev,
                        negativePromptEnabled: e.target.checked,
                      }))
                    }
                    className="rounded bg-zinc-900 border-white/20 text-amber-500"
                  />
                  Generate Anti-Artifacts Negative Prompt
                </label>

                <button
                  onClick={executeEnrichment}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Synthesize Enriched Prompt
                </button>
              </div>

              {remixedResult && (
                <div className="flex flex-col gap-4 mt-2 p-5 bg-zinc-950 border border-amber-500/30 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Enriched Positive Prompt:
                    </span>
                    <pre className="mt-2 p-3 bg-black/60 rounded-lg text-xs text-zinc-200 font-mono whitespace-pre-wrap select-all border border-white/5">
                      {remixedResult.enriched}
                    </pre>
                  </div>

                  {remixedResult.negative && (
                    <div>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                        Negative Prompt:
                      </span>
                      <pre className="mt-2 p-3 bg-black/60 rounded-lg text-xs text-rose-200/80 font-mono whitespace-pre-wrap select-all border border-white/5">
                        {remixedResult.negative}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    {onInsertIntoEditor && (
                      <button
                        onClick={() => onInsertIntoEditor(remixedResult.enriched)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded-lg flex items-center gap-1.5"
                      >
                        <Code2 className="w-3.5 h-3.5" /> Insert in Editor
                      </button>
                    )}
                    {onSendToChat && (
                      <button
                        onClick={() => onSendToChat(remixedResult.enriched)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded-lg flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Send to Chat
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(999999, remixedResult.enriched)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black rounded-lg flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dataset' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full flex flex-col gap-6 text-zinc-300 text-xs leading-relaxed">
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-bold text-amber-400 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Nano Banana Pro Prompt Dataset Specifications
                </h3>
                <p className="text-zinc-400 mb-4">
                  The dataset contains 2,500 highly specific, professionally formatted AI image generation prompts
                  scraped, structured, and cleaned into JSON & JSONL formats.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-xl font-bold text-white">2,500</div>
                    <div className="text-zinc-500">Total Prompts</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-xl font-bold text-amber-400">3.42 MB</div>
                    <div className="text-zinc-500">Dataset JSON Size</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-xl font-bold text-emerald-400">4</div>
                    <div className="text-zinc-500">Curated Categories</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-xl font-bold text-indigo-400">100%</div>
                    <div className="text-zinc-500">Air-Gapped & Local</div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-bold text-white mb-3">Included Scrapers & Source Files:</h4>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    <span className="text-amber-300 font-mono">awesome-nano-banana-pro-prompts-main/nano-banana-prompts.json</span>{' '}
                    — Master 2,500 prompt collection.
                  </li>
                  <li>
                    <span className="text-amber-300 font-mono">parallel-scraper.js / enhanced-scraper.js</span>{' '}
                    — High-concurrency scraper and pagination engine.
                  </li>
                  <li>
                    <span className="text-amber-300 font-mono">rsc-parser.js</span> — React Server Component
                    flight data stream parser.
                  </li>
                  <li>
                    <span className="text-amber-300 font-mono">website/out/</span> — Pre-compiled static Next.js
                    export with dark glassmorphism web gallery.
                  </li>
                  <li>
                    <span className="text-amber-300 font-mono">lib/ai/nanoBananaEngine.ts</span> — IDE-integrated
                    in-memory search, BM25 filtering, and parametric prompt synthesizer.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-zinc-950 border border-white/15 rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 text-zinc-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {selectedPrompt.category}
                </span>
                <h3 className="text-base font-bold mt-1 text-white">{selectedPrompt.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPrompt(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-48 rounded-xl overflow-hidden bg-black border border-white/10">
              <img
                src={selectedPrompt.image}
                alt={selectedPrompt.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold text-zinc-400 mb-1">Full Prompt:</div>
              <pre className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-xs font-mono text-zinc-200 whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                {selectedPrompt.content}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              {onInsertIntoEditor && (
                <button
                  onClick={() => {
                    onInsertIntoEditor(selectedPrompt.content);
                    setSelectedPrompt(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white rounded-lg flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" /> Insert in Editor
                </button>
              )}
              {onSendToChat && (
                <button
                  onClick={() => {
                    onSendToChat(selectedPrompt.content);
                    setSelectedPrompt(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white rounded-lg flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Send to Chat
                </button>
              )}
              <button
                onClick={() => handleCopy(selectedPrompt.id, selectedPrompt.content)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
