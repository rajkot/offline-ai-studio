/**
 * Cline & Roo Code Autonomous Plan-and-Act Protocol Engine
 *
 * Implements:
 * 1. Autonomous Plan-and-Act execution loop
 * 2. Dynamic Modes (Architect, Code, Ask, Debug, Test, Custom)
 * 3. XML/Structured Tool Call parsing & generation
 * 4. Granular Human-in-the-Loop (HITL) approval rules
 * 5. Destructive command safety policy
 * 6. Model Context Protocol (MCP) tool routing adapter
 */

export interface ClineMode {
  slug: string;
  name: string;
  icon: string;
  description: string;
  roleDefinition: string;
  allowedTools: string[];
}

export interface ClineToolCall {
  name: string;
  parameters: Record<string, any>;
  rawXml?: string;
}

export interface ClinePermissionsConfig {
  autoApproveRead: boolean;
  autoApproveWrite: boolean;
  autoApproveExecute: boolean;
  autoApproveBrowser: boolean;
  autoApproveMcp: boolean;
  blockedCommands: string[];
}

export interface ClineMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ClineToolCall[];
  timestamp?: number;
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

export class ClineProtocolEngine {
  private modes: ClineMode[] = [
    {
      slug: 'code',
      name: 'Code',
      icon: '💻',
      description: 'Autonomous end-to-end full-stack software engineer',
      roleDefinition: 'You are an elite, production-grade autonomous software engineer. You implement features, refactor code, write comprehensive unit tests, and fix bugs directly in the workspace.',
      allowedTools: [
        'read_file',
        'write_to_file',
        'replace_in_file',
        'execute_command',
        'list_files',
        'browser_action',
        'use_mcp_tool',
        'ask_followup_question',
        'attempt_completion'
      ]
    },
    {
      slug: 'architect',
      name: 'Architect',
      icon: '🏛️',
      description: 'System architect for high-level technical specs & design',
      roleDefinition: 'You are an ARCHITECT. You gather requirements, inspect file structures, draft architecture designs, and propose detailed multi-step implementation plans. You NEVER write code directly or execute destructive actions without explicit user confirmation.',
      allowedTools: [
        'read_file',
        'list_files',
        'ask_followup_question',
        'attempt_completion'
      ]
    },
    {
      slug: 'ask',
      name: 'Ask',
      icon: '❓',
      description: 'Conversational assistant for Q&A and code explanations',
      roleDefinition: 'You are an expert technical advisor. You read files and answer user queries clearly without making unsolicited modifications to the repository.',
      allowedTools: [
        'read_file',
        'list_files',
        'ask_followup_question'
      ]
    },
    {
      slug: 'debug',
      name: 'Debug',
      icon: '🐛',
      description: 'Root-cause analysis and test-driven regression isolation',
      roleDefinition: 'You are a meticulous debugging specialist. You isolate minimal reproducing cases, inspect call stacks, trace state mutations, and construct failing tests before proposing surgical fixes.',
      allowedTools: [
        'read_file',
        'write_to_file',
        'replace_in_file',
        'execute_command',
        'list_files',
        'ask_followup_question',
        'attempt_completion'
      ]
    },
    {
      slug: 'test',
      name: 'Test',
      icon: '🧪',
      description: 'Quality assurance and automated test suite engineer',
      roleDefinition: 'You are a Quality Assurance engineer. You write unit, integration, and end-to-end tests ensuring 100% coverage and edge case resilience.',
      allowedTools: [
        'read_file',
        'write_to_file',
        'replace_in_file',
        'execute_command',
        'list_files',
        'ask_followup_question',
        'attempt_completion'
      ]
    }
  ];

  private defaultBlockedCommands: string[] = [
    'rm -rf /',
    'rm -rf ~',
    'rmdir /s /q c:\\',
    'del /f /s /q *.*',
    'format c:',
    'mkfs',
    ':(){ :|:& };:',
    'shutdown',
    'reboot'
  ];

  /**
   * Get all registered modes
   */
  public getAvailableModes(): ClineMode[] {
    return [...this.modes];
  }

