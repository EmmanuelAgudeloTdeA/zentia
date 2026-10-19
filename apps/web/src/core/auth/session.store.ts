import { create } from 'zustand';

// M1 reemplaza RoleCode por el enum Role de @zentia/shared.
export type RoleCode = string;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
}

export type SessionStatus = 'anonymous' | 'loading' | 'authenticated';

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  status: SessionStatus;
  setSession: (user: SessionUser, accessToken: string) => void;
  setLoading: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'anonymous',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setLoading: () => set({ status: 'loading' }),
  clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),
}));
