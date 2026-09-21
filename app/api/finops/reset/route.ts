import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'FinOps quotas and spend counters reset successfully.',
    dailySpend: 0.00,
    promptTokens: 0,
    completionTokens: 0
  });
}
