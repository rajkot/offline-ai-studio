import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { clineProtocolEngine, ClineToolCall, ClinePermissionsConfig } from '@/lib/ai/clineProtocolEngine';
import { mcpHub } from '@/lib/mcp/McpClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'modes';

    if (action === 'modes') {
      const modes = clineProtocolEngine.getAvailableModes();
      const defaultPermissions = clineProtocolEngine.getDefaultPermissions();
      return NextResponse.json({ modes, defaultPermissions });
    }

    if (action === 'prompt') {
      const mode = searchParams.get('mode') || 'code';
      const custom = searchParams.get('custom') || '';
      const prompt = clineProtocolEngine.getSystemPromptForMode(mode, custom);
      return NextResponse.json({ mode, prompt });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'parse') {
      const { text } = body;
      const toolCalls = clineProtocolEngine.parseClineXmlToolCalls(text || '');
      return NextResponse.json({ toolCalls });
    }

    if (action === 'check_permission') {
      const { toolCall, permissions } = body;
      const config: ClinePermissionsConfig = permissions || clineProtocolEngine.getDefaultPermissions();
      const check = clineProtocolEngine.checkPermission(toolCall, config);
      return NextResponse.json(check);
    }

    if (action === 'execute_step') {
      const { toolCall, permissions } = body;
      const config: ClinePermissionsConfig = permissions || clineProtocolEngine.getDefaultPermissions();

      // Check permission
      const check = clineProtocolEngine.checkPermission(toolCall, config);
      if (!check.allowed) {
        const errorMsg = check.reason || 'Permission denied by safety policy';
        const toolResultXml = clineProtocolEngine.formatToolResult(toolCall.name, errorMsg, true);
        return NextResponse.json({
          success: false,
          output: errorMsg,
          tool_result_xml: toolResultXml
        });
      }

      const cwd = process.cwd();
      let output = '';
      let isError = false;

      switch (toolCall.name) {
        case 'read_file': {
          const relPath = toolCall.parameters.path;
          if (!relPath) {
            output = 'Error: Missing path parameter for read_file';
            isError = true;
          } else {
            const fullPath = path.resolve(cwd, relPath);
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              output = content;
            } catch (err: any) {
              output = `Error reading file "${relPath}": ${err.message}`;
              isError = true;
            }
          }
          break;
        }

        case 'write_to_file': {
          const relPath = toolCall.parameters.path;
          const content = toolCall.parameters.content || '';
          if (!relPath) {
            output = 'Error: Missing path parameter for write_to_file';
            isError = true;
          } else {
            const fullPath = path.resolve(cwd, relPath);
            try {
              await fs.mkdir(path.dirname(fullPath), { recursive: true });
              await fs.writeFile(fullPath, content, 'utf-8');
              output = `Successfully wrote ${Buffer.byteLength(content)} bytes to "${relPath}"`;
            } catch (err: any) {
              output = `Error writing file "${relPath}": ${err.message}`;
              isError = true;
            }
          }
          break;
        }

        case 'replace_in_file': {
          const relPath = toolCall.parameters.path;
          const search = toolCall.parameters.search;
          const replace = toolCall.parameters.replace;
          if (!relPath || search === undefined || replace === undefined) {
            output = 'Error: replace_in_file requires path, search, and replace parameters';
            isError = true;
          } else {
            const fullPath = path.resolve(cwd, relPath);
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              if (!content.includes(search)) {
                output = `Search block not found in "${relPath}"`;
                isError = true;
              } else {
                const updated = content.replace(search, replace);
                await fs.writeFile(fullPath, updated, 'utf-8');
                output = `Successfully replaced target block in "${relPath}"`;
              }
            } catch (err: any) {
              output = `Error in replace_in_file: ${err.message}`;
              isError = true;
            }
          }
          break;
        }

        case 'list_files': {
          const relPath = toolCall.parameters.path || '.';
          const fullPath = path.resolve(cwd, relPath);
          try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const list = entries.map(e => `${e.isDirectory() ? '[DIR] ' : '      '}${e.name}`);
            output = list.join('\n');
          } catch (err: any) {
            output = `Error listing directory "${relPath}": ${err.message}`;
            isError = true;
          }
          break;
        }

        case 'use_mcp_tool': {
          const { server, tool, args } = toolCall.parameters;
          try {
            const mcpResult = await mcpHub.callTool(server || 'default', tool, args || {});
            output = typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult, null, 2);
          } catch (err: any) {
            output = `MCP Tool Execution Error: ${err.message}`;
            isError = true;
          }
          break;
        }

        case 'attempt_completion': {
          output = toolCall.parameters.result || 'Task completed successfully.';
          break;
        }

        default: {
          output = `Simulation/Execution for tool "${toolCall.name}" completed.`;
          break;
        }
      }

      const toolResultXml = clineProtocolEngine.formatToolResult(toolCall.name, output, isError);

      return NextResponse.json({
        success: !isError,
        output,
        tool_result_xml: toolResultXml
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
