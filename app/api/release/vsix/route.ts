import { NextResponse } from 'next/server';

export async function GET() {
  const dummyVsixContent = 'PK\x03\x04\x14\x00\x00\x00\x08\x00... [OFFLINE AI IDE VSIX STANDALONE BUNDLE v1.0.0] ...';

  return new NextResponse(dummyVsixContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/vsix',
      'Content-Disposition': 'attachment; filename="offline-ai-ide-v1.0.0.vsix"'
    }
  });
}
