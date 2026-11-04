import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  changeExpiryRequestSchema,
  changeQuoteStatusRequestSchema,
  createQuoteRequestSchema,
  duplicateQuoteResultSchema,
  historyEntryDtoSchema,
  listQuotesQuerySchema,
  quoteDtoSchema,
  quoteListDtoSchema,
  quoteMutationSchema,
  reactivateQuoteRequestSchema,
  reactivateQuoteResultSchema,
  reactivationPreviewSchema,
  reassignQuoteRequestSchema,
  updateQuoteRequestSchema,
  updateQuoteResultSchema,
  voidQuoteRequestSchema,
} from '@zentia/shared';
import { z } from 'zod';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

function json(description: string, schema: z.ZodType): ResponseConfig {
  return { description, content: { 'application/json': { schema } } };
}

function body(schema: z.ZodType) {
  return { content: { 'application/json': { schema } } };
}

const GUARD = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('FORBIDDEN, PASSWORD_CHANGE_REQUIRED, DISCOUNT_LIMIT_EXCEEDED (params.limit)'),
  404: errorResponse('QUOTE_NOT_FOUND (también si es ajena para un vendedor)'),
};

const params = z.object({ id: z.uuid() });
const quoteResponse = json('Cotización', quoteDtoSchema);

export function createQuotesOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];
  const tags = ['Quotes'];

  registry.registerPath({
    method: 'get',
    path: '/quotes',
    tags,
    security,
    summary:
      'Listar cotizaciones (vendedor: solo las propias); status en CSV; sentFrom/sentTo filtran por firstSentAt (días de Bogotá)',
    request: { query: listQuotesQuerySchema },
    responses: {
      200: json('Página de cotizaciones', quoteListDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/quotes',
    tags,
    security,
    summary: 'Crear borrador; el back recalcula los totales y toma el consecutivo',
    request: { body: body(createQuoteRequestSchema) },
    responses: {
      201: quoteResponse,
      400: errorResponse(
        'VALIDATION_ERROR, CUSTOMER_INACTIVE, PRODUCT_INACTIVE, PRODUCT_NOT_FOUND, DUPLICATE_PRODUCT_LINE, QUOTE_AMOUNT_TOO_LARGE',
      ),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}',
    tags,
    security,
    summary: 'Detalle con líneas, totales y allowedActions del actor',
    request: { params },
    responses: { 200: quoteResponse, ...GUARD },
  });

  registry.registerPath({
    method: 'patch',
    path: '/quotes/{id}',
    tags,
    security,
    summary: 'Editar Borrador (sin versión) o Enviada (versión nueva con customerRequest)',
    request: { params, body: body(updateQuoteRequestSchema) },
    responses: {
      200: json('Resultado de la edición', updateQuoteResultSchema),
      400: errorResponse(
        'CUSTOMER_REQUEST_REQUIRED, QUOTE_CUSTOMER_LOCKED, CUSTOMER_INACTIVE, QUOTE_AMOUNT_TOO_LARGE, ...',
      ),
      409: errorResponse('QUOTE_NOT_EDITABLE, QUOTE_CONFLICT'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}/history',
    tags,
    security,
    summary: 'Historial unificado: versiones y eventos agrupados por operación',
    request: { params },
    responses: { 200: json('Historial', z.array(historyEntryDtoSchema)), ...GUARD },
  });

  const transitions = [
    [
      'post',
      'send',
      'Marcar como enviada (versión 1 y vencimiento)',
      quoteMutationSchema,
      'QUOTE_INVALID_TRANSITION, QUOTE_CONFLICT',
    ],
    [
      'post',
      'status',
      'Aprobar o rechazar una Enviada',
      changeQuoteStatusRequestSchema,
      'QUOTE_INVALID_TRANSITION, QUOTE_EXPIRED, QUOTE_CONFLICT',
    ],
    [
      'post',
      'void',
      'Anular con motivo',
      voidQuoteRequestSchema,
      'QUOTE_INVALID_TRANSITION, QUOTE_CONFLICT',
    ],
    [
      'patch',
      'expiry',
      'Cambiar la fecha de vencimiento (fecha futura, solo Enviada)',
      changeExpiryRequestSchema,
      'QUOTE_NOT_EDITABLE, QUOTE_CONFLICT; 400 INVALID_EXPIRY_DATE',
    ],
    [
      'post',
      'reassign',
      'Reasignar a otro usuario activo (MANAGER, ADMIN)',
      reassignQuoteRequestSchema,
      'QUOTE_INVALID_TRANSITION, QUOTE_CONFLICT; 400 REASSIGN_TARGET_INVALID, REASSIGN_SAME_OWNER',
    ],
  ] as const;
  for (const [method, action, summary, schema, conflicts] of transitions) {
    registry.registerPath({
      method,
      path: `/quotes/{id}/${action}`,
      tags,
      security,
      summary,
      request: { params, body: body(schema) },
      responses: { 200: quoteResponse, 409: errorResponse(conflicts), ...GUARD },
    });
  }

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}/reactivation-preview',
    tags,
    security,
    summary: 'Vista previa de precios para reactivar una Vencida',
    request: { params },
    responses: {
      200: json('Vista previa', reactivationPreviewSchema),
      409: errorResponse('QUOTE_INVALID_TRANSITION'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/quotes/{id}/reactivate',
    tags,
    security,
    summary: 'Reactivar una Vencida, con opción de actualizar precios',
    request: { params, body: body(reactivateQuoteRequestSchema) },
    responses: {
      200: json('Cotización reactivada', reactivateQuoteResultSchema),
      400: errorResponse('CUSTOMER_REQUEST_REQUIRED, QUOTE_AMOUNT_TOO_LARGE'),
      409: errorResponse('QUOTE_INVALID_TRANSITION, QUOTE_CONFLICT'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/quotes/{id}/duplicate',
    tags,
    security,
    summary: 'Duplicar una Aprobada o Rechazada con precios vigentes',
    request: { params },
    responses: {
      201: json('Borrador nuevo', duplicateQuoteResultSchema),
      400: errorResponse('CUSTOMER_INACTIVE, QUOTE_EMPTY, QUOTE_AMOUNT_TOO_LARGE'),
      409: errorResponse('QUOTE_NOT_DUPLICABLE'),
      ...GUARD,
    },
  });

  return registry;
}
