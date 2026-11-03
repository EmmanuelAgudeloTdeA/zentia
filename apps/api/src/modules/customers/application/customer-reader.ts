import { AppError } from '../../../core/http/index.js';
import type { CustomersInfrastructure } from './customers-dependencies.js';

export interface CustomerSnapshotDto {
  readonly id: string;
  readonly name: string;
  readonly documentId: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly isActive: boolean;
}

/** Lectura de clientes para otros módulos (M4, M5). */
export interface CustomerReader {
  getById(id: string): Promise<CustomerSnapshotDto>;
  /** Para cotizaciones nuevas: rechaza clientes inactivos. */
  getActiveById(id: string): Promise<CustomerSnapshotDto>;
}

export class RepositoryCustomerReader implements CustomerReader {
  constructor(private readonly deps: CustomersInfrastructure) {}

  async getById(id: string): Promise<CustomerSnapshotDto> {
    const customer = await this.deps.customers.findById(id);
    if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', 404);
    const { name, documentId, phone, email, isActive } = customer;
    return Object.freeze({ id, name, documentId, phone, email, isActive });
  }

  async getActiveById(id: string): Promise<CustomerSnapshotDto> {
    const customer = await this.getById(id);
    if (!customer.isActive) throw new AppError('CUSTOMER_INACTIVE', 409);
    return customer;
  }
}
