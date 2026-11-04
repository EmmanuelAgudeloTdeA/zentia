import { ORDER_STATUSES, type OrderStatus } from '@zentia/shared';
import { describe, expect, it } from 'vitest';
import { canTransitionOrder, orderActions } from './order.js';

describe('order status', () => {
  const allowed = new Set([
    'PENDING>IN_PROGRESS',
    'PENDING>CANCELLED',
    'IN_PROGRESS>DELIVERED',
    'IN_PROGRESS>CANCELLED',
  ]);
  const targets = ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'] as const;
  const pairs = ORDER_STATUSES.flatMap((from) => targets.map((to) => [from, to] as const));

  it.each(pairs)('%s → %s', (from: OrderStatus, to: OrderStatus) => {
    expect(canTransitionOrder(from, to)).toBe(allowed.has(`${from}>${to}`));
  });

  it('derives the available actions', () => {
    expect(orderActions('PENDING')).toEqual(['startProgress', 'cancel']);
    expect(orderActions('IN_PROGRESS')).toEqual(['deliver', 'cancel']);
    expect(orderActions('DELIVERED')).toEqual([]);
    expect(orderActions('CANCELLED')).toEqual([]);
  });
});
