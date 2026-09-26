import { NextResponse } from 'next/server';
import { llamaCppEngine, GGUF_QUANTIZATION_TYPES } from '@/lib/ai/llamaCppEngine';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      engine: 'llama.cpp (ggerganov/llama.cpp)',
      version: 'b4500 (GGUF v3)',
      description: 'Extremely lightweight and superfast LLM inference engine in pure C/C++',
      supportedQuantizations: Object.keys(GGUF_QUANTIZATION_TYPES),
      quantizationMatrix: GGUF_QUANTIZATION_TYPES,
      defaultServerPort: 8080,
      accelerationBackends: ['CUDA (NVIDIA)', 'Metal (Apple Silicon)', 'Vulkan (AMD/Intel)', 'CPU AVX2/AVX-512', 'SYCL (Intel Arc)']
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to query llama.cpp engine' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, paramsBillions, quantKey, contextTokens, availableVramGb, totalLayers, prompt, modelPath } = body;

    switch (action) {
      case 'calculate-vram': {
        const pSize = Number(paramsBillions) || 7.0;
        const qKey = quantKey || 'Q4_K_M';
        const ctx = Number(contextTokens) || 8192;
        const vram = Number(availableVramGb) || 8.0;
        const layers = Number(totalLayers) || 32;

        const result = llamaCppEngine.calculateVram(pSize, qKey, ctx, vram, layers);
        const cliCmd = llamaCppEngine.generateCliCommand(modelPath, result);
        const srvCmd = llamaCppEngine.generateServerCommand(modelPath, result);

        return NextResponse.json({
          success: true,
          calculation: result,
          commands: { cli: cliCmd, server: srvCmd }
        });
      }

      case 'generate': {
        const textPrompt = prompt || 'Write a binary search algorithm in C++';
        const res = await llamaCppEngine.generateText(textPrompt, 'Qwen2.5-Coder-7B-Instruct', quantKey || 'Q4_K_M');
        return NextResponse.json({ success: true, result: res });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'llama.cpp execution failed' },
      { status: 500 }
    );
  }
}
