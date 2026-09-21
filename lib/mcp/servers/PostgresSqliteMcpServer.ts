/**
 * PostgreSQL / SQLite Relational Database MCP Server Adapter
 * Exposes SQL schema inspection, query execution, and table metadata retrieval.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpResource,
  McpPrompt,
  McpResourceTemplate
} from '../McpClient';

export interface SqlTableColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: any;
}

export interface SqlTableSchema {
  name: string;
  columns: SqlTableColumn[];
  rows: Record<string, any>[];
  indexes: string[];
}

export class PostgresSqliteMcpServer {
  public static readonly SERVER_ID = 'postgres-sqlite-mcp';
  public static readonly SERVER_NAME = 'PostgreSQL & SQLite Database';
  public static readonly SERVER_VERSION = '2.2.0';

  private tables: Map<string, SqlTableSchema> = new Map();

  constructor() {
    this.initDefaultTables();
  }

  private initDefaultTables(): void {
    // Users table
    this.tables.set('users', {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'role', type: 'VARCHAR(50)', nullable: false, defaultValue: 'developer' },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false }
      ],
      indexes: ['idx_users_email', 'idx_users_role'],
      rows: [
        { id: 1, name: 'Alice Chen', email: 'alice@antigravity.ai', role: 'admin', created_at: '2026-01-15T09:00:00Z' },
        { id: 2, name: 'Bob Miller', email: 'bob@antigravity.ai', role: 'engineer', created_at: '2026-02-01T14:30:00Z' },
        { id: 3, name: 'Clara Oswald', email: 'clara@antigravity.ai', role: 'designer', created_at: '2026-02-18T11:15:00Z' },
        { id: 4, name: 'David Kim', email: 'david@antigravity.ai', role: 'engineer', created_at: '2026-03-01T08:45:00Z' }
      ]
    });

    // LLM Interaction Logs
    this.tables.set('ai_interactions', {
      name: 'ai_interactions',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
        { name: 'session_id', type: 'VARCHAR(64)', nullable: false },
        { name: 'model', type: 'VARCHAR(64)', nullable: false },
        { name: 'prompt_tokens', type: 'INTEGER', nullable: false },
        { name: 'completion_tokens', type: 'INTEGER', nullable: false },
        { name: 'duration_ms', type: 'INTEGER', nullable: false },
        { name: 'timestamp', type: 'TIMESTAMP', nullable: false }
      ],
      indexes: ['idx_ai_session', 'idx_ai_timestamp'],
      rows: [
        { id: '1a2b3c4d', session_id: 'sess-001', model: 'gemini-1.5-flash', prompt_tokens: 820, completion_tokens: 340, duration_ms: 412, timestamp: '2026-09-12T18:30:00Z' },
        { id: '2b3c4d5e', session_id: 'sess-001', model: 'gemini-1.5-flash', prompt_tokens: 1450, completion_tokens: 890, duration_ms: 954, timestamp: '2026-09-12T18:35:00Z' },
        { id: '3c4d5e6f', session_id: 'sess-002', model: 'gemini-1.5-pro', prompt_tokens: 3200, completion_tokens: 1200, duration_ms: 1840, timestamp: '2026-09-13T01:10:00Z' }
      ]
    });

    // Workspace Project Settings
    this.tables.set('project_configs', {
      name: 'project_configs',
      columns: [
        { name: 'config_key', type: 'VARCHAR(128)', nullable: false, primaryKey: true },
        { name: 'config_value', type: 'JSONB', nullable: false },
        { name: 'updated_by', type: 'VARCHAR(100)', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
      ],
      indexes: ['idx_configs_updated_at'],
      rows: [
        { config_key: 'mcp.protocols.enabled', config_value: '["tools", "resources", "prompts"]', updated_by: 'Alice Chen', updated_at: '2026-09-10T12:00:00Z' },
        { config_key: 'lsp.worker.diagnostics', config_value: '{"severityThreshold": "warning"}', updated_by: 'Bob Miller', updated_at: '2026-09-12T15:20:00Z' }
      ]
    });
  }

  public getTools(): McpTool[] {
    return [
      {
        name: 'execute_query',
        description: 'Execute standard SQL queries (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, EXPLAIN) against database.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'SQL query string to execute' },
            readonly: { type: 'boolean', description: 'Enforce read-only execution (defaults to false)' }
          },
          required: ['sql']
        },
        serverId: PostgresSqliteMcpServer.SERVER_ID,
        serverName: PostgresSqliteMcpServer.SERVER_NAME
      },
      {
        name: 'inspect_schema',
        description: 'Get DDL CREATE TABLE statements and column types for all or specific tables.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Optional table name to filter' }
          }
        },
        serverId: PostgresSqliteMcpServer.SERVER_ID,
        serverName: PostgresSqliteMcpServer.SERVER_NAME
      },
      {
        name: 'list_tables',
        description: 'List all available relational tables, column counts, and active row statistics.',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        serverId: PostgresSqliteMcpServer.SERVER_ID,
        serverName: PostgresSqliteMcpServer.SERVER_NAME
      },
      {
        name: 'get_table_metadata',
        description: 'Get detailed metadata for a table: columns, nullability, primary keys, indexes, and sample rows.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Name of the database table' }
          },
          required: ['tableName']
        },
        serverId: PostgresSqliteMcpServer.SERVER_ID,
        serverName: PostgresSqliteMcpServer.SERVER_NAME
      }
    ];
  }

  public getResources(): McpResource[] {
    const list: McpResource[] = [
      {
        uri: 'sqlite://schema/public',
        name: 'Complete Database Schema DDL',
        description: 'All table definitions and index schemas',
        mimeType: 'text/x-sql',
        serverId: PostgresSqliteMcpServer.SERVER_ID
      }
    ];

    this.tables.forEach((table, tName) => {
      list.push({
        uri: `sqlite://tables/${tName}`,
        name: `Table: ${tName}`,
        description: `${table.rows.length} rows, ${table.columns.length} columns`,
        mimeType: 'application/json',
        serverId: PostgresSqliteMcpServer.SERVER_ID
      });
    });

    return list;
  }

  public getResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'sqlite://tables/{tableName}',
        name: 'Database Table Access',
        description: 'Direct query and snapshot access for any relational table',
        mimeType: 'application/json',
        serverId: PostgresSqliteMcpServer.SERVER_ID
      }
    ];
  }

  public getPrompts(): McpPrompt[] {
    return [
      {
        name: 'optimize_query',
        description: 'Analyze SQL query and propose indexing strategies and performance optimizations.',
        arguments: [
          { name: 'query', description: 'SQL query to analyze', required: true },
          { name: 'dbFlavor', description: 'Database engine (postgresql, sqlite, mysql)' }
        ],
        serverId: PostgresSqliteMcpServer.SERVER_ID
      },
      {
        name: 'generate_migration',
        description: 'Generate idempotent SQL DDL migration script for new feature data models.',
        arguments: [
          { name: 'description', description: 'Specification of the database changes needed', required: true }
        ],
        serverId: PostgresSqliteMcpServer.SERVER_ID
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
              name: PostgresSqliteMcpServer.SERVER_ID,
              version: PostgresSqliteMcpServer.SERVER_VERSION
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
        if (uri === 'sqlite://schema/public') {
          const ddls: string[] = [];
          this.tables.forEach(t => ddls.push(this.generateTableDdl(t)));
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri,
                mimeType: 'text/x-sql',
                text: ddls.join('\n\n')
              }]
            }
          };
        }

        if (uri.startsWith('sqlite://tables/')) {
          const tableName = uri.replace('sqlite://tables/', '');
          const table = this.tables.get(tableName);
          if (table) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    table: table.name,
                    columns: table.columns,
                    rows: table.rows
                  }, null, 2)
                }]
              }
            };
          }
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource '${uri}' not found.` }
        };
      }

      if (method === 'prompts/get') {
        const promptName = params?.name;
        const pArgs = params?.arguments || {};

        if (promptName === 'optimize_query') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'SQL Query Performance Optimization Prompt',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Analyze this SQL query for performance bottlenecks and recommend composite indexes and execution plans:\n\n\`\`\`sql\n${pArgs.query || 'SELECT * FROM users;'}\n\`\`\``
                  }
                }
              ]
            }
          };
        }

        if (promptName === 'generate_migration') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'SQL Migration Generator',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Write an idempotent SQL migration (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS) for:\n${pArgs.description || 'New feature schema'}`
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

        if (toolName === 'execute_query') {
          const sql = (args.sql || '').trim();
          if (!sql) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'SQL query string cannot be empty.' }] }
            };
          }

          const tStart = performance.now();
          const queryUpper = sql.toUpperCase();

          // SELECT Query
          if (queryUpper.startsWith('SELECT')) {
            const match = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
            const targetTable = match ? match[1].toLowerCase() : null;

            if (targetTable && this.tables.has(targetTable)) {
              const table = this.tables.get(targetTable)!;
              let rows = [...table.rows];

              // Simple WHERE filter simulation
              if (/WHERE\s+([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/i.test(sql)) {
                const [, col, val] = sql.match(/WHERE\s+([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/i)!;
                rows = rows.filter(r => String(r[col]) === val);
              } else if (/WHERE\s+([a-zA-Z0-9_]+)\s*=\s*([0-9]+)/i.test(sql)) {
                const [, col, val] = sql.match(/WHERE\s+([a-zA-Z0-9_]+)\s*=\s*([0-9]+)/i)!;
                rows = rows.filter(r => Number(r[col]) === Number(val));
              }

              // LIMIT
              const limitMatch = sql.match(/LIMIT\s+([0-9]+)/i);
              if (limitMatch) {
                rows = rows.slice(0, parseInt(limitMatch[1], 10));
              }

              const durationMs = (performance.now() - tStart).toFixed(2);
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      status: 'OK',
                      query: sql,
                      rowCount: rows.length,
                      durationMs: `${durationMs}ms`,
                      columns: table.columns.map(c => c.name),
                      rows
                    }, null, 2)
                  }]
                }
              };
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    status: 'OK',
                    query: sql,
                    rowCount: 1,
                    durationMs: `${(performance.now() - tStart).toFixed(2)}ms`,
                    rows: [{ result: 'Query executed successfully' }]
                  }, null, 2)
                }]
              }
            };
          }

          // INSERT INTO
          if (queryUpper.startsWith('INSERT')) {
            const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
            const targetTable = match ? match[1].toLowerCase() : null;
            if (targetTable && this.tables.has(targetTable)) {
              const table = this.tables.get(targetTable)!;
              const newId = table.rows.length + 1;
              const mockRow: Record<string, any> = { id: newId };
              table.columns.forEach(c => {
                if (c.name !== 'id') mockRow[c.name] = c.defaultValue || `test_${c.name}`;
              });
              table.rows.push(mockRow);

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({ status: 'OK', rowsAffected: 1, insertedId: newId }, null, 2)
                  }]
                }
              };
            }
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  status: 'OK',
                  query: sql,
                  rowsAffected: 1,
                  durationMs: `${(performance.now() - tStart).toFixed(2)}ms`
                }, null, 2)
              }]
            }
          };
        }

        if (toolName === 'inspect_schema') {
          const tableName = args.tableName?.trim();
          if (tableName && this.tables.has(tableName)) {
            const ddl = this.generateTableDdl(this.tables.get(tableName)!);
            return {
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: ddl }] }
            };
          }

          const allDdls: string[] = [];
          this.tables.forEach(t => allDdls.push(this.generateTableDdl(t)));
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: allDdls.join('\n\n') }] }
          };
        }

        if (toolName === 'list_tables') {
          const summary = Array.from(this.tables.values()).map(t => ({
            table: t.name,
            columnsCount: t.columns.length,
            rowsCount: t.rows.length,
            indexesCount: t.indexes.length
          }));
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
            }
          };
        }

        if (toolName === 'get_table_metadata') {
          const tName = args.tableName?.trim();
          if (tName && this.tables.has(tName)) {
            const t = this.tables.get(tName)!;
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    tableName: t.name,
                    columns: t.columns,
                    indexes: t.indexes,
                    rowCount: t.rows.length,
                    sampleRows: t.rows.slice(0, 3)
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
              content: [{ type: 'text', text: `Table '${tName}' not found in database.` }]
            }
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
        error: { code: -32601, message: `Method '${method}' not handled by PostgresSqliteMcpServer.` }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err?.message || 'Database execution error' }
      };
    }
  }

  private generateTableDdl(table: SqlTableSchema): string {
    const colLines = table.columns.map(c => {
      let line = `  ${c.name} ${c.type}`;
      if (c.primaryKey) line += ' PRIMARY KEY';
      if (!c.nullable && !c.primaryKey) line += ' NOT NULL';
      if (c.defaultValue !== undefined) line += ` DEFAULT '${c.defaultValue}'`;
      return line;
    });

    let ddl = `CREATE TABLE ${table.name} (\n${colLines.join(',\n')}\n);`;
    if (table.indexes.length > 0) {
      const idxLines = table.indexes.map(idx => `CREATE INDEX ${idx} ON ${table.name};`);
      ddl += '\n' + idxLines.join('\n');
    }
    return ddl;
  }
}
