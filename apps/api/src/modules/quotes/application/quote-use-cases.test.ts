import { randomUUID } from 'node:crypto';
import { Decimal, type QuoteDto, type QuoteStatus, type VatRate } from '@zentia/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import { createInMemoryQuotes, type InMemoryQuotes } from '../../../test/in-memory-quotes.js';
import type { Actor } from '../../auth/index.js';
import type { CatalogReader, ProductSnapshotDto } from '../../catalog/index.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import { CreateQuoteUseCase } from './create-quote.use-case.js';
import { DuplicateQuoteUseCase } from './duplicate-quote.use-case.js';
import { ExpireQuotesUseCase } from './expire-quotes.use-case.js';
import { GetQuoteHistoryUseCase, GetQuoteUseCase, ListQuotesUseCase } from './query-use-cases.js';
import type { QuotesDependencies } from './quotes-dependencies.js';
import {
  GetReactivationPreviewUseCase,
  ReactivateQuoteUseCase,
} from './reactivate-quote.use-case.js';
import {
  ChangeExpiryUseCase,
  ChangeQuoteStatusUseCase,
  ReassignQuoteUseCase,
  SendQuoteUseCase,
  VoidQuoteUseCase,
} from './transition-use-cases.js';
import { UpdateQuoteUseCase } from './update-quote.use-case.js';

const CUSTOMER = randomUUID();
const INACTIVE_CUSTOMER = randomUUID();
const LAPTOP = randomUUID();
const SERVICE = randomUUID();
const OLD = randomUUID();

let auth: InMemoryAuth;
let quotes: InMemoryQuotes;
let clock: FixedClock;
let deps: QuotesDependencies;
let seller: Actor;
let otherSeller: Actor;
let manager: Actor;
let products: Map<string, ProductSnapshotDto>;
const listener = vi.fn();

function product(id: string, name: string, price: string, vatRate: VatRate, isActive = true) {
  return { id, name, category: 'Tecnología', price: new Decimal(price), vatRate, isActive };
}

const customers: Record<string, { name: string; documentId: string; isActive: boolean }> = {
  [CUSTOMER]: { name: 'Acme SAS', documentId: '9001234567', isActive: true },
  [INACTIVE_CUSTOMER]: { name: 'Viejo Ltda', documentId: '800111222', isActive: false },
};

const customerReader: CustomerReader = {
  async getById(id) {
    const customer = customers[id];
    if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', 404);
    return { id, ...customer, phone: null, email: 'a@b.co' };
  },
  async getActiveById(id) {
    const customer = await this.getById(id);
    if (!customer.isActive) throw new AppError('CUSTOMER_INACTIVE', 400);
    return customer;
  },
};

const catalogReader: CatalogReader = {
  async getByIds(ids) {
    return [...new Set(ids)].map((id) => {
      const found = products.get(id);
      if (!found) throw new AppError('PRODUCT_NOT_FOUND', 400, { productId: id });
      return found;
    });
  },
  async getActiveByIds(ids) {
    const found = await this.getByIds(ids);
    const inactive = found.find((p) => !p.isActive);
    if (inactive) throw new AppError('PRODUCT_INACTIVE', 400, { productId: inactive.id });
    return found;
  },
};

const settings: SettingsReader = {
  async getCommercialParameters() {
    return {
      defaultVatRate: 'GENERAL_19',
      validityDays: 15,
      discountLimits: { SELLER: new Decimal(10), MANAGER: new Decimal(30), ADMIN: new Decimal(30) },
      shippingTaxable: false,
      expiringAlertDays: 3,
      followUpDays: 5,
      coldStartThreshold: 30,
    };
  },
  getDocumentProfile: () => Promise.reject(new Error('unused')),
};

async function actorFor(email: string, role: Actor['role'], isActive = true): Promise<Actor> {
  const user = await auth.addUser({ email, password: 'x', role, isActive });
  return { id: user.id, role, mustChangePassword: false };
}

