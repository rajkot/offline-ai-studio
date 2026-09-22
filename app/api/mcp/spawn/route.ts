import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

interface RunningMcpProcess {
  id: string;
  command: string;
  args: string[];
  pid?: number;
  process: ChildProcess;
  startedAt: number;
  status: 'running' | 'stopped' | 'error';
  lastLog?: string;
}

// Global registry of running stdio MCP processes (in-memory per Next.js server)
const runningMcpProcesses = new Map<string, RunningMcpProcess>();

const MCP_CONFIG_PATH = path.join(process.cwd(), 'mcp_config.json');

// Default initial mcp_config.json template
const DEFAULT_MCP_CONFIG = {
  mcpServers: {
    'filesystem-mcp': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
      env: {}
    },
    'git-mcp': {
      command: 'uvx',
      args: ['mcp-server-git', '--repository', '.'],
      env: {}
    },
    'memory-graph-mcp': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {}
    }
  }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';

  // Read mcp_config.json
  if (action === 'get-config') {
    try {
      if (!fs.existsSync(MCP_CONFIG_PATH)) {
        fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(DEFAULT_MCP_CONFIG, null, 2), 'utf-8');
      }
      const raw = fs.readFileSync(MCP_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      return NextResponse.json({ success: true, config, path: MCP_CONFIG_PATH });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // List running MCP processes
  const list = Array.from(runningMcpProcesses.entries()).map(([id, p]) => ({
    id,
    pid: p.pid,
    command: p.command,
    args: p.args,
    startedAt: p.startedAt,
    status: p.status,
    lastLog: p.lastLog
  }));

  return NextResponse.json({
    success: true,
    running: list
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, serverId, command, args, env, jsonRpcRequest, config } = body;

    // Save mcp_config.json
    if (action === 'save-config') {
      try {
        fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config || DEFAULT_MCP_CONFIG, null, 2), 'utf-8');
        return NextResponse.json({ success: true, message: 'mcp_config.json updated successfully' });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Spawn / Start an MCP Server process
    if (action === 'start') {
      if (!serverId || !command) {
        return NextResponse.json({ success: false, error: 'Missing serverId or command' }, { status: 400 });
      }

      // If already running, return status
      if (runningMcpProcesses.has(serverId)) {
        const existing = runningMcpProcesses.get(serverId)!;
        if (existing.status === 'running') {
          return NextResponse.json({ success: true, message: 'Server already running', pid: existing.pid });
        }
      }

      const spawnArgs = args || [];
      const procEnv = { ...process.env, ...(env || {}) };

      try {
        const child = spawn(command, spawnArgs, {
          env: procEnv,
          shell: true,
          cwd: process.cwd()
        });

        const entry: RunningMcpProcess = {
          id: serverId,
          command,
          args: spawnArgs,
          pid: child.pid,
          process: child,
          startedAt: Date.now(),
          status: 'running',
          lastLog: `Process spawned with PID ${child.pid}`
        };

        child.stdout?.on('data', (data) => {
          entry.lastLog = data.toString().slice(-300);
        });

        child.stderr?.on('data', (data) => {
          entry.lastLog = `[stderr] ${data.toString().slice(-300)}`;
        });

        child.on('close', (code) => {
          entry.status = 'stopped';
          entry.lastLog = `Process exited with code ${code}`;
        });

        child.on('error', (err) => {
          entry.status = 'error';
          entry.lastLog = `Error: ${err.message}`;
        });

        runningMcpProcesses.set(serverId, entry);

        return NextResponse.json({
          success: true,
          serverId,
          pid: child.pid,
          status: 'running',
          message: `MCP Server ${serverId} started successfully`
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Stop an MCP server process
    if (action === 'stop') {
      if (!serverId) {
        return NextResponse.json({ success: false, error: 'Missing serverId' }, { status: 400 });
      }

      const entry = runningMcpProcesses.get(serverId);
      if (!entry) {
        return NextResponse.json({ success: false, message: 'Process not found' });
      }

      try {
        entry.process.kill('SIGTERM');
        runningMcpProcesses.delete(serverId);
        return NextResponse.json({ success: true, message: `Server ${serverId} stopped` });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Relay JSON-RPC request to stdio MCP process
    if (action === 'call') {
      if (!serverId || !jsonRpcRequest) {
        return NextResponse.json({ success: false, error: 'Missing serverId or jsonRpcRequest' }, { status: 400 });
      }

      const entry = runningMcpProcesses.get(serverId);
      if (!entry || entry.status !== 'running') {
        return NextResponse.json({ success: false, error: `Server ${serverId} is not running` }, { status: 503 });
      }

      return new Promise<NextResponse>((resolve) => {
        let responseBuffer = '';
        const timeout = setTimeout(() => {
          resolve(NextResponse.json({
            jsonrpc: '2.0',
            id: jsonRpcRequest.id,
            error: { code: -32000, message: 'Timeout waiting for MCP response' }
          }));
        }, 5000);

        const onData = (chunk: Buffer) => {
          responseBuffer += chunk.toString();
          // Look for complete JSON-RPC line or object
          try {
            const parsed = JSON.parse(responseBuffer.trim());
            clearTimeout(timeout);
            entry.process.stdout?.off('data', onData);
            resolve(NextResponse.json(parsed));
          } catch {
            // Buffer not yet complete
          }
        };

        entry.process.stdout?.on('data', onData);
        entry.process.stdin?.write(JSON.stringify(jsonRpcRequest) + '\n');
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
