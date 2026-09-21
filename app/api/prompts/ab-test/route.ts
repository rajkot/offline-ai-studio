import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { promptA, promptB, splitRatio } = await req.json();

    if (!promptA || !promptB) {
      return NextResponse.json({ error: 'Both promptA and promptB are required' }, { status: 400 });
    }

    // Simulate A/B testing analytics based on fake model execution
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

    // Generate random but realistic looking stats
    const generateStats = (baseLatency: number, baseTokens: number, baseQuality: number) => ({
      latency: Math.floor(baseLatency + (Math.random() * 50 - 25)),
      tokensPerSec: Math.floor(baseTokens + (Math.random() * 10 - 5)),
      qualityScore: Math.min(100, Math.max(0, Math.floor(baseQuality + (Math.random() * 6 - 3))))
    });

    // We'll give slight edge to newer versions usually, but add randomness
    const results = {
      promptA: generateStats(450, 40, 88),
      promptB: generateStats(380, 52, 94),
      winner: Math.random() > 0.5 ? 'A' : 'B',
      trafficSplit: {
        a: splitRatio,
        b: 100 - splitRatio
      }
    };

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run A/B test' }, { status: 500 });
  }
}
