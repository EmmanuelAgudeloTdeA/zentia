import { apiErrorSchema, type ErrorCode } from '@zentia/shared';

export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN';

export type ApiErrorCode = ErrorCode | ClientErrorCode;

export interface ApiErrorIssue {
  path: string;
  code: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly params: Record<string, unknown> | undefined;
  readonly issues: ApiErrorIssue[] | undefined;

  constructor(
    code: ApiErrorCode,
    status: number,
    params?: Record<string, unknown>,
    issues?: ApiErrorIssue[],
  ) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.params = params;
    this.issues = issues;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) return new ApiError('UNKNOWN', status);
  const { code, params, issues } = parsed.data.error;
  return new ApiError(code, status, params, issues);
}

export function errorKey(error: unknown): string {
  return `errors.${isApiError(error) ? error.code : 'UNKNOWN'}`;
}
