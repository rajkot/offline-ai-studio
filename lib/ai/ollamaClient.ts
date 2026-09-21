/**
 * Ollama Local AI Client & Streaming Pipeline Engine
 * Connects the offline IDE directly to locally running Ollama models (e.g. llama3.2, qwen2.5-coder).
 * Supports zero-cloud offline generation, streaming completions, model enumeration, and health checks.
 */

export interface OllamaModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families?: string[];
  parameter_size: string;
  quantization_level: string;
  context_length?: number;
  embedding_length?: number;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
  capabilities?: string[];
}

export interface OllamaStatus {
  online: boolean;
  baseUrl: string;
  version?: string;
  models: OllamaModelInfo[];
  defaultModel: string;
  error?: string;
}

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

/**
 * Retrieve the active Ollama base URL from environment or fallback
 */
export function getOllamaBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.OLLAMA_BASE_URL) {
    return process.env.OLLAMA_BASE_URL.replace(/\/+$/, '');
  }
  return DEFAULT_OLLAMA_BASE_URL;
}

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaHealth(baseUrl = getOllamaBaseUrl()): Promise<{ online: boolean; version?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { online: true, version: data.version || 'unknown' };
    }
    return { online: false, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { online: false, error: err.message || 'Connection refused' };
  }
}

/**
 * List all installed models in the local Ollama instance
 */
export async function listOllamaModels(baseUrl = getOllamaBaseUrl()): Promise<OllamaModelInfo[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data.models) ? data.models : [];
  } catch (err) {
    console.warn('[OllamaClient] Failed to list models:', err);
    return [];
  }
}

/**
 * Determine the best available model for general coding or chat
 */
export function selectBestOllamaModel(models: OllamaModelInfo[], preferred?: string): string {
  if (models.length === 0) return 'qwen2.5:1.5b';

  // If user specified preferred and it exists
  if (preferred) {
    const matched = models.find(m => m.name === preferred || m.model === preferred);
    if (matched) return matched.name;
  }

  // Priority order for fast coding & general IDE tasks
  const priorityOrder = [
    'qwen2.5:1.5b',
    'llama3.2:3b',
    'qwen2.5-coder',
    'llama3.2',
    'qwen2.5',
    'codellama',
    'mistral',
    'phi3',
  ];

  for (const prio of priorityOrder) {
    const found = models.find(m => m.name.toLowerCase().startsWith(prio.toLowerCase()));
    if (found) return found.name;
  }

  return models[0].name;
}

/**
 * Stream text generation tokens from Ollama
 */
export async function* streamOllamaGenerate(options: {
  prompt: string;
  model?: string;
  system?: string;
  temperature?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  const baseUrl = (options.baseUrl || getOllamaBaseUrl()).replace(/\/+$/, '');
  const model = options.model || 'llama3.2:3b';

  const body: any = {
    model,
    prompt: options.prompt,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.3,
    },
  };

  if (options.system) {
    body.system = options.system;
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errorText}`);
  }

  if (!res.body) {
    throw new Error('Ollama response body is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.response) {
            yield parsed.response;
          }
          if (parsed.done) {
            return;
          }
        } catch (e) {
          // Line may be a partial JSON chunk
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.response) yield parsed.response;
      } catch {}
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream chat message tokens from Ollama's /api/chat
 */
export async function* streamOllamaChat(options: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  temperature?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  const baseUrl = (options.baseUrl || getOllamaBaseUrl()).replace(/\/+$/, '');
  const model = options.model || 'llama3.2:3b';

  const body: any = {
    model,
    messages: options.messages,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.3,
    },
  };

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama Chat error (${res.status}): ${errorText}`);
  }

  if (!res.body) {
    throw new Error('Ollama response body is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
          if (parsed.done) {
            return;
          }
        } catch (e) {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Single-shot text generation with Ollama
 */
export async function generateOllamaText(options: {
  prompt: string;
  model?: string;
  system?: string;
  temperature?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const baseUrl = (options.baseUrl || getOllamaBaseUrl()).replace(/\/+$/, '');
  const model = options.model || 'llama3.2:3b';

  const body: any = {
    model,
    prompt: options.prompt,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.2,
    },
  };

  if (options.system) {
    body.system = options.system;
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.response || '';
}
