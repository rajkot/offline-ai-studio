import { NextRequest, NextResponse } from 'next/server';
import { novelEditorEngine } from '@/lib/ai/novelEditorEngine';

export async function GET() {
  try {
    const slashCommands = novelEditorEngine.getSlashCommands();
    return NextResponse.json({
      status: 'online',
      editor: 'Novel: Notion-Style WYSIWYG Creative Studio',
      slashCommands,
      totalCommands: slashCommands.length,
      capabilities: [
        'Slash commands (/) for story scenes, LaTeX, sonnets, quizzes & NDAs',
        'Floating bubble formatting toolbar',
        'Inline AI continuation (++ or Tab)',
        'Dual-mode sync between Visual Canvas and Monaco Editor',
        'Real-time reading time, word count & grade level metrics'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text = '', cursorPos = 0, mode = 'creative_story', transformType = 'rewrite' } = body;

    if (action === 'autocomplete') {
      const continuation = novelEditorEngine.generateInlineContinuation(text, cursorPos, mode);
      return NextResponse.json({
        success: true,
        continuation,
        insertedAt: cursorPos
      });
    }

    if (action === 'metrics') {
      const metrics = novelEditorEngine.getDocumentMetrics(text);
      return NextResponse.json({
        success: true,
        metrics
      });
    }

    if (action === 'transform') {
      let transformed = text;
      if (transformType === 'poetic') {
        transformed = `The silent hours unfold their gilded wing,\nWhile in the dark, the quiet muses sing;\n` + text;
      } else if (transformType === 'academic') {
        transformed = `Empirical formalization indicates that: ${text.toLowerCase()}`;
      } else if (transformType === 'concise') {
        transformed = text.split('.').slice(0, 2).join('.') + '.';
      } else {
        transformed = `**Refined:** ${text}`;
      }

      return NextResponse.json({
        success: true,
        original: text,
        transformed,
        transformType
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
