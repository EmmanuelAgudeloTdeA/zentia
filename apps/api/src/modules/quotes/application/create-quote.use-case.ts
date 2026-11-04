import type { CreateQuoteInput, QuoteDto } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { toQuoteDto } from './quote-dto.js';
import { assertNoDuplicateProducts, discountDecision, priceLines } from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

export class CreateQuoteUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(actor: Actor, input: CreateQuoteInput): Promise<QuoteDto> {
    const customer = await this.deps.customers.getActiveById(input.customerId);
    const productIds = input.items.map((item) => item.productId);
    assertNoDuplicateProducts(productIds);
    const products = await this.deps.catalog.getActiveByIds(productIds);
    const override = await discountDecision(this.deps, actor, '0', input.discountPct, 'DRAFT');
    const { shippingTaxable } = await this.deps.settings.getCommercialParameters();

    const { items, amounts } = priceLines(
      input.items.map((item, index) => {
        const product = products[index];
        if (!product) throw new AppError('PRODUCT_NOT_FOUND', 400, { productId: item.productId });
        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          unitPrice: product.price.toFixed(0),
          vatRate: product.vatRate,
          quantity: item.quantity,
        };
      }),
      input.discountPct,
      input.shippingAmount,
      shippingTaxable,
    );

    const id = await this.deps.unitOfWork.run(async (tx) => {
      const quoteId = await tx.quotes.create({
        number: await tx.sequence.next(),
        customerId: customer.id,
        ownerId: actor.id,
        createdById: actor.id,
        shippingTaxable,
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
    const quote = await this.deps.quotes.findById(id);
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
    return await toQuoteDto(this.deps, quote, actor);
  }
}
