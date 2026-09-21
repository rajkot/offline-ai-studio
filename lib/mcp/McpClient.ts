/**
 * Model Context Protocol (MCP) Client & JSON-RPC 2.0 Core Engine
 * Standardized client engine implementing MCP specifications:
 * - tools/list, tools/call
 * - resources/list, resources/read, resources/templates/list
 * - prompts/list, prompts/get
 * - notifications/tools/list_changed, notifications/resources/list_changed, notifications/prompts/list_changed
 *
 * Supports Dual Transport Layers:
 * 1. Client-Side In-Memory & Web Worker Transport
 * 2. Server-Side SSE & WebSocket Proxy Transport for External Local MCP Servers
 */

import {
  FilesystemMcpServer,
  GitMcpServer,
  PostgresSqliteMcpServer,
  FetchHttpMcpServer,
  PuppeteerBrowserMcpServer,
  TerminalMcpServer
} from './servers';

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 Specification Protocol Types & Schema Validation
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Standard JSON-RPC 2.0 Error Codes
 */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
  ResourceNotFound = -32002
}

/**
 * Safe JSON-RPC Schema Validator & Sanitizer
 * Guarantees invalid packets never throw unhandled exceptions.
 */
export function validateJsonRpcRequest(raw: any, fallbackId?: string | number): JsonRpcRequest {
  const safeId = raw && (typeof raw.id === 'string' || typeof raw.id === 'number')
    ? raw.id
    : (fallbackId ?? `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`);

  const method = raw && typeof raw.method === 'string' && raw.method.trim().length > 0
    ? raw.method.trim()
    : 'unknown/method';

  return {
    jsonrpc: '2.0',
    id: safeId,
    method,
    params: raw && typeof raw.params === 'object' && raw.params !== null ? raw.params : {}
  };
}

export function validateJsonRpcResponse(raw: any, expectedId?: string | number): JsonRpcResponse {
  const safeId = raw && (typeof raw.id === 'string' || typeof raw.id === 'number')
    ? raw.id
    : (expectedId ?? 0);

  if (!raw || typeof raw !== 'object') {
    return {
      jsonrpc: '2.0',
      id: safeId,
      error: {
        code: JsonRpcErrorCode.ParseError,
        message: 'Invalid JSON-RPC response payload received.'
      }
    };
  }

  if (raw.error && typeof raw.error === 'object') {
    return {
      jsonrpc: '2.0',
      id: safeId,
      error: {
        code: typeof raw.error.code === 'number' ? raw.error.code : JsonRpcErrorCode.InternalError,
        message: String(raw.error.message || 'Unknown JSON-RPC error'),
        data: raw.error.data
      }
    };
  }

  return {
    jsonrpc: '2.0',
    id: safeId,
    result: raw.result !== undefined ? raw.result : {}
  };
}

// ---------------------------------------------------------------------------
// Model Context Protocol (MCP) Core Schemas
// ---------------------------------------------------------------------------

export type McpTransportType = 'in-memory' | 'worker' | 'sse' | 'websocket';

export interface McpServerConfig {
  id: string;
  name: string;
  version: string;
  transport: McpTransportType;
  url?: string;
  headers?: Record<string, string>;
  description?: string;
  icon?: string;
  isPreset?: boolean;
  enabled?: boolean;
}

export type McpServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unauthorized';

export interface McpToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  items?: { type: string };
}

export interface McpToolSchema {
  type: 'object';
  properties: Record<string, McpToolProperty>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpToolSchema;
  serverId?: string;
  serverName?: string;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
  serverId?: string;
}

export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
  serverId?: string;
}

export interface McpPromptMessageContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: McpResourceContent;
}

export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: McpPromptMessageContent;
}

export interface McpCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: any;
  }>;
  isError?: boolean;
}

export interface McpServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, any>;
}

export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

export interface McpServerState {
  config: McpServerConfig;
  status: McpServerStatus;
  errorMessage?: string;
  serverInfo?: McpServerInfo;
  capabilities?: McpServerCapabilities;
  tools: McpTool[];
  resources: McpResource[];
  resourceTemplates: McpResourceTemplate[];
  prompts: McpPrompt[];
  lastConnected?: string;
  latencyMs?: number;
}

export interface McpCallLog {
  id: string;
  timestamp: string;
  serverId: string;
  serverName: string;
  toolName: string;
  arguments: any;
  result?: any;
  error?: string;
  durationMs: number;
  status: 'success' | 'error';
}

// ---------------------------------------------------------------------------
// Transports Layer
// ---------------------------------------------------------------------------

