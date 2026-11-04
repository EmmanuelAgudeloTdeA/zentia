import { randomUUID } from 'node:crypto';
import { Decimal, type QuoteDto } from '@zentia/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import { FixedClock } from '../../../test/in-memory-auth.js';
import type { Actor } from '../../auth/index.js';
import type { DocumentProfileDto, SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type { Quote, QuoteReader, SendQuoteUseCase } from '../../quotes/index.js';
import { JsonDocumentTranslator } from './json-document-translator.js';
import {
  buildQuotePdfModel,
  documentActions,
  GetShareLinksUseCase,
  ShareQuoteUseCase,
  type DocumentsDependencies,
} from '../application/index.js';

const actor: Actor = { id: randomUUID(), role: 'SELLER', mustChangePassword: false };
const updatedAt = '2026-11-03T15:00:00.000Z';

function quoteFixture(overrides: Partial<Quote> = {}): Quote {
  return {
    id: randomUUID(),
    number: 12,
    status: 'DRAFT',
    customer: { id: randomUUID(), name: 'José Pérez', documentId: '9001234567', isActive: true },
    owner: { id: actor.id, name: 'Ana Gómez' },
    createdBy: { id: actor.id, name: 'Ana Gómez' },
    discountPct: '10',
    discountAmount: '500000',
    shippingAmount: '20000',
    shippingTaxable: false,
    subtotal: '5000000',
    linesVat: '855000',
    shippingVat: '0',
    total: '5375000',
    expiresAt: null,
    sentAt: null,
    firstSentAt: null,
    approvedAt: null,
    currentVersion: 0,
    voidReason: null,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
    items: [],
    ...overrides,
  };
}

const profile: DocumentProfileDto = {
  name: 'Ñandú SAS',
  taxId: '900123',
  address: null,
  city: null,
  phone: null,
  email: null,
  website: null,
  bankAccounts: null,
  commercialTerms: null,
  documentLocale: 'es',
  logoDataUrl: null,
};

let quote: Quote;
let contact: { phone: string | null; email: string | null };
let deps: DocumentsDependencies;
const send = vi.fn();
const translator = new JsonDocumentTranslator();

beforeEach(() => {
  send.mockReset().mockResolvedValue({ status: 'SENT' } as QuoteDto);
  quote = quoteFixture();
  contact = { phone: '573001234567', email: null };
  const quotes: QuoteReader = {
    getForActor: async () => quote,
    getDtoForActor: async () => ({ status: quote.status }) as QuoteDto,
  };
  const customers: CustomerReader = {
    getById: async (id) => ({
      id,
      name: 'José Pérez',
      documentId: '9001234567',
      isActive: true,
      ...contact,
    }),
    getActiveById: () => Promise.reject(new Error('unused')),
  };
  const settings: SettingsReader = {
    getDocumentProfile: async () => profile,
    getCommercialParameters: async () => ({
      defaultVatRate: 'GENERAL_19',
      validityDays: 15,
      discountLimits: { SELLER: new Decimal(10), MANAGER: new Decimal(30), ADMIN: new Decimal(30) },
      shippingTaxable: false,
      expiringAlertDays: 3,
      followUpDays: 5,
      coldStartThreshold: 30,
    }),
  };
  deps = {
    quotes,
    customers,
    settings,
    translator,
    renderer: { render: async () => Buffer.from('%PDF') },
    sendQuote: { execute: send } as unknown as SendQuoteUseCase,
    clock: new FixedClock(new Date(updatedAt)),
  };
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

describe('buildQuotePdfModel', () => {
  const options = {
    today: '2026-11-03',
    validityDays: 15,
    customerContact: { phone: null, email: 'a@b.co' },
  };

  it('marks a draft as projected with a watermark when viewed internally', () => {
    const model = buildQuotePdfModel(quoteFixture(), profile, { ...options, purpose: 'view' });
    expect(model.quote).toMatchObject({
      displayNumber: 'COT-0012',
      issueDate: '2026-11-03',
      expiresAt: '2026-11-18',
      isProjectedExpiry: true,
    });
    expect(model.watermark).toBe('DRAFT');
  });

  it('generates a clean draft PDF for sending (V1)', () => {
    const model = buildQuotePdfModel(quoteFixture(), profile, { ...options, purpose: 'send' });
    expect(model.watermark).toBeNull();
    expect(model.quote.isProjectedExpiry).toBe(false);
  });

  it('uses the real dates once sent and watermarks voided quotes', () => {
    const sent = quoteFixture({
      status: 'VOIDED',
      expiresAt: '2026-11-20',
      firstSentAt: new Date('2026-11-05T03:00:00.000Z'),
    });
    const model = buildQuotePdfModel(sent, profile, { ...options, purpose: 'view' });
    expect(model.quote).toMatchObject({
      issueDate: '2026-11-04',
      expiresAt: '2026-11-20',
      isProjectedExpiry: false,
    });
    expect(model.watermark).toBe('VOIDED');
    expect(
      buildQuotePdfModel({ ...sent, status: 'APPROVED' }, profile, { ...options, purpose: 'view' })
        .watermark,
    ).toBeNull();
  });
});

describe('JsonDocumentTranslator', () => {
  it('formats money and dates per locale and fills markers', () => {
    expect(translator.formatMoney('5375000', 'es')).toBe('$ 5.375.000');
    expect(translator.formatMoney('5375000', 'en')).toBe('COP 5,375,000');
    expect(translator.formatDay('2026-11-18', 'es')).toBe('18/11/2026');
    expect(translator.formatDay('2026-11-18', 'en')).toBe('11/18/2026');
    expect(translator.t('pdf.page', 'en', { current: 1, total: 3 })).toBe('Page 1 of 3');
    expect(translator.t('pdf.watermark.DRAFT', 'es')).toBe('BORRADOR');
  });
});

describe('GetShareLinksUseCase', () => {
  it('builds an encoded wa.me link and reports the missing email', async () => {
    const links = await new GetShareLinksUseCase(deps).execute(actor, quote.id);
    expect(links.emailUrl).toBeNull();
    expect(links.missing).toEqual(['EMAIL']);
    expect(links.whatsappUrl).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    const text = decodeURIComponent(links.whatsappUrl?.split('text=')[1] ?? '');
    expect(text).toContain('Hola José Pérez');
    expect(text).toContain('COT-0012');
    expect(text).toContain('$ 5.375.000');
    expect(text).toContain('18/11/2026');
    expect(text).toContain('Ana Gómez');
  });

  it('builds a mailto link with CRLF line breaks', async () => {
    contact = { phone: null, email: 'jose+compras@acme.co' };
    const links = await new GetShareLinksUseCase(deps).execute(actor, quote.id);
    expect(links.whatsappUrl).toBeNull();
    expect(links.missing).toEqual(['PHONE']);
    expect(links.emailUrl).toMatch(
      /^mailto:jose%2Bcompras@acme\.co\?subject=Cotizaci%C3%B3n%20COT-0012/,
    );
    expect(links.emailUrl).toContain('%0D%0A');
  });

  it('returns no links outside DRAFT and SENT', async () => {
    quote = quoteFixture({ status: 'APPROVED', expiresAt: '2026-11-18' });
    const links = await new GetShareLinksUseCase(deps).execute(actor, quote.id);
    expect(links).toEqual({ whatsappUrl: null, emailUrl: null, missing: ['EMAIL'] });
  });
});

describe('ShareQuoteUseCase', () => {
  const share = () => new ShareQuoteUseCase(deps);

  it('sends a draft and leaves a sent quote unchanged', async () => {
    await share().execute(actor, quote.id, { channel: 'WHATSAPP', updatedAt });
    expect(send).toHaveBeenCalledWith(actor, quote.id, { updatedAt });

    send.mockClear();
    quote = quoteFixture({ status: 'SENT', expiresAt: '2026-11-18' });
    expect(await share().execute(actor, quote.id, { channel: 'WHATSAPP', updatedAt })).toEqual({
      status: 'SENT',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects unavailable channels, other states and stale updates', async () => {
    await expectCode(
      share().execute(actor, quote.id, { channel: 'EMAIL', updatedAt }),
      'SHARE_CHANNEL_UNAVAILABLE',
      400,
    );
    await expectCode(
      share().execute(actor, quote.id, {
        channel: 'WHATSAPP',
        updatedAt: '2020-01-01T00:00:00.000Z',
      }),
      'QUOTE_CONFLICT',
      409,
    );
    quote = quoteFixture({ status: 'EXPIRED', expiresAt: '2026-10-01' });
    await expectCode(
      share().execute(actor, quote.id, { channel: 'WHATSAPP', updatedAt }),
      'QUOTE_INVALID_TRANSITION',
      409,
    );
  });

  it('contributes downloadPdf always and share only in DRAFT and SENT', () => {
    expect(documentActions(quoteFixture())).toEqual(['downloadPdf', 'share']);
    expect(documentActions(quoteFixture({ status: 'VOIDED' }))).toEqual(['downloadPdf']);
  });
});
