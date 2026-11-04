import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../../core/http/index.js';
import type {
  NewOrder,
  OrderRepository,
  OrderSearch,
  OrdersInfrastructure,
  OrderStatusChange,
} from '../application/index.js';
import type { Order } from '../domain/index.js';

const person = { select: { id: true, name: true } } as const;

const include = {
  quote: { select: { id: true, number: true, owner: person, customer: person } },
  createdBy: person,
  items: { orderBy: { position: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

const money = (value: Prisma.Decimal) => value.toFixed(0);

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    status: row.status,
    quote: { id: row.quote.id, number: row.quote.number },
    owner: row.quote.owner,
    customer: row.quote.customer,
    createdBy: row.createdBy,
    discountPct: row.discountPct.toString(),
    discountAmount: money(row.discountAmount),
    subtotal: money(row.subtotal),
    linesVat: money(row.linesVat),
    shippingAmount: money(row.shippingAmount),
    shippingVat: money(row.shippingVat),
    total: money(row.total),
    inProgressAt: row.inProgressAt,
    deliveredAt: row.deliveredAt,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      unitPrice: money(item.unitPrice),
      vatRate: item.vatRate,
      quantity: item.quantity.toString(),
      lineAmount: money(item.lineAmount),
    })),
  };
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create({ items, ...order }: NewOrder): Promise<string> {
    try {
      const created = await this.db.order.create({
        data: { ...order, items: { create: items } },
        select: { id: true },
      });
      return created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('ORDER_ALREADY_EXISTS', 409);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.db.order.findUnique({ where: { id }, include });
    return row ? toOrder(row) : null;
  }

  async findByQuoteId(quoteId: string): Promise<Order | null> {
    const row = await this.db.order.findUnique({ where: { quoteId }, include });
    return row ? toOrder(row) : null;
  }

  async list({ statuses, ownerId, quoteNumber, customerKey, skip, take }: OrderSearch) {
    const or: Prisma.QuoteWhereInput[] = [];
    if (quoteNumber !== undefined) or.push({ number: quoteNumber });
    if (customerKey) or.push({ customer: { nameKey: { contains: customerKey } } });
    const where: Prisma.OrderWhereInput = {
      ...(statuses.length > 0 ? { status: { in: [...statuses] } } : {}),
      quote: { ...(ownerId ? { ownerId } : {}), ...(or.length > 0 ? { OR: or } : {}) },
    };
    const [rows, total] = await Promise.all([
      this.db.order.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
      this.db.order.count({ where }),
    ]);
    return { items: rows.map(toOrder), total };
  }

  async updateStatus(
    id: string,
    expectedUpdatedAt: Date,
    change: OrderStatusChange,
  ): Promise<boolean> {
    const result = await this.db.order.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: change,
    });
    return result.count === 1;
  }
}

export function createPrismaOrdersInfrastructure(prisma: PrismaClient): OrdersInfrastructure {
  return { orders: new PrismaOrderRepository(prisma) };
}