export interface IMcpTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(req: JsonRpcRequest): Promise<JsonRpcResponse>;
  onNotification(cb: (notif: JsonRpcNotification) => void): void;
  onError(cb: (err: Error) => void): void;
  onClose(cb: () => void): void;
}

/**
 * 1. In-Memory Transport for Virtual & Local MCP Server Adapters
 */
export class InMemoryTransport implements IMcpTransport {
  private handler: (req: JsonRpcRequest) => Promise<JsonRpcResponse>;
  private notificationCallbacks: Array<(n: JsonRpcNotification) => void> = [];
  private errorCallbacks: Array<(err: Error) => void> = [];
  private closeCallbacks: Array<() => void> = [];
  private isConnected = false;

  constructor(handler: (req: JsonRpcRequest) => Promise<JsonRpcResponse>) {
    this.handler = handler;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.closeCallbacks.forEach(cb => cb());
  }

  async send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.isConnected) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: JsonRpcErrorCode.ServerError, message: 'In-memory transport is not connected.' }
      };
    }
    try {
      const validated = validateJsonRpcRequest(req);
      const res = await this.handler(validated);
      return validateJsonRpcResponse(res, req.id);
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: JsonRpcErrorCode.InternalError, message: err?.message || 'Internal In-Memory MCP Error' }
      };
    }
  }

  onNotification(cb: (notif: JsonRpcNotification) => void): void {
    this.notificationCallbacks.push(cb);
  }

  onError(cb: (err: Error) => void): void {
    this.errorCallbacks.push(cb);
  }

  onClose(cb: () => void): void {
    this.closeCallbacks.push(cb);
  }

  public emitNotification(method: string, params?: any): void {
    const notif: JsonRpcNotification = { jsonrpc: '2.0', method, params };
    this.notificationCallbacks.forEach(cb => cb(notif));
  }
}

/**
 * 2. Web Worker Client Transport for Isolated Background MCP Execution
 */
export class WebWorkerMcpTransport implements IMcpTransport {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string | number, { resolve: (res: JsonRpcResponse) => void; reject: (err: any) => void }>();
  private notificationCallbacks: Array<(n: JsonRpcNotification) => void> = [];
  private errorCallbacks: Array<(err: Error) => void> = [];
  private closeCallbacks: Array<() => void> = [];

  constructor(private workerScriptOrUrl?: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }

        if (this.workerScriptOrUrl) {
          this.worker = new Worker(this.workerScriptOrUrl);
        } else {
          // Fallback lightweight inline Web Worker
          const blob = new Blob([
            `self.onmessage = function(e) {
              const req = e.data;
              if (req.method === 'ping') {
                self.postMessage({ jsonrpc: '2.0', id: req.id, result: {} });
              } else {
                self.postMessage({ jsonrpc: '2.0', id: req.id, result: { ok: true } });
              }
            };`
          ], { type: 'application/javascript' });
          this.worker = new Worker(URL.createObjectURL(blob));
        }

        this.worker.onmessage = (e: MessageEvent) => {
          const data = e.data;
          if (data && 'id' in data && this.pendingRequests.has(data.id)) {
            const { resolve } = this.pendingRequests.get(data.id)!;
            this.pendingRequests.delete(data.id);
            resolve(validateJsonRpcResponse(data, data.id));
          } else if (data && 'method' in data) {
            this.notificationCallbacks.forEach(cb => cb(data));
          }
        };

        this.worker.onerror = (err) => {
          this.errorCallbacks.forEach(cb => cb(new Error('Web Worker MCP Transport error')));
        };

        resolve();
      } catch (err: any) {
        reject(err);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.closeCallbacks.forEach(cb => cb());
  }

  async send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.worker) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: JsonRpcErrorCode.ServerError, message: 'Web Worker not initialized.' }
      };
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(req.id, { resolve, reject });
      this.worker!.postMessage(req);
      setTimeout(() => {
        if (this.pendingRequests.has(req.id)) {
          this.pendingRequests.delete(req.id);
          resolve({
            jsonrpc: '2.0',
            id: req.id,
            error: { code: JsonRpcErrorCode.ServerError, message: 'Worker request timeout' }
          });
        }
      }, 10000);
    });
  }

  onNotification(cb: (notif: JsonRpcNotification) => void): void {
    this.notificationCallbacks.push(cb);
  }
  onError(cb: (err: Error) => void): void {
    this.errorCallbacks.push(cb);
  }
  onClose(cb: () => void): void {
    this.closeCallbacks.push(cb);
  }
}

/**
 * 3. Server-Sent Events (SSE) + HTTP POST Transport
 */
