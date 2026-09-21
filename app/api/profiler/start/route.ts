import { NextRequest, NextResponse } from 'next/server';

export interface FlamegraphFrame {
  id: string;
  name: string;
  file: string;
  depth: number;
  startTimeMs: number;
  durationMs: number;
  selfTimeMs: number;
  vramCostMb: number;
  cpuPct: number;
  children?: FlamegraphFrame[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'start', durationSec = 5 } = body;

    if (action === 'clear') {
      return NextResponse.json({
        success: true,
        message: 'Telemetry metrics cache and trace buffers flushed cleanly.',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'stop') {
      return NextResponse.json({
        success: true,
        status: 'stopped',
        message: 'Profiling trace session ended. Flamegraph profile compiled.',
        timestamp: new Date().toISOString()
      });
    }

    // Flamegraph call stack hierarchy
    const flamegraphData: FlamegraphFrame[] = [
      {
        id: 'root-1',
        name: 'app/api/pipeline/route.ts:POST',
        file: 'app/api/pipeline/route.ts',
        depth: 0,
        startTimeMs: 0,
        durationMs: 420,
        selfTimeMs: 15,
        vramCostMb: 120,
        cpuPct: 35,
        children: [
          {
            id: 'child-1-1',
            name: 'parseAndValidateRequest()',
            file: 'lib/validator.ts',
            depth: 1,
            startTimeMs: 15,
            durationMs: 45,
            selfTimeMs: 20,
            vramCostMb: 10,
            cpuPct: 12,
            children: [
              {
                id: 'child-1-1-1',
                name: 'zodSchema.safeParseAsync()',
                file: 'lib/schema.ts',
                depth: 2,
                startTimeMs: 20,
                durationMs: 25,
                selfTimeMs: 25,
                vramCostMb: 2,
                cpuPct: 8
              }
            ]
          },
          {
            id: 'child-1-2',
            name: 'VectorSearchRAG.queryEmbedding()',
            file: 'lib/rag/embed.ts',
            depth: 1,
            startTimeMs: 60,
            durationMs: 180,
            selfTimeMs: 35,
            vramCostMb: 450,
            cpuPct: 85,
            children: [
              {
                id: 'child-1-2-1',
                name: 'cosineSimilarityMatrix()',
                file: 'lib/math/vectors.ts',
                depth: 2,
                startTimeMs: 95,
                durationMs: 85,
                selfTimeMs: 85,
                vramCostMb: 120,
                cpuPct: 92
              },
              {
                id: 'child-1-2-2',
                name: 'hnswGraphIndexLookup()',
                file: 'lib/rag/hnsw.ts',
                depth: 2,
                startTimeMs: 180,
                durationMs: 60,
                selfTimeMs: 60,
                vramCostMb: 80,
                cpuPct: 45
              }
            ]
          },
          {
            id: 'child-1-3',
            name: 'GoogleGenAI.generateContentStream()',
            file: '@google/genai',
            depth: 1,
            startTimeMs: 240,
            durationMs: 160,
            selfTimeMs: 40,
            vramCostMb: 1200,
            cpuPct: 65,
            children: [
              {
                id: 'child-1-3-1',
                name: 'grpcStreamingDecoder()',
                file: 'lib/network/grpc.ts',
                depth: 2,
                startTimeMs: 280,
                durationMs: 120,
                selfTimeMs: 120,
                vramCostMb: 50,
                cpuPct: 28
              }
            ]
          },
          {
            id: 'child-1-4',
            name: 'postProcessTelemetryLogs()',
            file: 'lib/telemetry.ts',
            depth: 1,
            startTimeMs: 400,
            durationMs: 20,
            selfTimeMs: 20,
            vramCostMb: 5,
            cpuPct: 10
          }
        ]
      }
    ];

    // Live Telemetry Time Series (Last 20 ticks)
    const telemetryHistory = Array.from({ length: 20 }).map((_, i) => {
      const step = i + 1;
      return {
        timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString().substring(11, 19),
        cpuPct: Math.round((38 + Math.sin(step / 2) * 18 + Math.random() * 8) * 10) / 10,
        ramHeapMb: Math.round(1820 + Math.cos(step / 3) * 320 + Math.random() * 60),
        ramTotalMb: 4096,
        gpuVramGb: Math.round((5.8 + Math.sin(step / 4) * 1.2 + Math.random() * 0.2) * 10) / 10,
        gpuVramTotalGb: 12.0,
        gpuTempC: Math.round(58 + Math.sin(step / 3) * 6 + Math.random() * 2)
      };
    });

    return NextResponse.json({
      success: true,
      jobId: `trace-${Date.now().toString(36)}`,
      status: 'profiling',
      timestamp: new Date().toISOString(),
      summary: {
        totalDurationMs: 420,
        peakCpuPct: 92,
        peakRamHeapMb: 2240,
        ramWarningLimitMb: 3276, // 80% of 4096MB
        peakVramGb: 7.2,
        gpuTempC: 64,
        totalSamplesRecorded: 1420
      },
      telemetryHistory,
      flamegraph: flamegraphData,
      hotspots: [
        { function: 'cosineSimilarityMatrix()', file: 'lib/math/vectors.ts', selfTimeMs: 85, pctTotal: 20.2, vramMb: 120 },
        { function: 'grpcStreamingDecoder()', file: 'lib/network/grpc.ts', selfTimeMs: 120, pctTotal: 28.5, vramMb: 50 },
        { function: 'VectorSearchRAG.queryEmbedding()', file: 'lib/rag/embed.ts', selfTimeMs: 35, pctTotal: 8.3, vramMb: 450 }
      ]
    });

  } catch (err: any) {
    console.error('Profiler Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize profiler session' },
      { status: 500 }
    );
  }
}
