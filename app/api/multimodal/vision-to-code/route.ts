import { NextRequest, NextResponse } from 'next/server';
import { multimodalVoiceAgentEngine } from '@/lib/ai/multimodalVoiceAgentEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await multimodalVoiceAgentEngine.synthesizeFromVision(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
