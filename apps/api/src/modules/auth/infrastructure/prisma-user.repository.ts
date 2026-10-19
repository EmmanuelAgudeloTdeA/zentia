import type { Prisma, User } from '@prisma/client';
import type { Role } from '@zentia/shared';
import type { NewUser, PasswordUpdate, UserRepository } from '../application/index.js';
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
    return toAuthUser(await this.db.user.create({ data: user }));
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
}
