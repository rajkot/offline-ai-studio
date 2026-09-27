import { NextRequest, NextResponse } from 'next/server';
import { uiTarsEngine, UiTarsParsedAction } from '@/lib/ai/uiTarsEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'parse': {
        const { modelOutput } = body;
        const parsed = uiTarsEngine.parseAction(modelOutput);
        return NextResponse.json({ success: true, parsed });
      }

      case 'scale': {
        const { point, screenWidth = 1920, screenHeight = 1080 } = body;
        if (!point || !Array.isArray(point)) {
          return NextResponse.json({ error: '"point" [x, y] is required.' }, { status: 400 });
        }
        const scaled = uiTarsEngine.scaleCoordinates(point as [number, number], screenWidth, screenHeight);
        return NextResponse.json({ success: true, point, scaled, screenWidth, screenHeight });
      }

      case 'validate': {
        const parsedAction: UiTarsParsedAction = body.parsedAction;
        if (!parsedAction) {
          return NextResponse.json({ error: '"parsedAction" is required.' }, { status: 400 });
        }
        const safety = uiTarsEngine.validateActionSafety(parsedAction);
        return NextResponse.json({ success: true, ...safety });
      }

      case 'prompt': {
        const { taskGoal = 'Interact with GUI application' } = body;
        const prompt = uiTarsEngine.formatSystemPrompt(taskGoal);
        return NextResponse.json({ success: true, prompt });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: "${action}". Valid actions: parse, scale, validate, prompt` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[API /api/automation/ui-tars] Error:', err);
    return NextResponse.json(
      { error: err.message || 'UI-TARS API error' },
      { status: 500 }
    );
  }
}
