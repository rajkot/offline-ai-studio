'use client';
// components/GgufQuantizerStudio.tsx
// Visual GGUF Quantization & Model Converter Studio

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface QuantEstimate {
  quantType: string;
  label: string;
  bitsPerWeight: number;
  estimatedVramGb: number;
  estimatedFileSizeGb: number;
  qualityScore: number;
  recommended: boolean;
}

interface QuantJob {
  id: string;
  status: 'running' | 'done' | 'error';
  modelPath: string;
  quantType: string;
  outputPath: string;
  startedAt: number;
  finishedAt?: number;
  log: string[];
  error?: string;
}

interface ToolStatus {
  llamaCpp: { available: boolean; path: string; version?: string };
  python: { available: boolean; hasTransformers: boolean };
  ready: boolean;
  installGuide?: Record<string, string>;
}

interface GgufQuantizerStudioProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── VRAM bar ───────────────────────────────────────────────────────────── */

function VramBar({ gb, max = 24 }: { gb: number; max?: number }) {
  const pct = Math.min((gb / max) * 100, 100);
  const color = gb <= 4 ? '#4ade80' : gb <= 8 ? '#fbbf24' : gb <= 16 ? '#fb923c' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(100,116,139,0.2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 42, textAlign: 'right' }}>{gb}GB</span>
    </div>
  );
}

/* ─── Quality meter ──────────────────────────────────────────────────────── */

function QualityMeter({ score }: { score: number }) {
  const color = score >= 95 ? '#4ade80' : score >= 85 ? '#22d3ee' : score >= 75 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 50, height: 4, background: 'rgba(100,116,139,0.2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>{score}%</span>
    </div>
  );
}

/* ─── Log Viewer ─────────────────────────────────────────────────────────── */

