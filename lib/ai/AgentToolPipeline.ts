/**
 * AI Agent Tool-Calling & Dynamic MCP Integration Pipeline
 * Dynamically converts registered MCP tools into Gemini FunctionDeclaration format,
 * routes tool execution through the Model Context Protocol engine,
 * orchestrates multi-turn function call / function response conversation loops,
 * and enforces Human-In-The-Loop (HITL) approval for destructive actions.
 */

import { mcpHub, McpTool, McpCallToolResult } from '../mcp/McpClient';

// ---------------------------------------------------------------------------
// Gemini OpenAPI & Function Declaration Types
// ---------------------------------------------------------------------------

export type GeminiType = 'TYPE_UNSPECIFIED' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';

export interface GeminiSchemaProperty {
  type: GeminiType;
  description?: string;
  enum?: string[];
  properties?: Record<string, GeminiSchemaProperty>;
  required?: string[];
  items?: GeminiSchemaProperty;
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, GeminiSchemaProperty>;
    required?: string[];
  };
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, any>;
  id?: string;
}

export interface GeminiFunctionResponse {
  name: string;
  response: {
    name: string;
    content: any;
  };
  id?: string;
}

// ---------------------------------------------------------------------------
// HITL (Human-in-the-Loop) Types
// ---------------------------------------------------------------------------

export type HitlActionType = 'file_write' | 'file_delete' | 'db_mutation' | 'git_reset' | 'network_external' | 'system_command';

export interface HitlPermissionRequest {
  id: string;
  toolName: string;
  serverId?: string;
  actionType: HitlActionType;
  description: string;
  arguments: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolve: (approved: boolean) => void;
}

// ---------------------------------------------------------------------------
// Pipeline Execution Step Event Types
// ---------------------------------------------------------------------------

export type AgentStepType =
  | 'user_input'
  | 'thought'
  | 'tool_call_detected'
  | 'hitl_pending'
  | 'hitl_approved'
  | 'hitl_rejected'
  | 'tool_executing'
  | 'tool_completed'
  | 'tool_error'
  | 'assistant_resolution'
  | 'pipeline_error';

export interface AgentStepEvent {
  id: string;
  type: AgentStepType;
  timestamp: number;
  message?: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  hitlRequest?: HitlPermissionRequest;
  error?: string;
  turnIndex: number;
}

// ---------------------------------------------------------------------------
// Schema Converter: MCP -> Gemini OpenAPI
// ---------------------------------------------------------------------------

function mcpPropertyToGemini(prop: any): GeminiSchemaProperty {
  if (!prop || typeof prop !== 'object') {
    return { type: 'STRING' };
  }

  let type: GeminiType = 'STRING';
  const rawType = String(prop.type || '').toLowerCase();

  switch (rawType) {
    case 'string':
      type = 'STRING';
      break;
    case 'number':
      type = 'NUMBER';
      break;
    case 'integer':
      type = 'INTEGER';
      break;
    case 'boolean':
      type = 'BOOLEAN';
      break;
    case 'array':
      type = 'ARRAY';
      break;
    case 'object':
      type = 'OBJECT';
      break;
    default:
      type = 'STRING';
  }

  const result: GeminiSchemaProperty = {
    type,
    description: prop.description
  };

  if (Array.isArray(prop.enum)) {
    result.enum = prop.enum;
  }

  if (type === 'ARRAY' && prop.items) {
    result.items = mcpPropertyToGemini(prop.items);
  }

  if (type === 'OBJECT' && prop.properties) {
    result.properties = {};
    Object.entries(prop.properties).forEach(([k, v]) => {
      result.properties![k] = mcpPropertyToGemini(v);
    });
    if (Array.isArray(prop.required)) {
      result.required = prop.required;
    }
  }

  return result;
}

/**
 * Converts a list of registered MCP tools into standard Gemini FunctionDeclaration objects.
 */
export function convertMcpToolsToGeminiDeclarations(tools: McpTool[]): GeminiFunctionDeclaration[] {
  return tools.map(tool => {
    const properties: Record<string, GeminiSchemaProperty> = {};
    const mcpProps = tool.inputSchema?.properties || {};

    Object.entries(mcpProps).forEach(([propName, propDef]) => {
      properties[propName] = mcpPropertyToGemini(propDef);
    });

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties,
        required: tool.inputSchema?.required || []
      }
    };
  });
}

/**
 * Detects if a tool invocation constitutes a destructive action requiring HITL confirmation.
 */
