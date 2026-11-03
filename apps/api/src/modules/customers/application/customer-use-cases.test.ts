import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import {
  createInMemoryCustomers,
  type InMemoryCustomers,
} from '../../../test/in-memory-customers.js';
import { RepositoryCustomerReader } from './customer-reader.js';
import {
  CreateCustomerUseCase,
  SearchCustomersUseCase,
  UpdateCustomerUseCase,
} from './customer-use-cases.js';

const ACTOR = '6f1c2b3a-1d2e-4f5a-8b9c-0d1e2f3a4b5c';
let infra: InMemoryCustomers;

beforeEach(() => {
  infra = createInMemoryCustomers(() => 'Ana');
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

function create(overrides: Record<string, string | null> = {}) {
  return new CreateCustomerUseCase(infra).execute(ACTOR, {
    name: 'José Pérez',
    documentId: '9001234567',
    phone: '300 123 4567',
    email: null,
    ...overrides,
  });
}

describe('CreateCustomerUseCase', () => {
  it('normalizes the phone and records the creator', async () => {
    const customer = await create();
    expect(customer).toMatchObject({
      phone: '573001234567',
      isActive: true,
      createdBy: { id: ACTOR, name: 'Ana' },
    });
  });

  it('rejects a duplicated document, an invalid phone and a missing contact', async () => {
    await create();
    await expectCode(create(), 'CUSTOMER_DOCUMENT_TAKEN', 409);
    await expectCode(create({ documentId: '11111', phone: '123' }), 'INVALID_PHONE', 400);
    await expectCode(
      create({ documentId: '22222', phone: null, email: null }),
      'CUSTOMER_CONTACT_REQUIRED',
      400,
    );
  });
});

describe('UpdateCustomerUseCase', () => {
  it('validates the contact on the combined result', async () => {
    const customer = await create({ email: 'jose@acme.co' });
    const update = new UpdateCustomerUseCase(infra);

    expect(await update.execute(customer.id, { phone: null })).toMatchObject({
      phone: null,
      email: 'jose@acme.co',
    });
    await expectCode(
      update.execute(customer.id, { email: null }),
      'CUSTOMER_CONTACT_REQUIRED',
      400,
    );
  });

  it('rejects a document owned by another customer and unknown ids', async () => {
    await create({ documentId: '11111' });
    const other = await create({ documentId: '22222' });
    const update = new UpdateCustomerUseCase(infra);

    await expectCode(
      update.execute(other.id, { documentId: '11111' }),
      'CUSTOMER_DOCUMENT_TAKEN',
      409,
    );
    expect(await update.execute(other.id, { documentId: '22222', isActive: false })).toMatchObject({
      isActive: false,
    });
    await expectCode(update.execute(ACTOR, { name: 'X' }), 'CUSTOMER_NOT_FOUND', 404);
  });
});

describe('SearchCustomersUseCase', () => {
  it('finds without accents, by normalized document and by phone digits', async () => {
    await create();
    await create({ name: 'María Gómez', documentId: '1036555444', phone: '310 555 0000' });
    const search = new SearchCustomersUseCase(infra);
    const names = async (q: string) =>
      (await search.execute({ q, status: 'active', page: 1, pageSize: 20 })).items.map(
        (c) => c.name,
      );

    expect(await names('jose')).toEqual(['José Pérez']);
    expect(await names('900.123')).toEqual(['José Pérez']);
    expect(await names('310 555')).toEqual(['María Gómez']);
    expect(await names('MARIA')).toEqual(['María Gómez']);
  });
});

describe('RepositoryCustomerReader', () => {
  it('rejects inactive customers only for new quotes', async () => {
    const customer = await create();
    await new UpdateCustomerUseCase(infra).execute(customer.id, { isActive: false });
    const reader = new RepositoryCustomerReader(infra);

    expect(await reader.getById(customer.id)).toMatchObject({ id: customer.id, isActive: false });
    await expectCode(reader.getActiveById(customer.id), 'CUSTOMER_INACTIVE', 409);
    await expectCode(reader.getById(ACTOR), 'CUSTOMER_NOT_FOUND', 404);
  });
});
