// app/api/collab/signal/route.ts
// Local LAN Signaling Server — SSE-based broadcast hub for P2P collaboration
// No cloud, no internet required. Works on airplane mode / corporate LAN.

import { NextRequest, NextResponse } from 'next/server';

/* ─── In-memory session store ────────────────────────────────────────────── */

interface SessionPeer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
}

interface CollabSession {
  sessionId: string;
  sessionName: string;
  hostPeerId: string;
  peers: SessionPeer[];
  messageLog: any[];
  createdAt: number;
  sseControllers: Map<string, ReadableStreamDefaultController>;
}

// Module-level singleton store (persists across requests in the same process)
const sessions = new Map<string, CollabSession>();

function cleanupStaleSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    // Remove sessions inactive for > 2 hours
    if (now - s.createdAt > 2 * 60 * 60 * 1000 && s.peers.length === 0) {
      sessions.delete(id);
    }
  }
}

/* ─── SSE broadcast ──────────────────────────────────────────────────────── */

function broadcastToSession(session: CollabSession, message: any, excludePeerId?: string) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  const dead: string[] = [];

  for (const [peerId, controller] of session.sseControllers) {
    if (peerId === excludePeerId) continue;
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      dead.push(peerId);
    }
  }

  // Clean up dead connections
  dead.forEach(id => session.sseControllers.delete(id));
}

/* ─── GET: List session info or subscribe via SSE ───────────────────────── */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const peerId = searchParams.get('peerId');
  const stream = searchParams.get('stream');

  cleanupStaleSessions();

  // Discovery: list all active sessions
  if (!sessionId) {
    const list = Array.from(sessions.values()).map(s => ({
      sessionId: s.sessionId,
      sessionName: s.sessionName,
      hostPeerId: s.hostPeerId,
      peerCount: s.peers.length,
      createdAt: s.createdAt,
    }));
    return NextResponse.json({ sessions: list });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: `Session ${sessionId} not found` }, { status: 404 });
  }

  // SSE subscription mode
  if (stream === '1' && peerId) {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController;

    const readable = new ReadableStream({
      start(controller) {
        streamController = controller;
        session.sseControllers.set(peerId, controller);

        // Send current session state immediately
        const initMsg = JSON.stringify({
          type: 'session-state',
          peers: session.peers,
          messageLog: session.messageLog.slice(-50),
          sessionId,
          sessionName: session.sessionName,
        });
        controller.enqueue(encoder.encode(`data: ${initMsg}\n\n`));
      },
      cancel() {
        session.sseControllers.delete(peerId);
        // Remove peer from session
        session.peers = session.peers.filter(p => p.id !== peerId);
        // Notify others of departure
        broadcastToSession(session, {
          type: 'peer-leave',
          peerId,
          peerName: 'Unknown',
          peerColor: '#94a3b8',
          timestamp: Date.now(),
        });
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // Regular session info lookup
  return NextResponse.json({
    sessionId: session.sessionId,
    sessionName: session.sessionName,
    hostPeerId: session.hostPeerId,
    peers: session.peers.map(p => ({
      id: p.id, name: p.name, color: p.color,
      isHost: p.isHost, joinedAt: p.joinedAt,
    })),
    peerCount: session.peers.length,
    createdAt: session.createdAt,
  });
}

/* ─── POST: register, broadcast, leave ──────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, peerId, peerName, color, isHost, message } = body;

    switch (action) {

      // ── Register a peer (host creates session, guest joins) ────────────
      case 'register': {
        if (!sessionId || !peerId || !peerName) {
          return NextResponse.json({ error: 'sessionId, peerId, and peerName are required' }, { status: 400 });
        }

        let session = sessions.get(sessionId);

        if (!session) {
          // Create new session (host)
          session = {
            sessionId,
            sessionName: body.sessionName || `Session ${sessionId}`,
            hostPeerId: peerId,
            peers: [],
            messageLog: [],
            createdAt: Date.now(),
            sseControllers: new Map(),
          };
          sessions.set(sessionId, session);
        }

        // Add or update peer
        const existing = session.peers.find(p => p.id === peerId);
        if (!existing) {
          session.peers.push({
            id: peerId, name: peerName, color: color || '#a78bfa',
            isHost: isHost || false, joinedAt: Date.now(), lastSeen: Date.now(),
          });
        } else {
          existing.lastSeen = Date.now();
        }

        // Broadcast join to other peers
        const joinMsg = {
          type: 'peer-join',
          peerId, peerName, peerColor: color || '#a78bfa',
          timestamp: Date.now(),
        };
        broadcastToSession(session, joinMsg, peerId);

        return NextResponse.json({
          success: true,
          sessionId,
          sessionName: session.sessionName,
          peers: session.peers,
        });
      }

      // ── Broadcast a message to all peers in session ────────────────────
      case 'broadcast': {
        if (!sessionId || !message) {
          return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
        }

        const session = sessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Update peer heartbeat
        const peer = session.peers.find(p => p.id === message.peerId);
        if (peer) peer.lastSeen = Date.now();

        // Log chat and cursor messages
        if (message.type === 'chat' || message.type === 'file-open') {
          session.messageLog.push(message);
          if (session.messageLog.length > 200) session.messageLog.shift();
        }

        broadcastToSession(session, message, message.peerId);

        return NextResponse.json({ success: true, delivered: session.sseControllers.size });
      }

      // ── Leave session ──────────────────────────────────────────────────
      case 'leave': {
        const session = sessions.get(sessionId);
        if (session) {
          session.peers = session.peers.filter(p => p.id !== peerId);
          session.sseControllers.delete(peerId || '');

          broadcastToSession(session, {
            type: 'peer-leave',
            peerId, peerName, peerColor: color,
            timestamp: Date.now(),
          });

          if (session.peers.length === 0) {
            sessions.delete(sessionId);
          }
        }
        return NextResponse.json({ success: true });
      }

      // ── Delete/close session (host only) ──────────────────────────────
      case 'close': {
        const session = sessions.get(sessionId);
        if (session) {
          broadcastToSession(session, { type: 'session-closed', timestamp: Date.now() });
          session.sseControllers.forEach(ctrl => { try { ctrl.close(); } catch {} });
          sessions.delete(sessionId);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[collab-signal] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