  /**
   * Get default permission configurations
   */
  public getDefaultPermissions(): ClinePermissionsConfig {
    return {
      autoApproveRead: true,
      autoApproveWrite: false,
      autoApproveExecute: false,
      autoApproveBrowser: false,
      autoApproveMcp: false,
      blockedCommands: [...this.defaultBlockedCommands]
    };
  }

  /**
   * Generates the system prompt tailored to a specific Cline/Roo mode
   */
  public getSystemPromptForMode(modeSlug: string, customInstructions: string = ''): string {
    const mode = this.modes.find(m => m.slug === modeSlug) || this.modes[0];

    return `==== CLINE & ROO CODE AUTONOMOUS AGENT PROTOCOL ====
ROLE: ${mode.name} Mode (${mode.icon})
${mode.roleDefinition}

${customInstructions ? `USER CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}

ALLOWED TOOLS IN THIS MODE:
${mode.allowedTools.map(t => `- ${t}`).join('\n')}

TOOL INVOCATION PROTOCOL:
You communicate tool calls using clean XML markup. When you need to take an action, emit the corresponding XML block:

1. Read a file:
<read_file>
<path>relative/path/to/file.ts</path>
</read_file>

2. Write a new file or completely overwrite:
<write_to_file path="relative/path/to/file.ts">
<content>
file contents here
</content>
</write_to_file>

3. Execute a terminal command:
<execute_command>
<command>npm test</command>
</execute_command>

4. List files in directory:
<list_files>
<path>.</path>
</list_files>

5. Use Model Context Protocol (MCP) tool:
<use_mcp_tool server="git" tool="status">
<args>{}</args>
</use_mcp_tool>

6. Ask the user a clarifying question:
<ask_followup_question>
<question>Which database driver should we use?</question>
</ask_followup_question>

7. Complete the task:
<attempt_completion>
<result>Summary of all completed work and verification tests run.</result>
</attempt_completion>

OPERATIONAL PRINCIPLES:
- ALWAYS check file contents before editing.
- Break complex goals into clear, numbered milestones.
- Never invent file paths; verify them with list_files or read_file.
- Once finished, always invoke <attempt_completion> to present the final report.
`;
  }

  /**
   * Parses XML tool calls from an LLM response stream or text
   */
  public parseClineXmlToolCalls(text: string): ClineToolCall[] {
    const calls: ClineToolCall[] = [];
    if (!text || typeof text !== 'string') return calls;

    const toolNames = [
      'read_file',
      'write_to_file',
      'replace_in_file',
      'execute_command',
      'list_files',
      'browser_action',
      'use_mcp_tool',
      'ask_followup_question',
      'attempt_completion'
    ];

    for (const toolName of toolNames) {
      // Regex matching <toolName ...>...</toolName> or <toolName .../>
      const pattern = new RegExp(
        `<(${toolName})(?:\\s+([^>]*?))?(?:>(.*?)<\\/\\1>|\\/>)`,
        'gis'
      );

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullXml = match[0];
        const attributesStr = match[2] || '';
        const bodyStr = match[3] || '';

        const parameters: Record<string, any> = {};

        // 1. Parse attributes e.g. path="foo/bar"
        const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
          parameters[attrMatch[1]] = attrMatch[2];
        }

        // 2. Parse inner tags e.g. <path>foo/bar</path> or <content>...</content>
        const innerTagRegex = /<([a-zA-Z0-9_-]+)>(.*?)<\/\1>/gis;
        let innerMatch;
        let foundInnerTags = false;
        while ((innerMatch = innerTagRegex.exec(bodyStr)) !== null) {
          foundInnerTags = true;
          const paramKey = innerMatch[1];
          let paramValue: any = innerMatch[2].trim();
          if (paramKey === 'args' || paramKey === 'parameters') {
            try {
              paramValue = JSON.parse(paramValue);
            } catch {
              // keep as string
            }
          }
          parameters[paramKey] = paramValue;
        }

        // 3. Fallback: If body has no nested tags and is non-empty, assign to primary parameter
        if (!foundInnerTags && bodyStr.trim()) {
          if (toolName === 'execute_command' && !parameters.command) {
            parameters.command = bodyStr.trim();
          } else if (toolName === 'read_file' && !parameters.path) {
            parameters.path = bodyStr.trim();
          } else if (toolName === 'write_to_file' && !parameters.content) {
            parameters.content = bodyStr.trim();
          } else if (toolName === 'ask_followup_question' && !parameters.question) {
            parameters.question = bodyStr.trim();
          } else if (toolName === 'attempt_completion' && !parameters.result) {
            parameters.result = bodyStr.trim();
          }
        }

        calls.push({
          name: toolName,
          parameters,
          rawXml: fullXml
        });
      }
    }

    return calls;
  }

  /**
   * Check permissions and safety policy for an incoming tool call
   */
  public checkPermission(
    toolCall: ClineToolCall,
    config: ClinePermissionsConfig
  ): PermissionCheckResult {
    // 1. Destructive Command Heuristics
    if (toolCall.name === 'execute_command') {
      const command = (toolCall.parameters.command || '').trim().toLowerCase();
      for (const blocked of config.blockedCommands) {
        if (command.includes(blocked.toLowerCase())) {
          return {
            allowed: false,
            requiresConfirmation: false,
            reason: `Execution blocked by safety policy: dangerous command pattern "${blocked}" detected.`
          };
        }
      }

      if (config.autoApproveExecute) {
        return { allowed: true, requiresConfirmation: false };
      }
      return {
        allowed: true,
        requiresConfirmation: true,
        reason: 'Terminal command requires human confirmation.'
      };
    }

    // 2. Read operations
    if (toolCall.name === 'read_file' || toolCall.name === 'list_files') {
      if (config.autoApproveRead) {
        return { allowed: true, requiresConfirmation: false };
      }
      return { allowed: true, requiresConfirmation: true, reason: 'Read requires user approval.' };
    }

    // 3. Write operations
    if (toolCall.name === 'write_to_file' || toolCall.name === 'replace_in_file') {
      if (config.autoApproveWrite) {
        return { allowed: true, requiresConfirmation: false };
      }
      return {
        allowed: true,
        requiresConfirmation: true,
        reason: `Modifying file "${toolCall.parameters.path || 'unknown'}" requires user approval.`
      };
    }

    // 4. Browser operations
    if (toolCall.name === 'browser_action') {
      if (config.autoApproveBrowser) {
        return { allowed: true, requiresConfirmation: false };
      }
      return { allowed: true, requiresConfirmation: true, reason: 'Browser action requires confirmation.' };
    }

    // 5. MCP tools
    if (toolCall.name === 'use_mcp_tool') {
      if (config.autoApproveMcp) {
        return { allowed: true, requiresConfirmation: false };
      }
      return {
        allowed: true,
        requiresConfirmation: true,
        reason: `MCP tool "${toolCall.parameters.tool || ''}" requires confirmation.`
      };
    }

    // 6. Conversational tools (asking questions or finishing)
    return { allowed: true, requiresConfirmation: false };
  }

  /**
   * Formats the execution result into standard XML tool response block
   */
  public formatToolResult(toolName: string, output: string, isError: boolean = false): string {
    const statusAttr = isError ? ' status="error"' : '';
    return `<tool_result name="${toolName}"${statusAttr}>
${output}
</tool_result>`;
  }

  /**
   * Compacts conversation history when reaching context window limits
   */
  public compactContextHistory(messages: ClineMessage[], maxKeepRecent: number = 6): ClineMessage[] {
    if (messages.length <= maxKeepRecent + 2) {
      return messages;
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');
    const older = nonSystem.slice(0, nonSystem.length - maxKeepRecent);
    const recent = nonSystem.slice(nonSystem.length - maxKeepRecent);

    const summaryContent = `[SYSTEM SUMMARY: The previous ${older.length} interaction turns were compacted. Key actions taken: ${
      older
        .filter(m => m.toolCalls && m.toolCalls.length > 0)
        .flatMap(m => m.toolCalls!.map(tc => tc.name))
        .join(', ') || 'user discussion and architectural inquiries'
    }]`;

    return [
      ...systemMessages,
      {
        role: 'system',
        content: summaryContent,
        timestamp: Date.now()
      },
      ...recent
    ];
  }
}

export const clineProtocolEngine = new ClineProtocolEngine();
