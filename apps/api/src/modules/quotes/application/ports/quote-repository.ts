import type { QuoteChanges, QuoteEventType, QuoteStatus, VatRate } from '@zentia/shared';
import type { Person, Quote, QuoteSnapshot } from '../../domain/index.js';

export interface NewQuoteItem {
  productId: string;
  position: number;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
  lineAmount: string;
}

export interface QuoteAmounts {
  discountPct: string;
  discountAmount: string;
  shippingAmount: string;
  subtotal: string;
  linesVat: string;
  shippingVat: string;
  total: string;
}

export interface NewQuote extends QuoteAmounts {
  number: number;
  customerId: string;
  ownerId: string;
  createdById: string;
  shippingTaxable: boolean;
  items: NewQuoteItem[];
}

export interface QuoteUpdate extends Partial<QuoteAmounts> {
  customerId?: string;
  ownerId?: string;
  status?: QuoteStatus;
  expiresAt?: string;
  sentAt?: Date;
  firstSentAt?: Date;
  approvedAt?: Date;
  currentVersion?: number;
}

export interface NewQuoteVersion {
  quoteId: string;
  number: number;
  snapshot: QuoteSnapshot;
  changes: QuoteChanges | null;
  customerRequest: string | null;
  authorId: string;
}

export interface NewQuoteEvent {
  quoteId: string;
  type: QuoteEventType;
  actorId: string | null;
  versionId?: string | null;
  note?: string | null;
  data: Record<string, unknown>;
}

export interface QuoteSummary {
  id: string;
  number: number;
  status: QuoteStatus;
  customer: Person;
  owner: Person;
  total: string;
  expiresAt: string | null;
  updatedAt: Date;
}

export interface QuoteSearch {
  statuses: readonly QuoteStatus[];
  ownerId?: string | undefined;
  customerId?: string | undefined;
  /** Número exacto si el texto es `COT-12` o `12`. */
  number?: number | undefined;
  /** Clave sin tildes del nombre del cliente. */
  customerKey?: string | undefined;
  skip: number;
  take: number;
}

export interface VersionRecord {
  id: string;
  number: number;
  changes: QuoteChanges | null;
  customerRequest: string | null;
  total: string;
  author: Person;
  createdAt: Date;
}

export interface EventRecord {
  id: string;
  type: QuoteEventType;
  actor: Person | null;
  versionId: string | null;
  note: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface QuoteRepository {
  findById(id: string): Promise<Quote | null>;
  /** `SELECT … FOR UPDATE` dentro de la transacción; false si no existe. */
  lockForUpdate(id: string): Promise<boolean>;
  list(search: QuoteSearch): Promise<{ items: QuoteSummary[]; total: number }>;
  create(quote: NewQuote): Promise<string>;
  update(id: string, changes: QuoteUpdate): Promise<void>;
  replaceItems(id: string, items: NewQuoteItem[]): Promise<void>;
  addVersion(version: NewQuoteVersion): Promise<string>;
  addEvents(events: NewQuoteEvent[]): Promise<void>;
  history(id: string): Promise<{ versions: VersionRecord[]; events: EventRecord[] }>;
  /** Pasa a `EXPIRED` las `SENT` con `expiresAt < today` y devuelve sus ids. */
  expireDue(today: string): Promise<string[]>;
}

export interface QuoteSequence {
  next(): Promise<number>;
}

export interface QuotesTransaction {
  quotes: QuoteRepository;
  sequence: QuoteSequence;
  /** Cliente de la transacción para los listeners de otros módulos (Prisma en producción). */
  client: unknown;
}

export interface QuotesUnitOfWork {
  run<T>(work: (tx: QuotesTransaction) => Promise<T>): Promise<T>;
}

export interface UserDirectory {
  findActive(id: string): Promise<Person | null>;
}
