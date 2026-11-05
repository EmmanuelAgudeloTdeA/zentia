import 'dotenv/config';
import { pino } from 'pino';
import { disconnectPrisma, getPrisma } from './core/prisma/index.js';
import { seedDemoCatalog } from './demo/catalog-seed.js';
import { assertDemoSeedAllowed } from './demo/demo-seed.js';

async function main(): Promise<void> {
  const logger = pino();
  assertDemoSeedAllowed(process.env);
  const result = await seedDemoCatalog(getPrisma());
  logger.info(result, 'Catalog seed completed');
}

main()
  .catch((error: unknown) => {
    pino().fatal({ err: error }, 'Catalog seed failed');
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
