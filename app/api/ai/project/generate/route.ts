import { NextRequest, NextResponse } from 'next/server';
import { generateProjectWithAi, OnlineAiProvider } from '@/lib/ai/onlineAiEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, projectType, provider = 'openrouter', model, apiKey } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Project description prompt is required' }, { status: 400 });
    }

    const result = await generateProjectWithAi({
      prompt: prompt.trim(),
      projectType,
      provider: provider as OnlineAiProvider,
      model,
      apiKey
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[ProjectGenerateRoute] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to generate project with AI'
    }, { status: 500 });
  }
}
