// app/api/docker/route.ts
// Docker Sandbox API — spawn/stop/exec isolated containers for build environments

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/* ─── helpers ───────────────────────────────────────────────────────────── */

async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker info --format "{{.ServerVersion}}"');
    return true;
  } catch {
    return false;
  }
}

function sanitiseContainerName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 63);
}

/* ─── Route handlers ────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json({
        available: false,
        containers: [],
        message: 'Docker daemon is not running or Docker is not installed. Install Docker Desktop to use sandbox environments.',
      });
    }

    // List running containers managed by offline-ai-studio
    const { stdout } = await execAsync(
      'docker ps --filter "label=managed-by=offline-ai-studio" --format "{{json .}}" 2>&1'
    );

    const containers = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({ available: true, containers });

  } catch (err: any) {
    return NextResponse.json({ available: false, containers: [], error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, containerId, containerName, image, command, workdir, env = {} } = body;

    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json({ success: false, error: 'Docker is not available on this system.' }, { status: 503 });
    }

    switch (action) {

      // ── Spawn a new sandbox container ─────────────────────────────────
      case 'spawn': {
        const safeImage = (image || 'node:20-alpine').replace(/[^a-zA-Z0-9:._-]/g, '');
        const safeName = sanitiseContainerName(containerName || `oai-sandbox-${Date.now()}`);
        const safeWorkdir = (workdir || '/workspace').replace(/[^a-zA-Z0-9/_-]/g, '');

        const envFlags = Object.entries(env)
          .map(([k, v]) => `-e ${k}="${String(v).replace(/"/g, '\\"')}"`)
          .join(' ');

        const spawnCmd = [
          'docker run -d',
          '--rm',
          `--name ${safeName}`,
          `--label managed-by=offline-ai-studio`,
          '--memory=1g',
          '--cpus=1',
          '--network=bridge',
          '--cap-drop=ALL',
          '--security-opt=no-new-privileges',
          `-w ${safeWorkdir}`,
          envFlags,
          safeImage,
          'tail -f /dev/null', // keep alive
        ].filter(Boolean).join(' ');

        const { stdout: cid } = await execAsync(spawnCmd);
        const trimmedId = cid.trim().slice(0, 12);

        return NextResponse.json({
          success: true,
          action: 'spawn',
          containerId: trimmedId,
          containerName: safeName,
          image: safeImage,
          message: `Container ${safeName} (${trimmedId}) started successfully.`,
        });
      }

      // ── Execute a command inside a container ──────────────────────────
      case 'exec': {
        if (!containerId) return NextResponse.json({ success: false, error: 'containerId required' }, { status: 400 });
        if (!command) return NextResponse.json({ success: false, error: 'command required' }, { status: 400 });

        const safeContainerId = containerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 63);

        try {
          const { stdout, stderr } = await execAsync(
            `docker exec ${safeContainerId} sh -c "${command.replace(/"/g, '\\"')}"`,
            { timeout: 30000 }
          );
          return NextResponse.json({
            success: true,
            action: 'exec',
            containerId: safeContainerId,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
          });
        } catch (execErr: any) {
          return NextResponse.json({
            success: false,
            action: 'exec',
            containerId: safeContainerId,
            stdout: execErr.stdout || '',
            stderr: execErr.stderr || execErr.message,
            exitCode: execErr.code || 1,
          });
        }
      }

      // ── Stop and remove a container ───────────────────────────────────
      case 'stop': {
        if (!containerId) return NextResponse.json({ success: false, error: 'containerId required' }, { status: 400 });
        const safeContainerId = containerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 63);
        await execAsync(`docker stop ${safeContainerId}`).catch(() => {});
        return NextResponse.json({ success: true, action: 'stop', containerId: safeContainerId, message: `Container ${safeContainerId} stopped.` });
      }

      // ── Copy files into container ─────────────────────────────────────
      case 'copy': {
        const { files: fileMap, destDir = '/workspace' } = body;
        if (!containerId) return NextResponse.json({ success: false, error: 'containerId required' }, { status: 400 });
        if (!fileMap || typeof fileMap !== 'object') return NextResponse.json({ success: false, error: 'files map required' }, { status: 400 });

        const safeContainerId = containerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 63);
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oai-copy-'));
        for (const [relPath, content] of Object.entries(fileMap)) {
          const safePath = path.join(tmpDir, relPath.replace(/\.\./g, '__'));
          fs.mkdirSync(path.dirname(safePath), { recursive: true });
          fs.writeFileSync(safePath, String(content), 'utf8');
        }

        await execAsync(`docker cp "${tmpDir}/." ${safeContainerId}:${destDir}`);
        fs.rmSync(tmpDir, { recursive: true, force: true });

        return NextResponse.json({ success: true, action: 'copy', containerId: safeContainerId, copiedFiles: Object.keys(fileMap), destDir });
      }

      // ── Pull an image ─────────────────────────────────────────────────
      case 'pull': {
        const safeImage = (image || 'node:20-alpine').replace(/[^a-zA-Z0-9:._-]/g, '');
        const { stdout } = await execAsync(`docker pull ${safeImage}`, { timeout: 120000 });
        return NextResponse.json({ success: true, action: 'pull', image: safeImage, output: stdout });
      }

      // ── List available images ─────────────────────────────────────────
      case 'images': {
        const { stdout } = await execAsync('docker images --format "{{json .}}" 2>&1');
        const images = stdout.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        return NextResponse.json({ success: true, action: 'images', images });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[docker-api] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
