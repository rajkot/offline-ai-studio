import { NextRequest, NextResponse } from 'next/server';
import { strandsToolsEngine } from '@/lib/tools/strandsToolsEngine';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const schemaFormat = searchParams.get('format'); // 'ollama' | 'openai'

    if (schemaFormat === 'ollama' || schemaFormat === 'openai') {
      const schemas = strandsToolsEngine.generateOllamaToolSchemas();
      return NextResponse.json({ schemas });
    }

    const tools = strandsToolsEngine.searchTools(query || '', category);
    const categories = strandsToolsEngine.getCategories();
    const total = strandsToolsEngine.getAllTools().length;

    return NextResponse.json({
      status: 'ready',
      total,
      filteredCount: tools.length,
      categories,
      tools
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Strands tools' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, toolId, args = {}, enabled } = body;

    // 1. Toggle Tool Enablement
    if (action === 'toggle') {
      if (!toolId) {
        return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
      }
      const success = strandsToolsEngine.toggleTool(toolId, enabled);
      return NextResponse.json({ success, tool: strandsToolsEngine.getToolById(toolId) });
    }

    // 2. Generate Ollama / Agent Schemas
    if (action === 'getSchemas') {
      const { toolIds } = body;
      const schemas = strandsToolsEngine.generateOllamaToolSchemas(toolIds);
      return NextResponse.json({ success: true, schemas });
    }

    // 3. Execute Tool
    if (action === 'execute') {
      if (!toolId) {
        return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
      }

      const start = Date.now();

      // Native Server File Operations
      if (toolId === 'file_read') {
        const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
        if (!fs.existsSync(filePath)) {
          return NextResponse.json({
            toolId,
            success: false,
            error: `File '${args.path}' does not exist`,
            durationMs: Date.now() - start
          });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const startLine = Math.max(1, args.start_line || 1);
        const endLine = Math.min(lines.length, args.end_line || lines.length);
        const slice = lines.slice(startLine - 1, endLine).join('\n');

        return NextResponse.json({
          toolId,
          success: true,
          result: {
            path: args.path,
            totalLines: lines.length,
            startLine,
            endLine,
            content: slice
          },
          durationMs: Date.now() - start
        });
      }

      if (toolId === 'file_write') {
        const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, args.content || '', 'utf8');
        return NextResponse.json({
          toolId,
          success: true,
          result: {
            path: args.path,
            bytesWritten: Buffer.byteLength(args.content || '', 'utf8'),
            savedAt: new Date().toISOString()
          },
          durationMs: Date.now() - start
        });
      }

      if (toolId === 'shell') {
        const cmd = String(args.command || '');
        if (!cmd) {
          return NextResponse.json({ error: 'command argument is required' }, { status: 400 });
        }
        try {
          const { stdout, stderr } = await execAsync(cmd, {
            cwd: args.cwd || process.cwd(),
            timeout: args.timeout_ms || 15000,
            windowsHide: true
          });
          return NextResponse.json({
            toolId,
            success: true,
            result: {
              command: cmd,
              stdout: stdout.trim(),
              stderr: stderr.trim()
            },
            durationMs: Date.now() - start
          });
        } catch (execErr: any) {
          return NextResponse.json({
            toolId,
            success: false,
            error: execErr.message,
            stdout: execErr.stdout,
            stderr: execErr.stderr,
            durationMs: Date.now() - start
          });
        }
      }

      if (toolId === 'python_repl') {
        const code = String(args.code || '');
        // Execute python script via python -c
        try {
          const { stdout, stderr } = await execAsync(`python -c "${code.replace(/"/g, '\\"')}"`, {
            cwd: process.cwd(),
            timeout: 10000
          });
          return NextResponse.json({
            toolId,
            success: true,
            result: {
              code,
              stdout: stdout.trim(),
              stderr: stderr.trim()
            },
            durationMs: Date.now() - start
          });
        } catch (pyErr: any) {
          return NextResponse.json({
            toolId,
            success: false,
            error: pyErr.message,
            stdout: pyErr.stdout,
            stderr: pyErr.stderr,
            durationMs: Date.now() - start
          });
        }
      }

      // Default in-engine execution
      const engineRes = await strandsToolsEngine.executeTool(toolId, args);
      return NextResponse.json(engineRes);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to execute Strands tool' }, { status: 500 });
  }
}
