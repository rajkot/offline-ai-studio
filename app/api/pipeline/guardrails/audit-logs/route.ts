import { NextResponse } from 'next/server';

let MOCK_LOGS = [
  { id: '1', timestamp: new Date(Date.now() - 5000).toISOString(), risk: 'High', type: 'PII Leak', detail: 'Blocked attempt to send Credit Card number.' },
  { id: '2', timestamp: new Date(Date.now() - 120000).toISOString(), risk: 'Critical', type: 'Prompt Injection', detail: 'Detected "Ignore previous instructions" payload.' },
  { id: '3', timestamp: new Date(Date.now() - 360000).toISOString(), risk: 'Low', type: 'IP Exposure', detail: 'Filtered internal IP 192.168.1.5' },
];

export async function GET() {
  return NextResponse.json({ logs: MOCK_LOGS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { risk, type, detail } = body;
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      risk: risk || 'High',
      type: type || 'UNAUTHORIZED_ACCESS',
      detail: detail || 'Unauthorized access attempt detected'
    };
    MOCK_LOGS = [newLog, ...MOCK_LOGS];
    return NextResponse.json({ success: true, log: newLog });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to add audit log' }, { status: 500 });
  }
}