beforeEach(async () => {
  listener.mockReset();
  auth = createInMemoryAuth();
  clock = new FixedClock(new Date('2026-11-03T15:00:00.000Z'));
  products = new Map([
    [LAPTOP, product(LAPTOP, 'Portátil', '2500000', 'GENERAL_19')],
    [SERVICE, product(SERVICE, 'Instalación', '100000', 'EXEMPT')],
    [OLD, product(OLD, 'Descontinuado', '50000', 'GENERAL_19', false)],
  ]);
  quotes = createInMemoryQuotes({
    customer: (id) => ({
      id,
      ...(customers[id] ?? { name: '?', documentId: '', isActive: false }),
    }),
    user: (id) => {
      const user = auth.users.users.get(id);
      return user ? { id, name: user.name, isActive: user.isActive } : null;
    },
  });
  deps = {
    ...quotes,
    clock,
    settings,
    customers: customerReader,
    catalog: catalogReader,
    reassignedListeners: [listener],
    actionContributors: [() => ['downloadPdf']],
  };
  seller = await actorFor('vendedor@empresa.co', 'SELLER');
  otherSeller = await actorFor('otro@empresa.co', 'SELLER');
  manager = await actorFor('gerente@empresa.co', 'MANAGER');
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
  return error as AppError;
}

function createPpi(actor = seller, discountPct = '10') {
  return new CreateQuoteUseCase(deps).execute(actor, {
    customerId: CUSTOMER,
    items: [{ productId: LAPTOP, quantity: '2' }],
    discountPct,
    shippingAmount: '20000',
  });
}

const send = (quote: QuoteDto, actor = seller) =>
  new SendQuoteUseCase(deps).execute(actor, quote.id, { updatedAt: quote.updatedAt });

const eventsOf = (id: string) => quotes.quotes.events.filter((event) => event.quoteId === id);

describe('CreateQuoteUseCase', () => {
  it('creates the PPI example as a draft with consecutive numbers', async () => {
    const quote = await createPpi();
    expect(quote).toMatchObject({
      number: 1,
      displayNumber: 'COT-0001',
      status: 'DRAFT',
      owner: { id: seller.id },
      subtotal: '5000000',
      discountAmount: '500000',
      linesVat: '855000',
      total: '5375000',
      shippingTaxable: false,
      expiresAt: null,
    });
    expect(quote.items[0]).toMatchObject({
      unitPrice: '2500000',
      quantity: '2',
      lineAmount: '5000000',
    });
    expect(quote.allowedActions).toEqual(['edit', 'send', 'void', 'downloadPdf']);
    expect((await createPpi()).number).toBe(2);
  });

  it('rejects inactive customers and products, and repeated products', async () => {
    const create = new CreateQuoteUseCase(deps);
    const base = { discountPct: '0', shippingAmount: '0' };
    await expectCode(
      create.execute(seller, {
        ...base,
        customerId: INACTIVE_CUSTOMER,
        items: [{ productId: LAPTOP, quantity: '1' }],
      }),
      'CUSTOMER_INACTIVE',
      400,
    );
    const inactive = await expectCode(
      create.execute(seller, {
        ...base,
        customerId: CUSTOMER,
        items: [{ productId: OLD, quantity: '1' }],
      }),
      'PRODUCT_INACTIVE',
      400,
    );
    expect(inactive.params).toEqual({ productId: OLD });
    await expectCode(
      create.execute(seller, {
        ...base,
        customerId: CUSTOMER,
        items: [
          { productId: LAPTOP, quantity: '1' },
          { productId: LAPTOP, quantity: '2' },
        ],
      }),
      'DUPLICATE_PRODUCT_LINE',
      400,
    );
  });

  it('limits the discount by the role of who applies it and records overrides', async () => {
    const error = await expectCode(createPpi(seller, '15'), 'DISCOUNT_LIMIT_EXCEEDED', 403);
    expect(error.params).toEqual({ limit: '10' });
    const quote = await createPpi(manager, '20');
    expect(eventsOf(quote.id)).toMatchObject([
      {
        type: 'DISCOUNT_OVERRIDE',
        actorId: manager.id,
        data: { from: '0', to: '20', sellerLimit: '10' },
      },
    ]);
  });
});

describe('send and status changes', () => {
  it('sends with version 1, expiry date and a STATE_CHANGED linked to the version', async () => {
    const sent = await send(await createPpi());
    expect(sent).toMatchObject({ status: 'SENT', expiresAt: '2026-11-18', currentVersion: 1 });
    expect(sent.sentAt).toBe(sent.firstSentAt);
    const [version] = quotes.quotes.versions;
    expect(version).toMatchObject({ number: 1, changes: null, customerRequest: null });
    expect(version?.snapshot.expiresAt).toBe('2026-11-18');
    expect(eventsOf(sent.id)).toMatchObject([
      { type: 'STATE_CHANGED', versionId: version?.id, data: { from: 'DRAFT', to: 'SENT' } },
    ]);
  });

  it('rejects stale updates and foreign quotes', async () => {
    const draft = await createPpi();
    await send(draft);
    await expectCode(send(draft), 'QUOTE_CONFLICT', 409);
    await expectCode(
      new GetQuoteUseCase(deps).execute(otherSeller, draft.id),
      'QUOTE_NOT_FOUND',
      404,
    );
  });

  it('approves only before the expiry date and then blocks edits', async () => {
    const sent = await send(await createPpi());
    const status = new ChangeQuoteStatusUseCase(deps);
    clock.advance(16 * 86_400_000);
    await expectCode(
      status.execute(seller, sent.id, { to: 'APPROVED', updatedAt: sent.updatedAt }),
      'QUOTE_EXPIRED',
      409,
    );
    clock.advance(-16 * 86_400_000);
    const approved = await status.execute(seller, sent.id, {
      to: 'APPROVED',
      updatedAt: sent.updatedAt,
    });
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedAt).not.toBeNull();
    await expectCode(
      new UpdateQuoteUseCase(deps).execute(seller, sent.id, {
        discountPct: '5',
        updatedAt: approved.updatedAt,
      }),
      'QUOTE_NOT_EDITABLE',
      409,
    );
  });

  it('voids with a reason that is exposed as voidReason', async () => {
    const draft = await createPpi();
    const voided = await new VoidQuoteUseCase(deps).execute(seller, draft.id, {
      reason: 'El cliente canceló',
      updatedAt: draft.updatedAt,
    });
    expect(voided).toMatchObject({ status: 'VOIDED', voidReason: 'El cliente canceló', number: 1 });
    await expectCode(
      new VoidQuoteUseCase(deps).execute(seller, draft.id, {
        reason: 'x',
        updatedAt: voided.updatedAt,
      }),
      'QUOTE_INVALID_TRANSITION',
      409,
    );
  });

  it('changes the expiry date only to a future date', async () => {
    const sent = await send(await createPpi());
    const change = new ChangeExpiryUseCase(deps);
    await expectCode(
      change.execute(seller, sent.id, { expiresAt: '2026-11-03', updatedAt: sent.updatedAt }),
      'INVALID_EXPIRY_DATE',
      400,
    );
    const changed = await change.execute(seller, sent.id, {
      expiresAt: '2026-12-01',
      updatedAt: sent.updatedAt,
    });
    expect(changed.expiresAt).toBe('2026-12-01');
    expect(eventsOf(sent.id).at(-1)).toMatchObject({
      type: 'EXPIRY_CHANGED',
      data: { from: '2026-11-18', to: '2026-12-01' },
    });
  });

  it('reassigns to an active user and notifies the listeners', async () => {
    const draft = await createPpi();
    const reassign = new ReassignQuoteUseCase(deps);
    await expectCode(
      reassign.execute(manager, draft.id, { ownerId: seller.id, updatedAt: draft.updatedAt }),
      'REASSIGN_SAME_OWNER',
      400,
    );
    const inactive = await actorFor('inactivo@empresa.co', 'SELLER', false);
    await expectCode(
      reassign.execute(manager, draft.id, { ownerId: inactive.id, updatedAt: draft.updatedAt }),
      'REASSIGN_TARGET_INVALID',
      400,
    );
    const moved = await reassign.execute(manager, draft.id, {
      ownerId: otherSeller.id,
      updatedAt: draft.updatedAt,
    });
    expect(moved.owner.id).toBe(otherSeller.id);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: draft.id, to: { id: otherSeller.id, name: 'otro' } }),
      expect.anything(),
    );
    await expectCode(new GetQuoteUseCase(deps).execute(seller, draft.id), 'QUOTE_NOT_FOUND', 404);
  });
});

