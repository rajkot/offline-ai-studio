import { NextRequest, NextResponse } from 'next/server';
import { loraFineTuningEngine, DatasetPair } from '@/lib/ai/loraFineTuningEngine';
import fs from 'fs';
import path from 'path';

function getWorkspaceSampleFiles(): Array<{ path: string; content: string }> {
  const sampleFiles: Array<{ path: string; content: string }> = [];
  const targetRelativePaths = [
    'lib/ai/multiAgentConsensusEngine.ts',
    'lib/ai/autonomousAgentEngine.ts',
    'lib/ast/codeKnowledgeGraphEngine.ts',
    'lib/ai/ollamaClient.ts'
  ];

  const rootDir = process.cwd();

  for (const relPath of targetRelativePaths) {
    try {
      const fullPath = path.join(rootDir, relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        sampleFiles.push({ path: relPath, content: content.slice(0, 10000) });
      }
    } catch (e) {
      // Ignore missing files in sandbox
    }
  }

  // Fallback defaults if workspace reading is constrained
  if (sampleFiles.length === 0) {
    sampleFiles.push({
      path: 'lib/rateLimiter.ts',
      content: `
export class TokenBucketRateLimiter {
  private capacity: number;
  private tokens: number;
  constructor(capacity: number) {
    this.capacity = capacity;
    this.tokens = capacity;
  }
  public tryConsume(tokens: number = 1): boolean {
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}
      `
    });
  }

  return sampleFiles;
}

export async function GET() {
  try {
    const files = getWorkspaceSampleFiles();
    const pairs = loraFineTuningEngine.harvestWorkspaceDataset(files);
    return NextResponse.json({
      success: true,
      count: pairs.length,
      pairs
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const files = body.files && body.files.length > 0 ? body.files : getWorkspaceSampleFiles();
    const pairs = loraFineTuningEngine.harvestWorkspaceDataset(files);

    return NextResponse.json({
      success: true,
      count: pairs.length,
      pairs
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
