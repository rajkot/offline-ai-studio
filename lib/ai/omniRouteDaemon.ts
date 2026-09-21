/**
 * OmniRoute Daemon Manager
 * Starts and controls the local OmniRoute server background process.
 */

import { spawn, ChildProcess } from 'child_process';
import { checkOmniRouteHealth, DEFAULT_OMNIROUTE_URL } from './omniRouteClient';

let omniRouteProcess: ChildProcess | null = null;

export async function ensureOmniRouteRunning(port = 20128): Promise<{ started: boolean; online: boolean; message: string }> {
  const health = await checkOmniRouteHealth(`http://localhost:${port}`);
  if (health.online) {
    return {
      started: false,
      online: true,
      message: `OmniRoute is already running on port ${port}`
    };
  }

  try {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'npx.cmd' : 'npx';
    const args = ['-y', 'omniroute', 'serve', '--no-open', '--port', String(port)];

    omniRouteProcess = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
      shell: isWindows
    });

    omniRouteProcess.unref();

    // Poll for up to 8 seconds
    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 500));
      const currentHealth = await checkOmniRouteHealth(`http://localhost:${port}`);
      if (currentHealth.online) {
        return {
          started: true,
          online: true,
          message: `OmniRoute gateway started successfully on port ${port}`
        };
      }
    }

    return {
      started: true,
      online: false,
      message: 'OmniRoute process spawned, waiting for port binding'
    };
  } catch (err: any) {
    return {
      started: false,
      online: false,
      message: `Failed to spawn OmniRoute daemon: ${err.message}`
    };
  }
}
