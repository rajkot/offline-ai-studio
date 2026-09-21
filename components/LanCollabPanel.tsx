'use client';
// components/LanCollabPanel.tsx
// Offline LAN P2P Pair Programming Studio — zero cloud, zero internet

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { lanCollabEngine, CollabSession, CollabPeer, CollabMessage } from '@/lib/collab/lanCollabEngine';

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface LanCollabPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: string | null;
  cursorLine?: number;
  cursorColumn?: number;
  onIncomingEdit?: (filePath: string, delta: string, peerId: string) => void;
  onFollowPeer?: (filePath: string, line: number) => void;
}

/* ─── Peer Avatar ────────────────────────────────────────────────────────── */

function PeerAvatar({ peer, size = 32 }: { peer: CollabPeer; size?: number }) {
  const initials = peer.name.slice(0, 2).toUpperCase();
  const isActive = Date.now() - peer.lastSeen < 10000;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `${peer.color}33`, border: `2px solid ${peer.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, color: peer.color, userSelect: 'none',
      }}>{initials}</div>
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: size * 0.3, height: size * 0.3, borderRadius: '50%',
        background: isActive ? '#4ade80' : '#475569',
        border: '2px solid #0f172a',
      }} />
    </div>
  );
}

/* ─── Connection QR/Code display ─────────────────────────────────────────── */

function SessionCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 8,
        color: '#22d3ee', background: 'rgba(6,182,212,0.1)', padding: '8px 16px',
        borderRadius: 8, border: '1px solid rgba(6,182,212,0.3)',
      }}>{code}</div>
      <button onClick={copy} style={{
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(6,182,212,0.1)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(6,182,212,0.25)'}`,
        borderRadius: 8, color: copied ? '#4ade80' : '#22d3ee',
        padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      }}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */

