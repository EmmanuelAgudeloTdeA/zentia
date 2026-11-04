import cron from 'node-cron';
import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../env/index.js';
import { NodeCronScheduler, runJob, startScheduler, type Scheduler } from './scheduler.js';

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

  it('schedules with the Bogota timezone and without overlapping runs', () => {
    const schedule = vi.spyOn(cron, 'schedule');
    const scheduler = new NodeCronScheduler(pino({ level: 'silent' }));
    scheduler.register({ name: 'follow-up-alerts', cron: '0 7 * * *', run: async () => 0 });
    expect(schedule).toHaveBeenCalledWith('0 7 * * *', expect.any(Function), {
      name: 'follow-up-alerts',
      timezone: 'America/Bogota',
      noOverlap: true,
    });
    scheduler.stop();
    schedule.mockRestore();
  });
});

describe('startScheduler', () => {
  const jobs = [
    { name: 'expire-quotes', cron: '5 0 * * *', run: async () => 0 },
    { name: 'follow-up-alerts', cron: '0 7 * * *', run: async () => 0 },
  ];

  function fakeScheduler() {
    const calls: string[] = [];
    const scheduler: Scheduler = {
      register: (job) => void calls.push(`register:${job.name}`),
      runNow: async (name) => void calls.push(`run:${name}`),
      stop: () => undefined,
    };
    return { scheduler, calls };
  }

  it('registers nothing when disabled', async () => {
    const create = vi.fn(() => fakeScheduler().scheduler);
    const startup = startScheduler({ enabled: false, create, jobs });
    await startup.recovery;
    expect(startup.scheduler).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('registers the jobs and runs the recovery pass expire first, then alerts', async () => {
    const fake = fakeScheduler();
    const startup = startScheduler({ enabled: true, create: () => fake.scheduler, jobs });
    await startup.recovery;
    expect(startup.scheduler).toBe(fake.scheduler);
    expect(fake.calls).toEqual([
      'register:expire-quotes',
      'register:follow-up-alerts',
      'run:expire-quotes',
      'run:follow-up-alerts',
    ]);
  });
});
