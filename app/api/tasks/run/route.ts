import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, cwd } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ success: false, error: 'Command string is required' }, { status: 400 });
    }

    const workingDir = cwd || process.cwd();
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 120000 // 2 minutes
      });

      const durationMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        exitCode: 0,
        stdout,
        stderr,
        durationMs
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        exitCode: err.code || 1,
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || '',
        durationMs
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
