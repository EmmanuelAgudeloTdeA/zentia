import type { CustomerDto } from '@zentia/shared';
import type { Customer } from '../domain/index.js';

export function toCustomerDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    name: customer.name,
    documentId: customer.documentId,
    phone: customer.phone,
    email: customer.email,
    isActive: customer.isActive,
    createdBy: customer.createdBy,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
