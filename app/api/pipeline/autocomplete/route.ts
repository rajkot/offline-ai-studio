import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';
import { checkOllamaHealth, generateOllamaText } from '@/lib/ai/ollamaClient';

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { prefix, suffix, filePath, model: requestedModel } = body;

    let completion = '';
    let usedModel = 'heuristic';

    // 1. Try Local Ollama (qwen2.5:1.5b is extremely fast for FIM)
    try {
      const health = await checkOllamaHealth();
      if (health.online && prefix) {
        const model = requestedModel || 'qwen2.5:1.5b';
        const prompt = `You are an inline code autocomplete engine.
Complete the code at the cursor. Output ONLY the raw characters that should follow the cursor, without markdown backticks.

File: ${filePath || 'code.ts'}
PREFIX:
${prefix.slice(-600)}
${suffix ? `SUFFIX:\n${suffix.slice(0, 200)}` : ''}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        completion = await generateOllamaText({
          model,
          prompt,
          temperature: 0.1,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (completion) {
          completion = completion.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trimEnd();
          usedModel = `ollama:${model}`;
        }
      }
    } catch (ollamaErr) {
      // Proceed to fallback
    }

    // 2. Cloud Gemini fallback if key is configured and no completion yet
    if (!completion && process.env.GEMINI_API_KEY && prefix) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `FIM autocomplete for "${filePath || 'file.ts'}". Output ONLY the next 1-3 lines of code without markdown:
PREFIX:
${prefix.slice(-600)}
SUFFIX:
${(suffix || '').slice(0, 200)}`;

        const responsePromise = ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
          config: { maxOutputTokens: 80, temperature: 0.1 }
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const raceResult: any = await Promise.race([responsePromise, timeoutPromise]);
        if (raceResult && raceResult.text) {
          completion = raceResult.text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trimEnd();
          usedModel = 'gemini-1.5-flash';
        }
      } catch (geminiErr) {}
    }

    // 3. Heuristic fallback
    if (!completion && prefix) {
      const lines = prefix.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine.includes('function') || lastLine.includes('=>')) {
        completion = ' {\n  return true;\n}';
      } else {
        completion = ';\n';
      }
    }

    return NextResponse.json({
      success: true,
      completion,
      latencyMs: Date.now() - startTime,
      model: usedModel
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
