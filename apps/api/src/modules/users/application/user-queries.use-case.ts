import type { UserDto, UserListDto, UserListFilter, UserOptionDto } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { toUserDto } from '../../auth/index.js';
import type { UsersDependencies } from './users-dependencies.js';

type UserReadDependencies = Pick<UsersDependencies, 'users'>;

export class ListUsersUseCase {
  constructor(private readonly deps: UserReadDependencies) {}

  async execute({ q, role, isActive, page, pageSize }: UserListFilter): Promise<UserListDto> {
    const result = await this.deps.users.list(
      { q: q || undefined, role, isActive },
      { skip: (page - 1) * pageSize, take: pageSize },
    );
    return { items: result.items.map(toUserDto), total: result.total, page, pageSize };
  }
}

export class ListUserOptionsUseCase {
  constructor(private readonly deps: UserReadDependencies) {}

  /** Solo activos por defecto (reasignar); con inactivos para filtrar por dueño (M4). */
  execute(includeInactive = false): Promise<UserOptionDto[]> {
    return this.deps.users.listOptions({ includeInactive });
  }
}

export class GetUserUseCase {
  constructor(private readonly deps: UserReadDependencies) {}

  async execute(id: string): Promise<UserDto> {
    const user = await this.deps.users.findById(id);
    if (!user) throw new AppError('USER_NOT_FOUND', 404);
    return toUserDto(user);
  }
}
