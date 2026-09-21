import { NextResponse } from 'next/server';

let currentUsage = {
  dailySpend: 14.82,
  dailyBudgetLimit: 20.00,
  warningThreshold: 80,
  failoverAction: 'Local Fallback', // 'Local Fallback' | 'Hard Block' | 'Notify Only'
  inrRate: 83.50,
  promptTokens: 1420500,
  completionTokens: 480200,
  currentRpm: 42,
  rpmLimit: 120,
  currentTpm: 34500,
  tpmLimit: 100000,
  alerts: [
    { id: '1', timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'warning', message: 'Warning: 74% of Daily Budget reached ($14.82 / $20.00).' },
    { id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'info', message: 'RPM rate limit pacing normal (42 / 120 RPM).' },
    { id: '3', timestamp: new Date(Date.now() - 86400000).toISOString(), level: 'success', message: 'Daily quota reset successfully at 00:00 UTC.' }
  ]
};

export async function GET() {
  return NextResponse.json(currentUsage);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'reset') {
      currentUsage.dailySpend = 0.00;
      currentUsage.promptTokens = 0;
      currentUsage.completionTokens = 0;
      currentUsage.alerts.unshift({
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'success',
        message: 'Manual quota reset executed successfully by administrator.'
      });
    } else {
      if (body.dailyBudgetLimit !== undefined) {
        currentUsage.dailyBudgetLimit = Number(body.dailyBudgetLimit);
      }
      if (body.warningThreshold !== undefined) {
        currentUsage.warningThreshold = Number(body.warningThreshold);
      }
      if (body.failoverAction !== undefined) {
        currentUsage.failoverAction = String(body.failoverAction);
      }
      if (body.inrRate !== undefined) {
        currentUsage.inrRate = Number(body.inrRate);
      }
      currentUsage.alerts.unshift({
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `FinOps configuration updated: Limit=$${currentUsage.dailyBudgetLimit.toFixed(2)}, Warning=${currentUsage.warningThreshold}%, Failover=${currentUsage.failoverAction}.`
      });
    }
    return NextResponse.json({ success: true, usage: currentUsage });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

