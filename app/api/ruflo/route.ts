import { NextRequest, NextResponse } from 'next/server';
import { rufloSwarmEngine, SwarmTopology } from '@/lib/ai/rufloSwarmEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';
    const query = searchParams.get('q') || '';

    if (action === 'memories') {
      const memories = rufloSwarmEngine.searchMemories(query);
      return NextResponse.json({ success: true, count: memories.length, memories });
    }

    if (action === 'agents') {
      const agents = rufloSwarmEngine.getAgents();
      return NextResponse.json({ success: true, count: agents.length, agents });
    }

    return NextResponse.json({
      status: 'ready',
      engine: 'Ruflo Swarm Orchestrator (ruvnet/ruflo)',
      version: 'v2.4.0',
      agentsCount: rufloSwarmEngine.getAgents().length,
      memoriesCount: rufloSwarmEngine.getMemories().length,
      topologies: ['hierarchical', 'mesh', 'consensus', 'pipeline']
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, objective, topology, memoryItem } = body;

    if (action === 'add-memory' && memoryItem) {
      const created = rufloSwarmEngine.addMemory(memoryItem);
      return NextResponse.json({ success: true, memory: created });
    }

    if (action === 'dispatch' || action === 'create-plan') {
      if (!objective) {
        return NextResponse.json({ success: false, error: 'objective is required' }, { status: 400 });
      }

      const plan = rufloSwarmEngine.createSwarmPlan(objective, (topology as SwarmTopology) || 'hierarchical');
      const executed = await rufloSwarmEngine.executeSwarmPlan(plan.id);

      return NextResponse.json({
        success: true,
        engine: 'Ruflo Multi-Agent Swarm',
        plan: executed
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
