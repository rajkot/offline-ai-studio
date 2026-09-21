import { NextRequest, NextResponse } from 'next/server';
import { checkOmniRouteHealth } from '@/lib/ai/omniRouteClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url') || 'http://localhost:20128';
  const status = await checkOmniRouteHealth(url);
  return NextResponse.json(status);
}
