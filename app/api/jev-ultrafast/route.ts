import { NextRequest, NextResponse } from 'next/server';
import { jevUltraFastEngine } from '@/lib/ai/jevUltraFastEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || 'http://localhost:3000';
    const sampleHtml = `
      <html>
        <head><title>Offline AI IDE</title></head>
        <body>
          <header>
            <input type="search" placeholder="Search codebase or symbols" />
            <button aria-label="Run Autonomous Agent">Run Agent</button>
            <button aria-label="Save Active File">Save File</button>
          </header>
          <main>
            <select aria-label="Select AI Model">
              <option>qwen2.5:1.5b</option>
              <option>deepseek-r1:1.5b</option>
            </select>
            <button aria-label="Open JEV DOM Inspector">Inspect DOM</button>
            <a href="/docs">Release Notes v1.0.0</a>
            <button aria-label="Run TDD Suite">Run Tests</button>
          </main>
        </body>
      </html>
    `;

    const snapshot = jevUltraFastEngine.parseDomSnapshot(sampleHtml, url);
    return NextResponse.json({
      status: 'ready',
      engine: 'JEV Ultra-Fast (Browser-Use)',
      snapshot,
      snapshotScript: jevUltraFastEngine.getSnapshotScript()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'JEV snapshot failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, html, url, goal } = body;

    const sourceHtml = html || `
      <div>
        <input type="text" placeholder="Type prompt here" />
        <button aria-label="Submit Plan">Submit</button>
        <button aria-label="Cancel Task">Cancel</button>
      </div>
    `;

    const snapshot = jevUltraFastEngine.parseDomSnapshot(sourceHtml, url || 'http://localhost:3000');

    if (action === 'plan') {
      const plan = jevUltraFastEngine.planNextStep(snapshot, goal || 'Submit Plan');
      return NextResponse.json({ snapshot, plan });
    }

    return NextResponse.json({ snapshot });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process JEV request' }, { status: 500 });
  }
}
