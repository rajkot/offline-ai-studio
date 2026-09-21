import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

// Blacklist destructive system commands
const BLOCKED_COMMAND_PATTERNS = [
  /\brm\s+-(?:rf|fr)\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bformat\s+[a-z]:/i,
  /\b(?:shutdown|reboot)\b/i,
  /\bdel\s+\/f\s+\/s\s+\/q\s+[c-z]:\\/i
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { command, cwd, timeoutMs = 30000 } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Command string is required.' },
        { status: 400 }
      );
    }

    // Safety guardrail check
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
      if (pattern.test(command)) {
        return NextResponse.json(
          {
            success: false,
            error: `Command blocked by security guardrails: forbidden destructive pattern detected.`,
            blocked: true
          },
          { status: 403 }
        );
      }
    }

    const workingDir = cwd ? path.resolve(cwd) : process.cwd();
    const startTime = Date.now();

    return await new Promise<NextResponse>((resolve) => {
      const child = exec(
        command,
        {
          cwd: workingDir,
          timeout: Math.min(timeoutMs, 60000), // Max 60 seconds
          maxBuffer: 1024 * 1024 * 4 // 4 MB buffer
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

          resolve(
            NextResponse.json({
              success: exitCode === 0,
              exitCode,
              stdout: stdout || '',
              stderr: stderr || (error ? error.message : ''),
              durationMs,
              command,
              cwd: workingDir
            })
          );
        }
      );
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Execution failed' },
      { status: 500 }
    );
  }
}
