import type { RequestHandler } from 'express';
import { AppError } from './app-error.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 404));
};
