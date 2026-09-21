import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseModel, epochs, learningRate, loraRank } = body;

    // Simulate training job initialization
    const jobId = `job-${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      jobId,
      message: `Started fine-tuning job with base model ${baseModel || 'qwen2.5:1.5b'} (Epochs: ${epochs || 3}, LR: ${learningRate || '2e-4'}, LoRA r: ${loraRank || 16})`,
      status: 'training_in_progress',
      estimatedDurationSeconds: 120
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to start training' }, { status: 500 });
  }
}
