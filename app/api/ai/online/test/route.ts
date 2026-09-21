import { NextRequest, NextResponse } from 'next/server';
import { verifyProviderKey, OnlineAiProvider } from '@/lib/ai/onlineAiEngine';

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const result = await verifyProviderKey(provider as OnlineAiProvider, apiKey);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      valid: false,
      models: [],
      error: err.message || 'Internal error testing AI provider connection'
    }, { status: 500 });
  }
}
