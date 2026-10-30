import {
  updateCommercialParametersSchema,
  updateCompanyProfileSchema,
  uploadLogoRequestSchema,
} from '@zentia/shared';
import express, { Router, type RequestHandler } from 'express';
import type { RequireAuth } from '../../../core/modules/index.js';
import type {
  DeleteLogoUseCase,
  GetBrandingUseCase,
  GetLogoUseCase,
  GetSettingsUseCase,
  UpdateParametersUseCase,
  UpdateProfileUseCase,
  UploadLogoUseCase,
} from '../application/index.js';

export const LOGO_BODY_LIMIT = '1mb';

export interface CompanyRouterDependencies {
  getBranding: GetBrandingUseCase;
  getLogo: GetLogoUseCase;
  getSettings: GetSettingsUseCase;
  updateProfile: UpdateProfileUseCase;
  updateParameters: UpdateParametersUseCase;
  uploadLogo: UploadLogoUseCase;
  deleteLogo: DeleteLogoUseCase;
  publicLimiter: RequestHandler;
  requireAuth: RequireAuth;
}

/** Parser propio del logo (1 MB); se monta antes del `express.json()` global de 100 KB. */
export function createCompanyBodyParsers(): Router {
  const router = Router();
  router.put('/logo', express.json({ limit: LOGO_BODY_LIMIT }));
  return router;
}

export function createCompanyRouter(deps: CompanyRouterDependencies): Router {
  const router = Router();
  const adminOnly = deps.requireAuth({ roles: ['ADMIN'] });

  router.get('/branding', deps.publicLimiter, async (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(await deps.getBranding.execute());
  });

  router.get('/logo', deps.publicLimiter, async (req, res) => {
    const logo = await deps.getLogo.execute();
    const etag = `"logo-${logo.version}"`;
    res.set({ 'Cache-Control': 'public, max-age=300', ETag: etag });
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.type(logo.mimeType).send(logo.bytes);
  });

  router.get('/settings', deps.requireAuth(), async (_req, res) => {
    res.json(await deps.getSettings.execute());
  });

  router.patch('/profile', adminOnly, async (req, res) => {
    const changes = updateCompanyProfileSchema.parse(req.body);
    res.json(await deps.updateProfile.execute(changes));
  });

  router.patch('/parameters', adminOnly, async (req, res) => {
    const changes = updateCommercialParametersSchema.parse(req.body);
    res.json(await deps.updateParameters.execute(changes));
  });

  router.put('/logo', adminOnly, async (req, res) => {
    res.json(await deps.uploadLogo.execute(uploadLogoRequestSchema.parse(req.body)));
  });

  router.delete('/logo', adminOnly, async (_req, res) => {
    await deps.deleteLogo.execute();
    res.status(204).end();
  });

  return router;
}
