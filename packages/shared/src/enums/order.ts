export const ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ACTIONS = ['startProgress', 'deliver', 'cancel'] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

/** El pedido usa el número de su cotización: `COT-0012` → `PED-0012`. */
export function formatOrderNumber(quoteNumber: number): string {
  return `PED-${String(quoteNumber).padStart(4, '0')}`;
}
