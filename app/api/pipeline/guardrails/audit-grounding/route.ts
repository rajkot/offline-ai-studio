import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text || body.response || body.prompt;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Split text into sentences for basic analysis
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Mock hallucination logic: randomly select one sentence to be ungrounded if there are multiple
    let ungroundedSentences: string[] = [];
    let sources: any[] = [];
    let score = 100;

    if (sentences.length > 0) {
      const hallucinationIndex = Math.floor(Math.random() * sentences.length);
      sentences.forEach((sentence: string, i: number) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length < 5) return;
        
        // Let's say ~30% chance a random sentence is hallucinated, or we can just guarantee one for demo purposes, 
        // but maybe only if it has words like 'always', 'never', 'must'. We'll just randomly mark one if Math.random() > 0.5.
        // Actually, to ensure the UI can be tested, we'll mark sentences containing specific keywords, or just the first sentence.
        if (i === sentences.length - 1 && sentences.length > 1) {
            ungroundedSentences.push(cleanSentence);
            score = 65; // Red
        } else if (i === hallucinationIndex && sentences.length > 2) {
            ungroundedSentences.push(cleanSentence);
            score = 75; // Yellow
        } else {
            sources.push({
                claim: cleanSentence,
                chunk: `This is a retrieved chunk from the workspace that supports the claim: "${cleanSentence.substring(0, 30)}..."`,
                file: '/src/components/App.tsx'
            });
        }
      });
      
      // If no ungrounded, score is 95
      if (ungroundedSentences.length === 0) {
        score = 95;
      }
    }

    return NextResponse.json({
      score,
      ungroundedSentences,
      sources
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to perform grounding audit' }, { status: 500 });
  }
}
