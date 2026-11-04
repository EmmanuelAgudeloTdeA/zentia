import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  pdfQuerySchema,
  quoteDtoSchema,
  shareLinksDtoSchema,
  shareQuoteRequestSchema,
} from '@zentia/shared';
import { z } from 'zod';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

const GUARD = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('PASSWORD_CHANGE_REQUIRED'),
  404: errorResponse('QUOTE_NOT_FOUND (también si es ajena para un vendedor)'),
};

const params = z.object({ id: z.uuid() });

export function createDocumentsOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];
  const tags = ['Documents'];

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}/pdf',
    tags,
    security,
    summary: 'PDF de la cotización en documentLocale; purpose=send lo genera sin marca de agua',
    request: { params, query: pdfQuerySchema },
    responses: {
      200: {
        description: 'Archivo COT-0001.pdf',
        content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
      },
      500: errorResponse('PDF_GENERATION_FAILED'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}/share-links',
    tags,
    security,
    summary:
      'Enlaces wa.me y mailto con el mensaje en documentLocale (null si falta el dato, el estado no lo permite o el cliente de un Borrador está inactivo: unavailableReason)',
    request: { params },
    responses: {
      200: {
        description: 'Enlaces',
        content: { 'application/json': { schema: shareLinksDtoSchema } },
      },
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/quotes/{id}/share',
    tags,
    security,
    summary: 'Registrar el uso de un canal: un Borrador pasa a Enviada; una Enviada no cambia',
    request: {
      params,
      body: { content: { 'application/json': { schema: shareQuoteRequestSchema } } },
    },
    responses: {
      200: {
        description: 'Cotización',
        content: { 'application/json': { schema: quoteDtoSchema } },
      },
      400: errorResponse('SHARE_CHANNEL_UNAVAILABLE'),
      409: errorResponse('QUOTE_INVALID_TRANSITION, QUOTE_CONFLICT'),
      ...GUARD,
    },
  });

  return registry;
}
