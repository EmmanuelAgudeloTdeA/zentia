import type { CustomerRepository } from './ports/index.js';

export interface CustomersInfrastructure {
  customers: CustomerRepository;
}
