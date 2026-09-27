import { NextResponse } from 'next/server';
import { multimodalVoiceAgentEngine } from '@/lib/ai/multimodalVoiceAgentEngine';

export async function GET() {
  try {
    const status = multimodalVoiceAgentEngine.getStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
