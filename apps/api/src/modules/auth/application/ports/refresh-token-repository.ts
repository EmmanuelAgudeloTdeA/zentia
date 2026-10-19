import type { RefreshTokenRecord } from '../../domain/index.js';

export interface NewRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(token: NewRefreshToken): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Marca el token como rotado solo si sigue vigente; devuelve false si otro proceso lo rotó antes. */
  markRotated(id: string, replacedById: string, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
  deleteStale(userId: string, before: Date): Promise<void>;
}
