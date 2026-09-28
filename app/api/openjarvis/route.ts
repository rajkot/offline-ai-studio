import { NextRequest, NextResponse } from 'next/server';
import { openJarvisEngine } from '@/lib/ai/openJarvisEngine';

export async function GET(req: NextRequest) {
  try {
    const spec = openJarvisEngine.getSpec();
    const presets = openJarvisEngine.getAgentPresets();
    const traces = openJarvisEngine.getTraces();
    const metrics = openJarvisEngine.getMetrics();

    return NextResponse.json({
      status: 'ready',
      spec,
      presets,
      traces,
      metrics
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch OpenJarvis status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, presetId, task, context = '', specUpdate } = body;

    if (action === 'updateSpec') {
      const updated = openJarvisEngine.updateSpec(specUpdate || {});
      return NextResponse.json({ success: true, spec: updated });
    }

    if (action === 'executePreset' || action === 'run') {
      if (!presetId) {
        return NextResponse.json({ error: 'presetId is required' }, { status: 400 });
      }
      if (!task || !task.trim()) {
        return NextResponse.json({ error: 'task is required' }, { status: 400 });
      }

      const execution = await openJarvisEngine.executePreset(presetId, task, context);
      return NextResponse.json({
        success: true,
        ...execution,
        metrics: openJarvisEngine.getMetrics()
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process OpenJarvis action' }, { status: 500 });
  }
}
