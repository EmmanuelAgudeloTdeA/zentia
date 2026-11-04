import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../env/index.js';
import { NodeCronScheduler, runJob } from './scheduler.js';

describe('scheduler', () => {
  it('logs processed counts and never throws on failures', async () => {
    const logger = pino({ level: 'silent' });
    const info = vi.spyOn(logger, 'info');
    const error = vi.spyOn(logger, 'error');
    await runJob({ name: 'ok', cron: '* * * * *', run: async () => 3 }, logger);
    expect(info).toHaveBeenLastCalledWith(
      expect.objectContaining({ job: 'ok', processed: 3 }),
      'Job finished',
    );
    await runJob(
      { name: 'boom', cron: '* * * * *', run: () => Promise.reject(new Error('x')) },
      logger,
    );
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ job: 'boom' }), 'Job failed');
  });

  it('registers jobs and runs them on demand for the recovery pass', async () => {
    const scheduler = new NodeCronScheduler(pino({ level: 'silent' }));
    const run = vi.fn().mockResolvedValue(1);
    scheduler.register({ name: 'expire-quotes', cron: '5 0 * * *', run });
    await scheduler.runNow('expire-quotes');
    expect(run).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('keeps the scheduler disabled by default', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://zentia:zentia@localhost:5432/zentia',
      JWT_ACCESS_SECRET: 'test-secret-with-at-least-32-characters',
    });
    expect(env.SCHEDULER_ENABLED).toBe(false);
  });
});
