import type {
  ChangeOrderStatusRequest,
  OrderDto,
  OrderListDto,
  OrderStatus,
  OrderSummaryDto,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export const ordersService = {
  convert: (quoteId: string) => request<OrderDto>('POST', `/quotes/${quoteId}/order`),
  getByQuote: (quoteId: string) => request<OrderSummaryDto>('GET', `/quotes/${quoteId}/order`),
  list: ({
    statuses,
    ...query
  }: {
    statuses: readonly OrderStatus[];
    q?: string | undefined;
    page: number;
    pageSize: number;
  }) =>
    request<OrderListDto>('GET', '/orders', {
      query: { ...query, status: statuses.length > 0 ? statuses.join(',') : undefined },
    }),
  get: (id: string) => request<OrderDto>('GET', `/orders/${id}`),
  changeStatus: (id: string, body: ChangeOrderStatusRequest) =>
    request<OrderDto>('POST', `/orders/${id}/status`, { body }),
};
