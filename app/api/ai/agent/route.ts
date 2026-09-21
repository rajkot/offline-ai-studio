import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages = [], tools = [], workspaceFilesSummary = [] } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        thought: 'Running in offline simulation mode without GEMINI_API_KEY.',
        text: 'Gemini API key is not configured in server environment. Use Settings to configure your API key.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format Gemini Tool definitions
    const functionDeclarations = tools.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    const systemInstruction = `You are the AI IDE Autonomous Principal Software Engineer & Cascade Agent.
You have direct access to Model Context Protocol (MCP) tools for:
- Reading, writing, searching workspace files and computing diffs
- Inspecting and committing to the Git repository
- Querying SQLite / PostgreSQL database schemas and executing SQL
- Fetching HTTP REST and GraphQL endpoints
- Scraping web pages and inspecting headless DOM trees

When solving a user task:
1. First use tools (such as read_file, search_files, git_status, inspect_schema) to gather necessary context.
2. Execute modifications precisely.
3. Finally summarize the resolution clearly to the user.

Workspace overview files: ${workspaceFilesSummary.join(', ')}`;

    // Build contents from messages
    const contents: any[] = [];

    messages.forEach((msg: any) => {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }] });
      } else if (msg.role === 'model') {
        if (msg.functionCalls && msg.functionCalls.length > 0) {
          contents.push({
            role: 'model',
            parts: msg.functionCalls.map((fc: any) => ({
              functionCall: {
                name: fc.name,
                args: fc.args
              }
            }))
          });
        } else if (msg.content) {
          contents.push({ role: 'model', parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }] });
        }
      } else if (msg.role === 'tool') {
        const fr = msg.functionResponse;
        if (fr) {
          contents.push({
            role: 'tool',
            parts: [{
              functionResponse: {
                name: fr.name,
                response: fr.response
              }
            }]
          });
        }
      }
    });

    if (contents.length === 0 && prompt) {
      contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    const generateConfig: any = {
      model: 'gemini-1.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    };

    if (functionDeclarations.length > 0) {
      generateConfig.config.tools = [{ functionDeclarations }];
    }

    const response = await ai.models.generateContent(generateConfig);

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
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
      thought: functionCalls.length > 0 ? `Invoking ${functionCalls.length} MCP tool(s)...` : undefined,
      text: textOutput,
      functionCalls
    });
  } catch (err: any) {
    console.error('Agent route error:', err);
    return NextResponse.json({
      error: err.message || 'Agent error'
    }, { status: 500 });
  }
}
