/**
 * OmniRoute Client & Health Management
 * Connects to local or remote OmniRoute instances (default: http://localhost:20128)
 */

export interface OmniRouteStatus {
  online: boolean;
  version?: string;
  url: string;
  modelsCount: number;
  error?: string;
}

export const DEFAULT_OMNIROUTE_URL = 'http://localhost:20128';

/**
 * Check if the local OmniRoute gateway is running.
 */
export async function checkOmniRouteHealth(baseUrl = DEFAULT_OMNIROUTE_URL): Promise<OmniRouteStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const models = data.data || data || [];
      return {
        online: true,
        version: res.headers.get('x-omniroute-version') || '3.8.x',
        url: baseUrl,
        modelsCount: models.length
      };
    }

    return {
      online: false,
      url: baseUrl,
      modelsCount: 0,
      error: `OmniRoute returned HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      online: false,
      url: baseUrl,
      modelsCount: 0,
      error: err.message || 'OmniRoute is not reachable'
    };
  }
}

/**
 * List all models available from the OmniRoute gateway.
 */
export async function listOmniRouteModels(baseUrl = DEFAULT_OMNIROUTE_URL): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/v1/models`);
    if (!res.ok) return [];
    const data = await res.json();
    const modelsList = data.data || data || [];
    return modelsList.map((m: any) => typeof m === 'string' ? m : (m.id || m.name));
  } catch {
    return [];
  }
}
