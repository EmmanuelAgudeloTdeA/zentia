import { Decimal } from '@zentia/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '../../../core/clock/index.js';
import { createInMemoryFollowUp } from '../../../test/in-memory-follow-up.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type { QuoteReader } from '../../quotes/index.js';
import type { FollowUpDependencies } from './follow-up-dependencies.js';
import { createFollowUpJobs, RunFollowUpAlertsUseCase } from './follow-up-use-cases.js';

const unused = () => Promise.reject(new Error('not used'));

function settingsWith(expiringAlertDays: number, followUpDays: number): SettingsReader {
  return {
    getCommercialParameters: async () => ({
      defaultVatRate: 'GENERAL_19',
      validityDays: 15,
      discountLimits: { SELLER: new Decimal(10), MANAGER: new Decimal(30), ADMIN: new Decimal(30) },
      shippingTaxable: false,
      expiringAlertDays,
      followUpDays,
      coldStartThreshold: 30,
    }),
    getDocumentProfile: unused,
  };
}

function deps(clock: Clock, settings: SettingsReader) {
  const followUp = createInMemoryFollowUp();
  const customers: CustomerReader = { getById: unused, getActiveById: unused };
  const quotes: QuoteReader = { getForActor: unused, getDtoForActor: unused };
  const dependencies: FollowUpDependencies = {
    ...followUp.infrastructure,
    clock,
    settings,
    customers,
    quotes,
  };
  return { followUp, dependencies };
}

describe('createFollowUpJobs', () => {
  it('returns expire-quotes at 00:05 and follow-up-alerts at 07:00, in that order', () => {
    const { dependencies } = deps(
      { now: () => new Date(), today: () => '2026-11-03' },
      settingsWith(3, 5),
    );
    const jobs = createFollowUpJobs(
      dependencies,
      { execute: async () => 0 },
      new RunFollowUpAlertsUseCase(dependencies),
    );
    expect(jobs.map(({ name, cron }) => ({ name, cron }))).toEqual([
      { name: 'expire-quotes', cron: '5 0 * * *' },
      { name: 'follow-up-alerts', cron: '0 7 * * *' },
    ]);
  });

  it('yields 0 without running when another instance holds the lock', async () => {
    const expire = vi.fn().mockResolvedValue(4);
    const alerts = { execute: vi.fn().mockResolvedValue(2) };
    const jobs = createFollowUpJobs(
      { jobLock: { withLock: async () => null } },
      { execute: expire },
      alerts,
    );
    for (const job of jobs) expect(await job.run()).toBe(0);
    expect(expire).not.toHaveBeenCalled();
    expect(alerts.execute).not.toHaveBeenCalled();
  });

  it('returns the processed count when the lock is acquired', async () => {
    const jobs = createFollowUpJobs(
      { jobLock: { withLock: (_name, fn) => fn() } },
      { execute: async () => 4 },
      { execute: async () => 2 },
    );
    expect(await jobs[0]?.run()).toBe(4);
    expect(await jobs[1]?.run()).toBe(2);
  });
});

describe('RunFollowUpAlertsUseCase', () => {
  const candidate = {
    quoteId: 'q1',
    ownerId: 'manager-1',
    number: 7,
    customerName: 'Acme',
    expiresAt: '2026-11-20',
    sentDay: '2026-11-01',
    lastInteractionDay: null,
  };

  it('uses clock.today() and the X/Y days from the settings', async () => {
    const today = vi.fn(() => '2026-11-03');
    const { followUp, dependencies } = deps({ now: () => new Date(), today }, settingsWith(1, 2));
    followUp.candidates.push(candidate);
    expect(await new RunFollowUpAlertsUseCase(dependencies).execute()).toBe(1);
    expect(today).toHaveBeenCalled();
    expect(followUp.notifications).toMatchObject([
      { userId: 'manager-1', type: 'QUOTE_NO_FOLLOW_UP', referenceDate: '2026-11-01' },
    ]);
  });

  it('creates nothing when Y has not elapsed and is idempotent on reruns', async () => {
    const clock = { now: () => new Date(), today: () => '2026-11-03' };
    const strict = deps(clock, settingsWith(1, 5));
    strict.followUp.candidates.push(candidate);
    expect(await new RunFollowUpAlertsUseCase(strict.dependencies).execute()).toBe(0);

    const loose = deps(clock, settingsWith(1, 2));
    loose.followUp.candidates.push(candidate);
    const useCase = new RunFollowUpAlertsUseCase(loose.dependencies);
    expect(await useCase.execute()).toBe(1);
    expect(await useCase.execute()).toBe(0);
  });

  it('alerts the new owner after a reassignment even if the previous one read the alert', async () => {
    const clock = { now: () => new Date(), today: () => '2026-11-03' };
    const { followUp, dependencies } = deps(clock, settingsWith(1, 2));
    followUp.candidates.push(candidate);
    const useCase = new RunFollowUpAlertsUseCase(dependencies);
    expect(await useCase.execute()).toBe(1);
    const [first] = followUp.notifications;
    if (!first) throw new Error('missing notification');
    await followUp.infrastructure.notifications.markRead(first.id, 'manager-1', new Date());
    await followUp.infrastructure.notifications.transferUnread(null, 'q1', 'seller-2');
    followUp.candidates[0] = { ...candidate, ownerId: 'seller-2' };

    expect(await useCase.execute()).toBe(1);
    expect(await useCase.execute()).toBe(0);
    expect(followUp.notifications.map((n) => [n.userId, n.readAt !== null])).toEqual([
      ['manager-1', true],
      ['seller-2', false],
    ]);
  });
});
