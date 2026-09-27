import { NextRequest, NextResponse } from 'next/server';
import { isolatedExecutionGuard } from '@/lib/sandbox/isolatedExecutionGuard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { command = '' } = body;

    const result = isolatedExecutionGuard.inspectCommand(command);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
