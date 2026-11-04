export const DASHBOARD_MAX_PERIOD_DAYS = 366;

export interface Period {
  from: string;
  to: string;
}

function shift(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthOf(day: string): { year: number; month: number } {
  const [year = '1970', month = '1'] = day.split('-');
  return { year: Number(year), month: Number(month) };
}

/** Presets del filtro de período (fechas en America/Bogota, ambos extremos incluidos). */
export function periodPresets(
  today: string,
): Record<'thisMonth' | 'lastMonth' | 'last90Days', Period> {
  const { year, month } = monthOf(today);
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const previousFirst = `${previous.year}-${String(previous.month).padStart(2, '0')}-01`;
  return {
    thisMonth: { from: firstOfMonth, to: lastDayOfMonth(year, month) },
    lastMonth: { from: previousFirst, to: lastDayOfMonth(previous.year, previous.month) },
    last90Days: { from: shift(today, -89), to: today },
  };
}

/** Período por defecto: el mes en curso. `null` si `from > to` o supera 366 días. */
export function resolvePeriod(
  from: string | undefined,
  to: string | undefined,
  today: string,
): Period | null {
  const defaults = periodPresets(today).thisMonth;
  const period = { from: from ?? defaults.from, to: to ?? defaults.to };
  if (period.from > period.to) return null;
  const days =
    (Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000 +
    1;
  return days > DASHBOARD_MAX_PERIOD_DAYS ? null : period;
}

/** America/Bogota es UTC−5 todo el año (sin horario de verano): el día D empieza a las 05:00 UTC. */
export function bogotaDayStartUtc(day: string): Date {
  return new Date(`${day}T05:00:00.000Z`);
}

/** Límites UTC `[desde, hasta)` de días de Bogotá con ambos extremos incluidos. */
export function bogotaRangeUtc(
  from: string | undefined,
  to: string | undefined,
): { fromUtc?: Date; toUtcExclusive?: Date } {
  return {
    ...(from ? { fromUtc: bogotaDayStartUtc(from) } : {}),
    ...(to ? { toUtcExclusive: bogotaDayStartUtc(shift(to, 1)) } : {}),
  };
}
