import { NextRequest, NextResponse } from 'next/server';
import { getOllamaBaseUrl } from '@/lib/ai/ollamaClient';

export async function POST(req: NextRequest) {
  try {
    const { model } = await req.json();

    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    const baseUrl = getOllamaBaseUrl();
    
    let raw = model.trim();

    // Robust Hugging Face normalization
    raw = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    if (raw.startsWith('huggingface.co/')) {
      raw = raw.replace('huggingface.co/', 'hf.co/');
    }

    // Handle deep links like /resolve/main/model-Q4_K_M.gguf or /tree/main
    if (raw.includes('/resolve/main/') || raw.includes('/tree/main/')) {
      const parts = raw.split(/\/(?:resolve|tree)\/main\/?/);
      const repoPart = parts[0];
      const filePart = parts[1] || '';
      const quantMatch = filePart.match(/-(Q[0-9]_[A-Z0-9_]+)\.gguf/i);
      raw = quantMatch ? `${repoPart}:${quantMatch[1].toUpperCase()}` : repoPart;
    }

    let ollamaModelName = raw;
    if (ollamaModelName.includes('/') && !ollamaModelName.startsWith('hf.co/')) {
      ollamaModelName = `hf.co/${ollamaModelName}`;
    }

    // Call Ollama /api/pull with streaming response
    const ollamaRes = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModelName, stream: true }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return NextResponse.json(
        { error: `Ollama pull failed (${ollamaRes.status}): ${errText}`, model: ollamaModelName },
        { status: ollamaRes.status }
      );
    }

    if (!ollamaRes.body) {
      return NextResponse.json({ error: 'Empty response stream from Ollama' }, { status: 500 });
    }

    // Proxy the stream back to the client as SSE or ndjson
    return new NextResponse(ollamaRes.body as any, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('[OllamaPullRoute] Error pulling model:', err);
    return NextResponse.json({ error: err.message || 'Failed to connect to Ollama daemon' }, { status: 500 });
  }
}
