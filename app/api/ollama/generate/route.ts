import { NextRequest, NextResponse } from 'next/server';
import { streamOllamaGenerate, generateOllamaText } from '@/lib/ai/ollamaClient';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model = 'llama3.2:3b', system, stream = true, temperature = 0.3 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!stream) {
      const responseText = await generateOllamaText({ prompt, model, system, temperature });
      return NextResponse.json({ success: true, response: responseText, model });
    }

    const generator = streamOllamaGenerate({ prompt, model, system, temperature });
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ollama generation failed' }, { status: 500 });
  }
}
