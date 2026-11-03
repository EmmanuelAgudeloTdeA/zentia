/** Suma días a una fecha `YYYY-MM-DD` sin depender de la zona horaria del proceso. */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Vence si `expiresAt < hoy`: la cotización vale hasta el final de su fecha de vencimiento. */
export function isPastExpiry(expiresAt: string | null, today: string): boolean {
  return expiresAt !== null && expiresAt < today;
}
