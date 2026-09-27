import { NextRequest, NextResponse } from 'next/server';
import { browserAgentEngine, BrowserAuditOptions } from '@/lib/ai/browserAgentEngine';

export async function GET() {
  try {
    const status = browserAgentEngine.getStatus();
    return NextResponse.json({
      ok: true,
      data: status
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to get browser status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = body.url || 'http://localhost:3000';

    // Validate safe URL destination
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    const isLocalhost =
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname.startsWith('192.168.') ||
      parsedUrl.protocol === 'file:';

    if (!isLocalhost && !process.env.ALLOW_EXTERNAL_BROWSER_AUDIT) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Offline AI Studio browser inspection is restricted to local development URLs.'
        },
        { status: 403 }
      );
    }

    const options: BrowserAuditOptions = {
      timeoutMs: body.timeoutMs || 10000,
      viewportWidth: body.viewportWidth || 1280,
      viewportHeight: body.viewportHeight || 800,
      captureScreenshot: body.captureScreenshot !== false,
      fullPage: Boolean(body.fullPage),
      waitForSelector: body.waitForSelector
    };

    const auditResult = await browserAgentEngine.auditPage(rawUrl, options);

    return NextResponse.json({
      ok: true,
      data: auditResult
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Browser inspection failed' },
      { status: 500 }
    );
  }
}
