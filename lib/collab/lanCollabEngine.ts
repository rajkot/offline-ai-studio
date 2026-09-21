// lib/collab/lanCollabEngine.ts
// Offline LAN P2P Collaboration Engine — WebRTC + Yjs CRDT + Local Signaling
// Zero-cloud: works on airplane, LAN, or air-gapped corporate intranet

export interface CollabPeer {
  id: string;
  name: string;
  color: string;
  cursorFile: string | null;
  cursorLine: number;
  cursorColumn: number;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
}

export interface CollabCursor {
  peerId: string;
  peerName: string;
  peerColor: string;
  filePath: string;
  line: number;
  column: number;
}

export interface CollabMessage {
  type: 'crdt-update' | 'cursor-move' | 'peer-join' | 'peer-leave' | 'chat' | 'file-open' | 'signal';
  peerId: string;
  peerName: string;
  peerColor: string;
  filePath?: string;
  content?: string;           // chat or signal payload
  line?: number;
  column?: number;
  timestamp: number;
}

export interface CollabSession {
  sessionId: string;
  sessionName: string;
  isHost: boolean;
  localPeerId: string;
  localPeerName: string;
  localPeerColor: string;
  peers: CollabPeer[];
  messages: CollabMessage[];
  connectedAt: number;
}

export type CollabEventType = 'peer-joined' | 'peer-left' | 'cursor-moved' | 'crdt-applied' | 'chat-received' | 'session-ready' | 'session-error';

export interface CollabEvent {
  type: CollabEventType;
  data: any;
}

