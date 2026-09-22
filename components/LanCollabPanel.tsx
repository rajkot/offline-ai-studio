'use client';
// components/LanCollabPanel.tsx
// Offline LAN P2P Pair Programming Studio — zero cloud, zero internet

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  lanCollabEngine,
  CollabSession,
  CollabPeer,
  CollabMessage,
  TerminalBroadcastLog
} from '@/lib/collab/lanCollabEngine';
import {
  Users,
  Mic,
  MicOff,
  Terminal,
  MessageSquare,
  Activity,
  Copy,
  Check,
  Wifi,
  Radio,
  Play,
  Share2,
  Volume2,
  VolumeX,
  Send,
  Eye,
  LogOut,
  X
} from 'lucide-react';

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
  const isActive = Date.now() - peer.lastSeen < 12000;
  return (
    <div className="relative inline-block" title={`${peer.name} (${isActive ? 'Online' : 'Away'})`}>
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: `${peer.color}25`,
          borderColor: peer.color,
          color: peer.color,
          fontSize: size * 0.38
        }}
        className="rounded-full border-2 flex items-center justify-center font-bold font-mono select-none"
      >
        {initials}
      </div>
      <div
        className={`absolute bottom-0 right-0 rounded-full border-2 border-[#0f172a] ${
          isActive ? 'bg-emerald-400' : 'bg-zinc-600'
        }`}
        style={{ width: size * 0.32, height: size * 0.32 }}
      />
    </div>
  );
}

