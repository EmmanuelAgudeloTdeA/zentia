import { Decimal, QUOTE_STATUSES, type QuoteStatus, type Role } from '@zentia/shared';
import { describe, expect, it } from 'vitest';
import { allowedActions } from './allowed-actions.js';
import { checkDiscount, discountForDuplicate } from './discount-policy.js';
import { addDays, isPastExpiry } from './expiry.js';
import { diffSnapshots, type QuoteSnapshot } from './quote-snapshot.js';
import { canTransition } from './quote-status.js';

const limits: Record<Role, Decimal> = {
  SELLER: new Decimal(10),
  MANAGER: new Decimal(30),
  ADMIN: new Decimal(30),
};

describe('canTransition', () => {
  const allowed = new Set([
    'DRAFT>SENT',
    'DRAFT>VOIDED',
    'SENT>APPROVED',
    'SENT>REJECTED',
    'SENT>EXPIRED',
    'SENT>VOIDED',
    'EXPIRED>SENT',
  ]);
  const pairs = QUOTE_STATUSES.flatMap((from) => QUOTE_STATUSES.map((to) => [from, to] as const));

  it.each(pairs)('%s → %s', (from: QuoteStatus, to: QuoteStatus) => {
    expect(canTransition(from, to)).toBe(allowed.has(`${from}>${to}`));
  });
});

describe('checkDiscount', () => {
  it('validates only when the discount changes, against the actor limit', () => {
    const base = { limits, status: 'SENT' as const };
    expect(checkDiscount({ ...base, actorRole: 'SELLER', from: '20', to: '20.00' })).toEqual({
      ok: true,
      override: null,
    });
    expect(checkDiscount({ ...base, actorRole: 'SELLER', from: '0', to: '15' })).toEqual({
      ok: false,
      limit: '10',
    });
    expect(checkDiscount({ ...base, actorRole: 'MANAGER', from: '0', to: '31' })).toEqual({
      ok: false,
      limit: '30',
    });
  });

  it('records an override only in DRAFT and only above the seller limit', () => {
    expect(
      checkDiscount({ limits, actorRole: 'MANAGER', from: '5', to: '20', status: 'DRAFT' }),
    ).toEqual({ ok: true, override: { from: '5', to: '20', sellerLimit: '10' } });
    expect(
      checkDiscount({ limits, actorRole: 'MANAGER', from: '5', to: '20', status: 'SENT' }),
    ).toEqual({ ok: true, override: null });
    expect(
      checkDiscount({ limits, actorRole: 'ADMIN', from: '0', to: '10', status: 'DRAFT' }),
    ).toEqual({ ok: true, override: null });
  });

  it('RN-14: a seller cannot change a discount above the seller limit, not even to lower it', () => {
    for (const status of ['DRAFT', 'SENT'] as const) {
      expect(checkDiscount({ limits, actorRole: 'SELLER', from: '20', to: '5', status })).toEqual({
        ok: false,
        limit: '10',
      });
      expect(checkDiscount({ limits, actorRole: 'SELLER', from: '20', to: '0', status })).toEqual({
        ok: false,
        limit: '10',
      });
    }
    expect(
      checkDiscount({ limits, actorRole: 'SELLER', from: '10', to: '5', status: 'DRAFT' }),
    ).toEqual({ ok: true, override: null });
    expect(
      checkDiscount({ limits, actorRole: 'MANAGER', from: '20', to: '5', status: 'SENT' }),
    ).toEqual({ ok: true, override: null });
  });

  it('copies the discount on duplicate only within the actor limit', () => {
    expect(discountForDuplicate('25', 'SELLER', limits)).toEqual({ discountPct: '0', reset: true });
    expect(discountForDuplicate('25.50', 'MANAGER', limits)).toEqual({
      discountPct: '25.5',
      reset: false,
    });
  });
});

describe('allowedActions', () => {
  const today = '2026-11-03';
  const seller = { id: 'seller', role: 'SELLER' as const };
  const manager = { id: 'manager', role: 'MANAGER' as const };
  const quote = (status: QuoteStatus, expiresAt: string | null = null) => ({
    status,
    ownerId: 'seller',
    expiresAt,
  });

  it('follows the state for the owner', () => {
    expect(allowedActions(quote('DRAFT'), seller, today)).toEqual(['edit', 'send', 'void']);
    expect(allowedActions(quote('SENT', today), seller, today)).toEqual([
      'edit',
      'approve',
      'reject',
      'changeExpiry',
      'void',
    ]);
    expect(allowedActions(quote('EXPIRED', '2026-10-01'), seller, today)).toEqual(['reactivate']);
    expect(allowedActions(quote('APPROVED', today), seller, today)).toEqual(['duplicate']);
    expect(allowedActions(quote('VOIDED'), seller, today)).toEqual([]);
  });

  it('hides approve and reject once the date passed, before the job runs', () => {
    expect(allowedActions(quote('SENT', '2026-11-02'), seller, today)).toEqual([
      'edit',
      'changeExpiry',
      'void',
    ]);
  });

  it('adds reassign for managers except on voided quotes', () => {
    expect(allowedActions(quote('REJECTED', today), manager, today)).toEqual([
      'duplicate',
      'reassign',
    ]);
    expect(allowedActions(quote('VOIDED'), manager, today)).toEqual([]);
  });
});

describe('expiry', () => {
  it('adds days across months and compares by date', () => {
    expect(addDays('2026-11-20', 15)).toBe('2026-12-05');
    expect(isPastExpiry('2026-11-03', '2026-11-03')).toBe(false);
    expect(isPastExpiry('2026-11-02', '2026-11-03')).toBe(true);
    expect(isPastExpiry(null, '2026-11-03')).toBe(false);
  });
});

describe('diffSnapshots', () => {
  const item = (productId: string, quantity: string, unitPrice = '1000') => ({
    productId,
    productName: productId,
    category: 'C',
    unitPrice,
    vatRate: 'GENERAL_19' as const,
    quantity,
    lineAmount: '0',
  });
  const snapshot = (items: QuoteSnapshot['items'], discountPct = '0'): QuoteSnapshot => ({
    customer: { id: 'c', name: 'C', documentId: '1' },
    items,
    discountPct,
    discountAmount: '0',
    shippingAmount: '0',
    shippingTaxable: false,
    subtotal: '0',
    linesVat: '0',
    shippingVat: '0',
    total: '100',
    expiresAt: null,
  });

  it('reports added, removed and modified lines and discount changes', () => {
    const { changed, changes } = diffSnapshots(
      snapshot([item('a', '1'), item('b', '2')]),
      snapshot([item('a', '1.50'), item('c', '1')], '5'),
    );
    expect(changed).toBe(true);
    expect(changes.added.map((line) => line.productId)).toEqual(['c']);
    expect(changes.removed.map((line) => line.productId)).toEqual(['b']);
    expect(changes.modified).toEqual([
      { productId: 'a', productName: 'a', quantity: { from: '1', to: '1.50' }, unitPrice: null },
    ]);
    expect(changes.discountPct).toEqual({ from: '0', to: '5' });
  });

  it('is unchanged when only the number format differs', () => {
    expect(
      diffSnapshots(snapshot([item('a', '2')]), snapshot([item('a', '2.00')], '0.00')).changed,
    ).toBe(false);
  });
});
