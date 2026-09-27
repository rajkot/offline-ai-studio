import { NextRequest, NextResponse } from 'next/server';
import { smartMacroEngine, SmartMacroDefinition } from '@/lib/automation/smartMacroEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'validate': {
        const macro: Partial<SmartMacroDefinition> = body.macro;
        const result = smartMacroEngine.validateMacro(macro);
        return NextResponse.json(result);
      }

      case 'match': {
        const { intent, candidates } = body;
        if (!intent || !candidates || !Array.isArray(candidates)) {
          return NextResponse.json(
            { error: 'Both "intent" and array of "candidates" are required.' },
            { status: 400 }
          );
        }
        const match = await smartMacroEngine.matchElementWithNanoJev(intent, candidates);
        return NextResponse.json(match);
      }

      case 'inspect': {
        const { url } = body;
        if (!url || typeof url !== 'string') {
          return NextResponse.json({ error: '"url" is required for inspect.' }, { status: 400 });
        }
        const elements = await smartMacroEngine.inspectPageElements(url);
        return NextResponse.json({ url, count: elements.length, elements });
      }

      case 'execute': {
        const macro: SmartMacroDefinition = body.macro;
        const validation = smartMacroEngine.validateMacro(macro);
        if (!validation.valid) {
          return NextResponse.json({ success: false, errors: validation.errors }, { status: 400 });
        }

        const runResult = await smartMacroEngine.executeMacro(macro);
        return NextResponse.json(runResult);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: "${action}". Valid actions: validate, match, inspect, execute` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[API /api/automation/macro] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Automation Macro error' },
      { status: 500 }
    );
  }
}
