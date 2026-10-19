import type { ErrorCode } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { canAccess, type Actor } from '../domain/index.js';

// Con alcance OWN, un recurso ajeno responde el "no encontrado" del módulo para no revelar que existe.
export function assertCanAccess(actor: Actor, ownerId: string, notFoundCode: ErrorCode): void {
  if (!canAccess(actor, ownerId)) throw new AppError(notFoundCode, 404);
}
