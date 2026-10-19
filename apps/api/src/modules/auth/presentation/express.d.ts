import type { Actor } from '../domain/index.js';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

export {};
