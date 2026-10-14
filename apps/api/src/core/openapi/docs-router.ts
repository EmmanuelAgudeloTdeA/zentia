import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { buildOpenApiDocument } from './build-document.js';

export function createDocsRouter(document: ReturnType<typeof buildOpenApiDocument>): Router {
  const router = Router();
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
