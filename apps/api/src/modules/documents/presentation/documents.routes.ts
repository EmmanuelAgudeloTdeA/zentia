import { pdfQuerySchema, shareQuoteRequestSchema } from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  GenerateQuotePdfUseCase,
  GetShareLinksUseCase,
  ShareQuoteUseCase,
} from '../application/index.js';

export interface DocumentsRouterDependencies {
  pdf: GenerateQuotePdfUseCase;
  shareLinks: GetShareLinksUseCase;
  share: ShareQuoteUseCase;
  requireAuth: RequireAuth;
}

const idSchema = z.uuid();

function quoteId(req: Request): string {
  const parsed = idSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError('QUOTE_NOT_FOUND', 404);
  return parsed.data;
}

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

/** Se monta bajo `/quotes` para conservar el recurso: `/quotes/:id/pdf`, `/share-links`, `/share`. */
export function createDocumentsRouter(deps: DocumentsRouterDependencies): Router {
  const router = Router();
  const authenticated = deps.requireAuth();

  router.get('/:id/pdf', authenticated, async (req, res) => {
    const { purpose } = pdfQuerySchema.parse(req.query);
    const { fileName, content } = await deps.pdf.execute(actorOf(req), quoteId(req), purpose);
    res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${fileName}"`)
      .set('Cache-Control', 'no-store')
      .send(content);
  });

  router.get('/:id/share-links', authenticated, async (req, res) => {
    res.json(await deps.shareLinks.execute(actorOf(req), quoteId(req)));
  });

  router.post('/:id/share', authenticated, async (req, res) => {
    const id = quoteId(req);
    res.json(await deps.share.execute(actorOf(req), id, shareQuoteRequestSchema.parse(req.body)));
  });

  return router;
}
