import { NextRequest, NextResponse } from 'next/server';
import { checkOllamaHealth, listOllamaModels, selectBestOllamaModel, getOllamaBaseUrl } from '@/lib/ai/ollamaClient';
import { ensureOllamaRunning } from '@/lib/ai/ollamaDaemon';

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getOllamaBaseUrl();
    const autoStart = req.nextUrl.searchParams.get('autoStart') === 'true';
    let health = await checkOllamaHealth(baseUrl);

    // If offline and autoStart is enabled, try launching the daemon
    if (!health.online && autoStart) {
      const startResult = await ensureOllamaRunning(baseUrl);
      if (startResult.online) {
        health = { online: true, version: startResult.version };
      }
    }

    if (!health.online) {
      return NextResponse.json({
        online: false,
        baseUrl,
        error: health.error || 'Ollama is not responding on ' + baseUrl,
        models: [],
        defaultModel: '',
      });
    }

    const models = await listOllamaModels(baseUrl);
    const defaultModel = selectBestOllamaModel(models);

    return NextResponse.json({
      online: true,
      baseUrl,
      version: health.version,
      models,
      defaultModel,
      count: models.length,
    });
  } catch (error: any) {
    return NextResponse.json({
      online: false,
      baseUrl: getOllamaBaseUrl(),
      error: error.message || 'Failed to connect to Ollama',
      models: [],
      defaultModel: '',
    }, { status: 500 });
  }
}
