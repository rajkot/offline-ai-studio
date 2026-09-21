import { NextRequest, NextResponse } from "next/server";
import { getLanguageByCode, getLanguagePromptInstruction } from "@/lib/languages";
import { checkOllamaHealth, streamOllamaGenerate, listOllamaModels, selectBestOllamaModel } from "@/lib/ai/ollamaClient";
import { streamOnlineAi, OnlineAiProvider, getEnvApiKey } from "@/lib/ai/onlineAiEngine";

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      targetLanguage = 'en', 
      model: requestedModel, 
      preferProvider = 'ollama',
      apiKey: clientApiKey 
    } = await req.json();

    const langConfig = getLanguageByCode(targetLanguage);
    const langInstruction = getLanguagePromptInstruction(targetLanguage);

    const fullPrompt = `${langInstruction}\n\n${prompt}`;

    const systemPrompt = `You are the Offline AI IDE Assistant and Principal Software Engineer. You specialize in full-stack web development, TypeScript, Next.js, and clean code.
When generating code or full projects with multiple files:
- Always label each file with its target path in the markdown fence (e.g. \`\`\`tsx:src/components/MyComponent.tsx or \`\`\`typescript:src/utils/calc.ts) or with a header like: ### File: \`src/components/MyComponent.tsx\`.
- Provide complete, robust, working code so the IDE can automatically create and apply all files directly to the workspace. ${langInstruction}`;

    // 1. If an Online Provider is preferred (OpenRouter, OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral)
    const onlineProviders: OnlineAiProvider[] = ['openrouter', 'openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'mistral'];
    const chosenProvider = preferProvider as OnlineAiProvider;

    if (onlineProviders.includes(chosenProvider)) {
      const hasKey = Boolean(clientApiKey?.trim() || getEnvApiKey(chosenProvider));
      if (hasKey) {
        try {
          const generator = streamOnlineAi({
            provider: chosenProvider,
            model: requestedModel,
            apiKey: clientApiKey,
            systemPrompt,
            userPrompt: fullPrompt,
            temperature: 0.3
          });

          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of generator) {
                  controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
              } catch (onlineStreamErr) {
                console.warn(`[Stream] ${chosenProvider} stream error:`, onlineStreamErr);
                controller.error(onlineStreamErr);
              }
            }
          });

          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
              'X-AI-Provider': chosenProvider,
              'X-AI-Model': requestedModel || 'default',
            }
          });
        } catch (onlineErr: any) {
          console.warn(`Online provider ${chosenProvider} stream initiation failed:`, onlineErr?.message);
        }
      }
    }

    // 2. Offline-first: Local Ollama AI Engine
    try {
      const ollamaStatus = await checkOllamaHealth();
      if (ollamaStatus.online) {
        const availableModels = await listOllamaModels();
        const selectedModel = requestedModel || selectBestOllamaModel(availableModels);

        const generator = streamOllamaGenerate({
          prompt: fullPrompt,
          model: selectedModel,
          system: systemPrompt,
          temperature: 0.3,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of generator) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (ollamaStreamErr) {
              console.warn("Ollama stream error:", ollamaStreamErr);
              controller.error(ollamaStreamErr);
            }
          }
        });

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-AI-Provider': 'ollama',
            'X-AI-Model': selectedModel,
          }
        });
      }
    } catch (ollamaErr: any) {
      console.warn("Ollama check failed, checking cloud/offline fallbacks:", ollamaErr?.message);
    }

    // 3. Fallback: Environment Gemini AI (if available)
    if (process.env.GEMINI_API_KEY && chosenProvider !== 'ollama') {
      try {
        const generator = streamOnlineAi({
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          apiKey: process.env.GEMINI_API_KEY,
          systemPrompt,
          userPrompt: fullPrompt
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of generator) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (streamErr) {
              controller.error(streamErr);
            }
          }
        });

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-AI-Provider': 'gemini',
          }
        });
      } catch (geminiErr) {
        console.warn("Gemini stream fallback failed:", geminiErr);
      }
    }

    // 4. Offline template fallback if neither Ollama nor online models are responding
    const stream = new ReadableStream({
      async start(controller) {
        const localizedMsg = langConfig.code === 'gu'
          ? `API ક્વોટા મર્યાદા આવી ગઈ છે. ઑફલાઇન મોડમાં તમારો કાર્યસ્થળ તૈયાર છે.`
          : langConfig.code === 'hi'
          ? `API कोटा सीमा समाप्त हो गई है। ऑफ़लाइन मोड में आपका कोड तैयार है।`
          : `Offline mode ready. Start Ollama locally ('ollama serve') or connect an Online AI Model in Settings to stream responses.`;

        const fallbackText = `// [Offline Workspace Ready - ${langConfig.name}]\n// ${localizedMsg}\n\nconsole.log("Local offline workspace active.");\n`;
        const encoder = new TextEncoder();
        for (let i = 0; i < fallbackText.length; i += 15) {
          controller.enqueue(encoder.encode(fallbackText.slice(i, i + 15)));
          await new Promise(r => setTimeout(r, 15));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-AI-Provider': 'fallback',
      }
    });

  } catch (globalErr: any) {
    console.error("Stream route global error:", globalErr);
    return NextResponse.json({ error: globalErr.message || "Failed to stream" }, { status: 500 });
  }
}
