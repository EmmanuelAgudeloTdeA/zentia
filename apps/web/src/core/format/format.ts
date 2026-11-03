const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const BOGOTA = 'America/Bogota';

const DATE = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const ISO_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Monto COP (string entero de la API) → `$ 1.550.000`; con `BigInt` para no perder precisión. */
export function formatCop(amount: string): string {
  return /^-?\d+$/.test(amount) ? COP.format(BigInt(amount)) : amount;
}

/** Separador de miles sin símbolo: `1550000` → `1.550.000`. */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Fecha y hora ISO → `DD/MM/AAAA` en America/Bogota. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** Fecha y hora ISO → `DD/MM/AAAA HH:mm` en America/Bogota. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso)).replace(',', '');
}

/** Fecha sin hora (`YYYY-MM-DD`, p. ej. `expiresAt`) → `DD/MM/AAAA`, sin conversión de zona. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/** Hoy en America/Bogota como `YYYY-MM-DD`. */
export function todayInBogota(now: Date = new Date()): string {
  return ISO_DAY.format(now);
}

/** Días calendario entre dos fechas `YYYY-MM-DD` (`to − from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Porcentaje de la API (`10`, `7.5`) con coma decimal: `7,5 %`. */
export function formatPercent(value: string): string {
  return `${value.replace('.', ',')} %`;
}

/** Cantidad de la API (`1.5`) con coma decimal. */
export function formatQuantity(value: string): string {
  return value.replace('.', ',');
}
