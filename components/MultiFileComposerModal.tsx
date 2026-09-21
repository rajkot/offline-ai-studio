'use client';
// components/MultiFileComposerModal.tsx
// RAG-powered Multi-File Composer — semantic search + cross-file diff review

import React, { useState, useCallback, useRef, useEffect } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WorkspaceFile { path: string; content: string; }
interface ComposerFileEdit {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
  proposedContent: string;
  status: 'pending' | 'accepted' | 'rejected';
}
interface RetrievedChunk { filePath: string; lines: string; score: number; matchedTerms: string[]; }
interface ComposerResult {
  success: boolean;
  source: string;
  summary: string;
  targetArchitecture: string;
  files: ComposerFileEdit[];
  retrievedChunks: RetrievedChunk[];
  error?: string;
}
interface MultiFileComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceFiles: WorkspaceFile[];
  onApplyFiles: (files: { filePath: string; content: string }[]) => void;
}

/* ─── Diff renderer ─────────────────────────────────────────────────────── */

function InlineDiff({ original, proposed }: { original: string; proposed: string }) {
  const origLines = (original || '').split('\n');
  const propLines = (proposed || '').split('\n');
  const maxLines = Math.max(origLines.length, propLines.length);
  const preview = propLines.slice(0, 60);

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
      {preview.map((line, i) => {
        const origLine = origLines[i];
        const isNew = origLine === undefined;
        const isChanged = !isNew && origLine !== line;
        const bg = isNew ? 'rgba(34,197,94,0.12)' : isChanged ? 'rgba(251,191,36,0.10)' : 'transparent';
        const prefix = isNew ? '+' : isChanged ? '~' : ' ';
        const color = isNew ? '#4ade80' : isChanged ? '#fbbf24' : '#94a3b8';
        return (
          <div key={i} style={{ background: bg, padding: '0 6px', whiteSpace: 'pre' }}>
            <span style={{ color, userSelect: 'none', marginRight: 8 }}>{prefix}</span>
            <span style={{ color: '#e2e8f0' }}>{line}</span>
          </div>
        );
      })}
      {propLines.length > 60 && (
        <div style={{ color: '#64748b', padding: '2px 6px', fontStyle: 'italic' }}>
          ... {propLines.length - 60} more lines
        </div>
      )}
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────────────────────────── */

function ActionBadge({ action }: { action: 'create' | 'modify' | 'delete' }) {
  const colors: Record<string, string> = { create: '#22c55e', modify: '#f59e0b', delete: '#ef4444' };
  return (
    <span style={{
      background: colors[action] + '22', color: colors[action],
      border: `1px solid ${colors[action]}44`,
      borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
    }}>{action}</span>
  );
}

/* ─── Intent selector ───────────────────────────────────────────────────── */

const INTENTS = [
  { id: 'feature', label: '✨ Feature', desc: 'Add a new capability' },
  { id: 'refactor', label: '🔁 Refactor', desc: 'Improve structure' },
  { id: 'bugfix', label: '🐛 Bugfix', desc: 'Fix a known issue' },
  { id: 'test', label: '🧪 Test', desc: 'Add test coverage' },
  { id: 'docs', label: '📖 Docs', desc: 'Update documentation' },
];

/* ─── Main Modal ─────────────────────────────────────────────────────────── */

export default function MultiFileComposerModal({ isOpen, onClose, workspaceFiles, onApplyFiles }: MultiFileComposerModalProps) {
  const [prompt, setPrompt] = useState('');
  const [intent, setIntent] = useState<'feature' | 'refactor' | 'bugfix' | 'docs' | 'test'>('feature');
  const [topK, setTopK] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ComposerResult | null>(null);
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'context'>('compose');
  const [phase, setPhase] = useState<'input' | 'results'>('input');
  const [statusMsg, setStatusMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (isOpen && textareaRef.current) textareaRef.current.focus(); }, [isOpen]);
  useEffect(() => {
    if (result) {
      const init: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
      result.files.forEach(f => { init[f.filePath] = 'pending'; });
      setFileStatuses(init);
    }
  }, [result]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setStatusMsg('🔍 Retrieving semantic context from workspace…');
    setResult(null);

    try {
      const resp = await fetch('/api/composer/rag-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          workspaceFiles,
          topK,
          intent,
          maxContextTokens: 6000,
        }),
      });

      setStatusMsg('🤖 Generating multi-file plan with RAG context…');
      const data: ComposerResult = await resp.json();
      setResult(data);
      setPhase('results');
      setActiveTab('compose');
    } catch (err: any) {
      setResult({ success: false, source: 'error', summary: '', targetArchitecture: '', files: [], retrievedChunks: [], error: err.message });
      setPhase('results');
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  }, [prompt, workspaceFiles, topK, intent]);

  const acceptAll = () => {
    if (!result) return;
    const updated: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
    result.files.forEach(f => { updated[f.filePath] = 'accepted'; });
    setFileStatuses(updated);
  };

  const rejectAll = () => {
    if (!result) return;
    const updated: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
    result.files.forEach(f => { updated[f.filePath] = 'rejected'; });
    setFileStatuses(updated);
  };

  const handleApply = () => {
    if (!result) return;
    const toApply = result.files
      .filter(f => fileStatuses[f.filePath] === 'accepted' && f.action !== 'delete')
      .map(f => ({ filePath: f.filePath, content: f.proposedContent }));
    onApplyFiles(toApply);
    onClose();
  };

  const acceptedCount = Object.values(fileStatuses).filter(s => s === 'accepted').length;
  const totalCount = result?.files.length ?? 0;

  if (!isOpen) return null;

  /* ── Styles ─────────────────────────────────────────────────────────── */
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
  };
  const modal: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    border: '1px solid rgba(139,92,246,0.3)', borderRadius: 16,
    width: '100%', maxWidth: 980, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 60px rgba(139,92,246,0.25), 0 25px 50px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  };
  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(139,92,246,0.2)',
    background: 'rgba(139,92,246,0.08)',
  };
  const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 24 };
  const tabBar: React.CSSProperties = {
    display: 'flex', gap: 4, padding: '0 24px',
    borderBottom: '1px solid rgba(139,92,246,0.15)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: active ? '#a78bfa' : '#64748b',
    background: 'transparent', border: 'none',
    borderBottom: active ? '2px solid #a78bfa' : '2px solid transparent',
    transition: 'all 0.2s',
  });
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 10, color: '#e2e8f0', padding: '12px 16px', fontSize: 14,
    resize: 'vertical', minHeight: 100, outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const btn = (variant: 'primary' | 'secondary' | 'danger' | 'success'): React.CSSProperties => {
    const colors = {
      primary: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      secondary: 'rgba(100,116,139,0.15)',
      danger: 'rgba(239,68,68,0.15)',
      success: 'linear-gradient(135deg,#059669,#0891b2)',
    };
    return {
      background: colors[variant], border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 8, color: '#e2e8f0', padding: '8px 18px', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    };
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>🧩</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>Multi-File RAG Composer</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Semantic workspace search · Cross-file analysis · Chunk diff review
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {result && (
              <div style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.3)' }}>
                Source: {result.source}
              </div>
            )}
            <button onClick={onClose} style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        </div>

        {/* Tab bar — only when results are ready */}
        {phase === 'results' && result && (
          <div style={tabBar}>
            <button style={tabStyle(activeTab === 'compose')} onClick={() => setActiveTab('compose')}>
              📁 Files ({totalCount})
            </button>
            <button style={tabStyle(activeTab === 'context')} onClick={() => setActiveTab('context')}>
              🔍 Retrieved Context ({result.retrievedChunks?.length ?? 0})
            </button>
          </div>
        )}

        {/* Body */}
        <div style={body}>

          {/* ── Input phase ── */}
          {phase === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  DESCRIBE YOUR CHANGE
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                  placeholder="e.g. Add a dark/light theme toggle that persists to localStorage, with a floating button in the top-right corner and smooth transitions across all components…"
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Press Ctrl+Enter to generate</div>
              </div>

              {/* Intent */}
              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, display: 'block', marginBottom: 8 }}>INTENT</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {INTENTS.map(i => (
                    <button key={i.id} onClick={() => setIntent(i.id as typeof intent)} style={{
                      background: intent === i.id ? 'rgba(139,92,246,0.25)' : 'rgba(30,27,75,0.5)',
                      border: `1px solid ${intent === i.id ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.2)'}`,
                      borderRadius: 8, padding: '8px 14px', color: intent === i.id ? '#a78bfa' : '#64748b',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                    }}>
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    CONTEXT CHUNKS (top-K)
                  </label>
                  <input type="number" value={topK} min={4} max={30} onChange={e => setTopK(+e.target.value)}
                    style={{ ...inputStyle, minHeight: 'unset', padding: '6px 12px', width: 80 }} />
                </div>
                <div style={{ fontSize: 12, color: '#475569', paddingTop: 18 }}>
                  Workspace files: <strong style={{ color: '#a78bfa' }}>{workspaceFiles.length}</strong>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} style={{
                ...btn('primary'), justifyContent: 'center', padding: '14px 24px', fontSize: 15,
                opacity: isGenerating || !prompt.trim() ? 0.6 : 1,
              }}>
                {isGenerating ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> {statusMsg || 'Generating…'}</>
                ) : '🧩 Compose with RAG'}
              </button>
            </div>
          )}

          {/* ── Results: Files tab ── */}
          {phase === 'results' && result && activeTab === 'compose' && (
            <div>
              {/* Summary */}
              {result.summary && (
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, marginBottom: 4 }}>PLAN SUMMARY</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>{result.summary}</div>
                  {result.targetArchitecture && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>{result.targetArchitecture}</div>
                  )}
                </div>
              )}

              {result.error && !result.success && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 13 }}>
                  ⚠️ {result.error}
                </div>
              )}

              {/* Bulk actions */}
              {result.files.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                  <button onClick={acceptAll} style={btn('success')}>✅ Accept All</button>
                  <button onClick={rejectAll} style={btn('danger')}>❌ Reject All</button>
                  <button onClick={() => { setPhase('input'); setResult(null); }} style={btn('secondary')}>← Re-prompt</button>
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                    {acceptedCount} / {totalCount} accepted
                  </div>
                </div>
              )}

              {/* File cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.files.map(file => {
                  const status = fileStatuses[file.filePath] || 'pending';
                  const isExpanded = expandedFile === file.filePath;
                  const originalFile = workspaceFiles.find(f => f.path === file.filePath);

                  const statusColors = { pending: '#f59e0b', accepted: '#22c55e', rejected: '#ef4444' };

                  return (
                    <div key={file.filePath} style={{
                      background: 'rgba(30,27,75,0.5)', border: `1px solid ${statusColors[status]}33`,
                      borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s',
                    }}>
                      {/* File header */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10, cursor: 'pointer' }}
                        onClick={() => setExpandedFile(isExpanded ? null : file.filePath)}>
                        <ActionBadge action={file.action} />
                        <div style={{ flex: 1, fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>
                          {file.filePath}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={e => { e.stopPropagation(); setFileStatuses(p => ({ ...p, [file.filePath]: 'accepted' })); }}
                            style={{ ...btn('success'), padding: '4px 10px', fontSize: 11, opacity: status === 'accepted' ? 1 : 0.5 }}>
                            ✓ Accept
                          </button>
                          <button onClick={e => { e.stopPropagation(); setFileStatuses(p => ({ ...p, [file.filePath]: 'rejected' })); }}
                            style={{ ...btn('danger'), padding: '4px 10px', fontSize: 11, opacity: status === 'rejected' ? 1 : 0.5 }}>
                            ✗ Reject
                          </button>
                        </div>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Description */}
                      {file.description && (
                        <div style={{ padding: '0 16px 8px', fontSize: 12, color: '#64748b' }}>{file.description}</div>
                      )}

                      {/* Diff view */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(139,92,246,0.15)', padding: '12px 16px' }}>
                          <InlineDiff
                            original={originalFile?.content || ''}
                            proposed={file.proposedContent}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Apply button */}
              {acceptedCount > 0 && (
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleApply} style={{ ...btn('primary'), padding: '12px 28px', fontSize: 14 }}>
                    🚀 Apply {acceptedCount} File{acceptedCount > 1 ? 's' : ''} to Workspace
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Results: Context tab ── */}
          {phase === 'results' && result && activeTab === 'context' && (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                These chunks were retrieved from your workspace via BM25 semantic search and used as context for generation.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(result.retrievedChunks || []).map((chunk, i) => (
                  <div key={i} style={{ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{chunk.filePath}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>lines {chunk.lines}</div>
                      <div style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                        score: {chunk.score}
                      </div>
                    </div>
                    {chunk.matchedTerms.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {chunk.matchedTerms.map(t => (
                          <span key={t} style={{ fontSize: 10, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 4, padding: '1px 6px' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(result.retrievedChunks || []).length === 0 && (
                  <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 24 }}>
                    No chunks retrieved (prompt may have had no meaningful terms).
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
