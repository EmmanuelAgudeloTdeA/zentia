import type { CalibrationStatusDto, FollowUpMessageDto, ProbabilityDto } from '@zentia/shared';
import { request } from '../../../core/http-client';

export const aiService = {
  suggestMessage: (quoteId: string) =>
    request<FollowUpMessageDto>('POST', `/quotes/${quoteId}/follow-up-message`),
  getProbabilities: (quoteIds: readonly string[], signal?: AbortSignal) =>
    request<ProbabilityDto[]>('GET', '/ai/probabilities', {
      query: { quoteIds: quoteIds.join(',') },
      ...(signal ? { signal } : {}),
    }),
  getCalibrationStatus: () => request<CalibrationStatusDto>('GET', '/ai/calibration-status'),
};
