import { NextResponse } from 'next/server';
import { vectorDbWorkspace, chromaClient } from '@/lib/vectorDbEngine';

export async function POST(req: Request) {
  try {
    const { query, limit = 5, keywordWeight = 0.5, vectorWeight = 0.5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Run Hybrid Search on Vector DB Engine
    const hybrid = vectorDbWorkspace.hybridSearch(query, limit, {
      bm25Weight: keywordWeight,
      vectorWeight: vectorWeight,
      pageRankWeight: 0.10
    });

    // 2. Query Chroma Collection
    let chromaMatches: { id: string; file: string; chunk: string; score: string; distance: number }[] = [];
    try {
      const col = chromaClient.getOrCreateCollection({ name: 'offline_ai_workspace' });
      if (col.count() > 0) {
        const queryRes = col.query({
          queryTexts: [query],
          nResults: limit,
          include: ['documents', 'metadatas', 'distances']
        });

        if (queryRes.ids[0] && queryRes.ids[0].length > 0) {
          chromaMatches = queryRes.ids[0].map((id, idx) => {
            const doc = queryRes.documents[0]?.[idx] || '';
            const meta = queryRes.metadatas[0]?.[idx] || {};
            const dist = queryRes.distances[0]?.[idx] ?? 0;
            const sim = Math.max(0, 1 - dist);
            return {
              id,
              file: (meta.filePath as string) || 'workspace/code',
              chunk: doc,
              score: sim.toFixed(3),
              distance: dist
            };
          });
        }
      }
    } catch (_) {
      // Fallback
    }

    // Transform into standard sparse/dense/fused response
    const sparseResults = hybrid.map((h, i) => ({
      id: `sparse-${i}-${h.chunk.id}`,
      file: h.chunk.filePath,
      chunk: h.chunk.content.slice(0, 300),
      score: h.bm25Score.toFixed(3)
    }));

    const denseResults = (chromaMatches.length > 0
      ? chromaMatches
      : hybrid.map((h, i) => ({
          id: `dense-${i}-${h.chunk.id}`,
          file: h.chunk.filePath,
          chunk: h.chunk.content.slice(0, 300),
          score: h.denseScore.toFixed(3),
          distance: 1 - h.denseScore
        }))
    ).slice(0, limit);

    const fusedResults = hybrid.length > 0
      ? hybrid.map((h, i) => ({
          id: `fused-${i}-${h.chunk.id}`,
          file: h.chunk.filePath,
          chunk: h.chunk.content.slice(0, 300),
          score: (h.rrfScore * 10).toFixed(3)
        }))
      : denseResults.map((d, i) => ({
          id: `fused-${i}-${d.id}`,
          file: d.file,
          chunk: d.chunk,
          score: (parseFloat(d.score) * 100).toFixed(3)
        }));

    return NextResponse.json({
      success: true,
      query,
      sparse: sparseResults,
      dense: denseResults,
      fused: fusedResults,
      engine: 'Chroma Vector DB + BM25 Hybrid Fusion'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to perform hybrid search' }, { status: 500 });
  }
}
