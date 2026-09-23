import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getOllamaBaseUrl, listOllamaModels, selectBestOllamaModel } from '@/lib/ai/ollamaClient';
import { repoMapEngine } from '@/lib/ai/repoMapEngine';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Default standard MCP & IDE tools if none provided
const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the text content of a file in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative or absolute file path to read.' },
        startLine: { type: 'number', description: 'Optional 1-indexed starting line number.' },
        endLine: { type: 'number', description: 'Optional 1-indexed ending line number.' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with new content in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative path of the target file.' },
        content: { type: 'string', description: 'Complete content to write into the file.' }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'List all files and subdirectories in a workspace directory.',
    parameters: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Relative directory path. Defaults to root.' }
      }
    }
  },
  {
    name: 'search_codebase',
    description: 'Search for text patterns, functions, or variables across all workspace files.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'String or regex query to search.' }
      },
      required: ['query']
    }
  },
  {
    name: 'run_terminal_command',
    description: 'Execute a command in the local terminal shell (e.g. npm test, git status, tsc).',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command line string to execute.' }
      },
      required: ['command']
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      messages = [],
      tools: requestedTools,
      workspaceFiles = {},
      workspaceFilesSummary = [],
      provider = 'auto',
      model: requestedModel,
      apiKey: clientApiKey,
      baseUrl: clientBaseUrl,
      temperature = 0.2
    } = body;

    const tools: ToolDefinition[] = (requestedTools && requestedTools.length > 0)
      ? requestedTools
      : DEFAULT_TOOLS;

    // Build Aider-style AST Repo-Map if workspace files are available
    let repoMapSnippet = '';
    if (workspaceFiles && Object.keys(workspaceFiles).length > 0) {
      repoMapSnippet = repoMapEngine.generateRepoMap(workspaceFiles, 2048);
    }

    const systemInstruction = `You are the AI IDE Autonomous Principal Software Engineer & Cascade Agent.
You have direct access to tools for:
- Reading, writing, searching workspace files and computing diffs
- Inspecting and committing to the Git repository
- Executing terminal commands, tests, and builds

When solving a task:
1. First use tools (such as read_file, search_codebase, list_files) to gather necessary context.
2. Execute modifications precisely.
3. Finally summarize the resolution clearly to the user.

Workspace overview files: ${workspaceFilesSummary.join(', ') || 'Root project directory'}

${repoMapSnippet ? `\n${repoMapSnippet}\n` : ''}`;

    // Resolve provider order: explicit provider -> local Ollama -> OpenRouter -> Claude -> OpenAI -> Gemini
    let resolvedProvider = provider;
    if (resolvedProvider === 'auto') {
      if (clientApiKey?.startsWith('sk-or-') || process.env.OPENROUTER_API_KEY) {
        resolvedProvider = 'openrouter';
      } else if (clientApiKey?.startsWith('sk-ant-') || process.env.ANTHROPIC_API_KEY) {
        resolvedProvider = 'anthropic';
      } else if (clientApiKey?.startsWith('sk-') || process.env.OPENAI_API_KEY) {
        resolvedProvider = 'openai';
      } else if (process.env.GEMINI_API_KEY) {
        resolvedProvider = 'gemini';
      } else {
        resolvedProvider = 'ollama'; // Default to 100% offline local Ollama
      }
    }

    // -------------------------------------------------------------------------
    // 1. OLLAMA 100% LOCAL TOOL CALLING (Zero Cloud, Air-Gapped)
    // -------------------------------------------------------------------------
    if (resolvedProvider === 'ollama') {
      const ollamaBaseUrl = clientBaseUrl || getOllamaBaseUrl();
      let targetModel = requestedModel;

      if (!targetModel) {
        try {
          const models = await listOllamaModels(ollamaBaseUrl);
          targetModel = selectBestOllamaModel(models) || 'qwen2.5-coder:latest';
        } catch {
          targetModel = 'qwen2.5-coder:latest';
        }
      }

      // Format tools for Ollama (/api/chat supports OpenAI-compatible tool schemas)
      const ollamaTools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));

      // Build chat messages
      const chatMessages: any[] = [{ role: 'system', content: systemInstruction }];
      for (const msg of messages) {
        if (msg.role === 'user') {
          chatMessages.push({ role: 'user', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
        } else if (msg.role === 'model' || msg.role === 'assistant') {
          chatMessages.push({
            role: 'assistant',
            content: msg.text || msg.content || '',
            tool_calls: msg.functionCalls?.map((fc: any, idx: number) => ({
              id: `call_${idx}`,
              type: 'function',
              function: { name: fc.name, arguments: JSON.stringify(fc.args || {}) }
            }))
          });
        } else if (msg.role === 'tool') {
          chatMessages.push({
            role: 'tool',
            content: typeof msg.functionResponse?.response === 'string'
              ? msg.functionResponse.response
              : JSON.stringify(msg.functionResponse?.response ?? '')
          });
        }
      }

      if (chatMessages.length === 1 && prompt) {
        chatMessages.push({ role: 'user', content: prompt });
      }

      try {
        const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: targetModel,
            messages: chatMessages,
            tools: ollamaTools,
            stream: false,
            options: { temperature }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const message = data?.message || {};
          const functionCalls: any[] = [];

          if (Array.isArray(message.tool_calls)) {
            for (const call of message.tool_calls) {
              const fn = call.function;
              if (fn?.name) {
                let parsedArgs = {};
                try {
                  parsedArgs = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments || {});
                } catch {
                  parsedArgs = { raw: fn.arguments };
                }
                functionCalls.push({ name: fn.name, args: parsedArgs });
              }
            }
          }

          // Fallback: If model output raw JSON function call block in content
          const text = message.content || '';
          if (functionCalls.length === 0 && text.includes('```json')) {
            const match = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
              try {
                const parsed = JSON.parse(match[1]);
                if (parsed.name && (parsed.arguments || parsed.args || parsed.parameters)) {
                  functionCalls.push({
                    name: parsed.name,
                    args: parsed.arguments || parsed.args || parsed.parameters || {}
                  });
                }
              } catch {}
            }
          }

          return NextResponse.json({
            success: true,
            provider: 'ollama',
            model: targetModel,
            thought: functionCalls.length > 0 ? `Invoking ${functionCalls.length} tool(s) via Ollama (${targetModel})...` : undefined,
            text,
            functionCalls
          });
        }
      } catch (ollamaErr: any) {
        console.warn('Ollama tool calling error:', ollamaErr.message);
      }
    }

    // -------------------------------------------------------------------------
    // 2. OPENROUTER / OPENAI / DEEPSEEK TOOL CALLING (OpenAI Schema)
    // -------------------------------------------------------------------------
    if (resolvedProvider === 'openrouter' || resolvedProvider === 'openai' || resolvedProvider === 'deepseek') {
      const apiKey = clientApiKey || (
        resolvedProvider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
        resolvedProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY :
        process.env.OPENAI_API_KEY
      );

      if (apiKey) {
        const endpoint = resolvedProvider === 'openrouter'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : resolvedProvider === 'deepseek'
          ? 'https://api.deepseek.com/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

        const defaultModelForProvider = resolvedProvider === 'openrouter'
          ? 'anthropic/claude-3.5-sonnet'
          : resolvedProvider === 'deepseek'
          ? 'deepseek-chat'
          : 'gpt-4o';

        const targetModel = requestedModel || defaultModelForProvider;

        const openAiTools = tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));

        const chatMessages: any[] = [{ role: 'system', content: systemInstruction }];
        for (const msg of messages) {
          if (msg.role === 'user') {
            chatMessages.push({ role: 'user', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
          } else if (msg.role === 'model' || msg.role === 'assistant') {
            chatMessages.push({
              role: 'assistant',
              content: msg.text || msg.content || '',
              tool_calls: msg.functionCalls?.map((fc: any, idx: number) => ({
                id: `call_${idx}`,
                type: 'function',
                function: { name: fc.name, arguments: JSON.stringify(fc.args || {}) }
              }))
            });
          } else if (msg.role === 'tool') {
            chatMessages.push({
              role: 'tool',
              tool_call_id: msg.toolCallId || 'call_0',
              content: typeof msg.functionResponse?.response === 'string'
                ? msg.functionResponse.response
                : JSON.stringify(msg.functionResponse?.response ?? '')
            });
          }
        }

        if (chatMessages.length === 1 && prompt) {
          chatMessages.push({ role: 'user', content: prompt });
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(resolvedProvider === 'openrouter' ? {
              'HTTP-Referer': 'https://offline-ai-studio.local',
              'X-Title': 'Offline AI Studio'
            } : {})
          },
          body: JSON.stringify({
            model: targetModel,
            messages: chatMessages,
            tools: openAiTools,
            temperature
          })
        });

        if (res.ok) {
          const data = await res.json();
          const choice = data.choices?.[0]?.message || {};
          const functionCalls: any[] = [];

          if (Array.isArray(choice.tool_calls)) {
            for (const call of choice.tool_calls) {
              const fn = call.function;
              if (fn?.name) {
                let parsedArgs = {};
                try {
                  parsedArgs = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments || {});
                } catch {
                  parsedArgs = { raw: fn.arguments };
                }
                functionCalls.push({ name: fn.name, args: parsedArgs });
              }
            }
          }

          return NextResponse.json({
            success: true,
            provider: resolvedProvider,
            model: targetModel,
            thought: functionCalls.length > 0 ? `Invoking ${functionCalls.length} tool(s) via ${resolvedProvider} (${targetModel})...` : undefined,
            text: choice.content || '',
            functionCalls
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. ANTHROPIC CLAUDE DIRECT TOOL CALLING
    // -------------------------------------------------------------------------
    if (resolvedProvider === 'anthropic' || (!process.env.GEMINI_API_KEY && process.env.ANTHROPIC_API_KEY)) {
      const apiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const targetModel = requestedModel || 'claude-3-5-sonnet-20241022';

        const anthropicTools = tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters
        }));

        const chatMessages: any[] = [];
        for (const msg of messages) {
          if (msg.role === 'user') {
            chatMessages.push({ role: 'user', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
          } else if (msg.role === 'model' || msg.role === 'assistant') {
            const contentParts: any[] = [];
            if (msg.text || msg.content) {
              contentParts.push({ type: 'text', text: msg.text || msg.content });
            }
            if (msg.functionCalls) {
              msg.functionCalls.forEach((fc: any, idx: number) => {
                contentParts.push({
                  type: 'tool_use',
                  id: `toolu_${idx}`,
                  name: fc.name,
                  input: fc.args || {}
                });
              });
            }
            chatMessages.push({ role: 'assistant', content: contentParts.length > 0 ? contentParts : (msg.text || '') });
          } else if (msg.role === 'tool') {
            chatMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: msg.toolCallId || 'toolu_0',
                content: typeof msg.functionResponse?.response === 'string'
                  ? msg.functionResponse.response
                  : JSON.stringify(msg.functionResponse?.response ?? '')
              }]
            });
          }
        }

        if (chatMessages.length === 0 && prompt) {
          chatMessages.push({ role: 'user', content: prompt });
        }

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 4096,
            system: systemInstruction,
            messages: chatMessages,
            tools: anthropicTools,
            temperature
          })
        });

        if (res.ok) {
          const data = await res.json();
          let text = '';
          const functionCalls: any[] = [];

          for (const block of data.content || []) {
            if (block.type === 'text') {
              text += block.text;
            } else if (block.type === 'tool_use') {
              functionCalls.push({
                name: block.name,
                args: block.input || {}
              });
            }
          }

          return NextResponse.json({
            success: true,
            provider: 'anthropic',
            model: targetModel,
            thought: functionCalls.length > 0 ? `Invoking ${functionCalls.length} tool(s) via Claude (${targetModel})...` : undefined,
            text,
            functionCalls
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. GOOGLE GEMINI TOOL CALLING (SDK)
    // -------------------------------------------------------------------------
    const geminiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const functionDeclarations = tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }));

      const contents: any[] = [];
      for (const msg of messages) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }] });
        } else if (msg.role === 'model') {
          if (msg.functionCalls && msg.functionCalls.length > 0) {
            contents.push({
              role: 'model',
              parts: msg.functionCalls.map((fc: any) => ({
                functionCall: { name: fc.name, args: fc.args }
              }))
            });
          } else if (msg.content || msg.text) {
            contents.push({ role: 'model', parts: [{ text: typeof msg.content === 'string' ? msg.content : msg.text || JSON.stringify(msg.content) }] });
          }
        } else if (msg.role === 'tool') {
          const fr = msg.functionResponse;
          if (fr) {
            contents.push({
              role: 'tool',
              parts: [{ functionResponse: { name: fr.name, response: fr.response } }]
            });
          }
        }
      }

      if (contents.length === 0 && prompt) {
        contents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      const response = await ai.models.generateContent({
        model: requestedModel || 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction,
          temperature,
          tools: [{ functionDeclarations }]
        }
      });

      const firstCandidate = response.candidates?.[0];
      const parts = firstCandidate?.content?.parts || [];
      const functionCalls: any[] = [];
      let textOutput = '';

      parts.forEach((p: any) => {
        if (p.functionCall) {
          functionCalls.push({
            name: p.functionCall.name,
            args: p.functionCall.args || {}
          });
        }
        if (p.text) {
          textOutput += p.text;
        }
      });

      return NextResponse.json({
        success: true,
        provider: 'gemini',
        model: requestedModel || 'gemini-2.0-flash',
        thought: functionCalls.length > 0 ? `Invoking ${functionCalls.length} MCP tool(s)...` : undefined,
        text: textOutput,
        functionCalls
      });
    }

    // -------------------------------------------------------------------------
    // 5. LOCAL HEURISTIC SIMULATION (Zero Keys, Zero Daemons)
    // -------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      provider: 'offline-simulator',
      thought: 'Operating in self-contained offline mode. Inspecting requested task...',
      text: `Task received: "${prompt || 'Analyzing workspace'}". To run autonomous tool executions, start Ollama locally ('ollama serve') or add an API key in IDE Settings.`,
      functionCalls: [
        { name: 'list_files', args: { directory: '' } }
      ]
    });
  } catch (err: any) {
    console.error('Universal Agent route error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Agent error'
    }, { status: 500 });
  }
}
