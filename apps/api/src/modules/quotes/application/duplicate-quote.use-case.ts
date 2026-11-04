import type { DuplicateQuoteResult } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { checkDiscount, discountForDuplicate } from '../domain/index.js';
import { toQuoteDto } from './quote-dto.js';
import { loadVisible, priceLines } from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

/** RN-28: nuevo Borrador con precios vigentes, dueño = actor y sin los productos inactivos. */
export class DuplicateQuoteUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(actor: Actor, id: string): Promise<DuplicateQuoteResult> {
    const source = await loadVisible(this.deps, id, actor);
    if (source.status !== 'APPROVED' && source.status !== 'REJECTED') {
      throw new AppError('QUOTE_NOT_DUPLICABLE', 409);
    }
    const customer = await this.deps.customers.getActiveById(source.customer.id);
    const products = new Map(
      (await this.deps.catalog.getByIds(source.items.map((item) => item.productId))).map(
        (product) => [product.id, product],
      ),
    );
    const kept = source.items.filter((item) => products.get(item.productId)?.isActive);
    const omittedProductIds = source.items
      .filter((item) => !products.get(item.productId)?.isActive)
      .map((item) => item.productId);
    if (kept.length === 0) throw new AppError('QUOTE_EMPTY', 400);

    const params = await this.deps.settings.getCommercialParameters();
    const discount = discountForDuplicate(source.discountPct, actor.role, params.discountLimits);
    const check = checkDiscount({
      actorRole: actor.role,
      limits: params.discountLimits,
      from: '0',
      to: discount.discountPct,
      status: 'DRAFT',
    });
    const override = check.ok ? check.override : null;
    const { items, amounts } = priceLines(
      kept.map((item) => {
        const product = products.get(item.productId);
        return { ...item, unitPrice: product ? product.price.toFixed(0) : item.unitPrice };
      }),
      discount.discountPct,
      source.shippingAmount,
      params.shippingTaxable,
    );

    const newId = await this.deps.unitOfWork.run(async (tx) => {
      const quoteId = await tx.quotes.create({
        number: await tx.sequence.next(),
        customerId: customer.id,
        ownerId: actor.id,
        createdById: actor.id,
        shippingTaxable: params.shippingTaxable,
        items,
        ...amounts,
      });
      if (override) {
        await tx.quotes.addEvents([
          { quoteId, type: 'DISCOUNT_OVERRIDE', actorId: actor.id, data: { ...override } },
        ]);
      }
      return quoteId;
    });
    const quote = await this.deps.quotes.findById(newId);
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
    return {
      quote: await toQuoteDto(this.deps, quote, actor),
      omittedProductIds,
      discountReset: discount.reset,
    };
  }
}