export default function LanCollabPanel({
  isOpen,
  onClose,
  activeFile,
  cursorLine,
  cursorColumn,
  onIncomingEdit,
  onFollowPeer
}: LanCollabPanelProps) {
  const [phase, setPhase] = useState<'lobby' | 'session'>('lobby');
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [sessionName, setSessionName] = useState('LAN Pair Session');
  const [myName, setMyName] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('collab.myName') || 'Dev_' + Math.floor(Math.random() * 100)) : 'Dev_1');
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<CollabSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<TerminalBroadcastLog[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'peers' | 'terminal' | 'voice'>('chat');
  const [followPeerId, setFollowPeerId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Voice Chat State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
        setStatusMsg(`👤 ${e.data.peer?.name || 'A developer'} joined session`);
        setTimeout(() => setStatusMsg(''), 3500);
      }),
      lanCollabEngine.on('peer-left', (e) => {
        setPeers(lanCollabEngine.getSession()?.peers || []);
        setStatusMsg(`👋 ${e.data.peerName} disconnected`);
        setTimeout(() => setStatusMsg(''), 3500);
      }),
      lanCollabEngine.on('chat-received', () => {
        setMessages(lanCollabEngine.getSession()?.messages || []);
      }),
      lanCollabEngine.on('crdt-applied', (e) => {
        onIncomingEdit?.(e.data.filePath, e.data.delta, e.data.peerId);
      }),
      lanCollabEngine.on('terminal-output', (e) => {
        setTerminalLogs(prev => [...prev, e.data]);
      }),
      lanCollabEngine.on('voice-state-changed', (e) => {
        setPeers(lanCollabEngine.getSession()?.peers || []);
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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLogs]);

  const handleHost = async () => {
    if (!myName.trim()) return;
    setIsConnecting(true);
    setError('');
    try {
      const s = await lanCollabEngine.createSession(sessionName, myName);
      setSession(s);
      setPeers(s.peers);
      setMessages(s.messages);
      setTerminalLogs(s.terminalLogs);
      setPhase('session');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoin = async (targetCode?: string) => {
    const code = (targetCode || joinCode).trim().toLowerCase();
    if (!code || !myName.trim()) return;
    setIsConnecting(true);
    setError('');
    try {
      const s = await lanCollabEngine.joinSession(code, myName);
      setSession(s);
      setPeers(s.peers);
      setMessages(s.messages);
      setTerminalLogs(s.terminalLogs);
      setPhase('session');
    } catch (e: any) {
      setError(`Could not connect: ${e.message}. Ensure peer is on the same local Wi-Fi / subnet.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = () => {
    lanCollabEngine.leaveSession();
    setSession(null);
    setPeers([]);
    setMessages([]);
    setTerminalLogs([]);
    setIsVoiceActive(false);
    setPhase('lobby');
  };

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !session) return;
    lanCollabEngine.broadcastChat(msg);
    setMessages(lanCollabEngine.getSession()?.messages || []);
    setChatInput('');
  };

  const handleToggleVoice = async () => {
    if (!isVoiceActive) {
      const ok = await lanCollabEngine.startVoiceChat();
      if (ok) {
        setIsVoiceActive(true);
        setIsMuted(false);
      }
    } else {
      lanCollabEngine.stopVoiceChat();
      setIsVoiceActive(false);
    }
  };

  const handleToggleMute = () => {
    const muted = lanCollabEngine.toggleMute();
    setIsMuted(muted);
  };

  const copySessionCode = () => {
    if (!session) return;
    navigator.clipboard?.writeText(session.sessionId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#090d16] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-900/40 bg-[#0d1322] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-zinc-100 uppercase tracking-wide font-mono">
                  Offline Peer-to-Peer LAN Pair Programming
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono font-bold">
                  Zero Cloud · WebRTC CRDT
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Direct Wi-Fi / Local Subnet collaboration with live cursors, shared terminal, and P2P voice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <div className="flex items-center gap-2 mr-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                <button
                  onClick={handleToggleVoice}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    isVoiceActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={isVoiceActive ? 'Disconnect Voice' : 'Join Offline LAN Voice Chat'}
                >
                  {isVoiceActive ? <Mic size={14} className="text-emerald-400" /> : <MicOff size={14} />}
                  <span>{isVoiceActive ? 'Voice Connected' : 'Join Voice'}</span>
                </button>

                {isVoiceActive && (
                  <button
                    onClick={handleToggleMute}
                    className={`p-1 rounded cursor-pointer ${isMuted ? 'text-rose-400 bg-rose-950/60' : 'text-zinc-400 hover:text-white'}`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#090d16] custom-scrollbar">
          {/* ══════════════════════════════════════════════════════════════════
              PHASE 1: LOBBY (HOST / JOIN)
             ══════════════════════════════════════════════════════════════════ */}
          {phase === 'lobby' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Developer Nickname Box */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <label className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider block">
                  Your Developer Handle (Name Tag in Monaco)
                </label>
                <input
                  type="text"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="e.g. Alice, Bob, Architect"
                  className="w-full bg-[#101524] border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Host vs Join Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('host')}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                    mode === 'host'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-900/20 text-white'
                      : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-cyan-400 mb-2 font-mono font-bold text-sm flex items-center gap-1.5">
                    <Radio size={16} />
                    <span>Host a Session</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Create a room code and invite peers on your local Wi-Fi or LAN network to collaborate live on your project.
                  </p>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                    mode === 'join'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-900/20 text-white'
                      : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-cyan-400 mb-2 font-mono font-bold text-sm flex items-center gap-1.5">
                    <Wifi size={16} />
                    <span>Join Existing Session</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Connect to a peer using their 6-character room code or local IP to sync editor state and cursor.
                  </p>
                </button>
              </div>

              {/* Host Mode Form */}
              {mode === 'host' && (
                <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider block mb-1.5">
                      Session Name
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="e.g. Feature-12 Refactoring Session"
                      className="w-full bg-[#101524] border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={handleHost}
                    disabled={isConnecting}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-900/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Radio size={16} />
                    <span>Launch Local LAN Session</span>
                  </button>
                </div>
              )}

              {/* Join Mode Form */}
              {mode === 'join' && (
                <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider block mb-1.5">
                      Enter 6-Character Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                      placeholder="e.g. oai-a7b2c9"
                      className="w-full bg-[#101524] border border-zinc-700 rounded-lg p-2.5 text-xs text-cyan-300 font-mono tracking-widest uppercase focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={() => handleJoin()}
                    disabled={isConnecting || !joinCode.trim()}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-900/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Wifi size={16} />
                    <span>Connect to Peer</span>
                  </button>

                  {/* Active Local LAN Discoveries */}
                  {activeSessions.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        📡 Active LAN Sessions Discovered on Local Network:
                      </div>
                      <div className="space-y-1.5">
                        {activeSessions.map((s: any) => (
                          <div
                            key={s.sessionId}
                            onClick={() => handleJoin(s.sessionId)}
                            className="p-2.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="font-mono text-xs text-white font-bold">{s.sessionName || s.sessionId}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">({s.peers?.length || 1} online)</span>
                            </div>
                            <span className="text-cyan-400 text-xs font-mono font-bold">{s.sessionId} →</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PHASE 2: ACTIVE SESSION
             ══════════════════════════════════════════════════════════════════ */}
          {phase === 'session' && session && (
            <div className="space-y-5">
              {/* Session Bar */}
              <div className="p-4 bg-[#101628] border border-cyan-900/40 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    {peers.map(p => (
                      <PeerAvatar key={p.id} peer={p} size={30} />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">{session.sessionName}</span>
                      <span className="text-xs text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700/50">
                        {peers.length} Developers Connected
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span>Room Code: <strong className="font-mono text-cyan-300">{session.sessionId}</strong></span>
                      <button
                        onClick={copySessionCode}
                        className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'chat' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare size={12} />
                      <span>Chat ({messages.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('terminal')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'terminal' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Terminal size={12} />
                      <span>Shared Terminal ({terminalLogs.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('peers')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'peers' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Users size={12} />
                      <span>Peers ({peers.length})</span>
                    </button>
                  </div>

                  <button
                    onClick={handleLeave}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Leave</span>
                  </button>
                </div>
              </div>

              {statusMsg && (
                <div className="text-xs text-cyan-300 font-mono animate-pulse">
                  {statusMsg}
                </div>
              )}

              {/* TAB: CHAT */}
              {activeTab === 'chat' && (
                <div className="border border-zinc-800 rounded-xl bg-zinc-950/60 flex flex-col h-80 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar font-mono text-xs">
                    {messages.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 text-xs">
                        No messages yet. Say hello to your offline pair programming partner!
                      </div>
                    ) : (
                      messages.map((m, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span style={{ color: m.peerColor }} className="font-bold shrink-0">
                            [{m.peerName}]:
                          </span>
                          <span className="text-zinc-200">{m.content}</span>
                          <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-2 border-t border-zinc-800 bg-zinc-900/60 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                      placeholder="Type a message to peers..."
                      className="flex-1 bg-[#101524] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={handleSendChat}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: SHARED TERMINAL BROADCAST */}
              {activeTab === 'terminal' && (
                <div className="border border-zinc-800 rounded-xl bg-black p-4 h-80 flex flex-col font-mono text-xs overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[10px] text-zinc-400">
                    <span>📡 Synchronized Terminal Output Stream</span>
                    <span>All peers view terminal commands in real-time</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pt-3 custom-scrollbar text-zinc-300">
                    {terminalLogs.length === 0 ? (
                      <div className="text-zinc-600 py-16 text-center text-xs">
                        No shared terminal broadcasts yet. Any terminal test runs or compiler output are shared automatically here.
                      </div>
                    ) : (
                      terminalLogs.map((log) => (
                        <div key={log.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span style={{ color: log.peerColor }} className="font-bold">
                              ${log.peerName}
                            </span>
                            <span className="text-zinc-400">ran:</span>
                            <span className="text-cyan-300 font-bold">{log.command}</span>
                          </div>
                          <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 whitespace-pre-wrap">
                            {log.output}
                          </pre>
                        </div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              )}

              {/* TAB: PEERS LIST & FOLLOW CURSOR */}
              {activeTab === 'peers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {peers.map(p => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <PeerAvatar peer={p} size={36} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white font-mono">{p.name}</span>
                            {p.isHost && (
                              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1 py-0.2 rounded font-mono">
                                HOST
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {p.cursorFile ? `${p.cursorFile.split('/').pop()}:${p.cursorLine}` : 'Browsing'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (p.cursorFile && onFollowPeer) {
                              onFollowPeer(p.cursorFile, p.cursorLine || 1);
                              setFollowPeerId(p.id);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            followPeerId === p.id
                              ? 'bg-cyan-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <Eye size={12} />
                          <span>{followPeerId === p.id ? 'Following' : 'Follow'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cyan-900/40 bg-[#0d1322] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Air-gapped P2P protocol: No internet connection or third-party servers required</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
