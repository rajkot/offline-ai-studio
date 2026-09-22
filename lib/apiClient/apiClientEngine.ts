/**
 * API Client Engine (REST & GraphQL Client Studio)
 * Powering the Thunder Client / Postman alternative inside Offline AI IDE.
 * Supports GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, plus GraphQL queries & mutations.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface ApiAuth {
  type: AuthType;
  bearerToken?: string;
  basicUser?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyAddTo?: 'header' | 'query';
}

export interface ApiRequestItem {
  id: string;
  name: string;
  collectionId?: string;
  method: HttpMethod;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  auth: ApiAuth;
  bodyType: BodyType;
  rawBody: string;
  graphqlQuery?: string;
  graphqlVariables?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  data: any;
  rawText: string;
  contentType: string;
  timestamp: number;
  error?: string;
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  requests: ApiRequestItem[];
}

export interface ApiClientHistoryItem {
  id: string;
  request: ApiRequestItem;
  response: ApiResponseData;
  timestamp: number;
}

const STORAGE_COLLECTIONS_KEY = 'offline_ide_api_collections';
const STORAGE_HISTORY_KEY = 'offline_ide_api_history';

// Built-in starter collection to test local Next.js APIs right out of the box
const DEFAULT_COLLECTIONS: ApiCollection[] = [
  {
    id: 'col-local-nextjs',
    name: '🚀 Local IDE Backend Routes',
    description: 'Instant verification of offline Next.js API endpoints',
    requests: [
      {
        id: 'req-git-status',
        name: 'Git Status Check',
        method: 'GET',
        url: '/api/git?action=status',
        queryParams: [{ id: 'q-1', key: 'action', value: 'status', enabled: true }],
        headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
        rawBody: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'req-terminal-pty',
        name: 'Check PTY Daemon',
        method: 'POST',
        url: '/api/terminal/pty',
        queryParams: [],
        headers: [
          { id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true },
          { id: 'h-2', key: 'Accept', value: 'application/json', enabled: true }
        ],
        auth: { type: 'none' },
        bodyType: 'json',
        rawBody: JSON.stringify({ action: 'start-server' }, null, 2),
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'req-ollama-status',
        name: 'Local Ollama AI Status',
        method: 'GET',
        url: '/api/ollama/status',
        queryParams: [],
        headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
        rawBody: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  },
  {
    id: 'col-graphql-sample',
    name: '🪐 GraphQL Public Demo',
    description: 'Interactive GraphQL query testing',
    requests: [
      {
        id: 'req-gql-countries',
        name: 'Query Continents & Countries',
        method: 'POST',
        url: 'https://countries.trevorblades.com/',
        queryParams: [],
        headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'graphql',
        rawBody: '',
        graphqlQuery: `query GetContinents {\n  continents {\n    code\n    name\n    countries {\n      name\n      emoji\n      capital\n    }\n  }\n}`,
        graphqlVariables: '{}',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  }
];

class ApiClientEngine {
  private collections: ApiCollection[] = [];
  private history: ApiClientHistoryItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedCols = localStorage.getItem(STORAGE_COLLECTIONS_KEY);
      this.collections = savedCols ? JSON.parse(savedCols) : DEFAULT_COLLECTIONS;

      const savedHist = localStorage.getItem(STORAGE_HISTORY_KEY);
      this.history = savedHist ? JSON.parse(savedHist) : [];
    } catch {
      this.collections = DEFAULT_COLLECTIONS;
      this.history = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(this.collections));
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(this.history.slice(0, 50)));
    } catch {}
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getCollections(): ApiCollection[] {
    return this.collections;
  }

  public getHistory(): ApiClientHistoryItem[] {
    return this.history;
  }

  public clearHistory(): void {
    this.history = [];
    this.saveToStorage();
  }

  public saveRequestToCollection(collectionId: string, req: ApiRequestItem): void {
    const col = this.collections.find(c => c.id === collectionId);
    if (col) {
      const existingIdx = col.requests.findIndex(r => r.id === req.id);
      if (existingIdx !== -1) {
        col.requests[existingIdx] = { ...req, updatedAt: Date.now() };
      } else {
        col.requests.push({ ...req, id: req.id || `req-${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() });
      }
      this.saveToStorage();
    }
  }

  public createCollection(name: string, description?: string): ApiCollection {
    const newCol: ApiCollection = {
      id: `col-${Date.now()}`,
      name: name.trim() || 'New Collection',
      description,
      requests: []
    };
    this.collections.push(newCol);
    this.saveToStorage();
    return newCol;
  }

  public deleteCollection(collectionId: string): void {
    this.collections = this.collections.filter(c => c.id !== collectionId);
    this.saveToStorage();
  }

  public deleteRequest(collectionId: string, requestId: string): void {
    const col = this.collections.find(c => c.id === collectionId);
    if (col) {
      col.requests = col.requests.filter(r => r.id !== requestId);
      this.saveToStorage();
    }
  }

  /**
   * Execute API HTTP or GraphQL Request
   */
  public async executeRequest(req: ApiRequestItem): Promise<ApiResponseData> {
    const startTime = performance.now();

    // 1. Construct URL with query parameters
    let finalUrl = req.url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      // Relative path: prepend origin or localhost:3000
      if (typeof window !== 'undefined') {
        finalUrl = `${window.location.origin}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
      } else {
        finalUrl = `http://localhost:3000${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
      }
    }

    try {
      const parsedUrl = new URL(finalUrl);
      req.queryParams
        .filter(q => q.enabled && q.key.trim())
        .forEach(q => {
          parsedUrl.searchParams.set(q.key.trim(), q.value);
        });

      // API Key in query parameter
      if (req.auth.type === 'apiKey' && req.auth.apiKeyAddTo === 'query' && req.auth.apiKeyName) {
        parsedUrl.searchParams.set(req.auth.apiKeyName, req.auth.apiKeyValue || '');
      }

      finalUrl = parsedUrl.toString();
    } catch {
      // If URL parsing fails, continue with finalUrl as is
    }

    // 2. Build Headers
    const headers: Record<string, string> = {};
    req.headers
      .filter(h => h.enabled && h.key.trim())
      .forEach(h => {
        headers[h.key.trim()] = h.value;
      });

    // Auth Headers
    if (req.auth.type === 'bearer' && req.auth.bearerToken) {
      headers['Authorization'] = `Bearer ${req.auth.bearerToken.trim()}`;
    } else if (req.auth.type === 'basic' && req.auth.basicUser) {
      const credentials = btoa(`${req.auth.basicUser}:${req.auth.basicPassword || ''}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (req.auth.type === 'apiKey' && req.auth.apiKeyAddTo === 'header' && req.auth.apiKeyName) {
      headers[req.auth.apiKeyName] = req.auth.apiKeyValue || '';
    }

    // 3. Build Body
    let body: BodyInit | undefined = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.bodyType === 'json') {
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        body = req.rawBody || '{}';
      } else if (req.bodyType === 'graphql') {
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        let vars = {};
        try {
          if (req.graphqlVariables) vars = JSON.parse(req.graphqlVariables);
        } catch {}
        body = JSON.stringify({
          query: req.graphqlQuery || '',
          variables: vars
        });
      } else if (req.bodyType === 'x-www-form-urlencoded') {
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = req.rawBody;
      } else if (req.bodyType === 'raw') {
        body = req.rawBody;
      }
    }

    try {
      const fetchResponse = await fetch(finalUrl, {
        method: req.method,
        headers,
        body
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const responseHeaders: Record<string, string> = {};
      fetchResponse.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const contentType = fetchResponse.headers.get('content-type') || '';
      const rawText = await fetchResponse.text();
      const sizeBytes = new Blob([rawText]).size;

      let data: any = rawText;
      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      const responseObj: ApiResponseData = {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText || (fetchResponse.ok ? 'OK' : 'Error'),
        durationMs,
        sizeBytes,
        headers: responseHeaders,
        data,
        rawText,
        contentType,
        timestamp: Date.now()
      };

      // Add to History
      this.history.unshift({
        id: `hist-${Date.now()}`,
        request: { ...req },
        response: responseObj,
        timestamp: Date.now()
      });
      this.saveToStorage();

      return responseObj;
    } catch (err: any) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const errorResponse: ApiResponseData = {
        status: 0,
        statusText: 'Network Error',
        durationMs,
        sizeBytes: 0,
        headers: {},
        data: null,
        rawText: err.message || 'Failed to fetch',
        contentType: 'text/plain',
        timestamp: Date.now(),
        error: err.message || 'Could not connect to target host'
      };

      this.history.unshift({
        id: `hist-${Date.now()}`,
        request: { ...req },
        response: errorResponse,
        timestamp: Date.now()
      });
      this.saveToStorage();

      return errorResponse;
    }
  }
}

export const apiClientEngine = new ApiClientEngine();
