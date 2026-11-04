import type { DashboardInfrastructure } from '../modules/dashboard/index.js';

/** Fake que devuelve valores fijos y registra los argumentos; las consultas SQL se prueban en integración. */
export function createFakeDashboard() {
  const calls: { ownerId: string | null; args: unknown[] }[] = [];
  const infrastructure: DashboardInfrastructure = {
    dashboard: {
      async currentCounts(ownerId, today, followUpDays) {
        calls.push({ ownerId, args: [today, followUpDays] });
        return { active: 4, pendingFollowUp: 1 };
      },
      async periodStats(ownerId, from, to) {
        calls.push({ ownerId, args: [from, to] });
        return {
          approved: 3,
          rejected: 4,
          expired: 1,
          quotedAmount: '12000000',
          approvedAmount: '5375000',
        };
      },
    },
  };
  return { infrastructure, calls };
}