export class SseMcpTransport implements IMcpTransport {
  private url: string;
  private headers: Record<string, string>;
  private eventSource: EventSource | null = null;
  private postEndpoint: string | null = null;
  private pendingRequests = new Map<string | number, { resolve: (res: JsonRpcResponse) => void; reject: (err: any) => void }>();
  private notificationCallbacks: Array<(n: JsonRpcNotification) => void> = [];
  private errorCallbacks: Array<(err: Error) => void> = [];
  private closeCallbacks: Array<() => void> = [];

  constructor(url: string, headers: Record<string, string> = {}) {
    this.url = url;
    this.headers = headers;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }
        this.eventSource = new EventSource(this.url);

        this.eventSource.onopen = () => {
          resolve();
        };

        this.eventSource.addEventListener('endpoint', (e: MessageEvent) => {
          this.postEndpoint = new URL(e.data, this.url).toString();
        });

        this.eventSource.addEventListener('message', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if ('id' in data && this.pendingRequests.has(data.id)) {
              const { resolve } = this.pendingRequests.get(data.id)!;
              this.pendingRequests.delete(data.id);
              resolve(validateJsonRpcResponse(data, data.id));
            } else if ('method' in data) {
              this.notificationCallbacks.forEach(cb => cb(data));
            }
          } catch (err) {
            console.error('[SSE MCP] parse error', err);
          }
        });

        this.eventSource.onerror = () => {
          this.errorCallbacks.forEach(cb => cb(new Error('SSE connection failed')));
          reject(new Error('SSE connection error'));
        };
      } catch (e: any) {
        reject(e);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.closeCallbacks.forEach(cb => cb());
  }

  async send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const targetUrl = this.postEndpoint || this.url;
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(req)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return validateJsonRpcResponse(data, req.id);
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: JsonRpcErrorCode.InternalError, message: err.message || 'Fetch request failed' }
      };
    }
  }

  onNotification(cb: (notif: JsonRpcNotification) => void): void {
    this.notificationCallbacks.push(cb);
  }
  onError(cb: (err: Error) => void): void {
    this.errorCallbacks.push(cb);
  }
  onClose(cb: () => void): void {
    this.closeCallbacks.push(cb);
  }
}

/**
 * 4. WebSocket Proxy Transport for Remote & Local MCP Servers
 */
export class WebSocketMcpTransport implements IMcpTransport {
  private url: string;
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string | number, { resolve: (res: JsonRpcResponse) => void; reject: (err: any) => void }>();
  private notificationCallbacks: Array<(n: JsonRpcNotification) => void> = [];
  private errorCallbacks: Array<(err: Error) => void> = [];
  private closeCallbacks: Array<() => void> = [];

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => resolve();
        this.ws.onerror = () => {
          this.errorCallbacks.forEach(cb => cb(new Error('WebSocket error')));
          reject(new Error('WebSocket connection failed'));
        };
        this.ws.onclose = () => {
          this.closeCallbacks.forEach(cb => cb());
        };
        this.ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if ('id' in data && this.pendingRequests.has(data.id)) {
              const { resolve } = this.pendingRequests.get(data.id)!;
              this.pendingRequests.delete(data.id);
              resolve(validateJsonRpcResponse(data, data.id));
            } else if ('method' in data) {
              this.notificationCallbacks.forEach(cb => cb(data));
            }
          } catch (err) {
            console.error('[WS MCP] parse error', err);
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: JsonRpcErrorCode.ServerError, message: 'WebSocket is not open' }
      };
    }
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(req.id, { resolve, reject });
      this.ws!.send(JSON.stringify(req));
      setTimeout(() => {
        if (this.pendingRequests.has(req.id)) {
          this.pendingRequests.delete(req.id);
          resolve({
            jsonrpc: '2.0',
            id: req.id,
            error: { code: JsonRpcErrorCode.ServerError, message: 'Request timeout' }
          });
        }
      }, 15000);
    });
  }

  onNotification(cb: (notif: JsonRpcNotification) => void): void {
    this.notificationCallbacks.push(cb);
  }
  onError(cb: (err: Error) => void): void {
    this.errorCallbacks.push(cb);
  }
  onClose(cb: () => void): void {
    this.closeCallbacks.push(cb);
  }
}

// ---------------------------------------------------------------------------
// MCP Client Instance for Single Server
// ---------------------------------------------------------------------------

export class McpClient {
  private config: McpServerConfig;
  private transport: IMcpTransport;
  private state: McpServerState;
  private listeners: Array<(state: McpServerState) => void> = [];
  private requestIdCounter = 0;

  constructor(config: McpServerConfig, transport: IMcpTransport) {
    this.config = config;
    this.transport = transport;
    this.state = {
      config,
      status: 'disconnected',
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: []
    };

    this.setupTransportHandlers();
  }

