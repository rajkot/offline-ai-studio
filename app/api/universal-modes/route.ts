import { NextRequest, NextResponse } from 'next/server';
import { universalModesEngine, UniversalStudioMode } from '@/lib/ai/universalModesEngine';

export async function GET() {
  try {
    const currentMode = universalModesEngine.getCurrentMode();
    const modes = universalModesEngine.getAllModes();
    const activeMeta = universalModesEngine.getModeMetadata(currentMode);

    return NextResponse.json({
      status: 'online',
      currentMode,
      activeMeta,
      modes,
      totalModes: modes.length,
      capabilities: [
        'Domain-specific system prompt injection',
        'Story lore bibles & narrative arc scaffolding',
        'Poetic meter validation & syllable counting',
        'LaTeX scientific formula & citation generation',
        'Socratic 3-tier tutoring (ELI5 to Graduate)',
        'Executive summaries, NDAs & SWOT risk matrices'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, mode, prompt = '', text = '', context = '' } = body;

    if (action === 'setMode') {
      if (!mode) {
        return NextResponse.json({ error: 'Mode is required' }, { status: 400 });
      }
      universalModesEngine.setMode(mode as UniversalStudioMode);
      return NextResponse.json({
        success: true,
        currentMode: universalModesEngine.getCurrentMode(),
        metadata: universalModesEngine.getModeMetadata(mode as UniversalStudioMode)
      });
    }

    if (action === 'generate') {
      const targetMode = (mode || universalModesEngine.getCurrentMode()) as UniversalStudioMode;
      const result = universalModesEngine.generateDomainContent(targetMode, prompt, context);
      return NextResponse.json({
        success: true,
        mode: targetMode,
        ...result
      });
    }

    if (action === 'countSyllables') {
      const count = universalModesEngine.countSyllables(text || '');
      return NextResponse.json({
        success: true,
        text,
        syllables: count
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
