import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query, limit = 5, keywordWeight = 0.5, vectorWeight = 0.5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Mock data generation
    const mockFiles = ['/src/App.tsx', '/src/utils.ts', '/src/styles.css', '/package.json'];
    
    const sparseResults = Array.from({ length: limit }).map((_, i) => ({
      id: `sparse-${i}`,
      file: mockFiles[i % mockFiles.length],
      chunk: `Sparse chunk matched on keyword "${query.split(' ')[0] || 'search'}". This is a mock implementation representing BM25 exact match.`,
      score: (Math.random() * 0.5 + 0.5).toFixed(3)
    }));

    const denseResults = Array.from({ length: limit }).map((_, i) => ({
      id: `dense-${i}`,
      file: mockFiles[(i + 1) % mockFiles.length],
      chunk: `Dense chunk matching semantic intent of the query. Represents cosine similarity against vector embeddings.`,
      score: (Math.random() * 0.4 + 0.6).toFixed(3)
    }));

    const fusedResults = Array.from({ length: limit }).map((_, i) => {
      // Simulate RRF formula: 1 / (k + rank)
      const sparseRank = i + 1;
      const denseRank = (limit - i);
      const rrfScore = (keywordWeight * (1 / (60 + sparseRank))) + (vectorWeight * (1 / (60 + denseRank)));
      
      return {
        id: `fused-${i}`,
        file: mockFiles[(i + 2) % mockFiles.length],
        chunk: `Fused and re-ranked chunk based on Reciprocal Rank Fusion (RRF) with keyword weight ${keywordWeight} and vector weight ${vectorWeight}.`,
        score: (rrfScore * 1000).toFixed(3)
      };
    }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    return NextResponse.json({
      sparse: sparseResults,
      dense: denseResults,
      fused: fusedResults
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to perform hybrid search' }, { status: 500 });
  }
}
