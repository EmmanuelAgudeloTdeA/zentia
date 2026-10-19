export const REFRESH_GRACE_WINDOW_MS = 10_000;

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
}

export type RefreshTokenAssessment = 'valid' | 'invalid' | 'in-grace' | 'reused';

export function assessRefreshToken(
  record: RefreshTokenRecord | null,
  now: Date,
): RefreshTokenAssessment {
  if (!record) return 'invalid';
  if (record.rotatedAt) {
    const elapsed = now.getTime() - record.rotatedAt.getTime();
    return elapsed <= REFRESH_GRACE_WINDOW_MS ? 'in-grace' : 'reused';
  }
  if (record.revokedAt || record.expiresAt.getTime() <= now.getTime()) return 'invalid';
  return 'valid';
}
