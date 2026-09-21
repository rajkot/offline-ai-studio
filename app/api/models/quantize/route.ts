// app/api/models/quantize/route.ts
// GGUF Quantization Studio API — wraps llama.cpp convert/quantize tools

import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface QuantizationRequest {
  action: 'check' | 'estimate' | 'quantize' | 'list' | 'status';
  modelPath?: string;          // local path to safetensors or gguf
  outputDir?: string;
  quantType?: 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'Q4_0' | 'Q6_K' | 'F16';
  jobId?: string;
}

// In-memory job tracking
const quantJobs = new Map<string, {
  id: string;
  status: 'running' | 'done' | 'error';
  modelPath: string;
  quantType: string;
  outputPath: string;
  startedAt: number;
  finishedAt?: number;
  log: string[];
  error?: string;
}>();

/* ─── VRAM estimates ─────────────────────────────────────────────────────── */

const QUANT_SPECS: Record<string, { bpw: number; label: string; qualityScore: number; recommended: boolean }> = {
  'Q4_0':   { bpw: 4.5,  label: '4-bit (Basic)',          qualityScore: 72, recommended: false },
  'Q4_K_M': { bpw: 4.85, label: '4-bit K-Quant Medium',   qualityScore: 84, recommended: true  },
  'Q5_K_M': { bpw: 5.68, label: '5-bit K-Quant Medium',   qualityScore: 91, recommended: true  },
  'Q6_K':   { bpw: 6.57, label: '6-bit K-Quant',          qualityScore: 96, recommended: false },
  'Q8_0':   { bpw: 8.5,  label: '8-bit (Near Lossless)',  qualityScore: 99, recommended: true  },
  'F16':    { bpw: 16,   label: '16-bit Float (Lossless)', qualityScore: 100, recommended: false },
};

function estimateVramGb(paramsBillion: number, bpw: number): number {
  // Model weights + KV cache + overhead
  const weightsGb = (paramsBillion * 1e9 * bpw) / (8 * 1024 ** 3);
  const overheadGb = 0.5 + paramsBillion * 0.05; // KV cache + overhead
  return Math.round((weightsGb + overheadGb) * 10) / 10;
}

function guessParamCount(modelPath: string): number {
  const lower = modelPath.toLowerCase();
  if (lower.includes('0.5b') || lower.includes('500m')) return 0.5;
  if (lower.includes('1b') || lower.includes('1.1b') || lower.includes('1.3b')) return 1.3;
  if (lower.includes('1.5b')) return 1.5;
  if (lower.includes('3b') || lower.includes('2.7b')) return 3;
  if (lower.includes('7b') || lower.includes('6.7b')) return 7;
  if (lower.includes('13b') || lower.includes('14b')) return 13;
  if (lower.includes('30b') || lower.includes('32b')) return 30;
  if (lower.includes('70b') || lower.includes('65b')) return 70;
  return 7; // default assume 7B
}

/* ─── Tool detection ─────────────────────────────────────────────────────── */

async function detectLlamaCpp(): Promise<{ available: boolean; path: string; version?: string }> {
  const candidates = [
    'llama-quantize',
    'llama.cpp/build/bin/llama-quantize',
    path.join(os.homedir(), 'llama.cpp', 'build', 'bin', 'llama-quantize'),
    path.join(os.homedir(), 'llama.cpp', 'quantize'),
    '/usr/local/bin/llama-quantize',
    '/opt/llama.cpp/build/bin/llama-quantize',
  ];

  for (const cmd of candidates) {
    try {
      const { stdout } = await execAsync(`"${cmd}" --version 2>&1 || "${cmd}" 2>&1 | head -n 1`);
      return { available: true, path: cmd, version: stdout.trim().split('\n')[0] };
    } catch {}
  }

  // Try ollama's bundled llama-cli
  try {
    await execAsync('ollama --version');
    return { available: true, path: 'ollama', version: 'via Ollama' };
  } catch {}

  return { available: false, path: '' };
}

async function detectPython(): Promise<{ available: boolean; hasTransformers: boolean }> {
  try {
    const { stdout } = await execAsync('python --version 2>&1 || python3 --version 2>&1');
    try {
      await execAsync('python -c "import transformers" 2>&1 || python3 -c "import transformers" 2>&1');
      return { available: true, hasTransformers: true };
    } catch {
      return { available: true, hasTransformers: false };
    }
  } catch {
    return { available: false, hasTransformers: false };
  }
}