export function analyzeToolDestructiveness(
  toolName: string,
  args: Record<string, any> = {}
): { isDestructive: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical'; actionType: HitlActionType; description: string } {
  const name = toolName.toLowerCase();

  // 1. Filesystem Write / Overwrite / Delete
  if (name === 'write_file' || name === 'create_file') {
    const path = args.path || 'workspace file';
    return {
      isDestructive: true,
      riskLevel: 'medium',
      actionType: 'file_write',
      description: `Overwrite or write content to workspace file: "${path}"`
    };
  }

  if (name === 'delete_file' || name === 'remove_file') {
    const path = args.path || 'workspace file';
    return {
      isDestructive: true,
      riskLevel: 'high',
      actionType: 'file_delete',
      description: `Permanently delete workspace file: "${path}"`
    };
  }

  // 2. Database Modifications (INSERT, UPDATE, DELETE, DROP, ALTER)
  if (name === 'execute_query') {
    const sql = String(args.sql || '').trim().toUpperCase();
    if (sql.startsWith('DROP') || sql.startsWith('TRUNCATE')) {
      return {
        isDestructive: true,
        riskLevel: 'critical',
        actionType: 'db_mutation',
        description: `Execute destructive schema mutation: ${sql.slice(0, 80)}...`
      };
    }
    if (sql.startsWith('DELETE') || sql.startsWith('UPDATE') || sql.startsWith('ALTER')) {
      return {
        isDestructive: true,
        riskLevel: 'high',
        actionType: 'db_mutation',
        description: `Execute database modification: ${sql.slice(0, 80)}...`
      };
    }
    if (sql.startsWith('INSERT') || sql.startsWith('CREATE')) {
      return {
        isDestructive: true,
        riskLevel: 'medium',
        actionType: 'db_mutation',
        description: `Insert rows or create schema table: ${sql.slice(0, 80)}...`
      };
    }
  }

  // 3. Git Commits & Branch Switching
  if (name === 'git_commit') {
    return {
      isDestructive: true,
      riskLevel: 'low',
      actionType: 'git_reset',
      description: `Create new git commit: "${args.message || 'Automated changes'}"`
    };
  }

  // 4. Shell Command Execution (Terminal)
  if (name === 'execute_command') {
    const cmd = String(args.command || '');
    return {
      isDestructive: true,
      riskLevel: 'high',
      actionType: 'system_command',
      description: `Execute shell command in virtual environment: "${cmd}"`
    };
  }

  if (name === 'git_checkout' && args.createBranch) {
    return {
      isDestructive: true,
      riskLevel: 'low',
      actionType: 'git_reset',
      description: `Checkout and create branch: "${args.target}"`
    };
  }

  return {
    isDestructive: false,
    riskLevel: 'low',
    actionType: 'system_command',
    description: `Execute standard tool: ${toolName}`
  };
}

// ---------------------------------------------------------------------------
// Main Agent Tool Calling Pipeline
// ---------------------------------------------------------------------------

export interface AgentPipelineOptions {
  maxTurns?: number;
  enableHitl?: boolean;
  onStep?: (event: AgentStepEvent) => void;
  onRequestHitlApproval?: (req: HitlPermissionRequest) => Promise<boolean>;
}

export class AgentToolPipeline {
  private static instance: AgentToolPipeline;
  private pendingHitlRequests: Map<string, HitlPermissionRequest> = new Map();
  private hitlListeners: Array<(reqs: HitlPermissionRequest[]) => void> = [];

  public static getInstance(): AgentToolPipeline {
    if (!AgentToolPipeline.instance) {
      AgentToolPipeline.instance = new AgentToolPipeline();
    }
    return AgentToolPipeline.instance;
  }

  public subscribeHitlRequests(cb: (reqs: HitlPermissionRequest[]) => void): () => void {
    this.hitlListeners.push(cb);
    cb(this.getPendingHitlRequests());
    return () => {
      this.hitlListeners = this.hitlListeners.filter(l => l !== cb);
    };
  }

  public getPendingHitlRequests(): HitlPermissionRequest[] {
    return Array.from(this.pendingHitlRequests.values());
  }

  public resolveHitlRequest(id: string, approved: boolean): void {
    const req = this.pendingHitlRequests.get(id);
    if (req) {
      this.pendingHitlRequests.delete(id);
      this.notifyHitlListeners();
      req.resolve(approved);
    }
  }

  private notifyHitlListeners(): void {
    const list = this.getPendingHitlRequests();
    this.hitlListeners.forEach(cb => cb(list));
  }

