'use client';
// components/DockerSandboxPanel.tsx
// Docker-in-a-panel: spawn isolated containers, run commands, inspect output

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  Ports: string;
  CreatedAt?: string;
}

interface ExecLog {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: number;
  durationMs: number;
}

interface DockerImage {
  Repository: string;
  Tag: string;
  ID: string;
  Size: string;
}

interface DockerSandboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceFiles?: { path: string; content: string }[];
}

/* ─── Quick templates ──────────────────────────────────────────────────── */

const SANDBOX_TEMPLATES = [
  { id: 'node20', label: '⬢ Node.js 20', image: 'node:20-alpine', desc: 'npm/yarn/bun builds', initCmd: 'node --version && npm --version' },
  { id: 'python3', label: '🐍 Python 3.12', image: 'python:3.12-slim', desc: 'pip, scripts, ML', initCmd: 'python --version && pip --version' },
  { id: 'rust', label: '🦀 Rust', image: 'rust:1.78-slim', desc: 'cargo build & test', initCmd: 'rustc --version && cargo --version' },
  { id: 'golang', label: '🐹 Go 1.22', image: 'golang:1.22-alpine', desc: 'go build & test', initCmd: 'go version' },
  { id: 'ubuntu', label: '🐧 Ubuntu 22.04', image: 'ubuntu:22.04', desc: 'General purpose shell', initCmd: 'uname -a && bash --version' },
  { id: 'postgres', label: '🐘 Postgres 16', image: 'postgres:16-alpine', desc: 'DB migrations & scripts', initCmd: 'postgres --version' },
  { id: 'deno', label: '🦕 Deno 1.44', image: 'denoland/deno:1.44.0', desc: 'Deno TypeScript runtime', initCmd: 'deno --version' },
  { id: 'bun', label: '🍞 Bun 1.1', image: 'oven/bun:1.1', desc: 'Ultra-fast JS runtime', initCmd: 'bun --version' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatBytes(size: string): string {
  return size || '—';
}

function timeSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/* ─── Terminal Log Line ─────────────────────────────────────────────────── */

function ExecLogCard({ log }: { log: ExecLog }) {
  const [expanded, setExpanded] = useState(true);
  const hasError = log.exitCode !== 0;

  return (
    <div style={{
      background: hasError ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)',
      border: `1px solid ${hasError ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        cursor: 'pointer', background: hasError ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)',
      }}>
        <span style={{ fontSize: 12, color: hasError ? '#f87171' : '#4ade80', fontWeight: 700 }}>
          {hasError ? '✗' : '✓'} [{log.exitCode}]
        </span>
        <code style={{ flex: 1, fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>{log.command}</code>
        <span style={{ fontSize: 10, color: '#475569' }}>{log.durationMs}ms · {timeSince(log.timestamp)}</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
          {log.stdout && (
            <pre style={{ color: '#94a3b8', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.stdout}</pre>
          )}
          {log.stderr && (
            <pre style={{ color: '#f87171', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.stderr}</pre>
          )}
          {!log.stdout && !log.stderr && (
            <span style={{ color: '#475569', fontStyle: 'italic' }}>No output</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */

export default function DockerSandboxPanel({ isOpen, onClose, workspaceFiles = [] }: DockerSandboxPanelProps) {
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [execLogs, setExecLogs] = useState<ExecLog[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [isExecing, setIsExecing] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'images' | 'about'>('sandbox');
  const [selectedTemplate, setSelectedTemplate] = useState(SANDBOX_TEMPLATES[0]);
  const [customImage, setCustomImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [copyWorkspace, setCopyWorkspace] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);

  const activeContainer = containers.find(c => c.ID === activeContainerId || c.Names?.includes(activeContainerId || ''));

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch('/api/docker');
      const data = await resp.json();
      setDockerAvailable(data.available);
      setContainers(data.containers || []);
    } catch {
      setDockerAvailable(false);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const resp = await fetch('/api/docker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'images' }) });
      const data = await resp.json();
      setImages(data.images || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchImages();
    }
  }, [isOpen, fetchStatus, fetchImages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [execLogs]);

  const spawnContainer = async () => {
    setIsSpawning(true);
    setStatusMsg('Spawning container…');
    const image = customImage.trim() || selectedTemplate.image;
    const containerName = `oai-${selectedTemplate.id}-${Date.now().toString(36)}`;

    try {
      const resp = await fetch('/api/docker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spawn', image, containerName, workdir: '/workspace' }),
      });
      const data = await resp.json();

      if (data.success) {
        setStatusMsg(`✓ Container ${data.containerName} started!`);
        setActiveContainerId(data.containerId);
        await fetchStatus();

        // Optionally copy workspace files
        if (copyWorkspace && workspaceFiles.length > 0) {
          setStatusMsg('Copying workspace files into container…');
          const fileMap: Record<string, string> = {};
          workspaceFiles.forEach(f => { fileMap[f.path] = f.content; });
          await fetch('/api/docker', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'copy', containerId: data.containerId, files: fileMap, destDir: '/workspace' }),
          });
          setStatusMsg('✓ Workspace copied to container!');
        }

        // Run init command
        if (selectedTemplate.initCmd) {
          const startMs = Date.now();
          const execResp = await fetch('/api/docker', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'exec', containerId: data.containerId, command: selectedTemplate.initCmd }),
          });
          const execData = await execResp.json();
          setExecLogs(prev => [...prev, {
            id: `exec-${Date.now()}`, command: selectedTemplate.initCmd,
            stdout: execData.stdout, stderr: execData.stderr,
            exitCode: execData.exitCode, timestamp: Date.now(), durationMs: Date.now() - startMs,
          }]);
        }

        setStatusMsg('Ready');
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        setStatusMsg(`✗ ${data.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`✗ Error: ${err.message}`);
    } finally {
      setIsSpawning(false);
    }
  };

  const execCommand = async () => {
    const cmd = commandInput.trim();
    if (!cmd || !activeContainerId || isExecing) return;
    setIsExecing(true);
    setCommandInput('');

    const startMs = Date.now();
    try {
      const resp = await fetch('/api/docker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exec', containerId: activeContainerId, command: cmd }),
      });
      const data = await resp.json();
      setExecLogs(prev => [...prev, {
        id: `exec-${Date.now()}`, command: cmd,
        stdout: data.stdout || '', stderr: data.stderr || '',
        exitCode: data.exitCode ?? (data.success ? 0 : 1),
        timestamp: Date.now(), durationMs: Date.now() - startMs,
      }]);
    } catch (err: any) {
      setExecLogs(prev => [...prev, {
        id: `exec-${Date.now()}`, command: cmd, stdout: '', stderr: err.message,
        exitCode: 1, timestamp: Date.now(), durationMs: Date.now() - startMs,
      }]);
    } finally {
      setIsExecing(false);
      cmdRef.current?.focus();
    }
  };

  const stopContainer = async (id: string) => {
    await fetch('/api/docker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop', containerId: id }) });
    if (activeContainerId === id) setActiveContainerId(null);
    await fetchStatus();
  };

  const pullImage = async (image: string) => {
    setIsLoading(true);
    setStatusMsg(`Pulling ${image}…`);
    try {
      await fetch('/api/docker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pull', image }) });
      await fetchImages();
      setStatusMsg(`✓ ${image} pulled`);
    } catch (e: any) { setStatusMsg(`✗ ${e.message}`); }
    finally { setIsLoading(false); setTimeout(() => setStatusMsg(''), 4000); }
  };

  if (!isOpen) return null;

  /* ── Styles ─────────────────────────────────────────────────────────── */

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
  };
  const modal: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a0f1e 100%)',
    border: '1px solid rgba(6,182,212,0.3)', borderRadius: 16,
    width: '100%', maxWidth: 1050, height: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 60px rgba(6,182,212,0.2), 0 25px 50px rgba(0,0,0,0.7)', overflow: 'hidden',
  };
  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(6,182,212,0.2)',
    background: 'rgba(6,182,212,0.06)',
  };
  const tabBar: React.CSSProperties = {
    display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid rgba(6,182,212,0.15)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: active ? '#22d3ee' : '#64748b', background: 'transparent', border: 'none',
    borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent', transition: 'all 0.2s',
  });
  const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: 8, color: '#e2e8f0', padding: '10px 14px', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const primaryBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#0891b2,#0e7490)', border: '1px solid rgba(6,182,212,0.4)',
    borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  };
  const dangerBtn: React.CSSProperties = {
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, color: '#f87171', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>🐳</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>Docker Sandbox Studio</div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                Isolated containers · Zero host pollution · AI-assisted commands
              </div>
            </div>
            {dockerAvailable !== null && (
              <div style={{
                background: dockerAvailable ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${dockerAvailable ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                color: dockerAvailable ? '#4ade80' : '#f87171',
              }}>
                {dockerAvailable ? '● Docker Online' : '○ Docker Offline'}
              </div>
            )}
            {statusMsg && (
              <div style={{ fontSize: 11, color: '#22d3ee', fontStyle: 'italic' }}>{statusMsg}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={tabBar}>
          <button style={tabStyle(activeTab === 'sandbox')} onClick={() => setActiveTab('sandbox')}>🖥️ Sandbox ({containers.length})</button>
          <button style={tabStyle(activeTab === 'images')} onClick={() => setActiveTab('images')}>📦 Images ({images.length})</button>
          <button style={tabStyle(activeTab === 'about')} onClick={() => setActiveTab('about')}>ℹ️ About</button>
        </div>

        <div style={body}>

          {/* Docker unavailable warning */}
          {dockerAvailable === false && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>🐳 Docker Not Available</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                Docker daemon is not running or not installed.<br />
                Install <strong>Docker Desktop</strong> from <code>docker.com/products/docker-desktop</code> and ensure it is running, then refresh.
              </div>
              <button onClick={fetchStatus} style={{ ...primaryBtn, marginTop: 12, fontSize: 12 }}>🔄 Retry</button>
            </div>
          )}

          {/* ── Sandbox tab ── */}
          {activeTab === 'sandbox' && dockerAvailable !== false && (
            <div style={{ display: 'flex', gap: 20, flex: 1 }}>
              {/* Left panel: spawn + container list */}
              <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Spawn form */}
                <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#22d3ee', fontWeight: 700, marginBottom: 12 }}>SPAWN SANDBOX</div>

                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>TEMPLATE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
                    {SANDBOX_TEMPLATES.map(t => (
                      <div key={t.id} onClick={() => setSelectedTemplate(t)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                        background: selectedTemplate.id === t.id ? 'rgba(6,182,212,0.15)' : 'transparent',
                        border: `1px solid ${selectedTemplate.id === t.id ? 'rgba(6,182,212,0.4)' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: 13, flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>{t.label}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{t.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>CUSTOM IMAGE (optional)</label>
                  <input value={customImage} onChange={e => setCustomImage(e.target.value)} placeholder={selectedTemplate.image} style={{ ...inputStyle, marginBottom: 10 }} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer', marginBottom: 12 }}>
                    <input type="checkbox" checked={copyWorkspace} onChange={e => setCopyWorkspace(e.target.checked)} />
                    Copy workspace files into /workspace
                  </label>

                  <button onClick={spawnContainer} disabled={isSpawning || !dockerAvailable} style={{
                    ...primaryBtn, width: '100%', justifyContent: 'center', opacity: isSpawning ? 0.7 : 1,
                  }}>
                    {isSpawning ? '⏳ Spawning…' : '🚀 Spawn Container'}
                  </button>
                </div>

                {/* Running containers */}
                <div>
                  <div style={{ fontSize: 12, color: '#22d3ee', fontWeight: 700, marginBottom: 8 }}>RUNNING CONTAINERS</div>
                  {containers.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: 16, fontStyle: 'italic' }}>
                      No containers running
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {containers.map(c => (
                        <div key={c.ID} onClick={() => setActiveContainerId(c.ID)} style={{
                          background: (activeContainerId === c.ID || c.Names?.includes(activeContainerId || '')) ? 'rgba(6,182,212,0.15)' : 'rgba(10,15,30,0.5)',
                          border: `1px solid ${(activeContainerId === c.ID) ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.15)'}`,
                          borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#22d3ee', fontWeight: 600 }}>
                              {c.Names || c.ID?.slice(0, 12)}
                            </span>
                            <button onClick={e => { e.stopPropagation(); stopContainer(c.ID); }} style={dangerBtn}>■ Stop</button>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{c.Image} · {c.Status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={fetchStatus} style={{ ...primaryBtn, background: 'rgba(6,182,212,0.1)', fontSize: 11, marginTop: 8, padding: '6px 12px' }}>🔄 Refresh</button>
                </div>
              </div>

              {/* Right panel: terminal */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!activeContainerId || !activeContainer ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🐳</div>
                    <div>Spawn a container and select it to start executing commands</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(6,182,212,0.06)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.15)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#22d3ee', fontWeight: 600 }}>
                        {activeContainer?.Names || activeContainerId?.slice(0, 12)}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{activeContainer?.Image}</span>
                    </div>

                    <div style={{
                      flex: 1, background: 'rgba(5,5,10,0.8)', borderRadius: 10,
                      border: '1px solid rgba(6,182,212,0.15)', padding: 12, overflowY: 'auto',
                      fontFamily: 'monospace', fontSize: 12,
                    }}>
                      {execLogs.length === 0 ? (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>No commands run yet…</div>
                      ) : (
                        execLogs.map(log => <ExecLogCard key={log.id} log={log} />)
                      )}
                      <div ref={logsEndRef} />
                    </div>

                    {/* Command input */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(5,5,10,0.7)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, padding: '0 12px' }}>
                        <span style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: 13, marginRight: 8 }}>$</span>
                        <input
                          ref={cmdRef}
                          value={commandInput}
                          onChange={e => setCommandInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') execCommand(); }}
                          placeholder="npm install, python script.py, cargo build…"
                          disabled={isExecing}
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', padding: '10px 0' }}
                        />
                      </div>
                      <button onClick={execCommand} disabled={isExecing || !commandInput.trim()} style={{ ...primaryBtn, opacity: isExecing ? 0.6 : 1 }}>
                        {isExecing ? '⏳' : '▶ Run'}
                      </button>
                      <button onClick={() => setExecLogs([])} style={{ ...dangerBtn, padding: '8px 12px' }} title="Clear logs">🗑</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Images tab ── */}
          {activeTab === 'images' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {SANDBOX_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => pullImage(t.image)} disabled={isLoading} style={{
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                    borderRadius: 8, color: '#22d3ee', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    ⬇ {t.image}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {images.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 24, fontStyle: 'italic' }}>
                    No local images found
                  </div>
                ) : images.map((img, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(6,182,212,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 16 }}>📦</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', flex: 1 }}>{img.Repository}:{img.Tag}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatBytes(img.Size)}</span>
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{img.ID?.slice(0, 12)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── About tab ── */}
          {activeTab === 'about' && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8 }}>
                <h3 style={{ color: '#22d3ee', marginTop: 0 }}>🐳 Docker Sandbox Studio</h3>
                <p>Spawn fully isolated Docker containers to safely build, test, and run complex workloads without polluting your host system.</p>
                <ul style={{ paddingLeft: 20, color: '#64748b' }}>
                  <li>🔒 <strong style={{ color: '#94a3b8' }}>Sandboxed by default</strong> — memory (1GB), CPU (1 core), no privileged access</li>
                  <li>📁 <strong style={{ color: '#94a3b8' }}>Workspace sync</strong> — copy your IDE files into the container with one click</li>
                  <li>⚡ <strong style={{ color: '#94a3b8' }}>8 preset templates</strong> — Node.js, Python, Rust, Go, Ubuntu, Postgres, Deno, Bun</li>
                  <li>🖥️ <strong style={{ color: '#94a3b8' }}>In-panel terminal</strong> — run any shell command and see colorized output</li>
                  <li>📦 <strong style={{ color: '#94a3b8' }}>Image management</strong> — pull and inspect local Docker images</li>
                </ul>
                <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, padding: '12px 16px', marginTop: 12 }}>
                  <strong style={{ color: '#22d3ee' }}>Requirements:</strong> Docker Desktop (Windows/macOS) or Docker Engine (Linux) must be running on the host.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
