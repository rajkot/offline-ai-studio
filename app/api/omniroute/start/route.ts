import { NextRequest, NextResponse } from 'next/server';
import { ensureOmniRouteRunning } from '@/lib/ai/omniRouteDaemon';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const port = Number(body.port) || 20128;
    const result = await ensureOmniRouteRunning(port);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      started: false,
      online: false,
      message: err.message || 'Failed to start OmniRoute server'
    }, { status: 500 });
  }
}
