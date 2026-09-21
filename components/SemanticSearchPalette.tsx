'use client';
// components/SemanticSearchPalette.tsx
// Natural Language Semantic Codebase Search — Ctrl+Shift+F
// Uses local vector embeddings + BM25 fusion, no cloud required

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number;
  matchType: 'semantic' | 'bm25' | 'hybrid';
  matchedTerms: string[];
  explanation?: string;
}

interface SemanticSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceFiles: { path: string; content: string }[];
  onJumpToResult: (filePath: string, line: number) => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function ScorePill({ score, type }: { score: number; type: string }) {
  const pct = Math.round(score * 100);
  const color = type === 'hybrid' ? '#a78bfa' : type === 'semantic' ? '#22d3ee' : '#fbbf24';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 36, height: 6, borderRadius: 3, background: 'rgba(100,116,139,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{ height: '100%', width: `${Math.min(pct * 3, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>{score.toFixed(3)}</span>
    </div>
  );
}

function MatchBadge({ type }: { type: string }) {
  const colors: Record<string, string> = { hybrid: '#a78bfa', semantic: '#22d3ee', bm25: '#fbbf24' };
  const labels: Record<string, string> = { hybrid: '⚡ Hybrid', semantic: '🧠 Semantic', bm25: '🔤 BM25' };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, background: `${colors[type] || '#64748b'}22`,
      color: colors[type] || '#64748b', border: `1px solid ${colors[type] || '#64748b'}44`,
      borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5, textTransform: 'uppercase',
    }}>{labels[type] || type}</span>
  );
}

function SnippetHighlight({ snippet, terms }: { snippet: string; terms: string[] }) {
  if (terms.length === 0) {
    return <pre style={{ margin: 0, fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'hidden' }}>{snippet.slice(0, 350)}</pre>;
  }

  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = snippet.slice(0, 350).split(pattern);

  return (
    <pre style={{ margin: 0, fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'hidden' }}>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} style={{ background: 'rgba(251,191,36,0.25)', color: '#fbbf24', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </pre>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function SemanticSearchPalette({ isOpen, onClose, workspaceFiles, onJumpToResult }: SemanticSearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [explanation, setExplanation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [topK, setTopK] = useState(20);
  const [explain, setExplain] = useState(false);
  const [queryMs, setQueryMs] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setResults([]);
      setExplanation('');
      setErrorMsg('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || workspaceFiles.length === 0) { setResults([]); return; }
    setIsSearching(true);
    setErrorMsg('');
    setExplanation('');

    try {
      const resp = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), files: workspaceFiles, topK, explain }),
      });
      const data = await resp.json();
      if (data.success) {
        setResults(data.results || []);
        setExplanation(data.explanation || '');
        setQueryMs(data.queryMs);
        setTotalChunks(data.totalChunks);
        setSelectedIndex(0);
      } else {
        setErrorMsg(data.error || 'Search failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSearching(false);
    }
  }, [workspaceFiles, topK, explain]);

  // Debounced search on typing
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 3) runSearch(query);
      else setResults([]);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
      } else if (historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setQuery(history[nextIdx]);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleJump(results[selectedIndex]);
      } else if (query.trim()) {
        runSearch(query);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleJump = (result: SearchResult) => {
    // Save to history
    if (query && !history.includes(query)) {
      setHistory(prev => [query, ...prev.slice(0, 9)]);
    }
    setHistoryIndex(-1);
    onJumpToResult(result.filePath, result.startLine);
    onClose();
  };

  const EXAMPLE_QUERIES = [
    'Where are JWT tokens decoded and validated?',
    'How does authentication session handling work?',
    'Find all database connection initialization code',
    'Where is error handling and retry logic implemented?',
    'Show me the file upload and storage logic',
  ];

  if (!isOpen) return null;

  /* ── Styles ─────────────────────────────────────────────────────────── */

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 9999, paddingTop: '8vh',
  };
  const palette: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
    border: '1px solid rgba(139,92,246,0.4)', borderRadius: 16,
    width: '100%', maxWidth: 860, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 80px rgba(139,92,246,0.3), 0 30px 60px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={palette}>
        {/* Search input */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.06)' }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>🔍</div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask in natural language: 'Where are JWT tokens validated?' or 'Find all async data fetching…'"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: 16, fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {isSearching && (
              <div style={{ fontSize: 12, color: '#a78bfa', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span> Searching…
              </div>
            )}
            {queryMs !== null && !isSearching && (
              <div style={{ fontSize: 11, color: '#475569' }}>{queryMs}ms · {totalChunks} chunks</div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={explain} onChange={e => setExplain(e.target.checked)} />
              AI explain
            </label>
            <button onClick={onClose} style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 6, color: '#94a3b8', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>

        {/* Stats bar */}
        {results.length > 0 && (
          <div style={{ padding: '6px 20px', background: 'rgba(139,92,246,0.04)', borderBottom: '1px solid rgba(139,92,246,0.1)', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>📄 {results.length} results across {new Set(results.map(r => r.filePath)).size} files</span>
            <span>↑↓ navigate · Enter to jump · Esc to close</span>
          </div>
        )}

        {/* AI explanation */}
        {explanation && (
          <div style={{ padding: '10px 20px', background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid rgba(139,92,246,0.15)', fontSize: 13, color: '#c4b5fd', lineHeight: 1.6 }}>
            🤖 {explanation}
          </div>
        )}

        {/* Results */}
        <div ref={resultsRef} style={{ flex: 1, overflow: 'auto' }}>
          {/* Empty state / examples */}
          {!query && results.length === 0 && (
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 12 }}>TRY SEARCHING FOR:</div>
              {EXAMPLE_QUERIES.map((eq, i) => (
                <div key={i} onClick={() => setQuery(eq)} style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, color: '#94a3b8', marginBottom: 4,
                  background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(139,92,246,0.12)',
                  transition: 'all 0.15s',
                }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                   onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,27,75,0.4)')}>
                  💬 {eq}
                </div>
              ))}
              {workspaceFiles.length === 0 && (
                <div style={{ marginTop: 16, color: '#475569', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                  No workspace files indexed. Open or create some files first.
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div style={{ padding: 20, color: '#f87171', fontSize: 13 }}>⚠️ {errorMsg}</div>
          )}

          {/* Result list */}
          {results.map((result, i) => (
            <div
              key={i}
              onClick={() => handleJump(result)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                padding: '12px 20px', borderBottom: '1px solid rgba(139,92,246,0.08)',
                cursor: 'pointer', transition: 'background 0.1s',
                background: i === selectedIndex ? 'rgba(139,92,246,0.12)' : 'transparent',
                borderLeft: i === selectedIndex ? '3px solid #a78bfa' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#a78bfa', flex: 1, fontWeight: 600 }}>
                  {result.filePath}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>L{result.startLine}–{result.endLine}</span>
                <MatchBadge type={result.matchType} />
                <ScorePill score={result.score} type={result.matchType} />
              </div>

              <SnippetHighlight snippet={result.snippet} terms={result.matchedTerms} />

              {result.matchedTerms.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {result.matchedTerms.map(t => (
                    <span key={t} style={{ fontSize: 10, background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 3, padding: '1px 5px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* No results */}
          {query.length >= 3 && results.length === 0 && !isSearching && !errorMsg && (
            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>🔎</div>
              No results found for <em style={{ color: '#a78bfa' }}>"{query}"</em>
              <div style={{ fontSize: 12, marginTop: 8 }}>Try rephrasing with more technical keywords</div>
            </div>
          )}
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
