import type {
  ActiveStatusFilter,
  CreateCustomerRequest,
  CustomerDto,
  CustomerListDto,
  DocumentMatchesDto,
  UpdateCustomerRequest,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export interface CustomersListParams {
  q?: string | undefined;
  status: ActiveStatusFilter;
  page: number;
  pageSize: number;
}

export const customersService = {
  list: (query: CustomersListParams, signal?: AbortSignal) =>
    request<CustomerListDto>('GET', '/customers', {
      query: { ...query },
      ...(signal ? { signal } : {}),
    }),
  documentMatches: (documentId: string) =>
    request<DocumentMatchesDto>('GET', '/customers/document-matches', { query: { documentId } }),
  get: (id: string) => request<CustomerDto>('GET', `/customers/${id}`),
  create: (body: CreateCustomerRequest) => request<CustomerDto>('POST', '/customers', { body }),
  update: (id: string, body: UpdateCustomerRequest) =>
    request<CustomerDto>('PATCH', `/customers/${id}`, { body }),
};
