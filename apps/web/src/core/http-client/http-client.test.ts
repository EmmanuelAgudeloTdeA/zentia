import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureHttpClient, errorKey, request } from '.';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('http-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configureHttpClient({});
  });

  it('prefixes /api, serializes the query and returns the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await request<{ status: string }>('GET', '/health', {
      query: { page: 2, q: undefined },
    });

    expect(data).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('/api/health?page=2', expect.any(Object));
  });

  it('returns undefined on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request('POST', '/auth/logout')).resolves.toBeUndefined();
  });

  it('converts an error response into a typed ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: { code: 'VALIDATION_ERROR', issues: [{ path: 'email', code: 'invalid_format' }] },
        }),
      ),
    );

    const error = await request('POST', '/x', { body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      issues: [{ path: 'email', code: 'invalid_format' }],
    });
  });

  it('maps an unexpected error body to UNKNOWN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'UNKNOWN', status: 502 });
  });

  it('converts a network failure into NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('sends the access token and retries once when onUnauthorized resolves true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const onUnauthorized = vi.fn().mockResolvedValue(true);
    configureHttpClient({ getAccessToken: () => 'token', onUnauthorized });

    await expect(request('GET', '/me')).resolves.toEqual({ ok: true });

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token' });
  });

  it('builds the translation key for any error', () => {
    expect(errorKey(new ApiError('RATE_LIMITED', 429))).toBe('errors.RATE_LIMITED');
    expect(errorKey(new Error('boom'))).toBe('errors.UNKNOWN');
  });
});
