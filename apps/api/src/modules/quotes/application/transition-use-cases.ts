import type {
  ChangeExpiryRequest,
  ChangeQuoteStatusRequest,
  QuoteDto,
  ReassignQuoteRequest,
  VoidQuoteRequest,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { addDays, canTransition, isPastExpiry, toSnapshot } from '../domain/index.js';
import type { QuotesTransaction } from './ports/index.js';
import { toQuoteDto } from './quote-dto.js';
import { invalidTransition, loadForMutation } from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

abstract class QuoteMutation {
  constructor(protected readonly deps: QuotesDependencies) {}

  protected async mutate(
    actor: Actor,
    id: string,
    updatedAt: string,
    work: (
      tx: QuotesTransaction,
      quote: Awaited<ReturnType<typeof loadForMutation>>,
    ) => Promise<void>,
  ): Promise<QuoteDto> {
    await this.deps.unitOfWork.run(async (tx) =>
      work(tx, await loadForMutation(tx, id, actor, updatedAt)),
    );
    const quote = await this.deps.quotes.findById(id);
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
    return await toQuoteDto(this.deps, quote, actor);
  }
}

/** Borrador → Enviada: versión 1 + `STATE_CHANGED`; lo usan el botón manual y los accesos de M5. */
export class SendQuoteUseCase extends QuoteMutation {
  execute(actor: Actor, id: string, { updatedAt }: { updatedAt: string }): Promise<QuoteDto> {
    return this.mutate(actor, id, updatedAt, async (tx, quote) => {
      if (quote.status !== 'DRAFT') throw invalidTransition(quote.status, 'SENT');
      if (!quote.customer.isActive) throw new AppError('CUSTOMER_INACTIVE', 400);
      const { validityDays } = await this.deps.settings.getCommercialParameters();
      const now = this.deps.clock.now();
      const expiresAt = addDays(this.deps.clock.today(), validityDays);
      await tx.quotes.update(id, {
        status: 'SENT',
        sentAt: now,
        firstSentAt: quote.firstSentAt ?? now,
        expiresAt,
        currentVersion: 1,
      });
      const versionId = await tx.quotes.addVersion({
        quoteId: id,
        number: 1,
        snapshot: toSnapshot({ ...quote, expiresAt }),
        changes: null,
        customerRequest: null,
        authorId: actor.id,
      });
      await tx.quotes.addEvents([
        {
          quoteId: id,
          type: 'STATE_CHANGED',
          actorId: actor.id,
          versionId,
          data: { from: 'DRAFT', to: 'SENT' },
        },
      ]);
    });
  }
}

export class ChangeQuoteStatusUseCase extends QuoteMutation {
  execute(
    actor: Actor,
    id: string,
    { to, updatedAt }: ChangeQuoteStatusRequest,
  ): Promise<QuoteDto> {
    return this.mutate(actor, id, updatedAt, async (tx, quote) => {
      if (!canTransition(quote.status, to)) throw invalidTransition(quote.status, to);
      // Entre la medianoche y el job de vencimiento sigue en SENT, pero ya no se puede cerrar.
      if (isPastExpiry(quote.expiresAt, this.deps.clock.today())) {
        throw new AppError('QUOTE_EXPIRED', 409);
      }
      await tx.quotes.update(id, {
        status: to,
        ...(to === 'APPROVED' ? { approvedAt: this.deps.clock.now() } : {}),
      });
      await tx.quotes.addEvents([
        { quoteId: id, type: 'STATE_CHANGED', actorId: actor.id, data: { from: quote.status, to } },
      ]);
    });
  }
}

export class VoidQuoteUseCase extends QuoteMutation {
  execute(actor: Actor, id: string, { reason, updatedAt }: VoidQuoteRequest): Promise<QuoteDto> {
    return this.mutate(actor, id, updatedAt, async (tx, quote) => {
      if (!canTransition(quote.status, 'VOIDED')) throw invalidTransition(quote.status, 'VOIDED');
      await tx.quotes.update(id, { status: 'VOIDED' });
      await tx.quotes.addEvents([
        {
          quoteId: id,
          type: 'STATE_CHANGED',
          actorId: actor.id,
          note: reason,
          data: { from: quote.status, to: 'VOIDED' },
        },
      ]);
    });
  }
}

export class ChangeExpiryUseCase extends QuoteMutation {
  execute(
    actor: Actor,
    id: string,
    { expiresAt, updatedAt }: ChangeExpiryRequest,
  ): Promise<QuoteDto> {
    return this.mutate(actor, id, updatedAt, async (tx, quote) => {
      if (quote.status !== 'SENT') throw new AppError('QUOTE_NOT_EDITABLE', 409);
      if (expiresAt <= this.deps.clock.today()) throw new AppError('INVALID_EXPIRY_DATE', 400);
      await tx.quotes.update(id, { expiresAt });
      await tx.quotes.addEvents([
        {
          quoteId: id,
          type: 'EXPIRY_CHANGED',
          actorId: actor.id,
          data: { from: quote.expiresAt, to: expiresAt },
        },
      ]);
    });
  }
}

export class ReassignQuoteUseCase extends QuoteMutation {
  execute(
    actor: Actor,
    id: string,
    { ownerId, updatedAt }: ReassignQuoteRequest,
  ): Promise<QuoteDto> {
    return this.mutate(actor, id, updatedAt, async (tx, quote) => {
      if (quote.status === 'VOIDED') throw invalidTransition('VOIDED', 'VOIDED');
      if (ownerId === quote.owner.id) throw new AppError('REASSIGN_SAME_OWNER', 400);
      const target = await this.deps.users.findActive(ownerId);
      if (!target) throw new AppError('REASSIGN_TARGET_INVALID', 400);
      await tx.quotes.update(id, { ownerId: target.id });
      await tx.quotes.addEvents([
        {
          quoteId: id,
          type: 'REASSIGNED',
          actorId: actor.id,
          data: { from: quote.owner, to: target },
        },
      ]);
      for (const listener of this.deps.reassignedListeners) {
        await listener({ quoteId: id, from: quote.owner, to: target }, tx);
      }
    });
  }
}
