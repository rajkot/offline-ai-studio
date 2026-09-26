import { NextRequest, NextResponse } from 'next/server';
import { tabbyEngine } from '@/lib/ai/tabbyEngine';

export async function GET() {
  try {
    const config = tabbyEngine.getConfig();
    const stats = tabbyEngine.getStats();

    return NextResponse.json({
      status: 'online',
      engine: 'Tabby: Self-Hosted FIM Code Completion Server',
      repository: 'https://github.com/TabbyML/tabby.git',
      localPath: 'integrations/tabby',
      config,
      stats,
      supportedModels: [
        { id: 'Qwen2.5-Coder-1.5B', format: 'QwenCoder', contextLength: 32768, recommended: true },
        { id: 'StarCoder-1B', format: 'StarCoder', contextLength: 8192, recommended: false },
        { id: 'DeepSeek-Coder-1.3B', format: 'DeepSeekCoder', contextLength: 16384, recommended: true },
        { id: 'CodeLlama-7B', format: 'CodeLlama', contextLength: 16384, recommended: false }
      ],
      features: [
        'Fill-in-the-Middle (FIM) Ghost Text',
        'Sub-50ms Low-Latency Inference',
        'Direct Monaco Editor InlineCompletionsProvider',
        'Ollama & llama.cpp Local Endpoint Bridges',
        '100% Air-Gapped Code Privacy'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prefix = '', suffix = '', language = 'typescript', insertedText = '', configUpdates } = body;

    if (action === 'complete') {
      const response = await tabbyEngine.getCompletion({
        prefix,
        suffix,
        language,
        maxTokens: body.maxTokens,
        temperature: body.temperature
      });
      return NextResponse.json(response);
    }

    if (action === 'accept') {
      tabbyEngine.recordAcceptance(insertedText || '');
      return NextResponse.json({ success: true, stats: tabbyEngine.getStats() });
    }

    if (action === 'reject') {
      tabbyEngine.recordRejection();
      return NextResponse.json({ success: true, stats: tabbyEngine.getStats() });
    }

    if (action === 'config') {
      if (configUpdates) {
        tabbyEngine.updateConfig(configUpdates);
      }
      return NextResponse.json({ success: true, config: tabbyEngine.getConfig() });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
