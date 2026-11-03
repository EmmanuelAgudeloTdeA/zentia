import type { QuotesDependencies } from './quotes-dependencies.js';

/** Job diario (lo programa M6): `SENT` con `expiresAt < hoy` → `EXPIRED`, con actor sistema. Idempotente. */
export class ExpireQuotesUseCase {
  constructor(private readonly deps: Pick<QuotesDependencies, 'unitOfWork' | 'clock'>) {}

  execute(): Promise<number> {
    return this.deps.unitOfWork.run(async (tx) => {
      const ids = await tx.quotes.expireDue(this.deps.clock.today());
      await tx.quotes.addEvents(
        ids.map((quoteId) => ({
          quoteId,
          type: 'STATE_CHANGED' as const,
          actorId: null,
          data: { from: 'SENT', to: 'EXPIRED' },
        })),
      );
      return ids.length;
    });
  }
}
