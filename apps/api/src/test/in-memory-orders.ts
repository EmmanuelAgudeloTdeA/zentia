import { randomUUID } from 'node:crypto';
import { toSearchKey } from '@zentia/shared';
import { AppError } from '../core/http/index.js';
import type { OrderRepository } from '../modules/orders/application/index.js';
import type { Order } from '../modules/orders/domain/index.js';
import type { OrdersInfrastructure } from '../modules/orders/index.js';
import type { Quote } from '../modules/quotes/index.js';

type Stored = Omit<Order, 'quote' | 'owner' | 'customer' | 'createdBy'> & {
  quoteId: string;
  createdById: string;
};

let tick = Date.parse('2026-11-03T16:00:00.000Z');
const nextDate = () => new Date((tick += 1000));

/** El dueño y el cliente se leen de la cotización en cada consulta (se mueven al reasignar). */
export function createInMemoryOrders(
  findQuote: (id: string) => Promise<Quote | null>,
  userName: (id: string) => string = () => 'Usuario',
) {
  const orders = new Map<string, Stored>();

  const toOrder = async (stored: Stored): Promise<Order> => {
    const quote = await findQuote(stored.quoteId);
    if (!quote) throw new Error(`Quote ${stored.quoteId} not found`);
    const { quoteId: _quoteId, createdById, ...order } = stored;
    return {
      ...order,
      quote: { id: quote.id, number: quote.number },
      owner: quote.owner,
      customer: { id: quote.customer.id, name: quote.customer.name },
      createdBy: { id: createdById, name: userName(createdById) },
    };
  };

  const repo: OrderRepository = {
    async create({ items, ...input }) {
      if ([...orders.values()].some((order) => order.quoteId === input.quoteId)) {
        throw new AppError('ORDER_ALREADY_EXISTS', 409);
      }
      const now = nextDate();
      const id = randomUUID();
      orders.set(id, {
        ...input,
        id,
        status: 'PENDING',
        inProgressAt: null,
        deliveredAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdAt: now,
        updatedAt: now,
        items: items.map(({ position: _position, ...item }) => ({ ...item, id: randomUUID() })),
      });
      return id;
    },
    async findById(id) {
      const stored = orders.get(id);
      return stored ? toOrder(stored) : null;
    },
    async findByQuoteId(quoteId) {
      const stored = [...orders.values()].find((order) => order.quoteId === quoteId);
      return stored ? toOrder(stored) : null;
    },
    async list({ statuses, ownerId, quoteNumber, customerKey, skip, take }) {
      const all = await Promise.all([...orders.values()].map(toOrder));
      const matches = all
        .filter((order) => statuses.length === 0 || statuses.includes(order.status))
        .filter((order) => !ownerId || order.owner.id === ownerId)
        .filter(
          (order) =>
            (quoteNumber === undefined && !customerKey) ||
            order.quote.number === quoteNumber ||
            (customerKey !== undefined && toSearchKey(order.customer.name).includes(customerKey)),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return { items: matches.slice(skip, skip + take), total: matches.length };
    },
    async updateStatus(id, expectedUpdatedAt, change) {
      const stored = orders.get(id);
      if (!stored || stored.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return false;
      orders.set(id, { ...stored, ...change, updatedAt: nextDate() });
      return true;
    },
  };

  const infrastructure: OrdersInfrastructure = { orders: repo };
  return { infrastructure, orders };
}
