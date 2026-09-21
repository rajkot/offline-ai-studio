/**
 * Fetch HTTP REST / GraphQL MCP Server Adapter
 * Exposes safe HTTP REST/GraphQL querying with CORS fallback.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpTool,
  McpResource,
  McpPrompt,
  McpResourceTemplate
} from '../McpClient';

export class FetchHttpMcpServer {
  public static readonly SERVER_ID = 'fetch-http-mcp';
  public static readonly SERVER_NAME = 'Fetch HTTP & GraphQL';
  public static readonly SERVER_VERSION = '1.3.0';

  private requestHistory: Array<{
    id: string;
    url: string;
    method: string;
    status: number;
    durationMs: number;
    timestamp: string;
    responsePreview: string;
  }> = [];

  public getTools(): McpTool[] {
    return [
      {
        name: 'http_request',
        description: 'Execute HTTP REST requests (GET, POST, PUT, DELETE, PATCH) with custom headers, query params, and body.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL endpoint' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'], description: 'HTTP Verb (default GET)' },
            headers: { type: 'string', description: 'JSON string of request headers' },
            body: { type: 'string', description: 'Request payload body (string or JSON)' },
            timeoutMs: { type: 'number', description: 'Request timeout in milliseconds (default 10000)' }
          },
          required: ['url']
        },
        serverId: FetchHttpMcpServer.SERVER_ID,
        serverName: FetchHttpMcpServer.SERVER_NAME
      },
      {
        name: 'graphql_query',
        description: 'Execute a GraphQL query or mutation against a remote GraphQL endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'GraphQL HTTP endpoint URL' },
            query: { type: 'string', description: 'GraphQL query or mutation string' },
            variables: { type: 'string', description: 'JSON string of GraphQL variables' },
            headers: { type: 'string', description: 'JSON string of authentication headers' }
          },
          required: ['endpoint', 'query']
        },
        serverId: FetchHttpMcpServer.SERVER_ID,
        serverName: FetchHttpMcpServer.SERVER_NAME
      },
      {
        name: 'check_endpoint_health',
        description: 'Ping endpoint, check HTTP status code, measure network latency, and test availability.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL endpoint to ping' }
          },
          required: ['url']
        },
        serverId: FetchHttpMcpServer.SERVER_ID,
        serverName: FetchHttpMcpServer.SERVER_NAME
      },
      {
        name: 'inspect_headers',
        description: 'Retrieve and inspect HTTP response headers and security headers (CORS, CSP, Cache-Control).',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL' }
          },
          required: ['url']
        },
        serverId: FetchHttpMcpServer.SERVER_ID,
        serverName: FetchHttpMcpServer.SERVER_NAME
      }
    ];
  }

  public getResources(): McpResource[] {
    return [
      {
        uri: 'http://history/requests',
        name: 'HTTP Request Telemetry Log',
        description: `Recent HTTP calls executed through Fetch MCP (${this.requestHistory.length} calls)`,
        mimeType: 'application/json',
        serverId: FetchHttpMcpServer.SERVER_ID
      }
    ];
  }

  public getResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'http://cache/{id}',
        name: 'HTTP Response Cache',
        description: 'Cached response bodies for previous HTTP requests',
        mimeType: 'application/json',
        serverId: FetchHttpMcpServer.SERVER_ID
      }
    ];
  }

  public getPrompts(): McpPrompt[] {
    return [
      {
        name: 'generate_api_client',
        description: 'Generate a typed TypeScript client module with error handling based on an HTTP endpoint.',
        arguments: [
          { name: 'endpoint', description: 'API endpoint URL', required: true },
          { name: 'framework', description: 'Target framework (e.g. Next.js, React, Node)' }
        ],
        serverId: FetchHttpMcpServer.SERVER_ID
      },
      {
        name: 'debug_api_response',
        description: 'Debug and validate JSON API schema compliance and missing response fields.',
        arguments: [
          { name: 'url', description: 'API URL', required: true }
        ],
        serverId: FetchHttpMcpServer.SERVER_ID
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
              name: FetchHttpMcpServer.SERVER_ID,
              version: FetchHttpMcpServer.SERVER_VERSION
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
        if (uri === 'http://history/requests') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.requestHistory, null, 2)
              }]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource '${uri}' not found.` }
        };
      }

      if (method === 'prompts/get') {
        const pName = params?.name;
        const pArgs = params?.arguments || {};
        if (pName === 'generate_api_client') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Generate TypeScript API client',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Write a clean, strongly typed TypeScript fetch client SDK for the API at ${pArgs.endpoint || 'https://api.example.com/v1'}. Include Zod response schemas and retry handling.`
                  }
                }
              ]
            }
          };
        }

        if (pName === 'debug_api_response') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Debug API response',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Inspect the response payload for ${pArgs.url} and check for null values, schema drifts, or rate limit headers.`
                  }
                }
              ]
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Prompt '${pName}' not found.` }
        };
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        if (toolName === 'http_request') {
          const targetUrl = args.url?.trim();
          if (!targetUrl) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'URL parameter is required.' }] }
            };
          }

          const httpMethod = (args.method || 'GET').toUpperCase();
          let parsedHeaders: Record<string, string> = {
            'User-Agent': 'AI-Studio-MCP-Client/1.0',
            'Accept': 'application/json, text/plain, */*'
          };

          if (args.headers) {
            try {
              const h = typeof args.headers === 'string' ? JSON.parse(args.headers) : args.headers;
              parsedHeaders = { ...parsedHeaders, ...h };
            } catch {
              // ignore header parse error
            }
          }

          const tStart = performance.now();
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), args.timeoutMs || 10000);

            const fetchOptions: RequestInit = {
              method: httpMethod,
              headers: parsedHeaders,
              signal: controller.signal
            };

            if (['POST', 'PUT', 'PATCH'].includes(httpMethod) && args.body) {
              fetchOptions.body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
              if (!parsedHeaders['Content-Type']) {
                parsedHeaders['Content-Type'] = 'application/json';
              }
            }

            const res = await fetch(targetUrl, fetchOptions);
            clearTimeout(timeout);
            const duration = Math.round(performance.now() - tStart);

            let responseBody = '';
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const json = await res.json();
              responseBody = JSON.stringify(json, null, 2);
            } else {
              responseBody = await res.text();
            }

            const headerMap: Record<string, string> = {};
            res.headers.forEach((v, k) => { headerMap[k] = v; });

            this.requestHistory.unshift({
              id: Math.random().toString(36).substring(2, 7),
              url: targetUrl,
              method: httpMethod,
              status: res.status,
              durationMs: duration,
              timestamp: new Date().toISOString(),
              responsePreview: responseBody.slice(0, 100)
            });

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    status: res.status,
                    statusText: res.statusText,
                    durationMs: `${duration}ms`,
                    headers: headerMap,
                    data: responseBody.length > 50000 ? responseBody.slice(0, 50000) + '\n...[truncated]' : responseBody
                  }, null, 2)
                }]
              }
            };
          } catch (err: any) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                isError: true,
                content: [{
                  type: 'text',
                  text: `HTTP fetch failed: ${err.message || 'Network error (Check CORS or connectivity)'}`
                }]
              }
            };
          }
        }

        if (toolName === 'graphql_query') {
          const endpoint = args.endpoint?.trim();
          const query = args.query;
          if (!endpoint || !query) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: 'Endpoint and Query are required.' }] }
            };
          }

          let variables = {};
          if (args.variables) {
            try {
              variables = typeof args.variables === 'string' ? JSON.parse(args.variables) : args.variables;
            } catch {
              // fallback
            }
          }

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ query, variables })
            });
            const data = await res.json();
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
              }
            };
          } catch (err: any) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: `GraphQL execution failed: ${err.message}` }] }
            };
          }
        }

        if (toolName === 'check_endpoint_health') {
          const url = args.url?.trim();
          const tStart = performance.now();
          try {
            const res = await fetch(url, { method: 'HEAD' });
            const lat = Math.round(performance.now() - tStart);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    url,
                    online: res.ok,
                    statusCode: res.status,
                    latencyMs: `${lat}ms`,
                    protocol: url.startsWith('https') ? 'HTTPS (Secure)' : 'HTTP'
                  }, null, 2)
                }]
              }
            };
          } catch (err: any) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    url,
                    online: false,
                    error: err.message,
                    latencyMs: `${Math.round(performance.now() - tStart)}ms`
                  }, null, 2)
                }]
              }
            };
          }
        }

        if (toolName === 'inspect_headers') {
          const url = args.url?.trim();
          try {
            const res = await fetch(url, { method: 'GET' });
            const headers: Record<string, string> = {};
            res.headers.forEach((v, k) => { headers[k] = v; });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    url,
                    status: res.status,
                    securityHeaders: {
                      'access-control-allow-origin': headers['access-control-allow-origin'] || 'not set',
                      'content-security-policy': headers['content-security-policy'] || 'not set',
                      'strict-transport-security': headers['strict-transport-security'] || 'not set'
                    },
                    allHeaders: headers
                  }, null, 2)
                }]
              }
            };
          } catch (err: any) {
            return {
              jsonrpc: '2.0',
              id,
              result: { isError: true, content: [{ type: 'text', text: `Header inspection failed: ${err.message}` }] }
            };
          }
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
        error: { code: -32601, message: `Method '${method}' not handled by FetchHttpMcpServer.` }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err?.message || 'Internal Fetch HTTP MCP Server error' }
      };
    }
  }
}
