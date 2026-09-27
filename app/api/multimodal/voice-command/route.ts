import { NextRequest, NextResponse } from 'next/server';
import { multimodalVoiceAgentEngine } from '@/lib/ai/multimodalVoiceAgentEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transcript = '', activeFile = 'components/Playground.tsx', existingCode = '' } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Voice transcript string is required.' },
        { status: 400 }
      );
    }

    const result = await multimodalVoiceAgentEngine.executeVoiceCommand(transcript, activeFile, existingCode);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
