import { NextRequest, NextResponse } from 'next/server';

// In-memory mock state for optimizer status in dev/sandbox environment
let isLowResourceMode = false;
let activeLoadedModel = 'qwen2.5-coder:7b-instruct-q4_K_M';
let lastFlushTimestamp = Date.now();

interface ModelAllocation {
  modelName: string;
  vramUsageMB: number;
  totalLayerAllocated: number;
  quantization: string;
  status: 'active' | 'cached' | 'dormant';
  contextTokens: number;
}

export async function GET(req: NextRequest) {
  // Compute dynamic memory metrics (realistic simulation based on low resource mode & flush state)
  const timeSinceFlush = (Date.now() - lastFlushTimestamp) / 1000;
  
  // Base RAM: if low-resource, capped around 3.8GB - 5.2GB / 8GB; otherwise 6.2GB - 7.4GB / 16GB
  let totalRamMB = isLowResourceMode ? 8192 : 16384;
  let baseUsedRamMB = isLowResourceMode ? 3600 : 7200;
  // Drift slightly over time
  let driftMB = Math.min(Math.floor(timeSinceFlush * 15), isLowResourceMode ? 2800 : 6400);
  let usedRamMB = baseUsedRamMB + driftMB;
  let ramPercent = Math.min(Math.round((usedRamMB / totalRamMB) * 100), 96);

  let totalVramMB = isLowResourceMode ? 4096 : 12288;
  
  let models: ModelAllocation[] = [
    {
      modelName: activeLoadedModel,
      vramUsageMB: isLowResourceMode ? 1850 : 4420,
      totalLayerAllocated: isLowResourceMode ? 24 : 36,
      quantization: isLowResourceMode ? 'q3_K_S' : 'q4_K_M',
      status: 'active',
      contextTokens: 4096
    }
  ];

  if (timeSinceFlush > 30) {
    models.push({
      modelName: 'deepseek-coder:6.7b-base',
      vramUsageMB: isLowResourceMode ? 920 : 2840,
      totalLayerAllocated: isLowResourceMode ? 12 : 28,
      quantization: 'q4_K_S',
      status: 'cached',
      contextTokens: 2048
    });
  }

  if (timeSinceFlush > 60 && !isLowResourceMode) {
    models.push({
      modelName: 'starcoder2:3b-q8',
      vramUsageMB: 1650,
      totalLayerAllocated: 24,
      quantization: 'q8_0',
      status: 'dormant',
      contextTokens: 1024
    });
  }

  let totalUsedVramMB = models.reduce((acc, m) => acc + m.vramUsageMB, 0);
  let vramPercent = Math.min(Math.round((totalUsedVramMB / totalVramMB) * 100), 98);

  return NextResponse.json({
    success: true,
    activeLoadedModel,
    isLowResourceMode,
    sequentialExecutionEnforced: isLowResourceMode,
    aggressiveGcEnabled: isLowResourceMode,
    systemRam: {
      totalMB: totalRamMB,
      usedMB: usedRamMB,
      freeMB: totalRamMB - usedRamMB,
      percent: ramPercent,
      isHighPressure: ramPercent >= 85
    },
    vram: {
      totalMB: totalVramMB,
      usedMB: totalUsedVramMB,
      freeMB: totalVramMB - totalUsedVramMB,
      percent: vramPercent
    },
    models,
    lastFlushTimestamp
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body.isLowResourceMode === 'boolean') {
      isLowResourceMode = body.isLowResourceMode;
    }
    if (body.activeModel) {
      activeLoadedModel = body.activeModel;
    }
    return NextResponse.json({
      success: true,
      isLowResourceMode,
      activeLoadedModel,
      message: `Low-resource mode set to ${isLowResourceMode ? 'ENABLED (Sequential multi-agent execution & aggressive GC)' : 'DISABLED'}`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid body' }, { status: 400 });
  }
}
