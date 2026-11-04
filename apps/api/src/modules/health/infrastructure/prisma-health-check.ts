import type { PrismaClient } from '@prisma/client';
import type { HealthCheck } from '../application/index.js';

export const HEALTH_DB_TIMEOUT_MS = 1000;

/** `SELECT 1` con tiempo límite; cualquier error o demora cuenta como caída. */
export class PrismaHealthCheck implements HealthCheck {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly timeoutMs = HEALTH_DB_TIMEOUT_MS,
  ) {}

  async isHealthy(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), this.timeoutMs);
    });
    try {
      return await Promise.race([this.prisma.$queryRaw`SELECT 1`.then(() => true), timeout]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
