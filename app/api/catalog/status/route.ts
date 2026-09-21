import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
          progress = 100;
          const data = JSON.stringify({ status: 'completed', progress: 100, speed: '0.0 MB/s', eta: '0s' });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          clearInterval(interval);
          controller.close();
        } else {
          const speed = (Math.random() * 8 + 12).toFixed(1) + ' MB/s';
          const eta = Math.max(1, Math.floor((100 - progress) / 15)) + 's';
          const data = JSON.stringify({ status: 'downloading', progress, speed, eta });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }, 600);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
