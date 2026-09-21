import { NextResponse } from 'next/server';

export interface HitlTask {
  id: string;
  subjectId: string;
  taskTitle: string;
  confidenceScore: number;
  failureReason: string;
  createdAt: string;
  originalOutput: string;
  suggestedPrompt: string;
  language: string;
  status: 'pending' | 'approved' | 'discarded';
}

const mockTasks: HitlTask[] = [
  {
    id: 'hitl-001',
    subjectId: 'SUB-AUTH-409',
    taskTitle: 'JWT Middleware Validation with Refresh Rotation',
    confidenceScore: 54,
    failureReason: 'Potential security loophole in token expiry handling & ungrounded claim on session revoke',
    createdAt: '2026-08-21T21:40:00Z',
    suggestedPrompt: 'Write a secure Next.js middleware for verifying JWT tokens and handling silent token refresh.',
    language: 'typescript',
    status: 'pending',
    originalOutput: `// Low-confidence generation: Missing token rotation check
export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.redirect('/login');
  
  // UNVERIFIED: No signature verification logic provided
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.exp < Date.now()) {
    // BUG: exp is in seconds, Date.now() is milliseconds
    return NextResponse.next();
  }
  return NextResponse.next();
}`
  },
  {
    id: 'hitl-002',
    subjectId: 'SUB-SQL-812',
    taskTitle: 'Parameterized Vector Search Query Builder',
    confidenceScore: 68,
    failureReason: 'Query syntax unverified against dialect schema; missing vector dimension validation',
    createdAt: '2026-08-21T22:15:00Z',
    suggestedPrompt: 'Generate a PostgreSQL pgvector similarity query with parameter bindings.',
    language: 'sql',
    status: 'pending',
    originalOutput: `-- Low-confidence SQL query with potential injection risk
SELECT id, document_name, chunk_text,
       embedding <=> '\${userEmbedding}' AS distance
FROM document_embeddings
WHERE active = true
ORDER BY distance ASC
LIMIT 5;`
  },
  {
    id: 'hitl-003',
    subjectId: 'SUB-GUARD-104',
    taskTitle: 'Content Moderation Guardrail Regex Parser',
    confidenceScore: 42,
    failureReason: 'High hallucination score (>60%) and failed edge case testing for Unicode bypasses',
    createdAt: '2026-08-21T22:50:00Z',
    suggestedPrompt: 'Create a regex sanitizer for scrubbing PII and sensitive API keys.',
    language: 'typescript',
    status: 'pending',
    originalOutput: `export function sanitizePII(text: string): string {
  // Overly broad regex removes valid non-PII tokens
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\\b\\d{3}-\\d{2}-\\d{4}\\b/g, '[REDACTED_SSN]')
    .replace(/sk-[a-zA-Z0-9]{32}/g, '[REDACTED_KEY]');
}`
  }
];

export async function GET() {
  return NextResponse.json({ tasks: mockTasks });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, taskId, correctedOutput } = body;

    if (action === 'approve') {
      // Logic for saving to local golden training dataset and RAG vector store
      return NextResponse.json({
        success: true,
        message: `Task ${taskId} approved and synchronized into RAG golden training set.`,
        goldenSampleId: `golden-${Date.now()}`,
        correctedLength: correctedOutput?.length || 0
      });
    }

    if (action === 'discard') {
      return NextResponse.json({
        success: true,
        message: `Task ${taskId} discarded from review queue.`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to process HITL request' }, { status: 500 });
  }
}
