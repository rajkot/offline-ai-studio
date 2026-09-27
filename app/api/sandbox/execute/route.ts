import { NextRequest, NextResponse } from 'next/server';
import { isolatedExecutionGuard } from '@/lib/sandbox/isolatedExecutionGuard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, timeoutMs = 3000, memoryLimitMb = 256, envVars = {} } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code parameter is required and must be a string.' },
        { status: 400 }
      );
    }

    const result = await isolatedExecutionGuard.runInSandbox({
      code,
      timeoutMs: Math.min(10000, Math.max(100, Number(timeoutMs) || 3000)),
      memoryLimitMb: Math.min(1024, Math.max(32, Number(memoryLimitMb) || 256)),
      envVars
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
