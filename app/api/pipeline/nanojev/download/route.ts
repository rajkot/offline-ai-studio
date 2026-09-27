import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { nanoJevEngine } from '@/lib/ai/nanoJevEngine';

interface DownloadJobState {
  inProgress: boolean;
  startedAt?: string;
  completedAt?: string;
  progress: number;
  statusText: string;
  logs: string[];
  error?: string;
}

const activeJob: DownloadJobState = {
  inProgress: false,
  progress: 0,
  statusText: 'Idle',
  logs: []
};

export async function GET() {
  const status = nanoJevEngine.getStatus();
  return NextResponse.json({
    ok: true,
    engineStatus: status,
    job: activeJob
  });
}

export async function POST(req: NextRequest) {
  if (activeJob.inProgress) {
    return NextResponse.json(
      { ok: false, error: 'A download is already in progress', job: activeJob },
      { status: 409 }
    );
  }

  const rootDir = process.cwd();
  const scriptPath = path.join(rootDir, 'scripts', 'install-nanojev.ps1');

  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      { ok: false, error: `Installation script not found at ${scriptPath}` },
      { status: 404 }
    );
  }

  activeJob.inProgress = true;
  activeJob.startedAt = new Date().toISOString();
  activeJob.completedAt = undefined;
  activeJob.progress = 5;
  activeJob.statusText = 'Starting NanoJev download pipeline...';
  activeJob.logs = ['[INIT] NanoJev download request received.'];
  activeJob.error = undefined;

  // Launch PowerShell detached child process
  try {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath
    ], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ps.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (!line) return;
      activeJob.logs.push(line);
      if (activeJob.logs.length > 50) activeJob.logs.shift();

      if (line.includes('git-xet')) {
        activeJob.progress = 20;
        activeJob.statusText = 'Validating git-xet package...';
      } else if (line.includes('hf CLI')) {
        activeJob.progress = 40;
        activeJob.statusText = 'Validating Hugging Face CLI...';
      } else if (line.includes('Downloading') || line.includes('clone')) {
        activeJob.progress = 70;
        activeJob.statusText = 'Downloading C-Tianyu/NanoJev weights...';
      } else if (line.includes('COMPLETE') || line.includes('SUCCESS')) {
        activeJob.progress = 100;
        activeJob.statusText = 'NanoJev installed successfully!';
      }
    });

    ps.stderr.on('data', (data) => {
      const err = data.toString().trim();
      if (err) {
        activeJob.logs.push(`[ERR] ${err}`);
        if (activeJob.logs.length > 50) activeJob.logs.shift();
      }
    });

    ps.on('close', (code) => {
      activeJob.inProgress = false;
      activeJob.completedAt = new Date().toISOString();
      if (code === 0) {
        activeJob.progress = 100;
        activeJob.statusText = 'NanoJev ready for local inference.';
        activeJob.logs.push('[DONE] Process exited with code 0.');
      } else {
        activeJob.statusText = `Installation failed (exit code ${code})`;
        activeJob.error = `Process exited with code ${code}`;
        activeJob.logs.push(`[FAILED] Exited with code ${code}`);
      }
    });

    return NextResponse.json({
      ok: true,
      message: 'NanoJev automated download initiated in background',
      job: activeJob
    });
  } catch (err: any) {
    activeJob.inProgress = false;
    activeJob.error = err.message;
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
