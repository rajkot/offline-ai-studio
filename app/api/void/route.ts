import { NextRequest, NextResponse } from 'next/server';
import { voidFastApplyEngine } from '@/lib/ai/voidFastApplyEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'diff') {
      const { filePath = 'file.ts', oldContent = '', newContent = '' } = body;
      const hunks = voidFastApplyEngine.computeHunks(oldContent, newContent);
      const unifiedDiff = voidFastApplyEngine.generateUnifiedDiff(filePath, oldContent, newContent);

      let additions = 0;
      let deletions = 0;
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'insert') additions++;
          if (line.type === 'delete') deletions++;
        }
      }

      return NextResponse.json({
        hunks,
        unifiedDiff,
        stats: {
          additions,
          deletions,
          modifiedHunks: hunks.length
        }
      });
    }

    if (action === 'fast_apply') {
      const { originalContent = '', hunks = [] } = body;
      const result = voidFastApplyEngine.fastApply(originalContent, hunks);
      return NextResponse.json({
        success: result.conflicts.length === 0,
        updatedContent: result.updatedContent,
        conflicts: result.conflicts
      });
    }

    if (action === 'ghost_text') {
      const { prefix = '', fullCompletion = '' } = body;
      const ghostText = voidFastApplyEngine.extractGhostText(prefix, fullCompletion);
      const wordResult = voidFastApplyEngine.acceptNextWord(ghostText);

      return NextResponse.json({
        ghostText,
        nextWord: wordResult.acceptedWord,
        remainingGhostText: wordResult.remainingGhostText
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
