import { normalizeDocumentId, normalizePhone, toSearchKey } from '@zentia/shared';

export interface Customer {
  id: string;
  name: string;
  documentId: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerRuleViolation = 'INVALID_PHONE' | 'CUSTOMER_CONTACT_REQUIRED';

export type PreparedContact =
  | { ok: true; phone: string | null; email: string | null }
  | { ok: false; violation: CustomerRuleViolation };

/** Normaliza el teléfono y exige al menos un contacto (RN-31). */
export function prepareContact(contact: {
  phone: string | null;
  email: string | null;
}): PreparedContact {
  let phone: string | null = null;
  if (contact.phone) {
    phone = normalizePhone(contact.phone);
    if (!phone) return { ok: false, violation: 'INVALID_PHONE' };
  }
  const email = contact.email || null;
  if (!phone && !email) return { ok: false, violation: 'CUSTOMER_CONTACT_REQUIRED' };
  return { ok: true, phone, email };
}

export interface CustomerSearchTerms {
  nameKey: string;
  email: string;
  documentId: string | null;
  phoneDigits: string | null;
}

const MIN_PHONE_SEARCH_DIGITS = 3;

/** Términos de búsqueda: nombre sin tildes, correo, y documento y teléfono normalizados. */
export function customerSearchTerms(q: string): CustomerSearchTerms {
  const documentId = normalizeDocumentId(q);
  const phoneDigits = q.replace(/\D/g, '');
  return {
    nameKey: toSearchKey(q),
    email: q.trim().toLowerCase(),
    documentId: documentId || null,
    phoneDigits: phoneDigits.length >= MIN_PHONE_SEARCH_DIGITS ? phoneDigits : null,
  };
}
