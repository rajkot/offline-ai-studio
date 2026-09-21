/**
 * Filesystem MCP Server Adapter
 * Exposes workspace file read/write, directory listing, file search, and diff inspection.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpResource,
  McpPrompt,
  McpResourceTemplate
} from '../McpClient';

export interface FilesystemContext {
  getFiles: () => Record<string, string>;
  updateFile?: (path: string, content: string) => void;
  deleteFile?: (path: string) => void;
}

export class FilesystemMcpServer {
  public static readonly SERVER_ID = 'filesystem-mcp';
  public static readonly SERVER_NAME = 'Workspace Filesystem';
  public static readonly SERVER_VERSION = '1.2.0';

  private context: FilesystemContext;

  constructor(context: FilesystemContext) {
    this.context = context;
  }

  public setContext(context: FilesystemContext): void {
    this.context = context;
  }

  public getTools(): McpTool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the complete text contents or line range of a file in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path of the file to read (e.g. "src/App.tsx")' },
            startLine: { type: 'number', description: 'Optional 1-indexed starting line number' },
            endLine: { type: 'number', description: 'Optional 1-indexed ending line number' }
          },
          required: ['path']
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      },
      {
        name: 'write_file',
        description: 'Create a new file or overwrite an existing file in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path of the target file' },
            content: { type: 'string', description: 'Full text content to write into the file' }
          },
          required: ['path', 'content']
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      },
      {
        name: 'list_directory',
        description: 'List all files and directory trees located in a workspace subfolder.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory prefix path (or empty string for root)' },
            recursive: { type: 'boolean', description: 'Whether to list recursively (defaults to true)' }
          }
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      },
      {
        name: 'search_files',
        description: 'Perform a full-text substring or regular expression search across workspace files.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term or regex pattern' },
            caseSensitive: { type: 'boolean', description: 'Whether search is case-sensitive' },
            fileFilter: { type: 'string', description: 'Optional glob pattern or extension to filter (e.g. ".ts")' }
          },
          required: ['query']
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      },
      {
        name: 'inspect_diff',
        description: 'Compute a unified line-by-line diff between original file content and proposed new content.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Target file path' },
            proposedContent: { type: 'string', description: 'New proposed content to compare against current' }
          },
          required: ['path', 'proposedContent']
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      },
      {
        name: 'get_file_info',
        description: 'Retrieve detailed metadata for a file including byte size, line count, extension, and MIME type.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path of the file' }
          },
          required: ['path']
        },
        serverId: FilesystemMcpServer.SERVER_ID,
        serverName: FilesystemMcpServer.SERVER_NAME
      }
    ];
  }

  public getResources(): McpResource[] {
    const files = this.context.getFiles();
    return Object.entries(files).map(([path, content]) => ({
      uri: `file://workspace/${path.replace(/^\//, '')}`,
      name: path,
      description: `Workspace file (${content.split('\n').length} lines, ${content.length} bytes)`,
      mimeType: this.getMimeType(path),
      size: content.length,
      serverId: FilesystemMcpServer.SERVER_ID
    }));
  }

  public getResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'file://workspace/{path}',
        name: 'Workspace File Access',
        description: 'Access any text or code asset inside the active workspace',
        mimeType: 'text/plain',
        serverId: FilesystemMcpServer.SERVER_ID
      }
    ];
  }

  public getPrompts(): McpPrompt[] {
    return [
      {
        name: 'code_review',
        description: 'Performs a comprehensive automated code review on a selected workspace file.',
        arguments: [
          { name: 'path', description: 'Path of the file to review', required: true },
          { name: 'focus', description: 'Review focus (e.g. security, performance, architecture)' }
        ],
        serverId: FilesystemMcpServer.SERVER_ID
      },
      {
        name: 'refactor_file',
        description: 'Generates refactored version of a workspace file following modern patterns.',
        arguments: [
          { name: 'path', description: 'Path of the file to refactor', required: true },
          { name: 'goal', description: 'Specific refactoring instructions or design patterns to apply' }
        ],
        serverId: FilesystemMcpServer.SERVER_ID
      }
    ];
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = req;
    const files = this.context.getFiles();

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: FilesystemMcpServer.SERVER_ID,
              version: FilesystemMcpServer.SERVER_VERSION
            },
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: true, listChanged: true },
              prompts: { listChanged: true }
            }
          }
        };
      }

      if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
      }

      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: this.getTools() }
        };
      }

      if (method === 'resources/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { resources: this.getResources() }
        };
      }

      if (method === 'resources/templates/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { resourceTemplates: this.getResourceTemplates() }
        };
      }

      if (method === 'prompts/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: { prompts: this.getPrompts() }
        };
      }

      if (method === 'resources/read') {
        const uri = params?.uri || '';
        const cleanPath = uri.replace('file://workspace/', '').replace(/^\//, '');
        if (cleanPath in files) {
          const content = files[cleanPath];
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: this.getMimeType(cleanPath),
                  text: content
                }
              ]
            }
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource '${uri}' not found in workspace.` }
        };
      }

      if (method === 'prompts/get') {
        const promptName = params?.name;
        const promptArgs = params?.arguments || {};
        if (promptName === 'code_review') {
          const path = promptArgs.path || '';
          const content = files[path] || '(file not found)';
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: `Review for ${path}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Please review the following file (${path}):\nFocus: ${promptArgs.focus || 'general quality, edge cases, performance'}\n\n\`\`\`\n${content}\n\`\`\``
                  }
                }
              ]
            }
          };
        }

        if (promptName === 'refactor_file') {
          const path = promptArgs.path || '';
          const content = files[path] || '(file not found)';
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: `Refactoring prompt for ${path}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Refactor the code in ${path} according to: ${promptArgs.goal || 'modern TypeScript cleanest practices'}\n\n\`\`\`\n${content}\n\`\`\``
                  }
                }
              ]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Prompt template '${promptName}' not found.` }
        };
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        if (toolName === 'read_file') {
          const filePath = (args.path || '').replace(/^\//, '');
          if (filePath in files) {
            let content = files[filePath];
            if (args.startLine !== undefined || args.endLine !== undefined) {
              const lines = content.split('\n');
              const start = Math.max(1, args.startLine || 1) - 1;
              const end = Math.min(lines.length, args.endLine || lines.length);
              content = lines.slice(start, end).join('\n');
            }
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: content }]
              }
            };
          }
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Error: File '${filePath}' not found in workspace.` }]
            }
          };
        }

        if (toolName === 'write_file') {
          const filePath = (args.path || '').replace(/^\//, '');
          const content = args.content ?? '';
          if (this.context.updateFile) {
            this.context.updateFile(filePath, content);
          }
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Successfully wrote ${content.length} characters to '${filePath}'.` }]
            }
          };
        }

        if (toolName === 'list_directory') {
          const dirPrefix = (args.path || '').replace(/^\//, '').replace(/\/$/, '');
          const recursive = args.recursive !== false;
          const allPaths = Object.keys(files);
          let matched = dirPrefix
            ? allPaths.filter(p => p.startsWith(dirPrefix + '/'))
            : allPaths;

          if (!recursive && dirPrefix) {
            matched = matched.filter(p => {
              const rel = p.slice(dirPrefix.length + 1);
              return !rel.includes('/');
            });
          }

          const details = matched.map(p => ({
            path: p,
            lines: files[p].split('\n').length,
            bytes: files[p].length,
            mime: this.getMimeType(p)
          }));

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(details, null, 2) }]
            }
          };
        }

        if (toolName === 'search_files') {
          const query = args.query || '';
          const caseSensitive = !!args.caseSensitive;
          const fileFilter = args.fileFilter || '';
          const results: Array<{ file: string; line: number; text: string }> = [];

          let regex: RegExp;
          try {
            regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
          } catch {
            regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
          }

          Object.entries(files).forEach(([fPath, content]) => {
            if (fileFilter && !fPath.includes(fileFilter)) return;
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                results.push({ file: fPath, line: idx + 1, text: line.trim() });
              }
            });
          });

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({ matchesCount: results.length, matches: results.slice(0, 50) }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'inspect_diff') {
          const filePath = (args.path || '').replace(/^\//, '');
          const current = files[filePath] || '';
          const proposed = args.proposedContent ?? '';
          const diffResult = this.generateUnifiedDiff(filePath, current, proposed);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: diffResult }]
            }
          };
        }

        if (toolName === 'get_file_info') {
          const filePath = (args.path || '').replace(/^\//, '');
          if (filePath in files) {
            const content = files[filePath];
            const lines = content.split('\n');
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    path: filePath,
                    bytes: content.length,
                    lines: lines.length,
                    emptyLines: lines.filter(l => !l.trim()).length,
                    mimeType: this.getMimeType(filePath),
                    extension: filePath.split('.').pop() || ''
                  }, null, 2)
                }]
              }
            };
          }
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `File '${filePath}' does not exist in workspace.` }]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool '${toolName}'.` }
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not handled by FilesystemMcpServer.` }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err?.message || 'Internal Filesystem MCP Server error' }
      };
    }
  }

  private getMimeType(path: string): string {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text/typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript';
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.html')) return 'text/html';
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.md')) return 'text/markdown';
    return 'text/plain';
  }

  private generateUnifiedDiff(filePath: string, oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const output: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${oldLines.length} +1,${newLines.length} @@`
    ];

    const max = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === undefined) {
        output.push(`+ ${n}`);
      } else if (n === undefined) {
        output.push(`- ${o}`);
      } else if (o !== n) {
        output.push(`- ${o}`);
        output.push(`+ ${n}`);
      } else {
        output.push(`  ${o}`);
      }
    }

    return output.join('\n');
  }
}
