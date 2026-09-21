import { NextResponse } from 'next/server';
import { checkOllamaHealth, generateOllamaText } from '@/lib/ai/ollamaClient';
import { formatFimPrompt, cleanFimCompletion } from '@/lib/ai/fimPromptFormatter';
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { prefix, suffix, filePath, model: requestedModel } = body;

    if (!prefix && prefix !== '') {
      return NextResponse.json({ success: true, completion: '', latencyMs: 0 });
    }

    let completion = '';
    let usedModel = 'heuristic';

    const targetModel = requestedModel || process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:1.5b';
    const fimInfo = formatFimPrompt(prefix, suffix || '', targetModel, filePath);

    // 1. Try Local Ollama with raw FIM tokens (Zero Cloud, Ultra-Fast <100ms)
    try {
      const health = await checkOllamaHealth();
      if (health.online) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const rawCompletion = await generateOllamaText({
          model: targetModel,
          prompt: fimInfo.prompt,
          raw: fimInfo.isFimSupported, // bypass chat template so FIM tokens hit tokenizer directly
          temperature: 0.1,
          options: {
            stop: fimInfo.stopTokens,
            num_predict: 64, // fast single- or multi-token completion
            top_k: 20,
            top_p: 0.9,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (rawCompletion) {
          completion = cleanFimCompletion(rawCompletion, fimInfo.modelFamily);
          if (completion) {
            usedModel = `ollama:${targetModel} (FIM)`;
          }
        }
      }
    } catch {
      // Proceed to fallbacks
    }

    // 2. Try OmniRoute Gateway if active (Local port 20128)
    if (!completion) {
      try {
        const omniBase = process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const omniRes = await fetch(`${omniBase}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'auto/best-coding',
            messages: [
              {
                role: 'system',
                content: 'You are an inline code autocomplete FIM engine. Output ONLY the raw code tokens to insert at cursor position. Never wrap in markdown.'
              },
              {
                role: 'user',
                content: `File: ${filePath || 'code.ts'}\nPREFIX:\n${prefix.slice(-1000)}\n${suffix ? `SUFFIX:\n${suffix.slice(0, 300)}` : ''}`
              }
            ],
            max_tokens: 64,
            temperature: 0.1,
            stop: ['\n\n\n', '```']
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (omniRes.ok) {
          const data = await omniRes.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text) {
            completion = cleanFimCompletion(text, 'generic');
            usedModel = 'omniroute:auto/best-coding';
          }
        }
      } catch {}
    }

    // 3. Cloud Gemini Fallback if configured
    if (!completion && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-autocomplete' } }
        });

        const prompt = `Inline code autocomplete for "${filePath || 'file.ts'}". Output ONLY the next 1-3 lines of code without markdown backticks:
PREFIX:
${prefix.slice(-800)}
SUFFIX:
${(suffix || '').slice(0, 250)}`;

        const responsePromise = ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
          config: { maxOutputTokens: 64, temperature: 0.1 }
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const raceResult: any = await Promise.race([responsePromise, timeoutPromise]);
        if (raceResult?.text) {
          completion = cleanFimCompletion(raceResult.text, 'generic');
          usedModel = 'gemini-1.5-flash';
        }
      } catch {}
    }

    // 4. Speculative AST pattern fallback if no LLM responded
    if (!completion && prefix) {
      const lines = prefix.trimEnd().split('\n');
      const lastLine = lines[lines.length - 1]?.trim() || '';

      if (lastLine.endsWith('(') && (lastLine.includes('useState') || lastLine.includes('setState'))) {
        completion = 'null);';
      } else if (lastLine.endsWith('=>') || lastLine.endsWith('function') || lastLine.endsWith(') {')) {
        completion = '\n  return true;\n}';
      } else if (lastLine.endsWith('{') && lastLine.startsWith('export interface')) {
        completion = '\n  id: string;\n  name: string;\n}';
      } else if (lastLine.endsWith('.')) {
        completion = 'length;';
      } else if (lastLine.endsWith('=')) {
        completion = ' null;';
      }
    }

    return NextResponse.json({
      success: true,
      completion,
      latencyMs: Date.now() - startTime,
      model: usedModel,
      isFim: fimInfo.isFimSupported
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
