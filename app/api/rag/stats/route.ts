import { NextResponse } from 'next/server';
import { vectorDbWorkspace, chromaClient } from '@/lib/vectorDbEngine';

export async function GET() {
  const stats = vectorDbWorkspace.getStats();
  const chromaCollections = chromaClient.listCollections();
  const totalChromaRecords = chromaCollections.reduce((acc, c) => acc + c.count, 0);

  return NextResponse.json({
    indexedFilesCount: stats.totalFiles,
    totalChunksCount: stats.totalChunks,
    totalSymbols: stats.totalSymbols,
    totalEdges: stats.totalEdges,
    status: stats.totalChunks > 0 ? 'indexed' : 'idle',
    autoIndexing: true,
    storageEngine: stats.storageEngine,
    averageQueryLatencyMs: stats.averageQueryLatencyMs,
    chroma: {
      collectionsCount: chromaCollections.length,
      totalRecords: totalChromaRecords,
      collections: chromaCollections.map(c => ({ name: c.name, count: c.count }))
    }
  });
}
