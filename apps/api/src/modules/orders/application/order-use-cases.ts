import {
  formatOrderNumber,
  formatQuoteNumber,
  toSearchKey,
  type ChangeOrderStatusRequest,
  type OrderDto,
  type OrderListDto,
  type OrderListFilter,
  type OrderSummaryDto,
} from '@zentia/shared';
import type { Clock } from '../../../core/clock/index.js';
import { AppError } from '../../../core/http/index.js';
import { assertCanAccess, scopeFilter, type Actor } from '../../auth/index.js';
import type { AllowedActionsContributor, QuoteReader } from '../../quotes/index.js';
import { canTransitionOrder, orderActions, type Order } from '../domain/index.js';
import type { OrderRepository, OrderStatusChange } from './ports/index.js';

export interface OrdersInfrastructure {
  orders: OrderRepository;
}

export interface OrdersDependencies extends OrdersInfrastructure {
  quotes: QuoteReader;
  clock: Clock;
}

export function toOrderSummaryDto(order: Order): OrderSummaryDto {
  return {
    id: order.id,
    displayNumber: formatOrderNumber(order.quote.number),
    status: order.status,
    quote: { id: order.quote.id, displayNumber: formatQuoteNumber(order.quote.number) },
    customer: order.customer,
    owner: order.owner,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toOrderDto(order: Order): OrderDto {
  return {
    ...toOrderSummaryDto(order),
    items: order.items,
    discountPct: order.discountPct,
    discountAmount: order.discountAmount,
    subtotal: order.subtotal,
    linesVat: order.linesVat,
    shippingAmount: order.shippingAmount,
    shippingVat: order.shippingVat,
    inProgressAt: order.inProgressAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    createdBy: order.createdBy,
    allowedActions: orderActions(order.status),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function visibleOrder(deps: OrdersDependencies, id: string, actor: Actor): Promise<Order> {
  const order = await deps.orders.findById(id);
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404);
  assertCanAccess(actor, order.owner.id, 'ORDER_NOT_FOUND');
  return order;
}

/** RN-29: solo desde una Aprobada, un pedido por cotización y con copia fija de líneas y totales. */
export class ConvertQuoteToOrderUseCase {
  constructor(private readonly deps: OrdersDependencies) {}

  async execute(actor: Actor, quoteId: string): Promise<OrderDto> {
    const quote = await this.deps.quotes.getForActor(quoteId, actor);
    if (quote.status !== 'APPROVED') throw new AppError('QUOTE_NOT_APPROVED', 409);
    if (await this.deps.orders.findByQuoteId(quote.id))
      throw new AppError('ORDER_ALREADY_EXISTS', 409);
    const id = await this.deps.orders.create({
      quoteId: quote.id,
      createdById: actor.id,
      discountPct: quote.discountPct,
      discountAmount: quote.discountAmount,
      subtotal: quote.subtotal,
      linesVat: quote.linesVat,
      shippingAmount: quote.shippingAmount,
      shippingVat: quote.shippingVat,
      total: quote.total,
      items: quote.items.map((item, index) => ({
        productId: item.productId,
        position: index + 1,
        productName: item.productName,
        category: item.category,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        quantity: item.quantity,
        lineAmount: item.lineAmount,
      })),
    });
    return toOrderDto(await visibleOrder(this.deps, id, actor));
  }
}

export class GetQuoteOrderUseCase {
  constructor(private readonly deps: OrdersDependencies) {}

  async execute(actor: Actor, quoteId: string): Promise<OrderSummaryDto> {
    await this.deps.quotes.getForActor(quoteId, actor);
    const order = await this.deps.orders.findByQuoteId(quoteId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 404);
    return toOrderSummaryDto(order);
  }
}

export class GetOrderUseCase {
  constructor(private readonly deps: OrdersDependencies) {}

  async execute(actor: Actor, id: string): Promise<OrderDto> {
    return toOrderDto(await visibleOrder(this.deps, id, actor));
  }
}

const NUMBER_PATTERN = /^(?:(?:COT|PED)-?)?0*(\d{1,9})$/i;

export class ListOrdersUseCase {
  constructor(private readonly deps: OrdersDependencies) {}

  async execute(actor: Actor, filter: OrderListFilter): Promise<OrderListDto> {
    const { page, pageSize } = filter;
    const q = filter.q?.trim();
    const numberMatch = q ? NUMBER_PATTERN.exec(q) : null;
    const result = await this.deps.orders.list({
      statuses: filter.status,
      ownerId: scopeFilter(actor).ownerId,
      quoteNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      customerKey: q ? toSearchKey(q) || undefined : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: result.items.map(toOrderSummaryDto), total: result.total, page, pageSize };
  }
}

export class ChangeOrderStatusUseCase {
  constructor(private readonly deps: OrdersDependencies) {}

  async execute(
    actor: Actor,
    id: string,
    { to, reason, updatedAt }: ChangeOrderStatusRequest,
  ): Promise<OrderDto> {
    const order = await visibleOrder(this.deps, id, actor);
    if (order.updatedAt.getTime() !== new Date(updatedAt).getTime())
      throw new AppError('ORDER_CONFLICT', 409);
    if (!canTransitionOrder(order.status, to)) {
      throw new AppError('ORDER_INVALID_TRANSITION', 409, { from: order.status, to });
    }
    const now = this.deps.clock.now();
    const change: OrderStatusChange = { status: to };
    if (to === 'IN_PROGRESS') change.inProgressAt = now;
    if (to === 'DELIVERED') change.deliveredAt = now;
    if (to === 'CANCELLED') {
      change.cancelledAt = now;
      change.cancelReason = reason || null;
    }
    if (!(await this.deps.orders.updateStatus(id, order.updatedAt, change))) {
      throw new AppError('ORDER_CONFLICT', 409);
    }
    return toOrderDto(await visibleOrder(this.deps, id, actor));
  }
}

/** Aporta `convertToOrder` o `viewOrder` a las cotizaciones Aprobadas (punto de extensión de M4). */
export function createOrderActionsContributor(
  deps: OrdersInfrastructure,
): AllowedActionsContributor {
  return async (quote, actor) => {
    if (quote.status !== 'APPROVED') return [];
    if (await deps.orders.findByQuoteId(quote.id)) return ['viewOrder'];
    return actor.role !== 'SELLER' || quote.owner.id === actor.id ? ['convertToOrder'] : [];
  };
}
