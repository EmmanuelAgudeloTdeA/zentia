import { daysBetweenDays, followUpReferenceDate, type ProbabilityFactorCode } from '@zentia/shared';

/** Señales estructuradas de una cotización (solo conteos y fechas, RN-40). */
export interface QuoteSignals {
  quoteId: string;
  number: number;
  status: string;
  ownerId: string;
  ownerName: string;
  customerName: string;
  total: string;
  /** Fechas `YYYY-MM-DD` en America/Bogota. */
  sentDay: string | null;
  expiresAt: string | null;
  lastInteractionDay: string | null;
  /** Hubo interacción (de la cotización o del cliente sin cotización) después del último envío. */
  interactedSinceSent: boolean;
  versionsAfterSend: number;
}

export interface ProbabilityFactor {
  code: ProbabilityFactorCode;
  points: number;
}

export interface Probability {
  probability: number;
  factors: ProbabilityFactor[];
}

const BASE = 40;
const MIN = 5;
const MAX = 95;

function shiftDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Heurística v0 (RN-40), "estimación por reglas"; solo para Enviadas. */
export function calculateProbability(
  signals: QuoteSignals,
  today: string,
  followUpDays: number,
): Probability {
  const factors: ProbabilityFactor[] = [{ code: 'BASE', points: BASE }];
  const sentDay = signals.sentDay ?? today;

  if (
    signals.lastInteractionDay !== null &&
    signals.lastInteractionDay >= shiftDays(today, -followUpDays)
  ) {
    factors.push({ code: 'RECENT_INTERACTION', points: 15 });
  }
  if (signals.versionsAfterSend >= 1) factors.push({ code: 'VERSION_AFTER_SEND', points: 10 });

  // RN-40: "más de Y días sin interacción" (estrictamente mayor que Y).
  const reference = followUpReferenceDate(signals.lastInteractionDay, sentDay);
  if (daysBetweenDays(reference, today) > followUpDays)
    factors.push({ code: 'NO_FOLLOW_UP', points: -20 });

  if (signals.expiresAt !== null && !signals.interactedSinceSent) {
    const validity = daysBetweenDays(sentDay, signals.expiresAt);
    const elapsed = daysBetweenDays(sentDay, today);
    // elapsed / validity ≥ 0,75 en enteros, sin decimales.
    if (validity > 0 && elapsed * 4 >= validity * 3)
      factors.push({ code: 'VALIDITY_CONSUMED', points: -15 });
  }

  const sum = factors.reduce((total, factor) => total + factor.points, 0);
  return { probability: Math.min(MAX, Math.max(MIN, sum)), factors };
}
