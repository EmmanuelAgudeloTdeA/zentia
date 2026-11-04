import type {
  ChangeExpiryRequest,
  ChangeQuoteStatusRequest,
  CreateQuoteRequest,
  DuplicateQuoteResult,
  HistoryEntryDto,
  QuoteDto,
  QuoteListDto,
  QuoteStatus,
  ReactivateQuoteRequest,
  ReactivateQuoteResult,
  ReactivationPreview,
  ReassignQuoteRequest,
  UpdateQuoteRequest,
  UpdateQuoteResult,
  VoidQuoteRequest,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export interface QuotesListParams {
  statuses: readonly QuoteStatus[];
  q?: string | undefined;
  customerId?: string | undefined;
  ownerId?: string | undefined;
  sentFrom?: string | undefined;
  sentTo?: string | undefined;
  page: number;
  pageSize: number;
}

export const quotesService = {
  list: ({ statuses, ...query }: QuotesListParams, signal?: AbortSignal) =>
    request<QuoteListDto>('GET', '/quotes', {
      query: { ...query, status: statuses.length > 0 ? statuses.join(',') : undefined },
      ...(signal ? { signal } : {}),
    }),
  get: (id: string) => request<QuoteDto>('GET', `/quotes/${id}`),
  history: (id: string) => request<HistoryEntryDto[]>('GET', `/quotes/${id}/history`),
  create: (body: CreateQuoteRequest) => request<QuoteDto>('POST', '/quotes', { body }),
  update: (id: string, body: UpdateQuoteRequest) =>
    request<UpdateQuoteResult>('PATCH', `/quotes/${id}`, { body }),
  send: (id: string, updatedAt: string) =>
    request<QuoteDto>('POST', `/quotes/${id}/send`, { body: { updatedAt } }),
  changeStatus: (id: string, body: ChangeQuoteStatusRequest) =>
    request<QuoteDto>('POST', `/quotes/${id}/status`, { body }),
  void: (id: string, body: VoidQuoteRequest) =>
    request<QuoteDto>('POST', `/quotes/${id}/void`, { body }),
  changeExpiry: (id: string, body: ChangeExpiryRequest) =>
    request<QuoteDto>('PATCH', `/quotes/${id}/expiry`, { body }),
  reassign: (id: string, body: ReassignQuoteRequest) =>
    request<QuoteDto>('POST', `/quotes/${id}/reassign`, { body }),
  reactivationPreview: (id: string) =>
    request<ReactivationPreview>('GET', `/quotes/${id}/reactivation-preview`),
  reactivate: (id: string, body: ReactivateQuoteRequest) =>
    request<ReactivateQuoteResult>('POST', `/quotes/${id}/reactivate`, { body }),
  duplicate: (id: string) => request<DuplicateQuoteResult>('POST', `/quotes/${id}/duplicate`),
};
