import { NextResponse } from 'next/server';

let ragStats = {
  indexedFilesCount: 24,
  totalChunksCount: 188,
  status: 'idle', // 'idle' | 'scanning' | 'embedding' | 'indexed'
  autoIndexing: false,
  recentFiles: [
    { path: 'components/Playground.tsx', chunksCount: 18, sizeKb: 52.4 },
    { path: 'components/FinopsDashboard.tsx', chunksCount: 14, sizeKb: 16.8 },
    { path: 'components/ReleaseHubDashboard.tsx', chunksCount: 16, sizeKb: 14.2 },
    { path: 'app/api/rag/hybrid-search/route.ts', chunksCount: 8, sizeKb: 6.1 },
    { path: 'components/ThemeContext.tsx', chunksCount: 6, sizeKb: 2.3 }
  ]
};

export async function GET() {
  return NextResponse.json(ragStats);
}
