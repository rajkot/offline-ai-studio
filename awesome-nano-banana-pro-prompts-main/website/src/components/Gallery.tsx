'use client';

import { useState, useEffect, useMemo } from 'react';
import { Prompt, FilterOptions } from '@/types/prompt';
import { fetchPrompts, filterPrompts, getUniqueCategories, getUniqueStyles, getUniqueAuthors } from '@/lib/prompts';
import Header from './Header';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import PromptCard from './PromptCard';

export default function Gallery() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    category: null,
    style: null,
    author: null,
    featuredOnly: false,
    sortBy: 'newest',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPrompts();
        if (!cancelled) {
          setPrompts(data.prompts);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load prompts. Please try again.');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => getUniqueCategories(prompts), [prompts]);
  const styles = useMemo(() => getUniqueStyles(prompts), [prompts]);
  const authors = useMemo(() => getUniqueAuthors(prompts), [prompts]);

  const filtered = useMemo(() => filterPrompts(prompts, filters), [prompts, filters]);

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center glass rounded-2xl p-8">
          <span className="text-5xl">😢</span>
          <h2 className="text-xl font-bold text-white mt-4">Something went wrong</h2>
          <p className="text-[var(--color-text-secondary)] mt-2">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-[var(--color-accent)] text-white rounded-xl font-semibold">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl animate-float block mb-4">🍌</span>
          <div className="w-16 h-1 bg-[var(--color-accent)] rounded-full mx-auto animate-pulse-glow" />
          <p className="text-[var(--color-text-secondary)] mt-4 text-sm">Loading 2,500 prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header
        totalPrompts={prompts.length}
        totalCategories={categories.length}
        totalAuthors={authors.length}
      />

      {/* Sticky search bar */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SearchBar
            value={filters.searchQuery}
            onChange={v => updateFilter('searchQuery', v)}
            totalResults={filtered.length}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <FilterPanel
              categories={categories}
              styles={styles}
              authors={authors}
              selectedCategory={filters.category}
              selectedStyle={filters.style}
              selectedAuthor={filters.author}
              featuredOnly={filters.featuredOnly}
              sortBy={filters.sortBy}
              onCategoryChange={c => updateFilter('category', c)}
              onStyleChange={s => updateFilter('style', s)}
              onAuthorChange={a => updateFilter('author', a)}
              onFeaturedChange={f => updateFilter('featuredOnly', f)}
              onSortChange={s => updateFilter('sortBy', s)}
              totalResults={filtered.length}
            />
          </aside>

          {/* Gallery grid */}
          <main className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4">🔍</span>
                <h3 className="text-lg font-bold text-white">No prompts found</h3>
                <p className="text-[var(--color-text-secondary)] mt-2 max-w-sm">
                  Try adjusting your search query or filters. There are {prompts.length.toLocaleString()} prompts to explore!
                </p>
                <button
                  onClick={() => setFilters({ searchQuery: '', category: null, style: null, author: null, featuredOnly: false, sortBy: 'newest' })}
                  className="mt-4 px-5 py-2 bg-[var(--color-accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-accent)]/80 transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Showing <span className="text-white font-semibold">{filtered.length.toLocaleString()}</span> of <span className="text-white font-semibold">{prompts.length.toLocaleString()}</span> prompts
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((prompt, i) => (
                    <div key={prompt.id} className="animate-fade-up" style={{ animationDelay: `${(i % 20) * 30}ms` }}>
                      <PromptCard prompt={prompt} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center">
        <p className="text-xs text-[var(--color-text-secondary)]">
          🍌 Nano Banana Pro Prompt Gallery · {prompts.length.toLocaleString()} prompts · Built with Next.js
        </p>
      </footer>
    </div>
  );
}
