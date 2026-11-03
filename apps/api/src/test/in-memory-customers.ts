import { randomUUID } from 'node:crypto';
import { AppError } from '../core/http/index.js';
import type {
  Customer,
  CustomerRepository,
  CustomersInfrastructure,
} from '../modules/customers/index.js';

type Stored = Customer & { nameKey: string };

export class InMemoryCustomerRepository implements CustomerRepository {
  readonly customers = new Map<string, Stored>();

  constructor(private readonly userName: (id: string) => string = () => 'Usuario') {}

  private toCustomer({ nameKey: _nameKey, ...customer }: Stored): Customer {
    return customer;
  }

  private assertDocumentFree(documentId: string, id?: string) {
    const owner = [...this.customers.values()].find((c) => c.documentId === documentId);
    if (owner && owner.id !== id) throw new AppError('CUSTOMER_DOCUMENT_TAKEN', 409);
  }

  async create(input: Parameters<CustomerRepository['create']>[0]): Promise<Customer> {
    this.assertDocumentFree(input.documentId);
    const now = new Date();
    const { createdById, ...data } = input;
    const stored: Stored = {
      ...data,
      id: randomUUID(),
      isActive: true,
      createdBy: { id: createdById, name: this.userName(createdById) },
      createdAt: now,
      updatedAt: now,
    };
    this.customers.set(stored.id, stored);
    return this.toCustomer(stored);
  }

  async update(id: string, changes: Parameters<CustomerRepository['update']>[1]) {
    const current = this.customers.get(id);
    if (!current) throw new Error(`Customer ${id} not found`);
    if (changes.documentId) this.assertDocumentFree(changes.documentId, id);
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const updated: Stored = { ...current, ...defined, updatedAt: new Date() };
    this.customers.set(id, updated);
    return this.toCustomer(updated);
  }

  async findById(id: string) {
    const stored = this.customers.get(id);
    return stored ? this.toCustomer(stored) : null;
  }

  async findByDocumentId(documentId: string) {
    const stored = [...this.customers.values()].find((c) => c.documentId === documentId);
    return stored ? this.toCustomer(stored) : null;
  }

  async search({ terms, status, skip, take }: Parameters<CustomerRepository['search']>[0]) {
    const matches = [...this.customers.values()]
      .filter((c) => status === 'all' || c.isActive === (status === 'active'))
      .filter(
        (c) =>
          !terms ||
          c.nameKey.includes(terms.nameKey) ||
          (c.email ?? '').includes(terms.email) ||
          (terms.documentId !== null && c.documentId.includes(terms.documentId)) ||
          (terms.phoneDigits !== null && (c.phone ?? '').includes(terms.phoneDigits)),
      )
      .sort((a, b) => a.nameKey.localeCompare(b.nameKey));
    return {
      items: matches.slice(skip, skip + take).map((c) => this.toCustomer(c)),
      total: matches.length,
    };
  }
}

export interface InMemoryCustomers extends CustomersInfrastructure {
  customers: InMemoryCustomerRepository;
}

export function createInMemoryCustomers(userName?: (id: string) => string): InMemoryCustomers {
  return { customers: new InMemoryCustomerRepository(userName) };
}
