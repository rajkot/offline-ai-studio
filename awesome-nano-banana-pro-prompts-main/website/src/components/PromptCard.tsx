'use client';

import { Prompt } from '@/types/prompt';
import { useState, useCallback, useRef } from 'react';

interface PromptCardProps {
  prompt: Prompt;
  onFavorite?: (id: number) => void;
}

const GRADIENT_PALETTES = [
  ['#e94560', '#ff6b6b'],
  ['#0f3460', '#16213e'],
  ['#ffa726', '#ff7043'],
  ['#42a5f5', '#7c4dff'],
  ['#66bb6a', '#26a69a'],
  ['#ec407a', '#ab47bc'],
];

export default function PromptCard({ prompt, onFavorite }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const gradient = GRADIENT_PALETTES[prompt.id % GRADIENT_PALETTES.length];

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      showToast('Copied! 📋');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt.content;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied! 📋');
    }
  }, [prompt.content, showToast]);

  const toggleFavorite = useCallback(() => {
    setFavorited(v => !v);
    onFavorite?.(prompt.id);
  }, [prompt.id, onFavorite]);

  const chars = prompt.content.length;

  return (
    <article
      className="relative group/card glass rounded-2xl overflow-hidden flex flex-col card-hover"
      aria-label={`Prompt: ${prompt.title}`}
    >
      {/* Toast */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-[var(--color-accent)] text-white text-xs px-4 py-2 rounded-full shadow-lg animate-fade-up pointer-events-none">
          {toast}
        </div>
      )}

      {/* Image section */}
      <div className="relative h-44 overflow-hidden">
        {imgError ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
          >
            <span className="text-4xl">🍌</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{prompt.category}</span>
          </div>
        ) : (
          <img
            src={prompt.image}
            alt={prompt.title}
            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        )}

        {/* Category badge */}
        <span className="absolute top-3 right-3 bg-[var(--color-accent)] text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          {prompt.category}
        </span>

        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-sm hover:bg-black/60 transition-all"
          aria-label={favorited ? 'Unfavorite' : 'Favorite'}
        >
          {favorited ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-sm mb-2 line-clamp-2 leading-snug text-white">
          {prompt.title}
        </h3>

        <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2 leading-relaxed">
          {prompt.description || prompt.content.slice(0, 150)}
        </p>

        {/* Prompt content (expandable) */}
        {expanded && (
          <div className="mb-3 p-3 rounded-xl bg-[var(--color-surface)] border border-white/5 text-xs text-[var(--color-text-secondary)] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
            {prompt.content}
          </div>
        )}

        {/* Meta row */}
        <div className="mt-auto flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[8px]">👤</span>
            {prompt.author || 'Unknown'}
          </span>
          <span>{chars.toLocaleString()} chars</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-white text-xs font-semibold transition-all active:scale-95"
          >
            Copy Prompt
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] text-xs transition-all"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>
    </article>
  );
}
