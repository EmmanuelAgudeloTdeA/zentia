import type { AuthSession, Role, UserDto } from '@zentia/shared';
import { useSessionStore } from '../core/auth';

export function userFixture(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11',
    email: 'ana@empresa.co',
    name: 'Ana Gómez',
    role: 'SELLER',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

export function sessionFixture(overrides: Partial<UserDto> = {}): AuthSession {
  return { accessToken: 'access-token', user: userFixture(overrides) };
}

export function signIn(role: Role = 'SELLER', overrides: Partial<UserDto> = {}): void {
  useSessionStore.getState().setSession(sessionFixture({ role, ...overrides }));
}
