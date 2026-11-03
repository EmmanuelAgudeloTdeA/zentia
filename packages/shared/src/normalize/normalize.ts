const PHONE_MIN_DIGITS = 11;
const PHONE_MAX_DIGITS = 15;
const LOCAL_PHONE_DIGITS = 10;
const COUNTRY_CODE = '57';

/** Documento (NIT o cédula) en mayúsculas y solo `[0-9A-Z]`; no valida el dígito de verificación. */
export function normalizeDocumentId(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Teléfono internacional sin `+` (formato de wa.me); `null` si no queda entre 11 y 15 dígitos. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const international = digits.length === LOCAL_PHONE_DIGITS ? `${COUNTRY_CODE}${digits}` : digits;
  return international.length >= PHONE_MIN_DIGITS && international.length <= PHONE_MAX_DIGITS
    ? international
    : null;
}

/** `573001234567` → `+57 300 123 4567`; otros indicativos solo con `+`. */
export function formatPhoneForDisplay(phone: string): string {
  const match = /^57(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return match ? `+57 ${match[1]} ${match[2]} ${match[3]}` : `+${phone}`;
}

export function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Clave de búsqueda: minúsculas, sin tildes y con espacios colapsados. */
export function toSearchKey(value: string): string {
  return collapseSpaces(value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
}

export function normalizeCategoryLabel(value: string): string {
  return collapseSpaces(value);
}
