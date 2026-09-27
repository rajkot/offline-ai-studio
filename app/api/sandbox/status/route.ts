import { NextRequest, NextResponse } from 'next/server';
import { isolatedExecutionGuard } from '@/lib/sandbox/isolatedExecutionGuard';

export async function GET() {
  try {
    const status = isolatedExecutionGuard.getSandboxStatus();
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
