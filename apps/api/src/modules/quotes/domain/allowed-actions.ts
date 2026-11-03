import type { QuoteAction, QuoteStatus, Role } from '@zentia/shared';

interface ActionSubject {
  status: QuoteStatus;
  ownerId: string;
  expiresAt: string | null;
}

interface ActionActor {
  id: string;
  role: Role;
}

/** Acciones de M4 que el actor puede ejecutar; `today` en `YYYY-MM-DD` (Bogotá). */
export function allowedActions(
  quote: ActionSubject,
  actor: ActionActor,
  today: string,
): QuoteAction[] {
  const manages = actor.role !== 'SELLER' || quote.ownerId === actor.id;
  const actions: QuoteAction[] = [];
  if (!manages)
    return quote.status === 'APPROVED' || quote.status === 'REJECTED' ? ['duplicate'] : [];

  switch (quote.status) {
    case 'DRAFT':
      actions.push('edit', 'send', 'void');
      break;
    case 'SENT':
      actions.push('edit');
      // Vencida por fecha pero aún sin marcar por el job: no se aprueba ni rechaza (V3).
      if (quote.expiresAt !== null && quote.expiresAt >= today) actions.push('approve', 'reject');
      actions.push('changeExpiry', 'void');
      break;
    case 'EXPIRED':
      actions.push('reactivate');
      break;
    case 'APPROVED':
    case 'REJECTED':
      actions.push('duplicate');
      break;
    case 'VOIDED':
      break;
  }
  if (actor.role !== 'SELLER' && quote.status !== 'VOIDED') actions.push('reassign');
  return actions;
}