describe('UpdateQuoteUseCase', () => {
  it('edits a draft without versions and keeps line snapshots', async () => {
    const draft = await createPpi();
    products.set(LAPTOP, product(LAPTOP, 'Portátil', '3000000', 'GENERAL_19'));
    const { quote, changed, versionNumber } = await new UpdateQuoteUseCase(deps).execute(
      seller,
      draft.id,
      {
        items: [
          { id: draft.items[0]?.id, productId: LAPTOP, quantity: '1' },
          { productId: SERVICE, quantity: '1.5' },
        ],
        updatedAt: draft.updatedAt,
      },
    );
    expect({ changed, versionNumber }).toEqual({ changed: true, versionNumber: null });
    expect(quote.items.map((item) => [item.unitPrice, item.quantity])).toEqual([
      ['2500000', '1'],
      ['100000', '1.5'],
    ]);
    expect(quotes.quotes.versions).toHaveLength(0);
  });

  it('requires what the customer asked for and creates a version when a sent quote changes', async () => {
    const sent = await send(await createPpi());
    const update = new UpdateQuoteUseCase(deps);
    await expectCode(
      update.execute(seller, sent.id, { shippingAmount: '0', updatedAt: sent.updatedAt }),
      'CUSTOMER_REQUEST_REQUIRED',
      400,
    );
    const result = await update.execute(seller, sent.id, {
      shippingAmount: '0',
      customerRequest: 'Sin envío, lo recogen',
      updatedAt: sent.updatedAt,
    });
    expect(result).toMatchObject({
      changed: true,
      versionNumber: 2,
      quote: { status: 'SENT', total: '5355000' },
    });
    expect(result.quote.expiresAt).toBe(sent.expiresAt);
    expect(quotes.quotes.versions.at(-1)).toMatchObject({
      number: 2,
      customerRequest: 'Sin envío, lo recogen',
      changes: {
        shippingAmount: { from: '20000', to: '0' },
        total: { from: '5375000', to: '5355000' },
      },
    });

    const unchanged = await update.execute(seller, sent.id, {
      shippingAmount: '0',
      updatedAt: result.quote.updatedAt,
    });
    expect(unchanged).toMatchObject({ changed: false, versionNumber: null });
    await expectCode(
      update.execute(seller, sent.id, {
        customerId: INACTIVE_CUSTOMER,
        updatedAt: result.quote.updatedAt,
      }),
      'QUOTE_CUSTOMER_LOCKED',
      400,
    );
  });

  it('lets a seller edit lines but not a discount above their limit (RN-14)', async () => {
    const draft = await createPpi(manager, '20');
    await new ReassignQuoteUseCase(deps).execute(manager, draft.id, {
      ownerId: seller.id,
      updatedAt: draft.updatedAt,
    });
    const current = await new GetQuoteUseCase(deps).execute(seller, draft.id);
    const update = new UpdateQuoteUseCase(deps);
    const edited = await update.execute(seller, draft.id, {
      items: [{ id: current.items[0]?.id, productId: LAPTOP, quantity: '3' }],
      discountPct: '20.00',
      updatedAt: current.updatedAt,
    });
    expect(edited.quote.discountPct).toBe('20');
    await expectCode(
      update.execute(seller, draft.id, { discountPct: '15', updatedAt: edited.quote.updatedAt }),
      'DISCOUNT_LIMIT_EXCEEDED',
      403,
    );
  });
});

