import type { AuthSession, Role, UserDto } from '@zentia/shared';
import { create } from 'zustand';

export type SessionUser = UserDto;

export type SessionStatus = 'anonymous' | 'loading' | 'authenticated';

export type SessionNotice = 'sessionExpired';

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  status: SessionStatus;
  notice: SessionNotice | null;
  setSession: (session: AuthSession) => void;
  setLoading: () => void;
  markPasswordChangeRequired: () => void;
  clearSession: (notice?: SessionNotice) => void;
  clearNotice: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'anonymous',
  notice: null,
  setSession: ({ user, accessToken }) =>
    set({ user, accessToken, status: 'authenticated', notice: null }),
  setLoading: () => set({ status: 'loading' }),
  markPasswordChangeRequired: () =>
    set((state) => (state.user ? { user: { ...state.user, mustChangePassword: true } } : {})),
  clearSession: (notice) =>
    set({ user: null, accessToken: null, status: 'anonymous', notice: notice ?? null }),
  clearNotice: () => set({ notice: null }),
}));

export type RoleCode = Role;
