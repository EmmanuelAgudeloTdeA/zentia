import type { DashboardSummaryDto } from '@zentia/shared';
import { request } from '../../../core/http-client';

export const dashboardService = {
  summary: (
    query: { from: string; to: string; ownerId?: string | undefined },
    signal?: AbortSignal,
  ) =>
    request<DashboardSummaryDto>('GET', '/dashboard/summary', {
      query,
      ...(signal ? { signal } : {}),
    }),
};
