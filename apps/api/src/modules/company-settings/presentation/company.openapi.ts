import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  brandingDtoSchema,
  companySettingsDtoSchema,
  logoUploadResultSchema,
  updateCommercialParametersSchema,
  updateCompanyProfileSchema,
  uploadLogoRequestSchema,
} from '@zentia/shared';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

const settingsResponse: ResponseConfig = {
  description: 'Configuración de la empresa (sin el logo; incluye hasLogo)',
  content: { 'application/json': { schema: companySettingsDtoSchema } },
};

const GUARD_ERRORS = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('FORBIDDEN, PASSWORD_CHANGE_REQUIRED'),
};

export function createCompanyOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];

  registry.registerPath({
    method: 'get',
    path: '/company/branding',
    tags: ['Company'],
    summary: 'Nombre y estado del logo para el login (público)',
    responses: {
      200: {
        description: 'Branding',
        content: { 'application/json': { schema: brandingDtoSchema } },
      },
      429: errorResponse('RATE_LIMITED'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/company/logo',
    tags: ['Company'],
    summary: 'Logo de la empresa (público, con ETag y caché de 5 min)',
    responses: {
      200: {
        description: 'Imagen binaria',
        content: {
          'image/png': { schema: { type: 'string', format: 'binary' } },
          'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        },
      },
      304: { description: 'Sin cambios (If-None-Match coincide con el ETag)' },
      404: errorResponse('LOGO_NOT_FOUND'),
      429: errorResponse('RATE_LIMITED'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/company/settings',
    tags: ['Company'],
    summary: 'Leer la configuración (cualquier usuario autenticado)',
    security,
    responses: { 200: settingsResponse, ...GUARD_ERRORS },
  });

  registry.registerPath({
    method: 'patch',
    path: '/company/profile',
    tags: ['Company'],
    summary: 'Editar datos, condiciones comerciales e idioma de los documentos (ADMIN)',
    security,
    request: {
      body: { content: { 'application/json': { schema: updateCompanyProfileSchema } } },
    },
    responses: { 200: settingsResponse, 400: errorResponse('VALIDATION_ERROR'), ...GUARD_ERRORS },
  });

  registry.registerPath({
    method: 'patch',
    path: '/company/parameters',
    tags: ['Company'],
    summary: 'Editar parámetros comerciales; valida X < N sobre el resultado combinado (ADMIN)',
    security,
    request: {
      body: { content: { 'application/json': { schema: updateCommercialParametersSchema } } },
    },
    responses: { 200: settingsResponse, 400: errorResponse('VALIDATION_ERROR'), ...GUARD_ERRORS },
  });

  registry.registerPath({
    method: 'put',
    path: '/company/logo',
    tags: ['Company'],
    summary: 'Subir el logo en base64: PNG o JPEG, máximo 512 KB decodificado (ADMIN)',
    security,
    request: {
      body: { content: { 'application/json': { schema: uploadLogoRequestSchema } } },
    },
    responses: {
      200: {
        description: 'Logo guardado',
        content: { 'application/json': { schema: logoUploadResultSchema } },
      },
      400: errorResponse('VALIDATION_ERROR, LOGO_INVALID_TYPE, LOGO_TOO_LARGE'),
      413: errorResponse('PAYLOAD_TOO_LARGE (body mayor a 1 MB)'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/company/logo',
    tags: ['Company'],
    summary: 'Quitar el logo; idempotente (ADMIN)',
    security,
    responses: { 204: { description: 'Logo eliminado o inexistente' }, ...GUARD_ERRORS },
  });

  return registry;
}
