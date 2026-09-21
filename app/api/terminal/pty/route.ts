import { NextResponse } from 'next/server';
import { ptyManager } from '@/lib/terminal/ptyManager';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, shell, cols = 80, rows = 24, sessionId, data, cwd } = body;

    if (action === 'start-server') {
      const res = await ptyManager.ensureWebSocketServer(3002);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'shells') {
      const shells = ptyManager.getAvailableShells();
      return NextResponse.json({ success: true, shells });
    }

    if (action === 'create') {
      const session = ptyManager.createSession(shell, cols, rows, cwd);
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        shell: session.shell
      });
    }

    if (action === 'input') {
      if (!sessionId || data === undefined) {
        return NextResponse.json({ success: false, error: 'sessionId and data required' }, { status: 400 });
      }
      const ok = ptyManager.writeInput(sessionId, data);
      return NextResponse.json({ success: ok });
    }

    if (action === 'resize') {
      if (!sessionId || !cols || !rows) {
        return NextResponse.json({ success: false, error: 'sessionId, cols, and rows required' }, { status: 400 });
      }
      const ok = ptyManager.resizeSession(sessionId, cols, rows);
      return NextResponse.json({ success: ok });
    }

    if (action === 'kill') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
      }
      const ok = ptyManager.killSession(sessionId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// SSE fallback stream
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    const shells = ptyManager.getAvailableShells();
    return NextResponse.json({ success: true, shells });
  }

  const session = ptyManager.getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send historical buffer
  if (session.outputBuffer.length > 0) {
    const initData = session.outputBuffer.join('');
    writer.write(encoder.encode(`data: ${JSON.stringify({ text: initData })}\n\n`));
  }

  const listener = (chunk: string) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
    } catch (e) {}
  };

  session.subscribers.add(listener);

  req.signal.addEventListener('abort', () => {
    session.subscribers.delete(listener);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
