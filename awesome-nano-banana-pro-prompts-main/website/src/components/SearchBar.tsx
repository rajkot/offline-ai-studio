'use client';

import { useCallback, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  totalResults: number;
}

export default function SearchBar({ value, onChange, totalResults }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="relative w-full">
      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--color-accent)] to-[#7c4dff] opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-500" />
        
        <div className="relative flex items-center">
          <svg className="absolute left-5 w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search 2,500 prompts by title, description, content..."
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full pl-14 pr-28 py-4 glass rounded-2xl text-white placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)]/50 border border-transparent focus:border-[var(--color-accent)]/30 transition-all text-sm"
          />

          <div className="absolute right-3 flex items-center gap-2">
            {value && (
              <button onClick={handleClear} className="p-1.5 rounded-full hover:bg-white/10 text-[var(--color-text-secondary)] transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <span className="text-xs text-[var(--color-text-secondary)] bg-white/5 px-3 py-1.5 rounded-full font-medium min-w-[60px] text-center">
              {totalResults.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