export default function LanCollabPanel({ isOpen, onClose, activeFile, cursorLine, cursorColumn, onIncomingEdit, onFollowPeer }: LanCollabPanelProps) {
  const [phase, setPhase] = useState<'lobby' | 'session'>('lobby');
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [sessionName, setSessionName] = useState('Dev Session');
  const [myName, setMyName] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('collab.myName') || 'Developer') : 'Developer');
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<CollabSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'peers' | 'activity'>('chat');
  const [followPeerId, setFollowPeerId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist name
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('collab.myName', myName);
  }, [myName]);

  // Load active sessions on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/collab/signal').then(r => r.json()).then(d => setActiveSessions(d.sessions || [])).catch(() => {});
    }
  }, [isOpen]);

  // Subscribe to collab events
  useEffect(() => {
    const unsubs = [
      lanCollabEngine.on('peer-joined', (e) => {
        setPeers(lanCollabEngine.getSession()?.peers || []);
        setStatusMsg(`👤 ${e.data.peer?.name} joined`);
        setTimeout(() => setStatusMsg(''), 3000);
      }),
      lanCollabEngine.on('peer-left', (e) => {
        setPeers(lanCollabEngine.getSession()?.peers || []);
        setStatusMsg(`👋 ${e.data.peerName} left`);
        setTimeout(() => setStatusMsg(''), 3000);
      }),
      lanCollabEngine.on('chat-received', (e) => {
        setMessages(lanCollabEngine.getSession()?.messages || []);
      }),
      lanCollabEngine.on('crdt-applied', (e) => {
        onIncomingEdit?.(e.data.filePath, e.data.delta, e.data.peerId);
      }),
      lanCollabEngine.on('cursor-moved', (e) => {
        setPeers(lanCollabEngine.getSession()?.peers || []);
        if (followPeerId === e.data.peerId && e.data.filePath) {
          onFollowPeer?.(e.data.filePath, e.data.line || 1);
        }
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [onIncomingEdit, onFollowPeer, followPeerId]);

  // Broadcast cursor position
  useEffect(() => {
    if (session && activeFile && cursorLine !== undefined) {
      lanCollabEngine.broadcastCursorMove(activeFile, cursorLine, cursorColumn || 1);
    }
  }, [session, activeFile, cursorLine, cursorColumn]);

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleHost = async () => {
    if (!myName.trim()) return;
    setIsConnecting(true);
    setError('');
    try {
      const s = await lanCollabEngine.createSession(sessionName, myName);
      setSession(s);
      setPeers(s.peers);
      setMessages(s.messages);
      setPhase('session');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !myName.trim()) return;
    setIsConnecting(true);
    setError('');
    try {
      const s = await lanCollabEngine.joinSession(code, myName);
      setSession(s);
      setPeers(s.peers);
      setMessages(s.messages);
      setPhase('session');
    } catch (e: any) {
      setError(`Could not join: ${e.message}. Make sure the host is on the same network.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = () => {
    lanCollabEngine.leaveSession();
    setSession(null);
    setPeers([]);
    setMessages([]);
    setPhase('lobby');
  };

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !session) return;
    lanCollabEngine.broadcastChat(msg);
    setMessages(lanCollabEngine.getSession()?.messages || []);
    setChatInput('');
  };

  if (!isOpen) return null;

  /* ── Styles ─────────────────────────────────────────────────────────── */

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
  };
  const modal: React.CSSProperties = {
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #042f2e 100%)',
    border: '1px solid rgba(6,182,212,0.35)', borderRadius: 16,
    width: '100%', maxWidth: 780, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 80px rgba(6,182,212,0.2), 0 25px 60px rgba(0,0,0,0.7)', overflow: 'hidden',
  };
  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(6,182,212,0.2)',
    background: 'rgba(6,182,212,0.06)',
  };
  const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 24 };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: 8, color: '#e2e8f0', padding: '10px 14px', fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const primaryBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#0891b2,#0e7490)', border: '1px solid rgba(6,182,212,0.4)',
    borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  };
  const secondBtn: React.CSSProperties = {
    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
    borderRadius: 8, color: '#22d3ee', padding: '10px 20px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  };
  const tabBar: React.CSSProperties = {
    display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid rgba(6,182,212,0.15)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: active ? '#22d3ee' : '#64748b', background: 'transparent', border: 'none',
    borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent', transition: 'all 0.2s',
  });

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>🔌</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>LAN Pair Programming</div>
              <div style={{ fontSize: 11, color: '#475569' }}>Zero cloud · Same Wi-Fi · Air-gapped LAN · Airplane mode</div>
            </div>
            {session && (
              <div style={{ display: 'flex', gap: -8, alignItems: 'center', marginLeft: 8 }}>
                {peers.slice(0, 5).map(p => <div key={p.id} style={{ marginLeft: -6 }}><PeerAvatar peer={p} size={28} /></div>)}
                <div style={{ fontSize: 11, color: '#22d3ee', marginLeft: 8 }}>{peers.length} online</div>
              </div>
            )}
            {statusMsg && <div style={{ fontSize: 11, color: '#22d3ee', fontStyle: 'italic' }}>{statusMsg}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {session && (
              <button onClick={handleLeave} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                ⏏ Leave
              </button>
            )}
            <button onClick={onClose} style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        </div>

        {/* ── Lobby ── */}
        {phase === 'lobby' && (
          <div style={body}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Host */}
              <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee', marginBottom: 16 }}>🏠 Host a Session</div>
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>YOUR NAME</label>
                <input value={myName} onChange={e => setMyName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} placeholder="Alice" />
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>SESSION NAME</label>
                <input value={sessionName} onChange={e => setSessionName(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} placeholder="Sprint Planning" />
                <button onClick={handleHost} disabled={isConnecting || !myName.trim()} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', opacity: isConnecting ? 0.6 : 1 }}>
                  {isConnecting ? '⏳ Starting…' : '▶ Start Session'}
                </button>
              </div>

              {/* Join */}
              <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginBottom: 16 }}>🔗 Join a Session</div>
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>YOUR NAME</label>
                <input value={myName} onChange={e => setMyName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} placeholder="Bob" />
                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>SESSION CODE</label>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} style={{ ...inputStyle, marginBottom: 16, fontFamily: 'monospace', letterSpacing: 6, fontSize: 18, fontWeight: 700 }} placeholder="ABC123" maxLength={10} />
                <button onClick={handleJoin} disabled={isConnecting || !joinCode.trim() || !myName.trim()} style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: isConnecting ? 0.6 : 1 }}>
                  {isConnecting ? '⏳ Joining…' : '→ Join Session'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Active sessions on LAN */}
            {activeSessions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: '#22d3ee', fontWeight: 700, marginBottom: 8 }}>ACTIVE SESSIONS ON LOCAL NETWORK</div>
                {activeSessions.map(s => (
                  <div key={s.sessionId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, padding: '8px 14px', marginBottom: 6, cursor: 'pointer' }}
                    onClick={() => { setJoinCode(s.sessionId); setMode('join'); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{s.sessionName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.peerCount} peer{s.peerCount !== 1 ? 's' : ''} · {s.sessionId}</div>
                    </div>
                    <button style={{ ...secondBtn, padding: '5px 12px', fontSize: 11 }} onClick={() => setJoinCode(s.sessionId)}>Join</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', marginBottom: 8 }}>ℹ️ How it works</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
                <li>Host starts a session and shares the 6-character code</li>
                <li>Guests join using the code — <strong style={{ color: '#94a3b8' }}>no internet required</strong></li>
                <li>Live cursors, shared file views, and inline chat</li>
                <li>Works on same Wi-Fi, Ethernet LAN, or localhost</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Session view ── */}
        {phase === 'session' && session && (
          <>
            <div style={tabBar}>
              <button style={tabStyle(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>💬 Chat ({messages.length})</button>
              <button style={tabStyle(activeTab === 'peers')} onClick={() => setActiveTab('peers')}>👥 Peers ({peers.length})</button>
              <button style={tabStyle(activeTab === 'activity')} onClick={() => setActiveTab('activity')}>📍 Activity</button>
            </div>

            {/* Session code */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(6,182,212,0.1)', background: 'rgba(6,182,212,0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>SESSION CODE:</div>
              <SessionCode code={session.sessionId} />
              <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Share this with teammates on the same network</div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Chat tab */}
              {activeTab === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px' }}>
                    {messages.length === 0 && (
                      <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 24, fontStyle: 'italic' }}>
                        No messages yet. Say hello! 👋
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: `${msg.peerColor}33`,
                          border: `2px solid ${msg.peerColor}`, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 10, fontWeight: 700, color: msg.peerColor,
                          flexShrink: 0,
                        }}>{msg.peerName.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 11, color: msg.peerColor, fontWeight: 700, marginBottom: 2 }}>
                            {msg.peerName} <span style={{ color: '#475569', fontWeight: 400 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#e2e8f0', background: 'rgba(30,41,59,0.5)', padding: '6px 10px', borderRadius: '0 8px 8px 8px', maxWidth: 440, wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(6,182,212,0.1)', display: 'flex', gap: 8 }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                      placeholder="Send a message to all peers…"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={handleSendChat} disabled={!chatInput.trim()} style={{ ...primaryBtn, opacity: !chatInput.trim() ? 0.5 : 1 }}>
                      ↑ Send
                    </button>
                  </div>
                </div>
              )}

              {/* Peers tab */}
              {activeTab === 'peers' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {peers.map(peer => {
                      const isLocal = peer.id === session.localPeerId;
                      const isFollowing = followPeerId === peer.id;
                      return (
                        <div key={peer.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: isLocal ? 'rgba(6,182,212,0.08)' : 'rgba(30,41,59,0.4)',
                          border: `1px solid ${isLocal ? 'rgba(6,182,212,0.3)' : 'rgba(30,41,59,0.8)'}`,
                          borderRadius: 10, padding: '12px 16px',
                        }}>
                          <PeerAvatar peer={peer} size={38} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>
                              {peer.name} {isLocal && <span style={{ fontSize: 10, color: '#22d3ee', fontWeight: 400 }}>(you)</span>}
                              {peer.isHost && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginLeft: 6 }}>HOST</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {peer.cursorFile ? `📄 ${peer.cursorFile} : L${peer.cursorLine}` : 'No active file'}
                            </div>
                          </div>
                          {!isLocal && (
                            <button
                              onClick={() => setFollowPeerId(isFollowing ? null : peer.id)}
                              style={{
                                background: isFollowing ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.07)',
                                border: `1px solid ${isFollowing ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.2)'}`,
                                borderRadius: 6, color: '#22d3ee', padding: '5px 12px',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              }}
                            >{isFollowing ? '👁 Following' : '👁 Follow'}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity tab */}
              {activeTab === 'activity' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Real-time peer cursor positions across the workspace
                  </div>
                  {peers.filter(p => p.cursorFile).map(peer => (
                    <div key={peer.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                      background: 'rgba(30,41,59,0.3)', borderRadius: 8, padding: '8px 12px',
                    }}>
                      <PeerAvatar peer={peer} size={26} />
                      <div style={{ flex: 1, fontSize: 12 }}>
                        <span style={{ color: peer.color, fontWeight: 600 }}>{peer.name}</span>
                        <span style={{ color: '#64748b' }}> is editing </span>
                        <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{peer.cursorFile}</span>
                        <span style={{ color: '#64748b' }}> at line {peer.cursorLine}</span>
                      </div>
                      <button onClick={() => onFollowPeer?.(peer.cursorFile!, peer.cursorLine)} style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 5, color: '#22d3ee', padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
                        Jump
                      </button>
                    </div>
                  ))}
                  {peers.every(p => !p.cursorFile) && (
                    <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 24, fontStyle: 'italic' }}>
                      No active cursor positions yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
