import type { AuthSession, ChangePasswordRequest, LoginRequest } from '@zentia/shared';
import { request } from '../../../core/http-client';

export const authService = {
  login: (body: LoginRequest) =>
    request<AuthSession>('POST', '/auth/login', { body, skipAuth: true }),
  refresh: () => request<AuthSession>('POST', '/auth/refresh', { skipAuth: true }),
  logout: () => request<undefined>('POST', '/auth/logout', { skipAuth: true }),
  changePassword: (body: ChangePasswordRequest) =>
    request<AuthSession>('POST', '/auth/change-password', { body }),
};
