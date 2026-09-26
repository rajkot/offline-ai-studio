import { NextResponse } from 'next/server';
import { transformersJsEngine } from '@/lib/ai/transformersJsEngine';

export async function GET() {
  try {
    const hw = await transformersJsEngine.detectHardware();
    const models = transformersJsEngine.getModels();

    return NextResponse.json({
      success: true,
      engine: 'transformers.js (Xenova / Hugging Face)',
      version: '4.3.0',
      hardware: hw,
      models,
      totalModels: models.length,
      cachedCount: models.filter(m => m.cached).length,
      supportedPipelines: [
        'feature-extraction',
        'text-classification',
        'summarization',
        'token-classification',
        'automatic-speech-recognition'
      ]
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to query transformers.js runtime' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, text, textA, textB, modelId, code, device } = body;

    if (device && ['webgpu', 'wasm', 'cpu'].includes(device)) {
      transformersJsEngine.setPreferredDevice(device);
    }

    switch (action) {
      case 'embed': {
        if (!text) {
          return NextResponse.json({ success: false, error: 'Text is required for embedding' }, { status: 400 });
        }
        const res = await transformersJsEngine.computeEmbedding(text, modelId);
        return NextResponse.json({ success: true, result: res });
      }

      case 'compare-similarity': {
        if (!textA || !textB) {
          return NextResponse.json({ success: false, error: 'Both textA and textB are required' }, { status: 400 });
        }
        const embA = await transformersJsEngine.computeEmbedding(textA, modelId);
        const embB = await transformersJsEngine.computeEmbedding(textB, modelId);
        const sim = transformersJsEngine.cosineSimilarity(embA.embedding, embB.embedding);
        return NextResponse.json({
          success: true,
          similarity: Number(sim.toFixed(4)),
          scorePercentage: Number((sim * 100).toFixed(1)),
          dimensions: embA.dimensions,
          durationMs: embA.computeDurationMs + embB.computeDurationMs
        });
      }

      case 'classify': {
        if (!text) {
          return NextResponse.json({ success: false, error: 'Text is required for classification' }, { status: 400 });
        }
        const res = await transformersJsEngine.classifyText(text, modelId);
        return NextResponse.json({ success: true, result: res });
      }

      case 'summarize': {
        if (!code) {
          return NextResponse.json({ success: false, error: 'Code or text is required for summarization' }, { status: 400 });
        }
        const res = await transformersJsEngine.summarizeCode(code, modelId);
        return NextResponse.json({ success: true, result: res });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Transformers.js execution failed' },
      { status: 500 }
    );
  }
}
