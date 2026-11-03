import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../../core/http/index.js';
import type {
  CustomerRepository,
  CustomerSearch,
  CustomerUpdate,
  CustomersInfrastructure,
  NewCustomer,
} from '../application/index.js';
import type { Customer } from '../domain/index.js';

const include = { createdBy: { select: { id: true, name: true } } } as const;

type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof include }>;

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    documentId: row.documentId,
    phone: row.phone,
    email: row.email,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function translateUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError('CUSTOMER_DOCUMENT_TAKEN', 409);
  }
  throw error;
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async create(customer: NewCustomer): Promise<Customer> {
    try {
      return toCustomer(await this.db.customer.create({ data: customer, include }));
    } catch (error) {
      return translateUniqueViolation(error);
    }
  }

  async update(id: string, changes: CustomerUpdate): Promise<Customer> {
    try {
      return toCustomer(await this.db.customer.update({ where: { id }, data: changes, include }));
    } catch (error) {
      return translateUniqueViolation(error);
    }
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.db.customer.findUnique({ where: { id }, include });
    return row ? toCustomer(row) : null;
  }

  async findByDocumentId(documentId: string): Promise<Customer | null> {
    const row = await this.db.customer.findUnique({ where: { documentId }, include });
    return row ? toCustomer(row) : null;
  }

  async search({ terms, status, skip, take }: CustomerSearch) {
    const or: Prisma.CustomerWhereInput[] = [];
    if (terms) {
      or.push({ nameKey: { contains: terms.nameKey } }, { email: { contains: terms.email } });
      if (terms.documentId) or.push({ documentId: { contains: terms.documentId } });
      if (terms.phoneDigits) or.push({ phone: { contains: terms.phoneDigits } });
    }
    const where: Prisma.CustomerWhereInput = {
      ...(status === 'all' ? {} : { isActive: status === 'active' }),
      ...(or.length > 0 ? { OR: or } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.customer.findMany({ where, include, orderBy: { nameKey: 'asc' }, skip, take }),
      this.db.customer.count({ where }),
    ]);
    return { items: rows.map(toCustomer), total };
  }
}

export function createPrismaCustomersInfrastructure(prisma: PrismaClient): CustomersInfrastructure {
  return { customers: new PrismaCustomerRepository(prisma) };
}
