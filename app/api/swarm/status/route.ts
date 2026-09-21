import { NextRequest, NextResponse } from 'next/server';

export interface SwarmAgentState {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'active' | 'idle' | 'failed' | 'completed';
  currentTask: string;
  progress: number; // 0 - 100
  score: number; // 0.0 - 1.0
  vote: 'approved' | 'rejected' | 'needs_revision' | 'pending';
  lastLog: string;
  executionTimeMs: number;
  tokensUsed: number;
}

export interface SwarmConsensus {
  overallVerdict: string;
  consensusScore: number; // 0 - 100%
  status: 'agreed' | 'debating' | 'failed' | 'idle';
  totalTokens: number;
  iteration: number;
  maxIterations: number;
  agents: SwarmAgentState[];
}

const DEFAULT_AGENTS: SwarmAgentState[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    role: 'Task Decomposition & Architecture',
    avatar: '🏗️',
    status: 'completed',
    currentTask: 'Subdivided feature prompt into 3 AST modification subtasks',
    progress: 100,
    score: 0.96,
    vote: 'approved',
    lastLog: 'Task tree validated: 0 circular dependencies found',
    executionTimeMs: 420,
    tokensUsed: 1240
  },
  {
    id: 'coder',
    name: 'Coder Agent',
    role: 'Syntactic Generation & Patching',
    avatar: '💻',
    status: 'active',
    currentTask: 'Synthesizing React component state tree and event hooks',
    progress: 88,
    score: 0.91,
    vote: 'approved',
    lastLog: 'Emitted 42 AST nodes with full strict TypeScript annotations',
    executionTimeMs: 1150,
    tokensUsed: 4620
  },
  {
    id: 'reviewer',
    name: 'Reviewer Agent',
    role: 'Logical Invariant & Bug Analysis',
    avatar: '🔍',
    status: 'active',
    currentTask: 'Verifying dependency array stability and render idempotence',
    progress: 65,
    score: 0.89,
    vote: 'approved',
    lastLog: '0 infinite render cycles detected in state transition table',
    executionTimeMs: 890,
    tokensUsed: 2180
  },
  {
    id: 'auditor',
    name: 'Auditor Agent',
    role: 'Security Hardening & AST Safety',
    avatar: '🛡️',
    status: 'active',
    currentTask: 'Auditing dynamic eval and dangerous innerHTML vulnerabilities',
    progress: 92,
    score: 0.98,
    vote: 'approved',
    lastLog: 'Clean security scan: No injection vectors detected',
    executionTimeMs: 640,
    tokensUsed: 1450
  }
];

export async function GET() {
  const avgScore = DEFAULT_AGENTS.reduce((acc, a) => acc + a.score, 0) / DEFAULT_AGENTS.length;
  const consensusPct = Math.round(avgScore * 100);

  const consensus: SwarmConsensus = {
    overallVerdict: `🟢 Consolidated Output Generated with ${consensusPct}% Confidence`,
    consensusScore: consensusPct,
    status: 'agreed',
    totalTokens: DEFAULT_AGENTS.reduce((acc, a) => acc + a.tokensUsed, 0),
    iteration: 2,
    maxIterations: 5,
    agents: DEFAULT_AGENTS
  };

  return NextResponse.json(consensus);
}

export async function POST(req: NextRequest) {
  try {
    const { action, prompt } = await req.json();

    if (action === 'trigger_step') {
      // Simulate real-time progress update for interactive simulation
      const updatedAgents: SwarmAgentState[] = DEFAULT_AGENTS.map((agent) => {
        const jitterProgress = Math.min(100, Math.max(20, Math.floor(Math.random() * 40) + 60));
        const score = parseFloat((0.85 + Math.random() * 0.14).toFixed(2));
        const vote = score >= 0.90 ? 'approved' : score >= 0.85 ? 'needs_revision' : 'rejected';
        
        return {
          ...agent,
          progress: jitterProgress,
          score,
          vote,
          status: jitterProgress === 100 ? 'completed' : 'active',
          executionTimeMs: agent.executionTimeMs + Math.floor(Math.random() * 200),
          tokensUsed: agent.tokensUsed + Math.floor(Math.random() * 500)
        };
      });

      const avgScore = updatedAgents.reduce((acc, a) => acc + a.score, 0) / updatedAgents.length;
      const consensusPct = Math.round(avgScore * 100);

      return NextResponse.json({
        overallVerdict: `🟢 Consolidated Output Generated with ${consensusPct}% Confidence`,
        consensusScore: consensusPct,
        status: consensusPct > 80 ? 'agreed' : 'debating',
        totalTokens: updatedAgents.reduce((acc, a) => acc + a.tokensUsed, 0),
        iteration: 3,
        maxIterations: 5,
        agents: updatedAgents,
        promptReference: prompt || 'Synthesize parallel agent workflow'
      });
    }

    return GET();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
