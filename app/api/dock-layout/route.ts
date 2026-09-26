import { NextRequest, NextResponse } from 'next/server';
import {
  dockviewLayoutEngine,
  LAYOUT_PRESETS,
  DOCK_PANELS,
  LayoutPresetId,
  DockPanelId
} from '@/lib/layout/dockviewLayoutEngine';

export async function GET() {
  try {
    const currentPreset = dockviewLayoutEngine.getCurrentPreset();
    const presets = dockviewLayoutEngine.getPresets();
    const ratios = dockviewLayoutEngine.getRatios();
    const detached = dockviewLayoutEngine.getDetachedPanels();

    return NextResponse.json({
      status: 'online',
      manager: 'Dockview Layout & Window Dock Manager',
      currentPreset,
      presets,
      panels: DOCK_PANELS,
      ratios,
      detachedPanels: detached,
      capabilities: [
        'Multi-pane horizontal & vertical dock splitting',
        'Detached floating popout window support',
        '6 specialized workspace presets (Classic IDE, Creative, Data, Zen, Dual Code, Terminal Matrix)',
        'Dynamic pane ratio resizing (left, right, bottom)',
        '100% persistent layout state via localStorage'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, presetId, ratios, panelId } = body;

    if (action === 'setPreset') {
      if (!presetId || !LAYOUT_PRESETS[presetId as LayoutPresetId]) {
        return NextResponse.json({ error: 'Valid presetId is required' }, { status: 400 });
      }
      dockviewLayoutEngine.setPreset(presetId as LayoutPresetId);
      return NextResponse.json({
        success: true,
        currentPreset: dockviewLayoutEngine.getCurrentPreset(),
        ratios: dockviewLayoutEngine.getRatios()
      });
    }

    if (action === 'setRatios') {
      if (ratios) {
        dockviewLayoutEngine.setRatios(ratios);
      }
      return NextResponse.json({
        success: true,
        ratios: dockviewLayoutEngine.getRatios()
      });
    }

    if (action === 'toggleDetach') {
      if (!panelId) {
        return NextResponse.json({ error: 'panelId is required' }, { status: 400 });
      }
      const isDetached = dockviewLayoutEngine.toggleDetachPanel(panelId as DockPanelId);
      return NextResponse.json({
        success: true,
        panelId,
        isDetached,
        detachedPanels: dockviewLayoutEngine.getDetachedPanels()
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