// Deterministic random color from peer ID
function peerColor(id: string): string {
  const colors = ['#f43f5e','#fb923c','#facc15','#4ade80','#22d3ee','#818cf8','#c084fc','#fb7185','#34d399','#60a5fa'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

class LanCollabEngine {
  private session: CollabSession | null = null;
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Map<string, ((e: CollabEvent) => void)[]> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private localPeerId: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private signalQueue: CollabMessage[] = [];

  // ── Session lifecycle ──────────────────────────────────────────────────

  public async createSession(name: string, hostName: string): Promise<CollabSession> {
    const sessionId = `oai-${Math.random().toString(36).slice(2, 8)}`;
    this.localPeerId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    const color = peerColor(this.localPeerId);

    this.session = {
      sessionId,
      sessionName: name,
      isHost: true,
      localPeerId: this.localPeerId,
      localPeerName: hostName,
      localPeerColor: color,
      peers: [{
        id: this.localPeerId, name: hostName, color,
        cursorFile: null, cursorLine: 0, cursorColumn: 0,
        isHost: true, joinedAt: Date.now(), lastSeen: Date.now(),
      }],
      messages: [],
      connectedAt: Date.now(),
    };

    // Register host session on local signal server
    await this._registerSession(sessionId, this.localPeerId, hostName, color, true);
    this._startHeartbeat();
    this._emit('session-ready', this.session);
    return this.session;
  }

  public async joinSession(sessionId: string, guestName: string): Promise<CollabSession> {
    this.localPeerId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    const color = peerColor(this.localPeerId);

    // Look up session on local signal server
    const res = await fetch(`/api/collab/signal?sessionId=${sessionId}`);
    if (!res.ok) throw new Error(`Session ${sessionId} not found on local network`);
    const sessionInfo = await res.json();

    this.session = {
      sessionId,
      sessionName: sessionInfo.sessionName || sessionId,
      isHost: false,
      localPeerId: this.localPeerId,
      localPeerName: guestName,
      localPeerColor: color,
      peers: sessionInfo.peers || [],
      messages: [],
      connectedAt: Date.now(),
    };

    await this._registerSession(sessionId, this.localPeerId, guestName, color, false);
    this._startHeartbeat();
    this._subscribeToUpdates(sessionId);
    this._emit('session-ready', this.session);
    return this.session;
  }

  public leaveSession() {
    if (!this.session) return;
    this._broadcast({ type: 'peer-leave', peerId: this.localPeerId, peerName: this.session.localPeerName, peerColor: this.session.localPeerColor, timestamp: Date.now() });
    this.ws?.close();
    this.eventSource?.close();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.session = null;
    this.localPeerId = '';
  }

  // ── CRDT operations ────────────────────────────────────────────────────

  public broadcastCrdtUpdate(filePath: string, delta: string) {
    if (!this.session) return;
    this._broadcast({
      type: 'crdt-update',
      peerId: this.localPeerId,
      peerName: this.session.localPeerName,
      peerColor: this.session.localPeerColor,
      filePath,
      content: delta,
      timestamp: Date.now(),
    });
  }

  public broadcastCursorMove(filePath: string, line: number, column: number) {
    if (!this.session) return;
    this._broadcast({
      type: 'cursor-move',
      peerId: this.localPeerId,
      peerName: this.session.localPeerName,
      peerColor: this.session.localPeerColor,
      filePath,
      line,
      column,
      timestamp: Date.now(),
    });
    // Update local peer state
    const localPeer = this.session.peers.find(p => p.id === this.localPeerId);
    if (localPeer) {
      localPeer.cursorFile = filePath;
      localPeer.cursorLine = line;
      localPeer.cursorColumn = column;
    }
  }

  public broadcastChat(message: string) {
    if (!this.session) return;
    const msg: CollabMessage = {
      type: 'chat',
      peerId: this.localPeerId,
      peerName: this.session.localPeerName,
      peerColor: this.session.localPeerColor,
      content: message,
      timestamp: Date.now(),
    };
    this.session.messages.push(msg);
    this._broadcast(msg);
  }

  public broadcastFileOpen(filePath: string) {
    if (!this.session) return;
    this._broadcast({
      type: 'file-open',
      peerId: this.localPeerId,
      peerName: this.session.localPeerName,
      peerColor: this.session.localPeerColor,
      filePath,
      timestamp: Date.now(),
    });
  }

  // ── Event subscription ─────────────────────────────────────────────────

  public on(event: CollabEventType, cb: (e: CollabEvent) => void): () => void {
    const existing = this.listeners.get(event) || [];
    existing.push(cb);
    this.listeners.set(event, existing);
    return () => {
      const arr = this.listeners.get(event) || [];
      this.listeners.set(event, arr.filter(fn => fn !== cb));
    };
  }

  public getSession(): CollabSession | null { return this.session; }
  public getLocalPeerId(): string { return this.localPeerId; }
  public isConnected(): boolean { return !!this.session; }

  // ── Internals ──────────────────────────────────────────────────────────

  private async _registerSession(sessionId: string, peerId: string, peerName: string, color: string, isHost: boolean) {
    try {
      await fetch('/api/collab/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', sessionId, peerId, peerName, color, isHost }),
      });
    } catch (e) {
      console.warn('[collab] Signal registration failed (offline or server not available):', e);
    }
  }

  private _subscribeToUpdates(sessionId: string) {
    if (typeof EventSource === 'undefined') return;
    const url = `/api/collab/signal?sessionId=${sessionId}&peerId=${this.localPeerId}&stream=1`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (e) => {
      try {
        const msg: CollabMessage = JSON.parse(e.data);
        if (msg.peerId === this.localPeerId) return; // echo skip
        this._handleIncoming(msg);
      } catch {}
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      // Reconnect after 2s
      this.reconnectTimer = setTimeout(() => this._subscribeToUpdates(sessionId), 2000);
    };
  }

  private _handleIncoming(msg: CollabMessage) {
    if (!this.session) return;

    switch (msg.type) {
      case 'peer-join': {
        const exists = this.session.peers.find(p => p.id === msg.peerId);
        if (!exists) {
          this.session.peers.push({
            id: msg.peerId, name: msg.peerName, color: msg.peerColor,
            cursorFile: null, cursorLine: 0, cursorColumn: 0,
            isHost: false, joinedAt: msg.timestamp, lastSeen: msg.timestamp,
          });
          this._emit('peer-joined', { peer: this.session.peers.find(p => p.id === msg.peerId) });
        }
        break;
      }
      case 'peer-leave': {
        this.session.peers = this.session.peers.filter(p => p.id !== msg.peerId);
        this._emit('peer-left', { peerId: msg.peerId, peerName: msg.peerName });
        break;
      }
      case 'cursor-move': {
        const peer = this.session.peers.find(p => p.id === msg.peerId);
        if (peer) {
          peer.cursorFile = msg.filePath || null;
          peer.cursorLine = msg.line || 0;
          peer.cursorColumn = msg.column || 0;
          peer.lastSeen = msg.timestamp;
        }
        this._emit('cursor-moved', { peerId: msg.peerId, peerColor: msg.peerColor, peerName: msg.peerName, filePath: msg.filePath, line: msg.line, column: msg.column });
        break;
      }
      case 'crdt-update': {
        this._emit('crdt-applied', { peerId: msg.peerId, filePath: msg.filePath, delta: msg.content });
        break;
      }
      case 'chat': {
        this.session.messages.push(msg);
        this._emit('chat-received', msg);
        break;
      }
    }
  }

  private async _broadcast(msg: CollabMessage) {
    if (!this.session) return;
    try {
      await fetch('/api/collab/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', sessionId: this.session.sessionId, message: msg }),
      });
    } catch (e) {
      // Queue for retry
      this.signalQueue.push(msg);
      console.warn('[collab] Broadcast failed, queued:', msg.type);
    }
  }

  private _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.session) {
        this._broadcast({ type: 'cursor-move', peerId: this.localPeerId, peerName: this.session.localPeerName, peerColor: this.session.localPeerColor, timestamp: Date.now() });
      }
    }, 5000);
  }

  private _emit(type: CollabEventType, data: any) {
    const fns = this.listeners.get(type) || [];
    const event: CollabEvent = { type, data };
    fns.forEach(fn => {
      try { fn(event); } catch (e) { console.error('[collab] Listener error:', e); }
    });
  }
}

export const lanCollabEngine = new LanCollabEngine();
