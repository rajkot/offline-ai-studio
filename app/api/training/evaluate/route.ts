import { NextRequest, NextResponse } from 'next/server';
import { loraFineTuningEngine } from '@/lib/ai/loraFineTuningEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      prompt = 'Implement a thread-safe token bucket rate limiter with burst capacity', 
      baseModel = 'llama3.2:3b',
      jobId
    } = body;

    const comparison = await loraFineTuningEngine.evaluateComparison(prompt, baseModel, jobId);

    return NextResponse.json({
      success: true,
      prompt,
      baseModel,
      jobId,
      ...comparison
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
