import type { CreateInteractionRequest, InteractionDto, InteractionListDto } from '@zentia/shared';
import { request } from '../../../core/http-client';

export const interactionsService = {
  list: (query: {
    customerId?: string;
    quoteId?: string;
    withoutQuote?: 'true';
    page: number;
    pageSize: number;
  }) => request<InteractionListDto>('GET', '/interactions', { query }),
  create: (body: CreateInteractionRequest) =>
    request<InteractionDto>('POST', '/interactions', { body }),
};
