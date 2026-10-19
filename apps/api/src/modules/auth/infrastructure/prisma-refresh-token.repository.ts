import type { Prisma, RefreshToken } from '@prisma/client';
import type { NewRefreshToken, RefreshTokenRepository } from '../application/index.js';
import type { RefreshTokenRecord } from '../domain/index.js';

function toRecord(token: RefreshToken): RefreshTokenRecord {
  return {
    id: token.id,
    userId: token.userId,
    familyId: token.familyId,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    rotatedAt: token.rotatedAt,
  };
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async create(token: NewRefreshToken): Promise<RefreshTokenRecord> {
    return toRecord(await this.db.refreshToken.create({ data: token }));
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.db.refreshToken.findUnique({ where: { tokenHash } });
    return token ? toRecord(token) : null;
  }

  async markRotated(id: string, replacedById: string, at: Date): Promise<boolean> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, rotatedAt: at, replacedById },
    });
    return count === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async deleteStale(userId: string, before: Date): Promise<void> {
    await this.db.refreshToken.deleteMany({
      where: { userId, OR: [{ expiresAt: { lt: before } }, { revokedAt: { lt: before } }] },
    });
  }
}
