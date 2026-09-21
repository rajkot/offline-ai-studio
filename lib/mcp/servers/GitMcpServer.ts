/**
 * Git MCP Server Adapter
 * Exposes git commit, status, branch, diff, log, and branch checkout tools.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpResource,
  McpPrompt,
  McpResourceTemplate
} from '../McpClient';

export interface GitCommitRecord {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
}

export interface GitMcpState {
  currentBranch: string;
  branches: string[];
  commits: GitCommitRecord[];
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
}

export class GitMcpServer {
  public static readonly SERVER_ID = 'git-mcp';
  public static readonly SERVER_NAME = 'Git Version Control';
  public static readonly SERVER_VERSION = '1.1.0';

  private state: GitMcpState;
  private getWorkspaceFiles?: () => Record<string, string>;

  constructor(getWorkspaceFiles?: () => Record<string, string>) {
    this.getWorkspaceFiles = getWorkspaceFiles;
    this.state = {
      currentBranch: 'main',
      branches: ['main', 'feature/mcp-integration', 'fix/lsp-diagnostics'],
      commits: [
        {
          hash: 'a9f1c32',
          message: 'feat: initialize Model Context Protocol (MCP) hub',
          author: 'AI IDE Developer <dev@ai-ide.local>',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          filesChanged: ['lib/mcp/McpClient.ts', 'client/components/McpStudioPanel.tsx']
        },
        {
          hash: 'e8d4b17',
          message: 'feat: add real-time LSP diagnostics worker pipeline',
          author: 'AI IDE Developer <dev@ai-ide.local>',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          filesChanged: ['lib/lsp/LspWorkerHub.ts', 'client/components/BottomConsoleTray.tsx']
        },
        {
          hash: 'c23b59a',
          message: 'chore: update workbench layouts and docking engine',
          author: 'AI IDE Developer <dev@ai-ide.local>',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          filesChanged: ['components/Playground.tsx']
        }
      ],
      stagedFiles: [],
      unstagedFiles: ['lib/mcp/McpClient.ts', 'client/components/BottomConsoleTray.tsx'],
      untrackedFiles: ['lib/mcp/servers/FilesystemMcpServer.ts', 'lib/mcp/servers/GitMcpServer.ts']
    };
  }

  public getTools(): McpTool[] {
    return [
      {
        name: 'git_status',
        description: 'Get working tree status, staged files, unstaged changes, and untracked files.',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      },
      {
        name: 'git_commit',
        description: 'Record changes to the repository with a commit message and author.',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Commit message (e.g., "feat: add user profile")' },
            author: { type: 'string', description: 'Optional author identity string' },
            stageAll: { type: 'boolean', description: 'Whether to stage all tracked and untracked files' }
          },
          required: ['message']
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      },
      {
        name: 'git_branch',
        description: 'List all repository branches or create a new branch from current HEAD.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'create', 'delete'], description: 'Branch operation' },
            branchName: { type: 'string', description: 'Name of the branch to create or delete' }
          }
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      },
      {
        name: 'git_diff',
        description: 'Show changes between commits, commit and working tree, or staged index.',
        inputSchema: {
          type: 'object',
          properties: {
            stagedOnly: { type: 'boolean', description: 'Show only staged diffs' },
            filePath: { type: 'string', description: 'Limit diff to a specific file' }
          }
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      },
      {
        name: 'git_log',
        description: 'Show commit history logs with author, timestamp, hash, and commit message.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of commits to return (default 10)' },
            branch: { type: 'string', description: 'Specific branch to inspect' }
          }
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      },
      {
        name: 'git_checkout',
        description: 'Switch branches or checkout a specific commit.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Branch name or commit hash to checkout' },
            createBranch: { type: 'boolean', description: 'Create new branch if it does not exist' }
          },
          required: ['target']
        },
        serverId: GitMcpServer.SERVER_ID,
        serverName: GitMcpServer.SERVER_NAME
      }
    ];
  }

  public getResources(): McpResource[] {
    return [
      {
        uri: 'git://repo/status',
        name: 'Current Git Status',
        description: `Working tree status on branch '${this.state.currentBranch}'`,
        mimeType: 'application/json',
        serverId: GitMcpServer.SERVER_ID
      },
      {
        uri: 'git://repo/log',
        name: 'Git Commit Log',
        description: `Full commit history (${this.state.commits.length} commits)`,
        mimeType: 'application/json',
        serverId: GitMcpServer.SERVER_ID
      },
      {
        uri: 'git://repo/branches',
        name: 'Git Branch List',
        description: `Repository branches (${this.state.branches.join(', ')})`,
        mimeType: 'application/json',
        serverId: GitMcpServer.SERVER_ID
      }
    ];
  }

  public getResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'git://repo/commits/{hash}',
        name: 'Git Commit Details',
        description: 'Inspect metadata and changes for a specific commit hash',
        mimeType: 'application/json',
        serverId: GitMcpServer.SERVER_ID
      }
    ];
  }

  public getPrompts(): McpPrompt[] {
    return [
      {
        name: 'generate_commit_message',
        description: 'Generates a standard Conventional Commits message based on working tree diff.',
        arguments: [
          { name: 'style', description: 'Commit style (e.g. conventional, descriptive, emoji)' }
        ],
        serverId: GitMcpServer.SERVER_ID
      },
      {
        name: 'review_git_changes',
        description: 'Conducts a pre-commit code review of all staged and unstaged modifications.',
        arguments: [
          { name: 'strictness', description: 'Level of review rigor (low, medium, high)' }
        ],
        serverId: GitMcpServer.SERVER_ID
      }
    ];
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = req;

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: GitMcpServer.SERVER_ID,
              version: GitMcpServer.SERVER_VERSION
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
        if (uri === 'git://repo/status') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  branch: this.state.currentBranch,
                  staged: this.state.stagedFiles,
                  unstaged: this.state.unstagedFiles,
                  untracked: this.state.untrackedFiles
                }, null, 2)
              }]
            }
          };
        }

        if (uri === 'git://repo/log') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.state.commits, null, 2)
              }]
            }
          };
        }

        if (uri === 'git://repo/branches') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  active: this.state.currentBranch,
                  all: this.state.branches
                }, null, 2)
              }]
            }
          };
        }

        if (uri.startsWith('git://repo/commits/')) {
          const hash = uri.replace('git://repo/commits/', '');
          const commit = this.state.commits.find(c => c.hash.startsWith(hash));
          if (commit) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(commit, null, 2)
                }]
              }
            };
          }
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Git resource '${uri}' not found.` }
        };
      }

      if (method === 'prompts/get') {
        const promptName = params?.name;
        if (promptName === 'generate_commit_message') {
          const statusSummary = `Branch: ${this.state.currentBranch}\nModified: ${this.state.unstagedFiles.join(', ')}\nUntracked: ${this.state.untrackedFiles.join(', ')}`;
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Generate commit message for current changes',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Based on the following git changes, propose 3 conventional commit messages (feat:, fix:, chore:, refactor:):\n\n${statusSummary}`
                  }
                }
              ]
            }
          };
        }

        if (promptName === 'review_git_changes') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Review uncommitted changes',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Review all modified files for bugs, security loopholes, and performance degradations:\n${JSON.stringify(this.state.unstagedFiles, null, 2)}`
                  }
                }
              ]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown prompt '${promptName}'.` }
        };
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        if (toolName === 'git_status') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  branch: this.state.currentBranch,
                  isClean: this.state.unstagedFiles.length === 0 && this.state.untrackedFiles.length === 0 && this.state.stagedFiles.length === 0,
                  stagedFiles: this.state.stagedFiles,
                  unstagedFiles: this.state.unstagedFiles,
                  untrackedFiles: this.state.untrackedFiles,
                  totalCommits: this.state.commits.length,
                  headCommit: this.state.commits[0]
                }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'git_commit') {
          const message = args.message;
          if (!message || !message.trim()) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                isError: true,
                content: [{ type: 'text', text: 'Error: Commit message cannot be empty.' }]
              }
            };
          }

          const filesChanged = args.stageAll
            ? [...this.state.stagedFiles, ...this.state.unstagedFiles, ...this.state.untrackedFiles]
            : (this.state.stagedFiles.length > 0 ? this.state.stagedFiles : this.state.unstagedFiles);

          const newCommit: GitCommitRecord = {
            hash: Math.random().toString(16).substring(2, 9),
            message: message.trim(),
            author: args.author || 'AI Studio Developer <dev@ai-ide.local>',
            timestamp: new Date().toISOString(),
            filesChanged: filesChanged.length > 0 ? filesChanged : ['lib/workspace.ts']
          };

          this.state.commits.unshift(newCommit);
          this.state.stagedFiles = [];
          this.state.unstagedFiles = [];
          this.state.untrackedFiles = [];

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `[${this.state.currentBranch} ${newCommit.hash}] ${newCommit.message}\n ${newCommit.filesChanged.length} file(s) changed.`
              }]
            }
          };
        }

        if (toolName === 'git_branch') {
          const action = args.action || 'list';
          if (action === 'list') {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: this.state.branches.map(b => (b === this.state.currentBranch ? `* ${b}` : `  ${b}`)).join('\n')
                }]
              }
            };
          }

          if (action === 'create') {
            const bName = args.branchName?.trim();
            if (!bName) {
              return {
                jsonrpc: '2.0',
                id,
                result: { isError: true, content: [{ type: 'text', text: 'Branch name is required.' }] }
              };
            }
            if (!this.state.branches.includes(bName)) {
              this.state.branches.push(bName);
            }
            return {
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: `Created branch '${bName}'.` }] }
            };
          }

          if (action === 'delete') {
            const bName = args.branchName?.trim();
            if (bName === this.state.currentBranch) {
              return {
                jsonrpc: '2.0',
                id,
                result: { isError: true, content: [{ type: 'text', text: `Cannot delete active branch '${bName}'.` }] }
              };
            }
            this.state.branches = this.state.branches.filter(b => b !== bName);
            return {
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: `Deleted branch '${bName}'.` }] }
            };
          }
        }

        if (toolName === 'git_diff') {
          const lines = [
            `diff --git a/src/App.tsx b/src/App.tsx`,
            `index 7a9e1..8b2c4 100644`,
            `--- a/src/App.tsx`,
            `+++ b/src/App.tsx`,
            `@@ -14,6 +14,8 @@ export function App() {`,
            `   const [status, setStatus] = useState('idle');`,
            `+  const mcpHub = useMcpClient();`,
            `+  useEffect(() => { mcpHub.sync(); }, []);`,
            `   return <div>Application Ready</div>;`,
            ` }`
          ];
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: lines.join('\n') }]
            }
          };
        }

        if (toolName === 'git_log') {
          const limit = Math.max(1, args.limit || 10);
          const sliced = this.state.commits.slice(0, limit);
          const formatted = sliced.map(c => 
            `commit ${c.hash}\nAuthor: ${c.author}\nDate:   ${c.timestamp}\n\n    ${c.message}\n`
          ).join('\n');

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: formatted }]
            }
          };
        }

        if (toolName === 'git_checkout') {
          const target = args.target?.trim();
          if (!target) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'Checkout target is required.' }] }
            };
          }

          if (this.state.branches.includes(target)) {
            this.state.currentBranch = target;
            return {
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: `Switched to branch '${target}'.` }] }
            };
          }

          if (args.createBranch) {
            this.state.branches.push(target);
            this.state.currentBranch = target;
            return {
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: `Switched to a new branch '${target}'.` }] }
            };
          }

          return {
            jsonrpc: '2.0',
            id,
            result: { isError: true, content: [{ type: 'text', text: `Branch '${target}' not found.` }] }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool '${toolName}' not found.` }
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not handled by GitMcpServer.` }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err?.message || 'Internal Git MCP error' }
      };
    }
  }
}
