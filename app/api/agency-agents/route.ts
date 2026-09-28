import { NextRequest, NextResponse } from 'next/server';
import { agencyAgentsEngine } from '@/lib/ai/agencyAgentsEngine';
import { generateOllamaText, checkOllamaHealth } from '@/lib/ai/ollamaClient';
import { generateWithOnlineAi } from '@/lib/ai/onlineAiEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') || undefined;
    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const agentId = searchParams.get('id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    if (agentId) {
      const agent = agencyAgentsEngine.getAgentById(agentId);
      if (!agent) {
        return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
      }
      return NextResponse.json({ agent });
    }

    const divisions = agencyAgentsEngine.getDivisions();
    const stats = agencyAgentsEngine.getStats();
    const { agents, total } = agencyAgentsEngine.searchAgents({ division, query, limit, offset });
    const activeAgent = agencyAgentsEngine.getActiveAgent();

    return NextResponse.json({
      status: 'ready',
      total,
      divisions,
      stats,
      activeAgent,
      agents
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch agency agents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, agentId, task, context = '', model = 'qwen2.5:1.5b', useOnlineAi = false } = body;

    if (action === 'setActive') {
      if (!agentId) {
        return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
      }
      const success = agencyAgentsEngine.setActiveAgent(agentId);
      return NextResponse.json({
        success,
        activeAgent: agencyAgentsEngine.getActiveAgent()
      });
    }

    if (action === 'buildPrompt') {
      const prompt = agencyAgentsEngine.buildAgentPrompt(agentId || 'engineering-senior-developer', task || '', context);
      return NextResponse.json({ success: true, prompt });
    }

    if (action === 'execute') {
      const prompt = agencyAgentsEngine.buildAgentPrompt(agentId || 'engineering-senior-developer', task || '', context);
      
      let reply = '';
      let provider = 'ollama';

      if (useOnlineAi) {
        try {
          reply = await generateWithOnlineAi({
            provider: 'omniroute',
            userPrompt: prompt,
            systemPrompt: 'You are an elite specialized agency agent.',
            temperature: 0.2
          });
          provider = 'online';
        } catch (e: any) {
          console.warn('[AgencyAgents API] Online AI failed, falling back to local Ollama:', e.message);
        }
      }

      if (!reply) {
        try {
          reply = await generateOllamaText({
            prompt,
            model,
            temperature: 0.2
          });
          provider = 'ollama';
        } catch (err: any) {
          return NextResponse.json({
            error: `Local Ollama inference failed: ${err.message}. Make sure Ollama is running or configure Online AI.`,
            promptBuilt: prompt
          }, { status: 503 });
        }
      }

      return NextResponse.json({
        success: true,
        agentId,
        provider,
        response: reply
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Agency agent execution failed' }, { status: 500 });
  }
}
