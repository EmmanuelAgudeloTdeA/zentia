import type { ApiErrorBody } from '@zentia/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

type Issues = NonNullable<ApiErrorBody['error']['issues']>;

function hasType(error: unknown): error is { type: string } {
  return typeof error === 'object' && error !== null && 'type' in error;
}

function toAppError(error: unknown): { appError: AppError; issues?: Issues } {
  if (error instanceof AppError) return { appError: error };
  if (error instanceof ZodError) {
    return {
      appError: new AppError('VALIDATION_ERROR', 400),
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code })),
    };
  }
  if (hasType(error) && error.type === 'entity.parse.failed') {
    return { appError: new AppError('MALFORMED_JSON', 400) };
  }
  if (hasType(error) && error.type === 'entity.too.large') {
    return { appError: new AppError('PAYLOAD_TOO_LARGE', 413) };
  }
  return { appError: new AppError('INTERNAL_ERROR', 500) };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const { appError, issues } = toAppError(error);
  if (appError.status >= 500) {
    req.log.error({ err: error }, 'Unhandled error');
  }
  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      ...(appError.params ? { params: appError.params } : {}),
      ...(issues ? { issues } : {}),
    },
  };
  res.status(appError.status).json(body);
};
