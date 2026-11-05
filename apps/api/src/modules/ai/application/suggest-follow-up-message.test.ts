import { Decimal, type DocumentLocale } from '@zentia/shared';
import { describe, expect, it } from 'vitest';
import type { Actor } from '../../auth/index.js';
import { JsonDocumentTranslator } from '../../documents/index.js';
import type { Quote } from '../../quotes/index.js';
import type { FollowUpPromptInput } from '../domain/index.js';
import type { AiDependencies, LLMProvider } from './ai-ports.js';
import { SuggestFollowUpMessageUseCase } from './ai-use-cases.js';

const actor: Actor = { id: 'seller-1', role: 'SELLER', mustChangePassword: false };

const quote: Quote = {
  id: 'quote-1',
  number: 1,
  status: 'SENT',
  customer: { id: 'customer-1', name: 'ignored', documentId: '900', isActive: true },
  owner: { id: 'seller-1', name: 'Ana Gómez' },
  createdBy: { id: 'seller-1', name: 'Ana Gómez' },
  shippingTaxable: false,
  expiresAt: '2026-11-18',
  sentAt: new Date('2026-10-25T15:00:00.000Z'),
  firstSentAt: new Date('2026-10-25T15:00:00.000Z'),
  approvedAt: null,
  currentVersion: 1,
  voidReason: null,
  createdAt: new Date('2026-10-20T15:00:00.000Z'),
  updatedAt: new Date('2026-10-25T15:00:00.000Z'),
  discountPct: '0',
  discountAmount: '0',
  shippingAmount: '0',
  subtotal: '5000000',
  linesVat: '950000',
  shippingVat: '0',
  total: '5950000',
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      productName: 'Portátil',
      category: 'Tecnología',
      unitPrice: '2500000',
      vatRate: 'GENERAL_19',
      quantity: '2',
      lineAmount: '5000000',
    },
  ],
};

function useCase(llm: LLMProvider, options: { locale?: DocumentLocale; customer?: string } = {}) {
  const deps: AiDependencies = {
    llm,
    llmTimeoutMs: 4000,
    signals: {
      getSignals: async () => [
        {
          quoteId: quote.id,
          number: 1,
          status: 'SENT',
          ownerId: 'seller-1',
          ownerName: 'Ana Gómez',
          customerName: 'ignored',
          total: quote.total,
          sentDay: '2026-10-25',
          expiresAt: '2026-11-18',
          lastInteractionDay: null,
          interactedSinceSent: false,
          versionsAfterSend: 0,
        },
      ],
      sentSignals: async () => [],
      countClosed: async () => 0,
    },
    quotes: {
      getForActor: async () => quote,
      getDtoForActor: () => Promise.reject(new Error('unused')),
    },
    customers: {
      getById: async () => ({
        id: 'customer-1',
        name: options.customer ?? 'Industrias Ñandú SAS',
        documentId: '900',
        phone: '573009998877',
        email: null,
        isActive: true,
      }),
      getActiveById: () => Promise.reject(new Error('unused')),
    },
    settings: {
      getCommercialParameters: async () => ({
        defaultVatRate: 'GENERAL_19',
        validityDays: 15,
        discountLimits: {
          SELLER: new Decimal(10),
          MANAGER: new Decimal(30),
          ADMIN: new Decimal(30),
        },
        shippingTaxable: false,
        expiringAlertDays: 3,
        followUpDays: 5,
        coldStartThreshold: 30,
      }),
      getDocumentProfile: async () => ({
        name: null,
        taxId: null,
        address: null,
        city: null,
        phone: null,
        email: null,
        website: null,
        bankAccounts: null,
        commercialTerms: null,
        documentLocale: options.locale ?? 'es',
        logoDataUrl: null,
      }),
    },
    translator: new JsonDocumentTranslator(),
    clock: { now: () => new Date('2026-11-03T15:00:00.000Z'), today: () => '2026-11-03' },
  };
  return new SuggestFollowUpMessageUseCase(deps);
}

const answer = (text: string): LLMProvider => ({ generateFollowUp: async () => text });

describe('SuggestFollowUpMessageUseCase', () => {
  it.each(['', '   ', '{{X}}', '{{ CUALQUIERA }} {{OTRO}}'])(
    'uses the template when the LLM answers %j',
    async (text) => {
      const result = await useCase(answer(text)).execute(actor, quote.id);
      expect(result.source).toBe('TEMPLATE');
      expect(result.message).toContain('Hola Industrias Ñandú SAS');
      expect(result.message).toContain('hace 9 días');
      expect(result.message).not.toContain('{{');
    },
  );

  it('uses the template when the provider fails with 429', async () => {
    const llm: LLMProvider = {
      generateFollowUp: () =>
        Promise.reject(Object.assign(new Error('Too Many Requests'), { status: 429 })),
    };
    const result = await useCase(llm).execute(actor, quote.id);
    expect(result).toMatchObject({ source: 'TEMPLATE', daysWithoutFollowUp: 9, highlighted: true });
  });

  it('asks the LLM and falls back in the document locale', async () => {
    const inputs: FollowUpPromptInput[] = [];
    const llm: LLMProvider = {
      generateFollowUp: async (input) => {
        inputs.push(input);
        return '';
      },
    };
    const result = await useCase(llm, { locale: 'en' }).execute(actor, quote.id);
    expect(inputs[0]?.locale).toBe('en');
    expect(result.source).toBe('TEMPLATE');
    expect(result.message).toContain('Hi Industrias Ñandú SAS');
    expect(result.message).toContain('9 days ago');
    expect(result.message).toContain('Ana Gómez');
  });

  it('inserts names literally, without replacement patterns', async () => {
    const customer = "Pérez $' & $& $$ $1 {{VENDEDOR}} SAS";
    const ai = await useCase(answer('Hola {{CLIENTE}}, saludos de {{VENDEDOR}}'), {
      customer,
    }).execute(actor, quote.id);
    expect(ai).toMatchObject({
      source: 'AI',
      message: `Hola ${customer}, saludos de Ana Gómez`,
    });
    const template = await useCase(answer(''), { customer }).execute(actor, quote.id);
    expect(template.message).toContain(`Hola ${customer}`);
  });
});