function LogViewer({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(5,5,10,0.8)', borderRadius: 8, padding: '10px 14px', maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(100,116,139,0.15)' }}>
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.includes('✓') ? '#4ade80' : l.includes('✗') || l.includes('Error') ? '#f87171' : '#94a3b8', marginBottom: 2 }}>
          {l}
        </div>
      ))}
      {lines.length === 0 && <span style={{ color: '#475569', fontStyle: 'italic' }}>No output yet…</span>}
      <div ref={endRef} />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function GgufQuantizerStudio({ isOpen, onClose }: GgufQuantizerStudioProps) {
  const [activeTab, setActiveTab] = useState<'convert' | 'jobs' | 'guide'>('convert');
  const [modelPath, setModelPath] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [selectedQuant, setSelectedQuant] = useState<string>('Q4_K_M');
  const [estimates, setEstimates] = useState<QuantEstimate[]>([]);
  const [toolStatus, setToolStatus] = useState<ToolStatus | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isQuantizing, setIsQuantizing] = useState(false);
  const [jobs, setJobs] = useState<QuantJob[]>([]);
  const [activeJob, setActiveJob] = useState<QuantJob | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Check tool availability on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/models/quantize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check' }) })
        .then(r => r.json()).then(d => setToolStatus(d)).catch(() => {});
      fetch('/api/models/quantize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' }) })
        .then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {});
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen]);

  // Auto-estimate when model path changes
  useEffect(() => {
    if (!modelPath.trim()) { setEstimates([]); return; }
    const t = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const resp = await fetch('/api/models/quantize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'estimate', modelPath: modelPath.trim() }) });
        const data = await resp.json();
        if (data.success) setEstimates(data.estimates || []);
      } catch {}
      setIsEstimating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [modelPath]);

  const handleQuantize = async () => {
    if (!modelPath.trim() || !toolStatus?.ready) return;
    setIsQuantizing(true);
    setStatusMsg('Starting quantization job…');

    try {
      const resp = await fetch('/api/models/quantize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quantize', modelPath: modelPath.trim(), outputDir: outputDir.trim() || undefined, quantType: selectedQuant }),
      });
      const data = await resp.json();

      if (data.success) {
        setStatusMsg(`✓ Job started: ${data.jobId}`);
        setActiveTab('jobs');

        // Start polling job status
        const jobId = data.jobId;
        pollRef.current = setInterval(async () => {
          try {
            const jr = await fetch('/api/models/quantize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', jobId }) });
            const jd = await jr.json();
            if (jd.success) {
              setActiveJob(jd.job);
              setJobs(prev => {
                const idx = prev.findIndex(j => j.id === jobId);
                if (idx >= 0) { const next = [...prev]; next[idx] = jd.job; return next; }
                return [jd.job, ...prev];
              });
              if (jd.job.status === 'done' || jd.job.status === 'error') {
                clearInterval(pollRef.current);
              }
            }
          } catch {}
        }, 2000);

      } else {
        setStatusMsg(`✗ ${data.error}`);
      }
    } catch (e: any) {
      setStatusMsg(`✗ Error: ${e.message}`);
    } finally {
      setIsQuantizing(false);
    }
  };

  if (!isOpen) return null;

  /* ── Styles ─────────────────────────────────────────────────────────── */

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
  };
  const modal: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0c0a14 0%, #130f21 50%, #0c0a14 100%)',
    border: '1px solid rgba(168,85,247,0.35)', borderRadius: 16,
    width: '100%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 80px rgba(168,85,247,0.2), 0 30px 60px rgba(0,0,0,0.7)', overflow: 'hidden',
  };
  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(168,85,247,0.2)',
    background: 'rgba(168,85,247,0.06)',
  };
  const tabBar: React.CSSProperties = { display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid rgba(168,85,247,0.15)' };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: active ? '#c084fc' : '#64748b', background: 'transparent', border: 'none',
    borderBottom: active ? '2px solid #c084fc' : '2px solid transparent', transition: 'all 0.2s',
  });
  const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 24 };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(12,10,20,0.7)', border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 8, color: '#e2e8f0', padding: '10px 14px', fontSize: 13,
    outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
  };
  const primaryBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(168,85,247,0.4)',
    borderRadius: 8, color: '#e2e8f0', padding: '12px 24px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  };

  const selectedEstimate = estimates.find(e => e.quantType === selectedQuant);

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>📦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>GGUF Quantization Studio</div>
              <div style={{ fontSize: 11, color: '#475569' }}>Visual llama.cpp quantizer · VRAM estimator · 1-click Q4/Q5/Q8 conversion</div>
            </div>
            {toolStatus && (
              <div style={{
                background: toolStatus.ready ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${toolStatus.ready ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                color: toolStatus.ready ? '#4ade80' : '#f87171',
              }}>
                {toolStatus.ready ? `● llama.cpp ${toolStatus.llamaCpp.version || 'Ready'}` : '○ llama.cpp Not Found'}
              </div>
            )}
            {statusMsg && <div style={{ fontSize: 11, color: '#c084fc', fontStyle: 'italic' }}>{statusMsg}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={tabBar}>
          <button style={tabStyle(activeTab === 'convert')} onClick={() => setActiveTab('convert')}>⚗️ Convert</button>
          <button style={tabStyle(activeTab === 'jobs')} onClick={() => setActiveTab('jobs')}>📋 Jobs ({jobs.length})</button>
          <button style={tabStyle(activeTab === 'guide')} onClick={() => setActiveTab('guide')}>📖 Setup Guide</button>
        </div>

        <div style={body}>

          {/* ── Convert tab ── */}
          {activeTab === 'convert' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
              {/* Left: Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#c084fc', fontWeight: 700, display: 'block', marginBottom: 6 }}>MODEL PATH (Safetensors or GGUF)</label>
                  <input value={modelPath} onChange={e => setModelPath(e.target.value)} style={inputStyle} placeholder="C:\models\qwen2.5-7b or /home/user/llama-7b" />
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Local .safetensors directory or existing .gguf file</div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#c084fc', fontWeight: 700, display: 'block', marginBottom: 6 }}>OUTPUT DIRECTORY (optional)</label>
                  <input value={outputDir} onChange={e => setOutputDir(e.target.value)} style={inputStyle} placeholder="Same as model directory" />
                </div>

                {/* Quant type selector */}
                <div>
                  <label style={{ fontSize: 11, color: '#c084fc', fontWeight: 700, display: 'block', marginBottom: 8 }}>QUANTIZATION TYPE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0', 'Q6_K', 'F16'].map(qt => {
                      const est = estimates.find(e => e.quantType === qt);
                      const isSelected = selectedQuant === qt;
                      return (
                        <div key={qt} onClick={() => setSelectedQuant(qt)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                          borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                          background: isSelected ? 'rgba(168,85,247,0.18)' : 'rgba(12,10,20,0.5)',
                          border: `1px solid ${isSelected ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.12)'}`,
                        }}>
                          <input type="radio" checked={isSelected} onChange={() => setSelectedQuant(qt)} style={{ accentColor: '#c084fc' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{qt}</span>
                              {est?.recommended && <span style={{ fontSize: 9, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>RECOMMENDED</span>}
                            </div>
                            {est && <div style={{ fontSize: 10, color: '#64748b' }}>{est.label} · {est.bitsPerWeight} bpw</div>}
                          </div>
                          {est && <QualityMeter score={est.qualityScore} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button onClick={handleQuantize} disabled={isQuantizing || !modelPath.trim() || !toolStatus?.ready} style={{
                  ...primaryBtn, justifyContent: 'center',
                  opacity: isQuantizing || !modelPath.trim() || !toolStatus?.ready ? 0.5 : 1,
                }}>
                  {isQuantizing ? '⏳ Quantizing…' : `🔨 Quantize to ${selectedQuant}`}
                </button>

                {!toolStatus?.ready && (
                  <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>
                    llama.cpp not detected. See the Setup Guide tab.
                  </div>
                )}
              </div>

              {/* Right: VRAM estimates */}
              <div>
                <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 700, marginBottom: 12 }}>
                  VRAM REQUIREMENTS CALCULATOR
                  {isEstimating && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8 }}>Calculating…</span>}
                </div>

                {estimates.length === 0 && !isEstimating && (
                  <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 32, fontStyle: 'italic' }}>
                    Enter a model path to see VRAM estimates
                  </div>
                )}

                {estimates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {estimates.map(est => {
                      const isSelected = est.quantType === selectedQuant;
                      return (
                        <div key={est.quantType} onClick={() => setSelectedQuant(est.quantType)} style={{
                          background: isSelected ? 'rgba(168,85,247,0.1)' : 'rgba(12,10,20,0.4)',
                          border: `1px solid ${isSelected ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.1)'}`,
                          borderRadius: 8, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', fontSize: 12 }}>{est.quantType}</span>
                              <span style={{ fontSize: 10, color: '#64748b' }}>{est.label}</span>
                              {est.recommended && <span style={{ fontSize: 9, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 3, padding: '0 4px', fontWeight: 700 }}>✓</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>~{est.estimatedFileSizeGb}GB file</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <VramBar gb={est.estimatedVramGb} />
                            <QualityMeter score={est.qualityScore} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedEstimate && (
                  <div style={{ marginTop: 16, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#c084fc', marginBottom: 8 }}>SELECTED: {selectedEstimate.quantType}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                      <div>File size: <strong style={{ color: '#e2e8f0' }}>{selectedEstimate.estimatedFileSizeGb} GB</strong></div>
                      <div>VRAM needed: <strong style={{ color: '#e2e8f0' }}>{selectedEstimate.estimatedVramGb} GB</strong></div>
                      <div>Bits/weight: <strong style={{ color: '#e2e8f0' }}>{selectedEstimate.bitsPerWeight}</strong></div>
                      <div>Quality: <strong style={{ color: '#e2e8f0' }}>{selectedEstimate.qualityScore}%</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Jobs tab ── */}
          {activeTab === 'jobs' && (
            <div>
              {jobs.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', padding: 40, fontSize: 14, fontStyle: 'italic' }}>
                  No quantization jobs yet. Start one in the Convert tab.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {jobs.map(job => (
                    <div key={job.id} style={{
                      background: 'rgba(12,10,20,0.5)', border: `1px solid ${job.status === 'done' ? 'rgba(34,197,94,0.25)' : job.status === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(168,85,247,0.2)'}`,
                      borderRadius: 10, padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: job.status === 'done' ? '#4ade80' : job.status === 'error' ? '#f87171' : '#c084fc',
                          boxShadow: job.status === 'running' ? '0 0 8px #c084fc' : 'none',
                          animation: job.status === 'running' ? 'pulse 1.5s infinite' : 'none',
                        }} />
                        <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>{job.modelPath.split(/[\\/]/).pop()}</div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#c084fc' }}>{job.quantType}</span>
                        <span style={{ fontSize: 11, color: job.status === 'done' ? '#4ade80' : job.status === 'error' ? '#f87171' : '#c084fc', fontWeight: 700 }}>
                          {job.status.toUpperCase()}
                        </span>
                      </div>

                      {job.outputPath && (
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginBottom: 8 }}>
                          → {job.outputPath}
                        </div>
                      )}

                      {job.log && job.log.length > 0 && <LogViewer lines={job.log} />}

                      {job.error && (
                        <div style={{ marginTop: 8, color: '#f87171', fontSize: 12, fontFamily: 'monospace' }}>
                          ✗ {job.error}
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                        {job.finishedAt
                          ? `Finished in ${Math.round((job.finishedAt - job.startedAt) / 1000)}s`
                          : `Running for ${Math.round((Date.now() - job.startedAt) / 1000)}s`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Setup Guide tab ── */}
          {activeTab === 'guide' && (
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', marginBottom: 16 }}>🛠 Installing llama.cpp</div>

              {toolStatus?.installGuide && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(toolStatus.installGuide).map(([os, cmd]) => (
                    <div key={os} style={{ background: 'rgba(12,10,20,0.6)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 700, marginBottom: 8 }}>
                        {os === 'windows' ? '🪟 Windows' : os === 'linux' ? '🐧 Linux' : '🍎 macOS'}
                      </div>
                      <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{cmd}</pre>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c084fc', marginBottom: 10 }}>📋 Supported Quantization Formats</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                      {['Format','Bits/W','Quality','Best For'].map(h => (
                        <th key={h} style={{ padding: '4px 8px', color: '#c084fc', textAlign: 'left', fontSize: 11, fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Q4_K_M','4.85','84%','Daily use · low VRAM'],
                      ['Q5_K_M','5.68','91%','Balanced · medium VRAM'],
                      ['Q8_0','8.5','99%','High quality · 8GB+ VRAM'],
                      ['Q4_0','4.5','72%','Minimum VRAM (basic)'],
                      ['Q6_K','6.57','96%','Near-lossless on consumer GPU'],
                      ['F16','16','100%','Full precision (reference)'],
                    ].map(([fmt, bpw, q, desc]) => (
                      <tr key={fmt} style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0' }}>{fmt}</td>
                        <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{bpw}</td>
                        <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{q}</td>
                        <td style={{ padding: '6px 8px', color: '#64748b' }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>💡 Tips</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
                  <li>Use <strong style={{ color: '#94a3b8' }}>Q4_K_M</strong> for models you'll use daily — best size/quality ratio</li>
                  <li>Use <strong style={{ color: '#94a3b8' }}>Q8_0</strong> when quality matters most and you have enough VRAM</li>
                  <li>After quantizing, load via Ollama: <code style={{ color: '#c084fc' }}>ollama create my-model -f Modelfile</code></li>
                  <li>HuggingFace Hub: download safetensors with <code style={{ color: '#c084fc' }}>huggingface-cli download model-id</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
