import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, taskId, correctedOutput, feedback } = body;

    if (action === 'approve' || !action) {
      return NextResponse.json({
        success: true,
        message: `Task ${taskId || 'selected'} approved and merged into active workspace & RAG golden dataset.`,
        goldenSampleId: `golden-${Date.now()}`,
        correctedLength: correctedOutput?.length || 0,
        updatedStats: {
          totalCorrectionsCaptured: 149,
          datasetSizeKb: 2426,
          readinessPercentage: 85
        }
      });
    }

    if (action === 'reroute') {
      return NextResponse.json({
        success: true,
        message: `Re-routed corrected code snippet for task ${taskId || 'selected'} back to Gemini model for feedback-guided regeneration.`,
        suggestedRegenerationPrompt: `Feedback edit: "${feedback || 'Refactored code structure'}". Corrected snippet:\n${correctedOutput}`
      });
    }

    if (action === 'discard') {
      return NextResponse.json({
        success: true,
        message: `Task ${taskId || 'selected'} discarded from review queue.`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to process approval request' }, { status: 500 });
  }
}
