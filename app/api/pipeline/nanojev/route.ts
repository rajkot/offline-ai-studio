import { NextRequest, NextResponse } from 'next/server';
import { nanoJevEngine } from '@/lib/ai/nanoJevEngine';

export async function GET() {
  try {
    const status = nanoJevEngine.getStatus();
    return NextResponse.json({
      ok: true,
      data: status
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to retrieve NanoJev status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode 1: HITL Safety Prediction
    if (body.action) {
      const hitlResult = await nanoJevEngine.predictHitlApproval(body.action, body.payload || {});
      return NextResponse.json({
        ok: true,
        type: 'hitl_prediction',
        result: hitlResult
      });
    }

    // Mode 2: Parallel Candidate Decision Scoring
    const state = body.state || '';
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];

    const decision = await nanoJevEngine.evaluateDecisions(state, candidates);

    return NextResponse.json({
      ok: true,
      type: 'decision_evaluation',
      result: decision
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Error executing NanoJev decision forward pass' },
      { status: 400 }
    );
  }
}
