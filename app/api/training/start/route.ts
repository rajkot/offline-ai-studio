import { NextRequest, NextResponse } from 'next/server';
import { loraFineTuningEngine, LoraTrainingConfig } from '@/lib/ai/loraFineTuningEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      baseModel = 'llama3.2:3b',
      loraRank = 16,
      loraAlpha = 32,
      loraDropout = 0.05,
      targetModules = ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
      quantization = '4bit_qlora_nf4',
      learningRate = 0.0002,
      epochs = 3,
      batchSize = 4,
      gradientAccumulationSteps = 2,
      datasetSegments = ['apis', 'schemas', 'security'],
      systemPrompt = 'You are a specialized AI Coding Assistant fine-tuned for high-performance React and Next.js applications.',
      dataset
    } = body;

    const config: LoraTrainingConfig = {
      baseModel,
      loraRank: Number(loraRank) || 16,
      loraAlpha: Number(loraAlpha) || 32,
      loraDropout: Number(loraDropout) || 0.05,
      targetModules: Array.isArray(targetModules) ? targetModules : ['q_proj', 'v_proj'],
      quantization: quantization || '4bit_qlora_nf4',
      learningRate: Number(learningRate) || 0.0002,
      epochs: Number(epochs) || 3,
      batchSize: Number(batchSize) || 4,
      gradientAccumulationSteps: Number(gradientAccumulationSteps) || 2,
      datasetSegments: Array.isArray(datasetSegments) ? datasetSegments : ['apis', 'schemas'],
      systemPrompt: systemPrompt || 'You are an offline AI assistant.'
    };

    const report = await loraFineTuningEngine.executeTrainingRun(config, dataset);

    return NextResponse.json({
      success: true,
      ...report
    });
  } catch (err: any) {
    console.error('Error in training start API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to execute local model distillation job' },
      { status: 500 }
    );
  }
}
