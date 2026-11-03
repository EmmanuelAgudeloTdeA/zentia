import type { ActiveStatusFilter } from '@zentia/shared';
import type { Customer, CustomerSearchTerms } from '../../domain/index.js';

export interface NewCustomer {
  name: string;
  nameKey: string;
  documentId: string;
  phone: string | null;
  email: string | null;
  createdById: string;
}

export interface CustomerUpdate {
  name?: string;
  nameKey?: string;
  documentId?: string;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export interface CustomerSearch {
  terms: CustomerSearchTerms | null;
  status: ActiveStatusFilter;
  skip: number;
  take: number;
}

export interface CustomerRepository {
  /** Lanza `CUSTOMER_DOCUMENT_TAKEN` ante la violación del único de `documentId`. */
  create(customer: NewCustomer): Promise<Customer>;
  update(id: string, changes: CustomerUpdate): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByDocumentId(documentId: string): Promise<Customer | null>;
  search(search: CustomerSearch): Promise<{ items: Customer[]; total: number }>;
}
