'use client';

import { useCallback } from 'react';

type SortBy = 'newest' | 'oldest' | 'title' | 'author';

interface FilterPanelProps {
  categories: string[];
  styles: string[];
  authors: string[];
  selectedCategory: string | null;
  selectedStyle: string | null;
  selectedAuthor: string | null;
  featuredOnly: boolean;
  sortBy: SortBy;
  onCategoryChange: (c: string | null) => void;
  onStyleChange: (s: string | null) => void;
  onAuthorChange: (a: string | null) => void;
  onFeaturedChange: (f: boolean) => void;
  onSortChange: (s: SortBy) => void;
  totalResults: number;
}

function FilterChip({ label, active, onClick, color = 'var(--color-accent)' }: {
  label: string; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all border whitespace-nowrap"
      style={{
        background: active ? color : 'transparent',
        borderColor: active ? color : 'rgba(255,255,255,0.1)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, items, selected, onChange, color }: {
  title: string; items: string[]; selected: string | null;
  onChange: (v: string | null) => void; color?: string;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
        {items.slice(0, 30).map(item => (
          <FilterChip
            key={item}
            label={item}
            active={selected === item}
            onClick={() => onChange(selected === item ? null : item)}
            color={color}
          />
        ))}
        {items.length > 30 && (
          <span className="text-[10px] text-[var(--color-text-secondary)] self-center">+{items.length - 30} more</span>
        )}
      </div>
    </div>
  );
}

function SortButton({ value, label, active, onClick }: {
  value: SortBy; label: string; active: boolean; onClick: (v: SortBy) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all border"
      style={{
        background: active ? 'var(--color-accent)' : 'transparent',
        borderColor: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

export default function FilterPanel({
  categories, styles, authors,
  selectedCategory, selectedStyle, selectedAuthor,
  featuredOnly, sortBy,
  onCategoryChange, onStyleChange, onAuthorChange,
  onFeaturedChange, onSortChange,
  totalResults,
}: FilterPanelProps) {
  const hasActive = selectedCategory || selectedStyle || selectedAuthor || featuredOnly;

  const clearAll = useCallback(() => {
    onCategoryChange(null);
    onStyleChange(null);
    onAuthorChange(null);
    onFeaturedChange(false);
  }, [onCategoryChange, onStyleChange, onAuthorChange, onFeaturedChange]);

  return (
    <div className="glass rounded-2xl p-5 sticky top-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-sm text-white">🔍 Filters</h3>
        <div className="flex gap-2">
          {hasActive && (
            <button onClick={clearAll} className="text-[10px] text-[var(--color-accent)] hover:underline font-medium">Clear</button>
          )}
          <span className="text-[10px] text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full">{totalResults}</span>
        </div>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Sort By</h4>
        <div className="flex flex-wrap gap-2">
          <SortButton value="newest" label="🕐 Newest" active={sortBy === 'newest'} onClick={onSortChange} />
          <SortButton value="oldest" label="📜 Oldest" active={sortBy === 'oldest'} onClick={onSortChange} />
          <SortButton value="title" label="🔤 Title" active={sortBy === 'title'} onClick={onSortChange} />
          <SortButton value="author" label="👤 Author" active={sortBy === 'author'} onClick={onSortChange} />
        </div>
      </div>

      {/* Featured toggle */}
      <label className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
        <input type="checkbox" checked={featuredOnly} onChange={e => onFeaturedChange(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-accent)] rounded" />
        <span className="text-sm text-[var(--color-text-secondary)]">⭐ Featured Only</span>
      </label>

      {categories.length > 0 && <FilterSection title="📂 Categories" items={categories} selected={selectedCategory} onChange={onCategoryChange} color="#e94560" />}
      {styles.length > 0 && <FilterSection title="🎨 Styles" items={styles} selected={selectedStyle} onChange={onStyleChange} color="#7c4dff" />}
      {authors.length > 0 && <FilterSection title="✍️ Authors" items={authors} selected={selectedAuthor} onChange={onAuthorChange} color="#42a5f5" />}
    </div>
  );
}
