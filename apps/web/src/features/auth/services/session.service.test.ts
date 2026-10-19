import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../../core/auth';
import { ApiError, configureHttpClient, request } from '../../../core/http-client';
import { sessionFixture, signIn } from '../../../test/session-fixture';
import { authService } from './auth.service';
import { bootstrapSession, configureSessionHttpClient, refreshSession } from './session.service';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

describe('session service', () => {
  beforeEach(() => {
    configureSessionHttpClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    configureHttpClient({});
  });

  it('refreshes only once for concurrent callers', async () => {
    const refresh = vi.spyOn(authService, 'refresh').mockResolvedValue(sessionFixture());

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(results).toEqual([true, true, true]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('retries once after REFRESH_IN_PROGRESS', async () => {
    vi.useFakeTimers();
    const refresh = vi
      .spyOn(authService, 'refresh')
      .mockRejectedValueOnce(new ApiError('REFRESH_IN_PROGRESS', 409))
      .mockResolvedValueOnce(sessionFixture());

    const pending = refreshSession();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('bootstraps to anonymous when there is no valid cookie', async () => {
    vi.spyOn(authService, 'refresh').mockRejectedValue(new ApiError('INVALID_REFRESH_TOKEN', 401));

    await bootstrapSession();

    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', notice: null });
  });

  it('renews an expired access token and retries the request', async () => {
    signIn('SELLER');
    vi.spyOn(authService, 'refresh').mockResolvedValue({
      ...sessionFixture(),
      accessToken: 'fresh-token',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('GET', '/anything')).resolves.toEqual({ ok: true });

    const retried = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(retried.headers).toMatchObject({ Authorization: 'Bearer fresh-token' });
  });

  it('ends the session with a notice when the refresh fails', async () => {
    signIn('SELLER');
    vi.spyOn(authService, 'refresh').mockRejectedValue(new ApiError('REFRESH_TOKEN_REUSED', 401));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED' } })),
    );

    await expect(request('GET', '/anything')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(useSessionStore.getState()).toMatchObject({
      status: 'anonymous',
      notice: 'sessionExpired',
    });
  });

  it('flags the session when the API requires a password change', async () => {
    signIn('SELLER');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, { error: { code: 'PASSWORD_CHANGE_REQUIRED' } })),
    );

    await expect(request('GET', '/anything')).rejects.toBeInstanceOf(ApiError);
    expect(useSessionStore.getState().user?.mustChangePassword).toBe(true);
  });
});
