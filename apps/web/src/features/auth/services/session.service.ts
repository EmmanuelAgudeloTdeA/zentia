import type { ChangePasswordRequest, LoginRequest, UserDto } from '@zentia/shared';
import { useSessionStore } from '../../../core/auth';
import { configureHttpClient, isApiError, type ApiErrorCode } from '../../../core/http-client';
import { authService } from './auth.service';

const REFRESH_LOCK = 'zentia-auth-refresh';
const RETRY_DELAY_MS: Partial<Record<ApiErrorCode, number>> = {
  REFRESH_IN_PROGRESS: 1_000,
  RATE_LIMITED: 3_000,
};
const FORBIDDEN_REFRESH_COOLDOWN_MS = 60_000;

let inflight: Promise<boolean> | null = null;
let lastForbiddenRefreshAt = Number.NEGATIVE_INFINITY;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Serializa el refresh entre pestañas: la cookie rota en cada uso.
function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request(REFRESH_LOCK, work) : work();
}

async function refreshOnce(): Promise<boolean> {
  try {
    useSessionStore.getState().setSession(await authService.refresh());
    return true;
  } catch (error) {
    const delay = isApiError(error) ? RETRY_DELAY_MS[error.code] : undefined;
    if (delay === undefined) return false;
    await wait(delay);
    try {
      useSessionStore.getState().setSession(await authService.refresh());
      return true;
    } catch {
      return false;
    }
  }
}

/** Renueva el access token una sola vez aunque varias peticiones lo pidan a la vez. */
export function refreshSession(): Promise<boolean> {
  inflight ??= withRefreshLock(refreshOnce).finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function bootstrapSession(): Promise<void> {
  const store = useSessionStore.getState();
  store.setLoading();
  if (!(await refreshSession())) useSessionStore.getState().clearSession();
}

export async function login(credentials: LoginRequest): Promise<UserDto> {
  const session = await authService.login(credentials);
  useSessionStore.getState().setSession(session);
  return session.user;
}

export async function logout(): Promise<void> {
  try {
    await authService.logout();
  } finally {
    useSessionStore.getState().clearSession();
  }
}

export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  useSessionStore.getState().setSession(await authService.changePassword(input));
}

export function configureSessionHttpClient(): void {
  configureHttpClient({
    getAccessToken: () => useSessionStore.getState().accessToken,
    onUnauthorized: async (error) => {
      if (error.code === 'TOKEN_EXPIRED' && (await refreshSession())) return true;
      useSessionStore.getState().clearSession('sessionExpired');
      return false;
    },
    onError: (error) => {
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
        useSessionStore.getState().markPasswordChangeRequired();
      }
      // Un 403 puede venir de un rol cambiado: se recarga el usuario, con enfriamiento para no entrar en bucle.
      if (
        error.code === 'FORBIDDEN' &&
        Date.now() - lastForbiddenRefreshAt > FORBIDDEN_REFRESH_COOLDOWN_MS
      ) {
        lastForbiddenRefreshAt = Date.now();
        void refreshSession();
      }
    },
  });
}
