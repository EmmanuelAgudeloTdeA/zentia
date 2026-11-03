import type {
  CreateUserRequest,
  CreateUserResult,
  Role,
  TemporaryPasswordResult,
  UpdateUserRequest,
  UserDto,
  UserListDto,
  UserOptionDto,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export interface UsersListParams {
  q?: string | undefined;
  role?: Role | undefined;
  isActive?: boolean | undefined;
  page: number;
  pageSize: number;
}

export const usersService = {
  list: (query: UsersListParams, signal?: AbortSignal) =>
    request<UserListDto>('GET', '/users', {
      query: { ...query },
      ...(signal ? { signal } : {}),
    }),
  options: () => request<UserOptionDto[]>('GET', '/users/options'),
  get: (id: string) => request<UserDto>('GET', `/users/${id}`),
  create: (body: CreateUserRequest) => request<CreateUserResult>('POST', '/users', { body }),
  update: (id: string, body: UpdateUserRequest) =>
    request<UserDto>('PATCH', `/users/${id}`, { body }),
  resetPassword: (id: string) =>
    request<TemporaryPasswordResult>('POST', `/users/${id}/reset-password`),
};