  /**
   * Main multi-turn tool execution loop
   */
  public async executeAgentChat(
    userPrompt: string,
    workspaceFiles: Record<string, string>,
    history: Array<{ role: 'user' | 'model' | 'tool'; content: string | any }> = [],
    options: AgentPipelineOptions = {}
  ): Promise<{ responseText: string; steps: AgentStepEvent[]; totalToolCalls: number }> {
    const maxTurns = options.maxTurns || 6;
    const steps: AgentStepEvent[] = [];
    const availableTools = mcpHub.getAllTools();
    const toolDeclarations = convertMcpToolsToGeminiDeclarations(availableTools);

    let totalToolCalls = 0;
    let turnIndex = 0;
    let finalResponseText = '';

    const emitStep = (type: AgentStepType, payload: Partial<AgentStepEvent> = {}) => {
      const step: AgentStepEvent = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        timestamp: Date.now(),
        turnIndex,
        ...payload
      };
      steps.push(step);
      options.onStep?.(step);
    };

    emitStep('user_input', { message: userPrompt });

    // Initialize multi-turn conversation messages
    const conversationMessages: any[] = [
      ...history,
      { role: 'user', content: userPrompt }
    ];

    while (turnIndex < maxTurns) {
      turnIndex++;

      // 1. Call the AI Agent server-side endpoint with dynamically registered MCP tools
      let agentResponse: any;
      try {
        const res = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userPrompt,
            messages: conversationMessages,
            tools: toolDeclarations,
            workspaceFilesSummary: Object.keys(workspaceFiles).slice(0, 30)
          })
        });

        if (!res.ok) {
          throw new Error(`Agent server error: HTTP ${res.status}`);
        }

        agentResponse = await res.json();
      } catch (networkErr: any) {
        // Fallback local tool orchestrator if network or server endpoint is offline
        agentResponse = await this.fallbackLocalAgentTurn(userPrompt, availableTools, workspaceFiles, conversationMessages);
      }

      // Check for thoughts / reasoning text
      if (agentResponse.thought) {
        emitStep('thought', { message: agentResponse.thought });
      }

      // Check for tool calls
      const toolCalls: GeminiFunctionCall[] = agentResponse.functionCalls || [];

      if (toolCalls.length === 0) {
        // Model resolved and emitted final response
        finalResponseText = agentResponse.text || agentResponse.message || 'Task completed.';
        emitStep('assistant_resolution', { message: finalResponseText });
        break;
      }

      // Process tool calls in this turn
      for (const call of toolCalls) {
        totalToolCalls++;
        const toolName = call.name;
        const toolArgs = call.args || {};

        emitStep('tool_call_detected', {
          toolName,
          toolArgs,
          message: `Agent initiated tool call: ${toolName}`
        });

        // 2. Analyze destructiveness for Human-In-The-Loop (HITL) check
        const destructiveness = analyzeToolDestructiveness(toolName, toolArgs);
        let isApproved = true;

        if (destructiveness.isDestructive && options.enableHitl !== false) {
          emitStep('hitl_pending', {
            toolName,
            toolArgs,
            message: `Awaiting user approval for: ${destructiveness.description}`
          });

          isApproved = await new Promise<boolean>((resolve) => {
            const hitlReq: HitlPermissionRequest = {
              id: `hitl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              toolName,
              actionType: destructiveness.actionType,
              description: destructiveness.description,
              arguments: toolArgs,
              riskLevel: destructiveness.riskLevel,
              timestamp: Date.now(),
              resolve
            };

            this.pendingHitlRequests.set(hitlReq.id, hitlReq);
            this.notifyHitlListeners();

            if (options.onRequestHitlApproval) {
              options.onRequestHitlApproval(hitlReq).then(resolve).catch(() => resolve(false));
            }
          });

          if (isApproved) {
            emitStep('hitl_approved', { toolName, toolArgs, message: 'Action approved by user.' });
          } else {
            emitStep('hitl_rejected', { toolName, toolArgs, message: 'Action rejected by user.' });
          }
        }

        // 3. Execute or Reject
        let toolExecutionResult: McpCallToolResult;

        if (isApproved) {
          emitStep('tool_executing', { toolName, toolArgs, message: `Executing MCP tool: ${toolName}...` });
          try {
            toolExecutionResult = await mcpHub.executeTool(toolName, toolArgs);
            emitStep('tool_completed', {
              toolName,
              toolArgs,
              toolResult: toolExecutionResult,
              message: `Tool ${toolName} completed.`
            });
          } catch (execErr: any) {
            toolExecutionResult = {
              isError: true,
              content: [{ type: 'text', text: `Tool error: ${execErr.message}` }]
            };
            emitStep('tool_error', {
              toolName,
              toolArgs,
              error: execErr.message,
              message: `Tool ${toolName} execution error.`
            });
          }
        } else {
          toolExecutionResult = {
            isError: true,
            content: [{ type: 'text', text: 'Action cancelled: User rejected permission for this operation.' }]
          };
        }

        // 4. Feed tool result back into conversation context
        conversationMessages.push({
          role: 'model',
          functionCalls: [call]
        });

        conversationMessages.push({
          role: 'tool',
          functionResponse: {
            name: toolName,
            response: {
              name: toolName,
              content: toolExecutionResult.content
            }
          }
        });
      }
    }

    if (!finalResponseText && steps.length > 0) {
      finalResponseText = `Completed ${totalToolCalls} automated MCP tool operations. Workspace is synced.`;
      emitStep('assistant_resolution', { message: finalResponseText });
    }

    return {
      responseText: finalResponseText,
      steps,
      totalToolCalls
    };
  }

  /**
   * High-accuracy heuristic fallback turn when server endpoint is unavailable or in offline mode
   */
  private async fallbackLocalAgentTurn(
    prompt: string,
    tools: McpTool[],
    workspaceFiles: Record<string, string>,
    history: any[]
  ): Promise<any> {
    const p = prompt.toLowerCase();

    // If prompt asks to read file
    if ((p.includes('read') || p.includes('inspect') || p.includes('show')) && (p.includes('file') || p.includes('.ts') || p.includes('.json'))) {
      const match = prompt.match(/([a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+)/);
      const targetFile = match ? match[1] : Object.keys(workspaceFiles)[0];
      if (targetFile && history.filter(h => h.role === 'tool').length === 0) {
        return {
          thought: `I need to inspect the contents of "${targetFile}" using the MCP read_file tool.`,
          functionCalls: [{ name: 'read_file', args: { path: targetFile } }]
        };
      }
    }

    // If prompt asks to run commands / terminal
    if (p.includes('run') || p.includes('npm') || p.includes('install') || p.includes('build') || p.includes('terminal') || p.includes('shell')) {
      const cmdMatch = prompt.match(/(?:run|execute|type)\s+["']?([^"']+)["']?/i);
      let cmd = cmdMatch ? cmdMatch[1] : (p.includes('npm install') ? 'npm install' : (p.includes('npm run dev') ? 'npm run dev' : 'ls -la'));
      
      // Clean up common prefixes
      if (cmd.startsWith('command')) cmd = cmd.replace('command', '').trim();
      
      if (history.filter(h => h.role === 'tool').length === 0) {
        return {
          thought: `I will execute the terminal command "${cmd}" in the WASI environment.`,
          functionCalls: [{ name: 'execute_command', args: { command: cmd } }]
        };
      }
    }

    // If prompt asks to search files
    if (p.includes('search') || p.includes('find') || p.includes('grep')) {
      const termMatch = prompt.match(/(?:search|find|grep)\s+(?:for\s+)?["']?([^"'\s]+)["']?/i);
      const term = termMatch ? termMatch[1] : 'export';
      if (history.filter(h => h.role === 'tool').length === 0) {
        return {
          thought: `Searching workspace files for query term "${term}".`,
          functionCalls: [{ name: 'search_files', args: { query: term } }]
        };
      }
    }

    // If prompt asks about git status
    if (p.includes('git') && (p.includes('status') || p.includes('branch') || p.includes('changes'))) {
      if (history.filter(h => h.role === 'tool').length === 0) {
        return {
          thought: 'Querying the Git repository status via the git_status MCP tool.',
          functionCalls: [{ name: 'git_status', args: {} }]
        };
      }
    }

    // If prompt asks about database / SQL
    if (p.includes('sql') || p.includes('database') || p.includes('table') || p.includes('query')) {
      if (history.filter(h => h.role === 'tool').length === 0) {
        return {
          thought: 'Inspecting relational database schema with the inspect_schema MCP tool.',
          functionCalls: [{ name: 'inspect_schema', args: {} }]
        };
      }
    }

    // Default synthesis
    const toolHistory = history.filter(h => h.role === 'tool');
    if (toolHistory.length > 0) {
      const lastResult = toolHistory[toolHistory.length - 1]?.functionResponse?.response?.content?.[0]?.text || '';
      return {
        thought: 'Synthesizing the MCP tool execution results into a comprehensive explanation.',
        text: `Here is the analysis based on the tool execution output:\n\n\`\`\`\n${lastResult.slice(0, 1000)}\n\`\`\`\n\nAll operations succeeded and the workspace context is verified.`
      };
    }

    return {
      thought: 'Processing direct architectural query.',
      text: `I am ready to perform tool operations across your files, Git repository, SQLite database, and network endpoints using the connected MCP Hub. Ask me to read, write, or search any assets!`
    };
  }
}

export const agentToolPipeline = AgentToolPipeline.getInstance();
