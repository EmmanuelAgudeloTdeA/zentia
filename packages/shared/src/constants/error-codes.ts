export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_JSON',
  'NOT_FOUND',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
