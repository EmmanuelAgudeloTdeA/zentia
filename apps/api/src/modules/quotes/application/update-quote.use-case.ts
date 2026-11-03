import type { UpdateQuoteInput, UpdateQuoteResult } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { diffSnapshots, isEditable, toSnapshot } from '../domain/index.js';
import { toQuoteDto } from './quote-dto.js';
import {
  assertNoDuplicateProducts,
  discountDecision,
  loadForMutation,
  priceLines,
  requireCustomerRequest,
  snapshotOf,
  type LineDraft,
} from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

export class UpdateQuoteUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(actor: Actor, id: string, input: UpdateQuoteInput): Promise<UpdateQuoteResult> {
    const result = await this.deps.unitOfWork.run(async (tx) => {
      const quote = await loadForMutation(tx, id, actor, input.updatedAt);
      if (!isEditable(quote.status)) throw new AppError('QUOTE_NOT_EDITABLE', 409);
      const sent = quote.status === 'SENT';

      let customerId = quote.customer.id;
      if (input.customerId !== undefined && input.customerId !== quote.customer.id) {
        if (sent) throw new AppError('QUOTE_CUSTOMER_LOCKED', 400);
        customerId = (await this.deps.customers.getActiveById(input.customerId)).id;
      } else if (!sent && !quote.customer.isActive) {
        // Un Borrador no se guarda con un cliente inactivo (V6 del ui-brief).
        throw new AppError('CUSTOMER_INACTIVE', 400);
      }

      let lines: LineDraft[] = quote.items;
      if (input.items) {
        assertNoDuplicateProducts(input.items.map((item) => item.productId));
        const kept = new Map(quote.items.map((item) => [item.id, item]));
        const isKept = (item: (typeof input.items)[number]) =>
          item.id !== undefined && kept.get(item.id)?.productId === item.productId;
        const fresh = input.items.filter((item) => !isKept(item));
        const products = new Map(
          (await this.deps.catalog.getActiveByIds(fresh.map((item) => item.productId))).map(
            (product) => [product.id, product],
          ),
        );
        lines = input.items.map((item) => {
          const existing = item.id !== undefined ? kept.get(item.id) : undefined;
          if (existing && existing.productId === item.productId) {
            return { ...existing, quantity: item.quantity };
          }
          const product = products.get(item.productId);
          if (!product) throw new AppError('PRODUCT_NOT_FOUND', 400, { productId: item.productId });
          return {
            productId: product.id,
            productName: product.name,
            category: product.category,
            unitPrice: product.price.toFixed(0),
            vatRate: product.vatRate,
            quantity: item.quantity,
          };
        });
      }

      const discountPct = input.discountPct ?? quote.discountPct;
      const override = await discountDecision(
        this.deps,
        actor,
        quote.discountPct,
        discountPct,
        quote.status,
      );
      const { items, amounts } = priceLines(
        lines,
        discountPct,
        input.shippingAmount ?? quote.shippingAmount,
        quote.shippingTaxable,
      );
      const next = snapshotOf(quote, items, amounts, quote.expiresAt);
      const { changed, changes } = diffSnapshots(toSnapshot(quote), next);
      const customerChanged = customerId !== quote.customer.id;

      if (sent && !changed) return { changed: false, versionNumber: null };
      const customerRequest = sent ? requireCustomerRequest(input.customerRequest) : null;

      await tx.quotes.update(id, { ...amounts, customerId });
      await tx.quotes.replaceItems(id, items);
      if (sent) {
        const versionNumber = quote.currentVersion + 1;
        await tx.quotes.addVersion({
          quoteId: id,
          number: versionNumber,
          snapshot: next,
          changes,
          customerRequest,
          authorId: actor.id,
        });
        await tx.quotes.update(id, { currentVersion: versionNumber });
        return { changed: true, versionNumber };
      }
      if (override) {
        await tx.quotes.addEvents([
          { quoteId: id, type: 'DISCOUNT_OVERRIDE', actorId: actor.id, data: { ...override } },
        ]);
      }
      return { changed: changed || customerChanged, versionNumber: null };
    });

    const quote = await this.deps.quotes.findById(id);
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
    return { quote: toQuoteDto(this.deps, quote, actor), ...result };
  }
}
