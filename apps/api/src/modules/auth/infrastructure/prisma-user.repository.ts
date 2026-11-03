import { Prisma, type User } from '@prisma/client';
import type { Role } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type {
  NewUser,
  PasswordUpdate,
  UserOption,
  UserPage,
  UserRepository,
  UserSearchFilter,
  UserUpdate,
} from '../application/index.js';
import type { AuthUser } from '../domain/index.js';

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? toAuthUser(user) : null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    return user ? toAuthUser(user) : null;
  }

  async existsWithRole(role: Role): Promise<boolean> {
    return (await this.db.user.count({ where: { role } })) > 0;
  }

  async create(user: NewUser): Promise<AuthUser> {
    try {
      return toAuthUser(await this.db.user.create({ data: user }));
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('EMAIL_TAKEN', 409);
      throw error;
    }
  }

  async updatePassword(id: string, update: PasswordUpdate): Promise<AuthUser> {
    const user = await this.db.user.update({
      where: { id },
      data: {
        passwordHash: update.passwordHash,
        mustChangePassword: update.mustChangePassword,
        passwordChangedAt: update.changedAt,
      },
    });
    return toAuthUser(user);
  }

  async update(id: string, changes: UserUpdate): Promise<AuthUser> {
    const data: Prisma.UserUpdateInput = {};
    if (changes.email !== undefined) data.email = changes.email;
    if (changes.name !== undefined) data.name = changes.name;
    if (changes.role !== undefined) data.role = changes.role;
    if (changes.isActive !== undefined) data.isActive = changes.isActive;
    try {
      return toAuthUser(await this.db.user.update({ where: { id }, data }));
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('EMAIL_TAKEN', 409);
      throw error;
    }
  }

  async list(filter: UserSearchFilter, page: { skip: number; take: number }): Promise<UserPage> {
    const where: Prisma.UserWhereInput = {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { email: { contains: filter.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.db.user.count({ where }),
    ]);
    return { items: items.map(toAuthUser), total };
  }

  async listOptions({ includeInactive }: { includeInactive: boolean }): Promise<UserOption[]> {
    return this.db.user.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: { id: true, name: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async countActiveAdmins(): Promise<number> {
    // FOR UPDATE: dentro de una transacción serializa cambios concurrentes que afectan a los admins.
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "User" WHERE "role" = 'ADMIN' AND "isActive" = true FOR UPDATE`;
    return rows.length;
  }
}
