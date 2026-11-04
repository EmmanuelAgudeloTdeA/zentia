import 'dotenv/config';
import { pino } from 'pino';
import { disconnectPrisma, getPrisma } from './core/prisma/index.js';
import { assertDemoSeedAllowed, seedDemoData } from './demo/demo-seed.js';

async function main(): Promise<void> {
  const logger = pino();
  assertDemoSeedAllowed(process.env);
  const result = await seedDemoData(getPrisma());
  logger.info(result, result.skipped ? 'Demo data already present' : 'Demo seed completed');
}

main()
  .catch((error: unknown) => {
    pino().fatal({ err: error }, 'Demo seed failed');
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
