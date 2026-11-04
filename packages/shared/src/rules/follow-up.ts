/** Fechas `YYYY-MM-DD` en America/Bogota; se comparan como texto porque el formato es ordenable. */

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** RN-33: el ciclo de seguimiento parte del último contacto o del último envío, lo más reciente. */
export function followUpReferenceDate(lastInteractionDay: string | null, sentDay: string): string {
  return lastInteractionDay !== null && lastInteractionDay > sentDay ? lastInteractionDay : sentDay;
}

/** "Sin seguimiento": han pasado Y días o más desde la fecha de referencia. */
export function isWithoutFollowUp(
  referenceDate: string,
  today: string,
  followUpDays: number,
): boolean {
  return today >= addDays(referenceDate, followUpDays);
}

/** "Próxima a vencer": `expiresAt − X ≤ hoy ≤ expiresAt`. */
export function isExpiringSoon(expiresAt: string, today: string, alertDays: number): boolean {
  return today >= addDays(expiresAt, -alertDays) && today <= expiresAt;
}

/** Días calendario entre dos fechas (`to − from`). */
export function daysBetweenDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
