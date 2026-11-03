const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Monto COP (string entero de la API) → `$ 1.550.000`; con `BigInt` para no perder precisión. */
export function formatCop(amount: string): string {
  return /^-?\d+$/.test(amount) ? COP.format(BigInt(amount)) : amount;
}

/** Separador de miles sin símbolo: `1550000` → `1.550.000`. */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Fecha ISO → `DD/MM/AAAA` en America/Bogota. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}
