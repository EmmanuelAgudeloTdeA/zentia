import type {
  ReactivateQuoteRequest,
  ReactivateQuoteResult,
  ReactivationPreview,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { addDays, diffSnapshots, toSnapshot } from '../domain/index.js';
import { toQuoteDto } from './quote-dto.js';
import {
  invalidTransition,
  loadForMutation,
  loadVisible,
  priceLines,
  requireCustomerRequest,
  snapshotOf,
} from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

export class GetReactivationPreviewUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(actor: Actor, id: string): Promise<ReactivationPreview> {
    const quote = await loadVisible(this.deps, id, actor);
    if (quote.status !== 'EXPIRED') throw invalidTransition(quote.status, 'SENT');
    const products = new Map(
      (await this.deps.catalog.getByIds(quote.items.map((item) => item.productId))).map(
        (product) => [product.id, product],
      ),
    );
    const { validityDays } = await this.deps.settings.getCommercialParameters();
    return {
      newExpiresAt: addDays(this.deps.clock.today(), validityDays),
      lines: quote.items.map((item) => {
        const product = products.get(item.productId);
        return {
          itemId: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          currentPrice: item.unitPrice,
          catalogPrice: product ? product.price.toFixed(0) : item.unitPrice,
          productActive: product?.isActive ?? false,
        };
      }),
    };
  }
}

/** Vencida → Enviada (RN-27): versión si cambian precios; si no, lo solicitado va en la nota del evento. */
export class ReactivateQuoteUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(
    actor: Actor,
    id: string,
    input: ReactivateQuoteRequest,
  ): Promise<ReactivateQuoteResult> {
    const result = await this.deps.unitOfWork.run(async (tx) => {
      const quote = await loadForMutation(tx, id, actor, input.updatedAt);
      if (quote.status !== 'EXPIRED') throw invalidTransition(quote.status, 'SENT');
      const customerRequest = requireCustomerRequest(input.customerRequest);
      const { validityDays } = await this.deps.settings.getCommercialParameters();
      const expiresAt = addDays(this.deps.clock.today(), validityDays);

      let keptInactiveProductIds: string[] = [];
      let lines = quote.items;
      if (input.updatePrices) {
        const products = new Map(
          (await this.deps.catalog.getByIds(quote.items.map((item) => item.productId))).map(
            (product) => [product.id, product],
          ),
        );
        keptInactiveProductIds = quote.items
          .filter((item) => !products.get(item.productId)?.isActive)
          .map((item) => item.productId);
        lines = quote.items.map((item) => {
          const product = products.get(item.productId);
          return product?.isActive ? { ...item, unitPrice: product.price.toFixed(0) } : item;
        });
      }

      const { items, amounts } = priceLines(
        lines,
        quote.discountPct,
        quote.shippingAmount,
        quote.shippingTaxable,
      );
      const next = snapshotOf(quote, items, amounts, expiresAt);
      const { changed, changes } = diffSnapshots(toSnapshot(quote), next);
      await tx.quotes.update(id, { status: 'SENT', sentAt: this.deps.clock.now(), expiresAt });

      let versionId: string | null = null;
      let versionNumber: number | null = null;
      if (changed) {
        versionNumber = quote.currentVersion + 1;
        await tx.quotes.update(id, { ...amounts, currentVersion: versionNumber });
        await tx.quotes.replaceItems(id, items);
        versionId = await tx.quotes.addVersion({
          quoteId: id,
          number: versionNumber,
          snapshot: next,
          changes,
          customerRequest,
          authorId: actor.id,
        });
      }
      await tx.quotes.addEvents([
        {
          quoteId: id,
          type: 'STATE_CHANGED',
          actorId: actor.id,
          versionId,
          note: changed ? null : customerRequest,
          data: { from: 'EXPIRED', to: 'SENT' },
        },
      ]);
      return { versionNumber, keptInactiveProductIds };
    });

    const quote = await this.deps.quotes.findById(id);
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
    return { quote: toQuoteDto(this.deps, quote, actor), ...result };
  }
}