  private setupTransportHandlers(): void {
    this.transport.onNotification((notif) => {
      if (notif.method === 'notifications/tools/list_changed') {
        this.refreshTools().catch(console.error);
      } else if (notif.method === 'notifications/resources/list_changed') {
        this.refreshResources().catch(console.error);
      } else if (notif.method === 'notifications/prompts/list_changed') {
        this.refreshPrompts().catch(console.error);
      }
    });

    this.transport.onError((err) => {
      this.updateState({ status: 'error', errorMessage: err.message });
    });

    this.transport.onClose(() => {
      this.updateState({ status: 'disconnected' });
    });
  }

  public getState(): McpServerState {
    return { ...this.state };
  }

  public subscribe(cb: (state: McpServerState) => void): () => void {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private updateState(partial: Partial<McpServerState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(cb => cb(this.getState()));
  }

  private nextId(): string {
    this.requestIdCounter += 1;
    return `mcp-${this.config.id}-${this.requestIdCounter}`;
  }

  public async connect(): Promise<void> {
    this.updateState({ status: 'connecting', errorMessage: undefined });
    const tStart = performance.now();

    try {
      await this.transport.connect();

      // Send initialize request
      const initRes = await this.transport.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'offline-ai-ide-client',
            version: '2.0.0'
          }
        }
      });

      if (initRes.error) {
        throw new Error(initRes.error.message);
      }

      const serverInfo: McpServerInfo = initRes.result?.serverInfo || {
        name: this.config.name,
        version: this.config.version
      };

      const capabilities: McpServerCapabilities = initRes.result?.capabilities || {};

      const latencyMs = Math.round(performance.now() - tStart);

      this.updateState({
        status: 'connected',
        serverInfo,
        capabilities,
        lastConnected: new Date().toISOString(),
        latencyMs
      });

      // Load tools, resources, and prompts
      await Promise.all([
        this.refreshTools(),
        this.refreshResources(),
        this.refreshResourceTemplates(),
        this.refreshPrompts()
      ]);
    } catch (err: any) {
      this.updateState({
        status: 'error',
        errorMessage: err.message || 'Connection failed'
      });
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    await this.transport.disconnect();
    this.updateState({
      status: 'disconnected',
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: []
    });
  }

  public async refreshTools(): Promise<McpTool[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'tools/list',
        params: {}
      });

      if (res.result?.tools) {
        const tools: McpTool[] = res.result.tools.map((t: any) => ({
          ...t,
          serverId: this.config.id,
          serverName: this.config.name
        }));
        this.updateState({ tools });
        return tools;
      }
    } catch (err) {
      console.error(`[McpClient ${this.config.id}] Error fetching tools:`, err);
    }
    return [];
  }

  public async refreshResources(): Promise<McpResource[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'resources/list',
        params: {}
      });

      if (res.result?.resources) {
        const resources: McpResource[] = res.result.resources.map((r: any) => ({
          ...r,
          serverId: this.config.id
        }));
        this.updateState({ resources });
        return resources;
      }
    } catch (err) {
      console.error(`[McpClient ${this.config.id}] Error fetching resources:`, err);
    }
    return [];
  }

  public async refreshResourceTemplates(): Promise<McpResourceTemplate[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'resources/templates/list',
        params: {}
      });

      if (res.result?.resourceTemplates) {
        const resourceTemplates: McpResourceTemplate[] = res.result.resourceTemplates.map((rt: any) => ({
          ...rt,
          serverId: this.config.id
        }));
        this.updateState({ resourceTemplates });
        return resourceTemplates;
      }
    } catch (err) {
      console.error(`[McpClient ${this.config.id}] Error fetching resource templates:`, err);
    }
    return [];
  }

  public async refreshPrompts(): Promise<McpPrompt[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'prompts/list',
        params: {}
      });

      if (res.result?.prompts) {
        const prompts: McpPrompt[] = res.result.prompts.map((p: any) => ({
          ...p,
          serverId: this.config.id
        }));
        this.updateState({ prompts });
        return prompts;
      }
    } catch (err) {
      console.error(`[McpClient ${this.config.id}] Error fetching prompts:`, err);
    }
    return [];
  }

  public async callTool(name: string, args: Record<string, any>): Promise<McpCallToolResult> {
    const res = await this.transport.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });

    if (res.error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `[${res.error.code}] ${res.error.message}` }]
      };
    }

    return res.result as McpCallToolResult;
  }

  public async readResource(uri: string): Promise<McpResourceContent[]> {
    const res = await this.transport.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/read',
      params: { uri }
    });

    if (res.error) {
      throw new Error(res.error.message);
    }

    return res.result?.contents || [];
  }

  public async getPrompt(name: string, args?: Record<string, string>): Promise<{ description?: string; messages: McpPromptMessage[] }> {
    const res = await this.transport.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'prompts/get',
      params: {
        name,
        arguments: args || {}
      }
    });

    if (res.error) {
      throw new Error(res.error.message);
    }

    return res.result || { messages: [] };
  }
}

