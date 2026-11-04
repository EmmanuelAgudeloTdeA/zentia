import { Decimal, type QuoteStatus, type Role } from '@zentia/shared';

export interface DiscountOverride {
  from: string;
  to: string;
  sellerLimit: string;
}

export type DiscountCheck =
  { ok: false; limit: string } | { ok: true; override: DiscountOverride | null };

interface DiscountCheckInput {
  actorRole: Role;
  limits: Readonly<Record<Role, Decimal>>;
  from: string;
  to: string;
  status: QuoteStatus;
}

/**
 * RN-11 a RN-14: el límite es el del rol de quien cambia el descuento; si no lo cambia, no se valida.
 * Un gerente o administrador que supera el límite del vendedor en un Borrador deja `DISCOUNT_OVERRIDE`.
 */
export function checkDiscount({
  actorRole,
  limits,
  from,
  to,
  status,
}: DiscountCheckInput): DiscountCheck {
  const next = new Decimal(to);
  if (next.eq(from)) return { ok: true, override: null };
  const limit = limits[actorRole];
  if (next.gt(limit)) return { ok: false, limit: limit.toString() };
  const sellerLimit = limits.SELLER;
  // RN-14: un vendedor no modifica un descuento que ya supera su límite, ni siquiera para bajarlo.
  if (actorRole === 'SELLER' && new Decimal(from).gt(sellerLimit)) {
    return { ok: false, limit: limit.toString() };
  }
  const override =
    status === 'DRAFT' && actorRole !== 'SELLER' && next.gt(sellerLimit)
      ? {
          from: new Decimal(from).toString(),
          to: next.toString(),
          sellerLimit: sellerLimit.toString(),
        }
      : null;
  return { ok: true, override };
}

/** Descuento que se puede copiar al duplicar: el actual si no supera el límite del actor; si no, 0. */
export function discountForDuplicate(
  discountPct: string,
  actorRole: Role,
  limits: Readonly<Record<Role, Decimal>>,
): { discountPct: string; reset: boolean } {
  return new Decimal(discountPct).gt(limits[actorRole])
    ? { discountPct: '0', reset: true }
    : { discountPct: new Decimal(discountPct).toString(), reset: false };
}
