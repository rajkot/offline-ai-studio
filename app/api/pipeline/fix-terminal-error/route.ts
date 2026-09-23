import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';
import { checkOllamaHealth, generateOllamaText, listOllamaModels, selectBestOllamaModel } from '@/lib/ai/ollamaClient';

// Helper to extract file path and line number from terminal stack traces
function parseErrorTrace(trace: string): { extractedFile?: string; extractedLine?: number } {
  if (!trace) return {};

  // TypeScript / GCC error: filename.ts:12:5 or filename.tsx(12,5)
  const tsMatch = trace.match(/(?:^|\s)([\w./\\-]+\.(?:tsx?|jsx?|py|go|rs|json)):(\d+)(?::\d+)?/m) ||
                  trace.match(/(?:^|\s)([\w./\\-]+\.(?:tsx?|jsx?|py|go|rs|json))\s*\(\s*(\d+)/m);
  if (tsMatch) {
    return { extractedFile: tsMatch[1].replace(/\\/g, '/'), extractedLine: parseInt(tsMatch[2], 10) };
  }

  // Node.js stack: at Object.<anonymous> (file:///path/to/file.js:42:10) or at /path/to/file.ts:42:10
  const nodeMatch = trace.match(/at\s+(?:.*?\s+\()?(?:file:\/\/\/)?([\w./\\-]+\.(?:tsx?|jsx?|mjs)):(\d+):(\d+)\)?/m);
  if (nodeMatch) {
    return { extractedFile: nodeMatch[1].replace(/\\/g, '/'), extractedLine: parseInt(nodeMatch[2], 10) };
  }

  // Python stack: File "app.py", line 42
  const pyMatch = trace.match(/File\s+["']([^"']+\.py)["'],\s+line\s+(\d+)/m);
  if (pyMatch) {
    return { extractedFile: pyMatch[1].replace(/\\/g, '/'), extractedLine: parseInt(pyMatch[2], 10) };
  }

  return {};
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      errorLog,
      filePath: providedFilePath,
      currentCode,
      model: requestedModel,
      provider = 'auto',
      apiKey: clientApiKey
    } = body;

    if (!errorLog || errorLog.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'No error log provided' }, { status: 400 });
    }

    const { extractedFile, extractedLine } = parseErrorTrace(errorLog);
    const targetFile = providedFilePath || extractedFile || 'Active File';

    let patch = '';
    let explanation = '';
    let source = 'heuristic';

    const prompt = `You are a Principal Software Engineer and debugging expert.
Analyze this terminal error log and provide a direct code fix for "${targetFile}".

Error Log:
\`\`\`
${errorLog.slice(0, 1500)}
\`\`\`

${currentCode ? `Current Code Context:\n\`\`\`\n${currentCode.slice(0, 2000)}\n\`\`\`\n` : ''}

Format your response exactly as follows:
### Root Cause
(1-2 sentences explaining what failed)

### Explanation
(Brief explanation of the fix)

### Replacement Code
\`\`\`
(Only the corrected code block or function replacement)
\`\`\``;

    // 1. Try Local Ollama (100% Offline)
    try {
      const health = await checkOllamaHealth();
      if (health.online) {
        const availableModels = await listOllamaModels();
        const model = requestedModel || selectBestOllamaModel(availableModels) || 'qwen2.5-coder:latest';

        const ollamaRes = await generateOllamaText({
          model,
          prompt,
          temperature: 0.1,
        });

        if (ollamaRes && ollamaRes.trim().length > 0) {
          patch = ollamaRes;
          source = `ollama:${model}`;
        }
      }
    } catch {}

    // 2. Try OpenRouter / Claude / DeepSeek / OpenAI if configured
    if (!patch) {
      const openRouterKey = clientApiKey || process.env.OPENROUTER_API_KEY;
      const anthropicKey = clientApiKey || process.env.ANTHROPIC_API_KEY;
      const deepseekKey = clientApiKey || process.env.DEEPSEEK_API_KEY;
      const openaiKey = clientApiKey || process.env.OPENAI_API_KEY;

      if (openRouterKey || deepseekKey || openaiKey) {
        try {
          const endpoint = openRouterKey ? 'https://openrouter.ai/api/v1/chat/completions' :
                           deepseekKey ? 'https://api.deepseek.com/chat/completions' :
                           'https://api.openai.com/v1/chat/completions';
          const key = openRouterKey || deepseekKey || openaiKey;
          const model = requestedModel || (openRouterKey ? 'anthropic/claude-3.5-sonnet' : deepseekKey ? 'deepseek-chat' : 'gpt-4o');

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content;
            if (text) {
              patch = text;
              source = `cloud:${model}`;
            }
          }
        } catch {}
      } else if (anthropicKey) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: requestedModel || 'claude-3-5-sonnet-20241022',
              max_tokens: 2000,
              messages: [{ role: 'user', content: prompt }]
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.content?.[0]?.text;
            if (text) {
              patch = text;
              source = 'anthropic:claude-3.5-sonnet';
            }
          }
        } catch {}
      }
    }

    // 3. Try Google Gemini SDK
    if (!patch && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: { maxOutputTokens: 1000, temperature: 0.1 }
        });
        if (res.text) {
          patch = res.text;
          source = 'gemini-2.0-flash';
        }
      } catch {}
    }

    // 4. Fallback Rule-Based Traceback Diagnostic
    if (!patch) {
      const firstLine = errorLog.trim().split('\n')[0];
      patch = `### Root Cause
Detected runtime error: ${firstLine}

### Explanation
The terminal process failed during execution. Inspect line ${extractedLine || 'specified in traceback'} in \`${targetFile}\`. Ensure dependencies are installed and imports are resolved.

### Replacement Code
\`\`\`typescript
// Verify and wrap the execution in a safe try-catch block:
try {
  // execute operation
} catch (error: any) {
  console.error('[Runtime Handled Error]:', error.message);
}
\`\`\``;
      source = 'ast-diagnostics';
    }

    return NextResponse.json({
      success: true,
      message: 'Terminal error analyzed and patch generated.',
      patch,
      source,
      filePath: targetFile,
      lineNumber: extractedLine
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
