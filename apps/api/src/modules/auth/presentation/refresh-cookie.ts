import type { CookieOptions, Request, Response } from 'express';
import { readCookie } from '../../../core/http/index.js';

export const REFRESH_COOKIE = 'zentia_rt';

const BASE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/auth',
};

export function readRefreshCookie(req: Request): string | undefined {
  return readCookie(req.headers.cookie, REFRESH_COOKIE);
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, { ...BASE_OPTIONS, expires: expiresAt });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, BASE_OPTIONS);
}
