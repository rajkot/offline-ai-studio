import { NextRequest, NextResponse } from 'next/server';
import { ensureOllamaRunning } from '@/lib/ai/ollamaDaemon';
import { listOllamaModels, selectBestOllamaModel, getOllamaBaseUrl } from '@/lib/ai/ollamaClient';

export async function POST(req: NextRequest) {
  try {
    const baseUrl = getOllamaBaseUrl();
    const result = await ensureOllamaRunning(baseUrl);

    let models: any[] = [];
    let defaultModel = '';

    if (result.online) {
      models = await listOllamaModels(baseUrl);
      defaultModel = selectBestOllamaModel(models);
    }

    return NextResponse.json({
      success: result.online,
      online: result.online,
      started: result.started,
      alreadyRunning: result.alreadyRunning,
      version: result.version,
      executablePath: result.executablePath,
      baseUrl,
      models,
      defaultModel,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      online: false,
      started: false,
      alreadyRunning: false,
      error: err.message || 'Failed to start Ollama daemon',
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
