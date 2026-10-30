import 'dotenv/config';
import { pino } from 'pino';
import { z } from 'zod';
import { disconnectPrisma, getPrisma } from './core/prisma/index.js';
import { BcryptPasswordHasher, PrismaUserRepository } from './modules/auth/infrastructure/index.js';
import { SeedFirstAdminUseCase } from './modules/auth/index.js';
import { PrismaCompanySettingsRepository } from './modules/company-settings/infrastructure/index.js';
import { SeedCompanySettingsUseCase } from './modules/company-settings/index.js';

const seedEnvSchema = z.object({
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

async function main(): Promise<void> {
  const logger = pino();
  const env = seedEnvSchema.parse(process.env);
  const result = await new SeedFirstAdminUseCase({
    users: new PrismaUserRepository(getPrisma()),
    hasher: new BcryptPasswordHasher(env.BCRYPT_COST),
  }).execute({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  const companySettings = await new SeedCompanySettingsUseCase({
    settings: new PrismaCompanySettingsRepository(getPrisma()),
  }).execute();
  logger.info({ firstAdmin: result, companySettings }, 'Seed completed');
}

main()
  .catch((error: unknown) => {
    pino().fatal({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
