import { NextRequest, NextResponse } from 'next/server';
import { openCodeReviewEngine } from '@/lib/ai/openCodeReviewEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { filePath, code } = body;

    const targetPath = filePath || 'components/Playground.tsx';
    const targetCode = code || `
      // Sample code review target
      export function fetchUserData(userId: string) {
        const query = "SELECT * FROM users WHERE id = '" + userId + "'";
        const user = db.raw(query);
        return user.profile.settings.theme;
      }
    `;

    const review = openCodeReviewEngine.reviewCode(targetPath, targetCode);

    return NextResponse.json({
      status: 'ready',
      engine: 'Alibaba Open Code Review (OCR)',
      review
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Open Code Review failed' }, { status: 500 });
  }
}