/* ─── Main route ─────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body: QuantizationRequest = await req.json();
    const { action, modelPath, outputDir, quantType = 'Q4_K_M', jobId } = body;

    switch (action) {

      // ── Tool availability check ────────────────────────────────────────
      case 'check': {
        const [llamaCpp, python] = await Promise.all([detectLlamaCpp(), detectPython()]);
        return NextResponse.json({
          success: true,
          llamaCpp,
          python,
          ready: llamaCpp.available,
          installGuide: llamaCpp.available ? null : {
            windows: 'git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp && cmake -B build && cmake --build build --config Release',
            linux: 'git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp && make',
            macos: 'brew install llama.cpp  OR  git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp && make',
          },
        });
      }

      // ── VRAM estimate for all quant types ──────────────────────────────
      case 'estimate': {
        if (!modelPath) return NextResponse.json({ error: 'modelPath required' }, { status: 400 });
        const paramsBillion = guessParamCount(modelPath);
        const estimates = Object.entries(QUANT_SPECS).map(([qt, spec]) => ({
          quantType: qt,
          label: spec.label,
          bitsPerWeight: spec.bpw,
          estimatedVramGb: estimateVramGb(paramsBillion, spec.bpw),
          estimatedFileSizeGb: Math.round((paramsBillion * 1e9 * spec.bpw) / (8 * 1024 ** 3) * 10) / 10,
          qualityScore: spec.qualityScore,
          recommended: spec.recommended,
        }));

        return NextResponse.json({
          success: true,
          modelPath,
          estimatedParams: `${paramsBillion}B`,
          estimates,
        });
      }

      // ── Run quantization ───────────────────────────────────────────────
      case 'quantize': {
        if (!modelPath) return NextResponse.json({ error: 'modelPath required' }, { status: 400 });

        const llamaCpp = await detectLlamaCpp();
        if (!llamaCpp.available) {
          return NextResponse.json({
            success: false,
            error: 'llama.cpp not found. Please build llama.cpp and ensure llama-quantize is on your PATH.',
          }, { status: 503 });
        }

        const jobIdNew = `quant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const safeModelPath = path.resolve(modelPath).replace(/[;&|`$]/g, '');
        const safeOutputDir = path.resolve(outputDir || path.dirname(safeModelPath));
        const modelName = path.basename(safeModelPath, path.extname(safeModelPath));
        const outputPath = path.join(safeOutputDir, `${modelName}-${quantType}.gguf`);

        const job = {
          id: jobIdNew,
          status: 'running' as const,
          modelPath: safeModelPath,
          quantType,
          outputPath,
          startedAt: Date.now(),
          log: [`[${new Date().toISOString()}] Starting quantization: ${quantType}`],
        };
        quantJobs.set(jobIdNew, job);

        // Run async
        const doQuant = async () => {
          try {
            let cmd: string;
            if (llamaCpp.path === 'ollama') {
              // Use ollama create for conversion
              cmd = `ollama create ${modelName}-${quantType.toLowerCase()} --from ${safeModelPath}`;
            } else {
              cmd = `"${llamaCpp.path}" "${safeModelPath}" "${outputPath}" ${quantType}`;
            }

            const child = spawn(cmd, [], { shell: true });
            child.stdout?.on('data', d => { job.log.push(d.toString()); });
            child.stderr?.on('data', d => { job.log.push(d.toString()); });

            await new Promise<void>((resolve, reject) => {
              child.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Process exited with code ${code}`));
              });
              child.on('error', reject);
              // Timeout after 30 minutes
              setTimeout(() => { child.kill(); reject(new Error('Timeout after 30 minutes')); }, 30 * 60 * 1000);
            });

            (job as any).status = 'done';
            (job as any).finishedAt = Date.now();
            job.log.push(`[${new Date().toISOString()}] ✓ Quantization complete: ${outputPath}`);
          } catch (err: any) {
            (job as any).status = 'error';
            (job as any).finishedAt = Date.now();
            (job as any).error = err.message;
            job.log.push(`[${new Date().toISOString()}] ✗ Error: ${err.message}`);
          }
        };

        doQuant(); // fire and forget

        return NextResponse.json({
          success: true,
          jobId: jobIdNew,
          message: `Quantization job started (${quantType})`,
          outputPath,
        });
      }

      // ── Check job status ───────────────────────────────────────────────
      case 'status': {
        if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
        const job = quantJobs.get(jobId);
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        return NextResponse.json({
          success: true,
          job: {
            id: job.id, status: job.status, modelPath: job.modelPath,
            quantType: job.quantType, outputPath: job.outputPath,
            startedAt: job.startedAt, finishedAt: job.finishedAt,
            log: job.log.slice(-30), // last 30 lines
            error: job.error,
          },
        });
      }

      // ── List recent jobs ───────────────────────────────────────────────
      case 'list': {
        const jobs = Array.from(quantJobs.values()).map(j => ({
          id: j.id, status: j.status, modelPath: j.modelPath,
          quantType: j.quantType, outputPath: j.outputPath,
          startedAt: j.startedAt, finishedAt: j.finishedAt,
          error: j.error,
        }));
        return NextResponse.json({ success: true, jobs });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[quantize] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
