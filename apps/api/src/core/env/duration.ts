const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

/** Convierte "15m", "7d", "3600s" o "2h" a segundos; devuelve null si el formato no es válido. */
export function parseDurationSeconds(value: string): number | null {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  const amount = Number(match[1]);
  const seconds = amount * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
  return seconds > 0 ? seconds : null;
}
