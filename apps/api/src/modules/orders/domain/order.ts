import type { OrderAction, OrderStatus, VatRate } from '@zentia/shared';

export interface Person {
  id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
  lineAmount: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  /** El dueño del pedido es el dueño actual de su cotización (se mueve al reasignar). */
  quote: { id: string; number: number };
  owner: Person;
  customer: Person;
  createdBy: Person;
  discountPct: string;
  discountAmount: string;
  subtotal: string;
  linesVat: string;
  shippingAmount: string;
  shippingVat: string;
  total: string;
  inProgressAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

/** RN-30: PENDING → IN_PROGRESS → DELIVERED; se cancela desde PENDING o IN_PROGRESS. */
const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

const ACTION_TARGET: Readonly<Record<OrderAction, OrderStatus>> = {
  startProgress: 'IN_PROGRESS',
  deliver: 'DELIVERED',
  cancel: 'CANCELLED',
};

export function orderActions(status: OrderStatus): OrderAction[] {
  return (Object.keys(ACTION_TARGET) as OrderAction[]).filter((action) =>
    canTransitionOrder(status, ACTION_TARGET[action]),
  );
}
