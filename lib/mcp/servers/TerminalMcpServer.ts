import { wasiRuntime } from '../../wasiRuntime';
import type { JsonRpcRequest, JsonRpcResponse } from '../McpClient';

export class TerminalMcpServer {
  public static readonly SERVER_ID = 'terminal-mcp';
  public static readonly SERVER_NAME = 'WASI Terminal & Shell';
  public static readonly SERVER_VERSION = '1.0.0';

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = req;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: TerminalMcpServer.SERVER_NAME,
            version: TerminalMcpServer.SERVER_VERSION
          },
          capabilities: {
            tools: { listChanged: true }
          }
        }
      };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'execute_command',
              description: 'Execute a bash-like command in the virtual WASI POSIX environment (e.g., ls, npm, cd, node, python).',
              inputSchema: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description: 'The full command line to execute (e.g., "npm install", "ls -la", "node script.js")'
                  }
                },
                required: ['command']
              }
            },
            {
              name: 'get_environment',
              description: 'Get current terminal environment variables, working directory, and active processes.',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'execute_command') {
        const command = String(args.command || '');
        try {
          const result = await wasiRuntime.executeCommand(command);
          const combinedOutput = result.stdout + (result.stderr ? `\nERR: ${result.stderr}` : '');
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: combinedOutput || `[Command exited with code ${result.exitCode}]`
                }
              ],
              isError: result.exitCode !== 0
            }
          };
        } catch (err: any) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Execution Failed: ${err.message}` }],
              isError: true
            }
          };
        }
      }

      if (toolName === 'get_environment') {
        const pwd = wasiRuntime.getCurrentDir();
        const processes = wasiRuntime.getProcesses();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  cwd: pwd,
                  activeProcesses: processes.length,
                  user: 'developer',
                  shell: '/bin/bash (WASI-Sim)',
                  processList: processes.map(p => ({ pid: p.pid, cmd: p.command, status: p.status }))
                }, null, 2)
              }
            ]
          }
        };
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  }
}
