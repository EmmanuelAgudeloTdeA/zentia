import type { OrderStatus, VatRate } from '@zentia/shared';
import type { Order } from '../../domain/index.js';

export interface NewOrder {
  quoteId: string;
  createdById: string;
  discountPct: string;
  discountAmount: string;
  subtotal: string;
  linesVat: string;
  shippingAmount: string;
  shippingVat: string;
  total: string;
  items: {
    productId: string;
    position: number;
    productName: string;
    category: string;
    unitPrice: string;
    vatRate: VatRate;
    quantity: string;
    lineAmount: string;
  }[];
}

export interface OrderStatusChange {
  status: OrderStatus;
  inProgressAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string | null;
}

export interface OrderSearch {
  statuses: readonly OrderStatus[];
  /** Dueño de la cotización de origen (alcance de un vendedor). */
  ownerId?: string | undefined;
  quoteNumber?: number | undefined;
  customerKey?: string | undefined;
  skip: number;
  take: number;
}

export interface OrderRepository {
  /** Lanza `ORDER_ALREADY_EXISTS` ante la violación del único de `quoteId` (conversión concurrente). */
  create(order: NewOrder): Promise<string>;
  findById(id: string): Promise<Order | null>;
  findByQuoteId(quoteId: string): Promise<Order | null>;
  list(search: OrderSearch): Promise<{ items: Order[]; total: number }>;
  /** Actualiza solo si `updatedAt` no cambió (concurrencia optimista); false si hubo conflicto. */
  updateStatus(id: string, expectedUpdatedAt: Date, change: OrderStatusChange): Promise<boolean>;
}