describe('expiry, reactivation and duplicate', () => {
  async function expiredQuote() {
    const sent = await send(await createPpi());
    clock.advance(16 * 86_400_000);
    return sent;
  }

  it('expires due quotes once, with the system as actor', async () => {
    const sent = await expiredQuote();
    const expire = new ExpireQuotesUseCase(deps);
    expect(await expire.execute()).toBe(1);
    expect(await expire.execute()).toBe(0);
    expect(eventsOf(sent.id).at(-1)).toMatchObject({
      type: 'STATE_CHANGED',
      actorId: null,
      data: { from: 'SENT', to: 'EXPIRED' },
    });
  });

  it('reactivates without price changes keeping the request in the event note', async () => {
    const sent = await expiredQuote();
    await new ExpireQuotesUseCase(deps).execute();
    const expired = await new GetQuoteUseCase(deps).execute(seller, sent.id);
    const reactivate = new ReactivateQuoteUseCase(deps);
    await expectCode(
      reactivate.execute(seller, sent.id, { updatePrices: false, updatedAt: expired.updatedAt }),
      'CUSTOMER_REQUEST_REQUIRED',
      400,
    );
    const result = await reactivate.execute(seller, sent.id, {
      customerRequest: 'Sigue interesado',
      updatePrices: false,
      updatedAt: expired.updatedAt,
    });
    expect(result).toMatchObject({
      versionNumber: null,
      quote: { status: 'SENT', expiresAt: '2026-12-04' },
    });
    expect(result.quote.firstSentAt).toBe(sent.firstSentAt);
    expect(eventsOf(sent.id).at(-1)).toMatchObject({ note: 'Sigue interesado', versionId: null });
  });

  it('reactivates updating active prices into a new version and keeps inactive snapshots', async () => {
    const draft = await new CreateQuoteUseCase(deps).execute(seller, {
      customerId: CUSTOMER,
      items: [
        { productId: LAPTOP, quantity: '1' },
        { productId: SERVICE, quantity: '1' },
      ],
      discountPct: '0',
      shippingAmount: '0',
    });
    const sent = await send(draft);
    clock.advance(16 * 86_400_000);
    await new ExpireQuotesUseCase(deps).execute();
    products.set(LAPTOP, product(LAPTOP, 'Portátil', '2600000', 'GENERAL_19'));
    products.set(SERVICE, product(SERVICE, 'Instalación', '120000', 'EXEMPT', false));

    const preview = await new GetReactivationPreviewUseCase(deps).execute(seller, sent.id);
    expect(
      preview.lines.map((line) => [line.currentPrice, line.catalogPrice, line.productActive]),
    ).toEqual([
      ['2500000', '2600000', true],
      ['100000', '120000', false],
    ]);
    const expired = await new GetQuoteUseCase(deps).execute(seller, sent.id);
    const result = await new ReactivateQuoteUseCase(deps).execute(seller, sent.id, {
      customerRequest: 'Actualizar precios',
      updatePrices: true,
      updatedAt: expired.updatedAt,
    });
    expect(result.versionNumber).toBe(2);
    expect(result.keptInactiveProductIds).toEqual([SERVICE]);
    expect(result.quote.items.map((item) => item.unitPrice)).toEqual(['2600000', '100000']);
    const version = quotes.quotes.versions.at(-1);
    expect(eventsOf(sent.id).at(-1)).toMatchObject({ versionId: version?.id, note: null });
  });

  it('duplicates final quotes with current prices, omitting inactive products and resetting the discount', async () => {
    const draft = await new CreateQuoteUseCase(deps).execute(manager, {
      customerId: CUSTOMER,
      items: [
        { productId: LAPTOP, quantity: '1' },
        { productId: SERVICE, quantity: '2' },
      ],
      discountPct: '20',
      shippingAmount: '0',
    });
    await expectCode(
      new DuplicateQuoteUseCase(deps).execute(manager, draft.id),
      'QUOTE_NOT_DUPLICABLE',
      409,
    );
    const sent = await send(draft, manager);
    await new ChangeQuoteStatusUseCase(deps).execute(manager, sent.id, {
      to: 'REJECTED',
      updatedAt: sent.updatedAt,
    });
    products.set(SERVICE, product(SERVICE, 'Instalación', '100000', 'EXEMPT', false));
    products.set(LAPTOP, product(LAPTOP, 'Portátil', '2700000', 'GENERAL_19'));

    await new ReassignQuoteUseCase(deps).execute(manager, sent.id, {
      ownerId: seller.id,
      updatedAt: (await new GetQuoteUseCase(deps).execute(manager, sent.id)).updatedAt,
    });
    const result = await new DuplicateQuoteUseCase(deps).execute(seller, sent.id);
    expect(result).toMatchObject({
      omittedProductIds: [SERVICE],
      discountReset: true,
      quote: { status: 'DRAFT', number: 2, owner: { id: seller.id }, discountPct: '0' },
    });
    expect(result.quote.items.map((item) => item.unitPrice)).toEqual(['2700000']);
  });
});

