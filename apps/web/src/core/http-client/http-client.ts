import { ApiError, toApiError } from './api-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Omite el token y los hooks de sesión (rutas de /auth que gestionan la sesión). */
  skipAuth?: boolean;
}

export interface HttpClientHooks {
  getAccessToken?: () => string | null;
  /** Se llama ante un 401; si devuelve true, la petición se reintenta una vez. */
  onUnauthorized?: (error: ApiError) => Promise<boolean>;
  /** Se llama con cada error final (por ejemplo, 403 PASSWORD_CHANGE_REQUIRED). */
  onError?: (error: ApiError) => void;
}

const BASE_PATH = '/api';

let hooks: HttpClientHooks = {};

export function configureHttpClient(next: HttpClientHooks): void {
  hooks = next;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.append(key, String(value));
  }
  const search = params.toString();
  return `${BASE_PATH}${path}${search ? `?${search}` : ''}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function send(method: HttpMethod, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.skipAuth ? null : hooks.getAccessToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method, headers, credentials: 'same-origin' };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;

  try {
    return await fetch(buildUrl(path, options.query), init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 0);
  }
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await send(method, path, options);
  let body = await readBody(response);

  if (response.status === 401 && !options.skipAuth && hooks.onUnauthorized) {
    if (await hooks.onUnauthorized(toApiError(401, body))) {
      response = await send(method, path, options);
      body = await readBody(response);
    }
  }

  if (!response.ok) {
    const error = toApiError(response.status, body);
    if (!options.skipAuth) hooks.onError?.(error);
    throw error;
  }
  return body as T;
}