// ---------------------------------------------------------------------------
// Memory Knowledge Graph Virtual Server Adapter
// ---------------------------------------------------------------------------

function createMemoryMcpHandler() {
  const entities = new Map<string, { name: string; entityType: string; observations: string[] }>();
  const relations: Array<{ from: string; to: string; relationType: string }> = [];

  // Seed default graph
  entities.set('AntigravityIDE', {
    name: 'AntigravityIDE',
    entityType: 'System',
    observations: ['Offline browser-based full stack AI IDE', 'Integrates Monaco, WASI, MCP, and WebGPU']
  });
  entities.set('ModelContextProtocol', {
    name: 'ModelContextProtocol',
    entityType: 'Standard',
    observations: ['Standardized JSON-RPC protocol for LLM tool and resource integration']
  });
  relations.push({ from: 'AntigravityIDE', to: 'ModelContextProtocol', relationType: 'implements' });

  return async (req: JsonRpcRequest): Promise<JsonRpcResponse> => {
    const { method, params, id } = req;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'memory-mcp', version: '1.2.0' },
          capabilities: {
            tools: { listChanged: true },
            resources: { listChanged: true },
            prompts: { listChanged: true }
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
              name: 'create_entities',
              description: 'Create multiple new entities in the semantic knowledge graph.',
              inputSchema: {
                type: 'object',
                properties: {
                  entities: {
                    type: 'string',
                    description: 'JSON array of entities: [{"name": "AuthService", "entityType": "Module", "observations": ["handles jwt"]}]'
                  }
                },
                required: ['entities']
              }
            },
            {
              name: 'read_graph',
              description: 'Read the full knowledge graph or filter by entity names.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Optional search query to filter nodes' }
                }
              }
            },
            {
              name: 'create_relations',
              description: 'Create directed semantic relations between entities in the graph.',
              inputSchema: {
                type: 'object',
                properties: {
                  relations: {
                    type: 'string',
                    description: 'JSON array of relations: [{"from": "UserModule", "to": "Database", "relationType": "queries"}]'
                  }
                },
                required: ['relations']
              }
            }
          ]
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'create_entities') {
        let parsed: any[] = [];
        try {
          parsed = typeof args.entities === 'string' ? JSON.parse(args.entities) : args.entities;
        } catch {
          parsed = [];
        }
        parsed.forEach(e => {
          if (e.name) {
            entities.set(e.name, {
              name: e.name,
              entityType: e.entityType || 'General',
              observations: Array.isArray(e.observations) ? e.observations : []
            });
          }
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Created ${parsed.length} entities in Knowledge Graph.` }]
          }
        };
      }

      if (toolName === 'read_graph') {
        const query = (args.query || '').toLowerCase();
        const allNodes = Array.from(entities.values());
        const filtered = query ? allNodes.filter(n => n.name.toLowerCase().includes(query) || n.observations.some(o => o.toLowerCase().includes(query))) : allNodes;

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({ entities: filtered, relations }, null, 2)
            }]
          }
        };
      }

      if (toolName === 'create_relations') {
        let rels: any[] = [];
        try {
          rels = typeof args.relations === 'string' ? JSON.parse(args.relations) : args.relations;
        } catch {
          rels = [];
        }
        rels.forEach(r => {
          if (r.from && r.to) {
            relations.push({ from: r.from, to: r.to, relationType: r.relationType || 'relates_to' });
          }
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Added ${rels.length} relations to Knowledge Graph.` }]
          }
        };
      }
    }

    if (method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'memory://graph/full',
              name: 'Full Knowledge Graph',
              description: `Contains ${entities.size} entities and ${relations.length} relations`,
              mimeType: 'application/json'
            }
          ]
        }
      };
    }

    if (method === 'resources/read') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri: 'memory://graph/full',
              mimeType: 'application/json',
              text: JSON.stringify({ entities: Array.from(entities.values()), relations }, null, 2)
            }
          ]
        }
      };
    }

    if (method === 'prompts/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'synthesize_knowledge',
              description: 'Synthesize architecture relations and memory graph entities.',
              arguments: [{ name: 'topic', description: 'Architecture topic to query' }]
            }
          ]
        }
      };
    }

    if (method === 'prompts/get') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          description: 'Memory graph synthesis',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Using the following graph entities, synthesize the system architecture:\n${JSON.stringify(Array.from(entities.values()), null, 2)}`
              }
            }
          ]
        }
      };
    }

    return { jsonrpc: '2.0', id, result: {} };
  };
}

// ---------------------------------------------------------------------------
// Global Central MCP Hub Engine (McpHub)
// ---------------------------------------------------------------------------

export class McpHub {
  private static instance: McpHub;
  private clients: Map<string, McpClient> = new Map();
  private serverConfigs: McpServerConfig[] = [];
  private callLogs: McpCallLog[] = [];
  private listeners: Array<(states: McpServerState[]) => void> = [];

  // Workspace providers
  private filesystemServer: FilesystemMcpServer;
  private gitServer: GitMcpServer;
  private postgresSqliteServer: PostgresSqliteMcpServer;
  private fetchHttpServer: FetchHttpMcpServer;
  private puppeteerServer: PuppeteerBrowserMcpServer;
  private terminalServer: TerminalMcpServer;

  private workspaceFilesProvider: () => Record<string, string> = () => ({});
  private onUpdateFileCallback?: (path: string, content: string) => void;

  private constructor() {
    this.filesystemServer = new FilesystemMcpServer({
      getFiles: () => this.workspaceFilesProvider(),
      updateFile: (path, content) => this.onUpdateFileCallback?.(path, content)
    });
    this.gitServer = new GitMcpServer(() => this.workspaceFilesProvider());
    this.postgresSqliteServer = new PostgresSqliteMcpServer();
    this.fetchHttpServer = new FetchHttpMcpServer();
    this.puppeteerServer = new PuppeteerBrowserMcpServer();
    this.terminalServer = new TerminalMcpServer();

    this.registerPresetServers();
  }

  public static getInstance(): McpHub {
    if (!McpHub.instance) {
      McpHub.instance = new McpHub();
    }
    return McpHub.instance;
  }

  public setWorkspaceContext(
    filesProvider: () => Record<string, string>,
    onUpdateFile?: (path: string, content: string) => void
  ): void {
    this.workspaceFilesProvider = filesProvider;
    this.onUpdateFileCallback = onUpdateFile;
    this.filesystemServer.setContext({
      getFiles: filesProvider,
      updateFile: onUpdateFile
    });
  }

  private registerPresetServers(): void {
    const presets: McpServerConfig[] = [
      {
        id: FilesystemMcpServer.SERVER_ID,
        name: FilesystemMcpServer.SERVER_NAME,
        version: FilesystemMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'Read, write, search, and list files with unified diff inspection.',
        icon: 'folder',
        isPreset: true,
        enabled: true
      },
      {
        id: GitMcpServer.SERVER_ID,
        name: GitMcpServer.SERVER_NAME,
        version: GitMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'Git commit, status, branch, diff, and log management tools.',
        icon: 'git-branch',
        isPreset: true,
        enabled: true
      },
      {
        id: PostgresSqliteMcpServer.SERVER_ID,
        name: PostgresSqliteMcpServer.SERVER_NAME,
        version: PostgresSqliteMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'SQL schema inspection, query execution, and table metadata retrieval.',
        icon: 'database',
        isPreset: true,
        enabled: true
      },
      {
        id: FetchHttpMcpServer.SERVER_ID,
        name: FetchHttpMcpServer.SERVER_NAME,
        version: FetchHttpMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'Safe HTTP REST / GraphQL querying with CORS fallback & headers analysis.',
        icon: 'globe',
        isPreset: true,
        enabled: true
      },
      {
        id: PuppeteerBrowserMcpServer.SERVER_ID,
        name: PuppeteerBrowserMcpServer.SERVER_NAME,
        version: PuppeteerBrowserMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'Web page fetching, markdown scraping, and DOM extraction tools.',
        icon: 'terminal',
        isPreset: true,
        enabled: true
      },
      {
        id: TerminalMcpServer.SERVER_ID,
        name: TerminalMcpServer.SERVER_NAME,
        version: TerminalMcpServer.SERVER_VERSION,
        transport: 'in-memory',
        description: 'Interactive bash-like terminal for executing shell commands in WASI.',
        icon: 'terminal',
        isPreset: true,
        enabled: true
      },
      {
        id: 'memory-mcp',
        name: 'Knowledge Graph Memory',
        version: '1.2.0',
        transport: 'in-memory',
        description: 'Store entities, observations, and semantic graph relations.',
        icon: 'brain',
        isPreset: true,
        enabled: true
      }
    ];

    presets.forEach(cfg => {
      this.serverConfigs.push(cfg);
      this.createClient(cfg);
    });

    // Auto-connect presets
    setTimeout(() => {
      presets.forEach(cfg => {
        this.connectServer(cfg.id).catch(e => console.error(`[McpHub] Failed to auto-connect ${cfg.id}:`, e));
      });
    }, 50);
  }

  private createClient(config: McpServerConfig): McpClient {
    let transport: IMcpTransport;

    if (config.transport === 'in-memory') {
      if (config.id === FilesystemMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.filesystemServer.handleRequest(req));
      } else if (config.id === GitMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.gitServer.handleRequest(req));
      } else if (config.id === PostgresSqliteMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.postgresSqliteServer.handleRequest(req));
      } else if (config.id === FetchHttpMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.fetchHttpServer.handleRequest(req));
      } else if (config.id === PuppeteerBrowserMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.puppeteerServer.handleRequest(req));
      } else if (config.id === TerminalMcpServer.SERVER_ID) {
        transport = new InMemoryTransport((req) => this.terminalServer.handleRequest(req));
      } else if (config.id === 'memory-mcp') {
        transport = new InMemoryTransport(createMemoryMcpHandler());
      } else {
        transport = new InMemoryTransport(async (req) => ({
          jsonrpc: '2.0',
          id: req.id,
          result: { ok: true }
        }));
      }
    } else if (config.transport === 'worker') {
      transport = new WebWorkerMcpTransport(config.url);
    } else if (config.transport === 'sse') {
      transport = new SseMcpTransport(config.url || '', config.headers);
    } else {
      transport = new WebSocketMcpTransport(config.url || '');
    }

    const client = new McpClient(config, transport);
    client.subscribe(() => this.notify());
    this.clients.set(config.id, client);
    return client;
  }

  public subscribe(cb: (states: McpServerState[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getAllStates());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    const states = this.getAllStates();
    this.listeners.forEach(cb => cb(states));
  }

  public getAllStates(): McpServerState[] {
    return Array.from(this.clients.values()).map(c => c.getState());
  }

  public getServerState(id: string): McpServerState | undefined {
    return this.clients.get(id)?.getState();
  }

  public async addServer(config: McpServerConfig): Promise<void> {
    if (this.serverConfigs.some(c => c.id === config.id)) {
      throw new Error(`Server with id '${config.id}' already exists.`);
    }
    this.serverConfigs.push(config);
    const client = this.createClient(config);
    if (config.enabled !== false) {
      await client.connect();
    }
    this.notify();
  }

  public async removeServer(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      await client.disconnect();
      this.clients.delete(id);
    }
    this.serverConfigs = this.serverConfigs.filter(c => c.id !== id);
    this.notify();
  }

  /**
   * Connect to an MCP server by ID or config object
   */
  public async connectServer(configOrId: string | McpServerConfig): Promise<void> {
    let serverId: string;
    if (typeof configOrId === 'string') {
      serverId = configOrId;
    } else {
      serverId = configOrId.id;
      if (!this.clients.has(serverId)) {
        await this.addServer(configOrId);
        return;
      }
    }

    const client = this.clients.get(serverId);
    if (client) {
      await client.connect();
    }
  }

  public async disconnectServer(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      await client.disconnect();
    }
  }

  /**
   * List all available tools across connected servers (or for a specific server)
   */
  public listTools(serverId?: string): McpTool[] {
    if (serverId) {
      const client = this.clients.get(serverId);
      return client && client.getState().status === 'connected' ? client.getState().tools : [];
    }
    return this.getAllTools();
  }

  public getAllTools(): McpTool[] {
    const all: McpTool[] = [];
    this.clients.forEach(client => {
      if (client.getState().status === 'connected') {
        all.push(...client.getState().tools);
      }
    });
    return all;
  }

  /**
   * Execute tool by name and arguments. Auto-locates the server providing the tool if serverId is omitted.
   */
  public async executeTool(name: string, args: Record<string, any> = {}, serverId?: string): Promise<McpCallToolResult> {
    let targetServerId = serverId;
    if (!targetServerId) {
      for (const client of this.clients.values()) {
        if (client.getState().status === 'connected') {
          const hasTool = client.getState().tools.some(t => t.name === name);
          if (hasTool) {
            targetServerId = client.getState().config.id;
            break;
          }
        }
      }
    }

    if (!targetServerId) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool '${name}' not found on any connected MCP server.` }]
      };
    }

    return this.callTool(targetServerId, name, args);
  }

  public async callTool(serverId: string, toolName: string, args: Record<string, any>): Promise<McpCallToolResult> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP Server '${serverId}' is not registered.`);
    }

    const tStart = performance.now();
    let result: McpCallToolResult;
    let isSuccess = true;
    let errorStr: string | undefined;

    try {
      result = await client.callTool(toolName, args);
      if (result.isError) {
        isSuccess = false;
        errorStr = result.content.map(c => c.text).join(' ');
      }
    } catch (err: any) {
      isSuccess = false;
      errorStr = err.message || 'Execution error';
      result = {
        isError: true,
        content: [{ type: 'text', text: errorStr }]
      };
    }

    const durationMs = Math.round(performance.now() - tStart);

    // Record Call Log
    const log: McpCallLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      serverId,
      serverName: client.getState().config.name,
      toolName,
      arguments: args,
      result: result.content,
      error: errorStr,
      durationMs,
      status: isSuccess ? 'success' : 'error'
    };

    this.callLogs.unshift(log);
    if (this.callLogs.length > 200) {
      this.callLogs.pop();
    }

    return result;
  }

  public getAllResources(): McpResource[] {
    const all: McpResource[] = [];
    this.clients.forEach(client => {
      if (client.getState().status === 'connected') {
        all.push(...client.getState().resources);
      }
    });
    return all;
  }

  public listResources(serverId?: string): McpResource[] {
    if (serverId) {
      const client = this.clients.get(serverId);
      return client && client.getState().status === 'connected' ? client.getState().resources : [];
    }
    return this.getAllResources();
  }

  public listResourceTemplates(serverId?: string): McpResourceTemplate[] {
    if (serverId) {
      const client = this.clients.get(serverId);
      return client && client.getState().status === 'connected' ? client.getState().resourceTemplates : [];
    }
    const all: McpResourceTemplate[] = [];
    this.clients.forEach(client => {
      if (client.getState().status === 'connected') {
        all.push(...client.getState().resourceTemplates);
      }
    });
    return all;
  }

  /**
   * Read resource by URI across all connected servers or a target server
   */
  public async readResource(uri: string, serverId?: string): Promise<McpResourceContent[]> {
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) throw new Error(`MCP Server '${serverId}' not found.`);
      return await client.readResource(uri);
    }

    // Auto-detect server based on URI scheme or search in connected resources
    for (const client of this.clients.values()) {
      if (client.getState().status === 'connected') {
        const hasRes = client.getState().resources.some(r => r.uri === uri) ||
          (uri.startsWith('file://') && client.getState().config.id === FilesystemMcpServer.SERVER_ID) ||
          (uri.startsWith('git://') && client.getState().config.id === GitMcpServer.SERVER_ID) ||
          (uri.startsWith('sqlite://') && client.getState().config.id === PostgresSqliteMcpServer.SERVER_ID) ||
          (uri.startsWith('http://') && client.getState().config.id === FetchHttpMcpServer.SERVER_ID) ||
          (uri.startsWith('browser://') && client.getState().config.id === PuppeteerBrowserMcpServer.SERVER_ID) ||
          (uri.startsWith('memory://') && client.getState().config.id === 'memory-mcp');

        if (hasRes) {
          return await client.readResource(uri);
        }
      }
    }

    throw new Error(`Resource '${uri}' not found on any connected MCP server.`);
  }

  public getAllPrompts(): McpPrompt[] {
    const all: McpPrompt[] = [];
    this.clients.forEach(client => {
      if (client.getState().status === 'connected') {
        all.push(...client.getState().prompts);
      }
    });
    return all;
  }

  public listPrompts(serverId?: string): McpPrompt[] {
    if (serverId) {
      const client = this.clients.get(serverId);
      return client && client.getState().status === 'connected' ? client.getState().prompts : [];
    }
    return this.getAllPrompts();
  }

  public async getPrompt(promptName: string, args?: Record<string, string>, serverId?: string): Promise<{ description?: string; messages: McpPromptMessage[] }> {
    let targetServerId = serverId;
    if (!targetServerId) {
      for (const client of this.clients.values()) {
        if (client.getState().status === 'connected') {
          if (client.getState().prompts.some(p => p.name === promptName)) {
            targetServerId = client.getState().config.id;
            break;
          }
        }
      }
    }

    if (!targetServerId) {
      throw new Error(`Prompt '${promptName}' not found on any connected MCP server.`);
    }

    const client = this.clients.get(targetServerId);
    if (!client) {
      throw new Error(`MCP Server '${targetServerId}' not found.`);
    }

    return await client.getPrompt(promptName, args);
  }

  public getCallLogs(): McpCallLog[] {
    return this.callLogs;
  }

  public clearCallLogs(): void {
    this.callLogs = [];
  }
}

export const mcpHub = McpHub.getInstance();
