/**
 * Ollama Background Daemon Manager & Process Auto-Launcher
 * Automatically locates the Ollama binary and starts `ollama serve`
 * in the background if the local AI daemon is not running.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { checkOllamaHealth, getOllamaBaseUrl } from './ollamaClient';

let isStartingDaemon = false;
let startPromise: Promise<OllamaStartResult> | null = null;

export interface OllamaStartResult {
  online: boolean;
  started: boolean;
  alreadyRunning: boolean;
  version?: string;
  executablePath?: string;
  error?: string;
}

/**
 * Locate the Ollama executable on the system across platforms
 */
export function findOllamaExecutable(): string | null {
  // 1. Explicit environment variable
  if (process.env.OLLAMA_PATH && fs.existsSync(process.env.OLLAMA_PATH)) {
    return process.env.OLLAMA_PATH;
  }

  const isWin = process.platform === 'win32';

  if (isWin) {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', 'ollama.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Ollama', 'ollama.exe'),
    ];

    for (const p of candidates) {
      try {
        if (p && fs.existsSync(p)) {
          return p;
        }
      } catch {}
    }

    // Try `where.exe ollama`
    try {
      const output = execSync('where.exe ollama', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
      const first = output.split('\n')[0]?.trim();
      if (first && fs.existsSync(first)) {
        return first;
      }
    } catch {}
  } else {
    // macOS / Linux
    const candidates = [
      '/usr/local/bin/ollama',
      '/usr/bin/ollama',
      '/opt/homebrew/bin/ollama',
      path.join(process.env.HOME || '', '.ollama', 'bin', 'ollama'),
    ];

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {}
    }

    // Try `which ollama`
    try {
      const output = execSync('which ollama', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
      const first = output.split('\n')[0]?.trim();
      if (first && fs.existsSync(first)) {
        return first;
      }
    } catch {}
  }

  return null;
}

/**
 * Ensures Ollama is running. If offline, launches `ollama serve` detached.
 */
export async function ensureOllamaRunning(baseUrl = getOllamaBaseUrl()): Promise<OllamaStartResult> {
  // Check if already healthy
  const initialHealth = await checkOllamaHealth(baseUrl);
  if (initialHealth.online) {
    return {
      online: true,
      started: false,
      alreadyRunning: true,
      version: initialHealth.version,
    };
  }

  // Prevent multiple concurrent launch attempts
  if (isStartingDaemon && startPromise) {
    return startPromise;
  }

  isStartingDaemon = true;
  startPromise = (async (): Promise<OllamaStartResult> => {
    try {
      const exe = findOllamaExecutable();
      if (!exe) {
        console.warn('[OllamaDaemon] Ollama executable not found on system paths.');
        return {
          online: false,
          started: false,
          alreadyRunning: false,
          error: 'Ollama executable not found. Please install Ollama from https://ollama.com or set OLLAMA_PATH.',
        };
      }

      console.log(`[OllamaDaemon] Launching Ollama daemon via: "${exe} serve"...`);

      const child = spawn(exe, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          OLLAMA_HOST: '127.0.0.1:11434',
          OLLAMA_ORIGINS: '*',
        },
      });

      child.unref();

      // Poll until server responds (up to 15 attempts * 600ms = 9s)
      const maxAttempts = 15;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((res) => setTimeout(res, 600));
        const health = await checkOllamaHealth(baseUrl);
        if (health.online) {
          console.log(`[OllamaDaemon] Successfully connected to Ollama (v${health.version}) after attempt ${i + 1}`);
          return {
            online: true,
            started: true,
            alreadyRunning: false,
            version: health.version,
            executablePath: exe,
          };
        }
      }

      return {
        online: false,
        started: false,
        alreadyRunning: false,
        executablePath: exe,
        error: `Ollama daemon process was launched from ${exe}, but server did not respond at ${baseUrl} within 9 seconds.`,
      };
    } catch (err: any) {
      console.error('[OllamaDaemon] Failed to launch Ollama daemon:', err);
      return {
        online: false,
        started: false,
        alreadyRunning: false,
        error: err.message || 'Failed to launch Ollama daemon process',
      };
    } finally {
      isStartingDaemon = false;
      startPromise = null;
    }
  })();

  return startPromise;
}