describe('queries', () => {
  it('lists only own quotes for sellers and searches by number', async () => {
    const own = await createPpi();
    await createPpi(manager);
    const list = new ListQuotesUseCase(deps);
    const filter = { status: [] as QuoteStatus[], page: 1, pageSize: 20 };
    expect((await list.execute(seller, filter)).items.map((q) => q.id)).toEqual([own.id]);
    expect((await list.execute(manager, filter)).total).toBe(2);
    expect((await list.execute(manager, { ...filter, q: 'cot-0002' })).items[0]?.number).toBe(2);
    expect((await list.execute(manager, { ...filter, q: 'acme' })).total).toBe(2);
  });

  it('groups version and event of the same operation in the history', async () => {
    const draft = await createPpi(manager, '20');
    const sent = await send(draft, manager);
    await new VoidQuoteUseCase(deps).execute(manager, sent.id, {
      reason: 'Error',
      updatedAt: sent.updatedAt,
    });
    const history = await new GetQuoteHistoryUseCase(deps).execute(manager, sent.id);
    expect(history.map((entry) => entry.kind)).toEqual(['EVENT', 'VERSION', 'EVENT']);
    const [voided, version, override] = history;
    expect(voided).toMatchObject({ event: { type: 'STATE_CHANGED', note: 'Error' } });
    expect(version).toMatchObject({
      version: { number: 1, total: '4780000' },
      events: [{ type: 'STATE_CHANGED', data: { to: 'SENT' } }],
    });
    expect(override).toMatchObject({
      event: { type: 'DISCOUNT_OVERRIDE' },
      actor: { name: 'gerente' },
    });
  });
});
