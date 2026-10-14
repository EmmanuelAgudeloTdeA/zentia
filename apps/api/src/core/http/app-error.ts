import type { ErrorCode } from '@zentia/shared';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    readonly params?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'AppError';
  }
}
