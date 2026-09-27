import { NextRequest, NextResponse } from 'next/server';
import { 
  multiAgentConsensusEngine, 
  SwarmAgentState, 
  SwarmConsensus 
} from '@/lib/ai/multiAgentConsensusEngine';

export type { SwarmAgentState, SwarmConsensus };

export async function GET() {
  try {
    const state = multiAgentConsensusEngine.getState();
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, prompt, activeFile, initialContent, maxIterations } = body;

    if (action === 'run_consensus' || action === 'start' || action === 'trigger_step') {
      const result = await multiAgentConsensusEngine.runConsensusSession({
        prompt: prompt || 'Synthesize high-assurance TypeScript module with adversarial consensus verification',
        activeFile: activeFile || 'components/ConsensusModule.tsx',
        initialContent: initialContent || '',
        maxIterations: maxIterations || 3
      });

      return NextResponse.json(result);
    }

    if (action === 'reset') {
      multiAgentConsensusEngine.reset();
      return NextResponse.json(multiAgentConsensusEngine.getState());
    }

    // Default to returning current state
    return GET();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
