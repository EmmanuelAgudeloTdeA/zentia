import {
  DOCUMENT_MATCHES_LIMIT,
  toSearchKey,
  type CustomerChanges,
  type CustomerDto,
  type CustomerInput,
  type CustomerListDto,
  type CustomerListFilter,
  type DocumentMatchesDto,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import {
  customerSearchTerms,
  documentIdPrefixes,
  prepareContact,
  type Customer,
} from '../domain/index.js';
import type { CustomersInfrastructure } from './customers-dependencies.js';
import { toCustomerDto } from './customer-dto.js';
import type { CustomerUpdate } from './ports/index.js';

type Deps = CustomersInfrastructure;

async function findOrFail(deps: Deps, id: string): Promise<Customer> {
  const customer = await deps.customers.findById(id);
  if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', 404);
  return customer;
}

function contactOrFail(contact: { phone: string | null; email: string | null }) {
  const prepared = prepareContact(contact);
  if (!prepared.ok) throw new AppError(prepared.violation, 400);
  return prepared;
}

export class CreateCustomerUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(actorId: string, input: CustomerInput): Promise<CustomerDto> {
    const { phone, email } = contactOrFail(input);
    if (await this.deps.customers.findByDocumentId(input.documentId)) {
      throw new AppError('CUSTOMER_DOCUMENT_TAKEN', 409);
    }
    const customer = await this.deps.customers.create({
      name: input.name,
      nameKey: toSearchKey(input.name),
      documentId: input.documentId,
      phone,
      email,
      createdById: actorId,
    });
    return toCustomerDto(customer);
  }
}

export class UpdateCustomerUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(id: string, changes: CustomerChanges): Promise<CustomerDto> {
    const current = await findOrFail(this.deps, id);
    const update: CustomerUpdate = {};

    if (changes.name !== undefined) {
      update.name = changes.name;
      update.nameKey = toSearchKey(changes.name);
    }
    if (changes.documentId !== undefined && changes.documentId !== current.documentId) {
      const owner = await this.deps.customers.findByDocumentId(changes.documentId);
      if (owner && owner.id !== id) throw new AppError('CUSTOMER_DOCUMENT_TAKEN', 409);
      update.documentId = changes.documentId;
    }
    if (changes.phone !== undefined || changes.email !== undefined) {
      const { phone, email } = contactOrFail({
        phone: changes.phone !== undefined ? changes.phone : current.phone,
        email: changes.email !== undefined ? changes.email : current.email,
      });
      update.phone = phone;
      update.email = email;
    }
    if (changes.isActive !== undefined) update.isActive = changes.isActive;

    return toCustomerDto(await this.deps.customers.update(id, update));
  }
}

export class GetCustomerUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(id: string): Promise<CustomerDto> {
    return toCustomerDto(await findOrFail(this.deps, id));
  }
}

export class SearchCustomersUseCase {
  constructor(private readonly deps: Deps) {}

  async execute({ q, status, page, pageSize }: CustomerListFilter): Promise<CustomerListDto> {
    const result = await this.deps.customers.search({
      terms: q ? customerSearchTerms(q) : null,
      status,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: result.items.map(toCustomerDto), total: result.total, page, pageSize };
  }
}

export class FindDocumentMatchesUseCase {
  constructor(private readonly deps: Deps) {}

  /** `documentId` llega normalizado; el aviso no bloquea, el único de la BD sí. */
  async execute(documentId: string): Promise<DocumentMatchesDto> {
    const prefixes = documentIdPrefixes(documentId);
    if (!prefixes) return { items: [] };
    const matches = await this.deps.customers.findDocumentMatches(
      documentId,
      prefixes,
      DOCUMENT_MATCHES_LIMIT,
    );
    return { items: matches.map(toCustomerDto) };
  }
}
