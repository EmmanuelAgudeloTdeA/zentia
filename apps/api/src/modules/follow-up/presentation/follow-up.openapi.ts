import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  createInteractionRequestSchema,
  interactionDtoSchema,
  interactionListDtoSchema,
  listInteractionsQuerySchema,
  listNotificationsQuerySchema,
  notificationListDtoSchema,
  unreadCountDtoSchema,
} from '@zentia/shared';
import { z } from 'zod';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

function json(description: string, schema: z.ZodType): ResponseConfig {
  return { description, content: { 'application/json': { schema } } };
}

const GUARD = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('PASSWORD_CHANGE_REQUIRED'),
};

export function createFollowUpOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];

  registry.registerPath({
    method: 'post',
    path: '/interactions',
    tags: ['Interactions'],
    security,
    summary: 'Registrar una observación (solo agregar; no se edita ni se borra)',
    request: {
      body: { content: { 'application/json': { schema: createInteractionRequestSchema } } },
    },
    responses: {
      201: json('Interacción', interactionDtoSchema),
      400: errorResponse('VALIDATION_ERROR, INTERACTION_QUOTE_MISMATCH, INTERACTION_FUTURE_DATE'),
      404: errorResponse('CUSTOMER_NOT_FOUND, QUOTE_NOT_FOUND'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/interactions',
    tags: ['Interactions'],
    security,
    summary: 'Historial por cliente o cotización (vendedor: sin las de cotizaciones ajenas)',
    request: { query: listInteractionsQuerySchema },
    responses: {
      200: json('Interacciones', interactionListDtoSchema),
      404: errorResponse('QUOTE_NOT_FOUND'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/notifications',
    tags: ['Notifications'],
    security,
    summary: 'Notificaciones propias, más recientes primero',
    request: { query: listNotificationsQuerySchema },
    responses: { 200: json('Notificaciones', notificationListDtoSchema), ...GUARD },
  });

  registry.registerPath({
    method: 'get',
    path: '/notifications/unread-count',
    tags: ['Notifications'],
    security,
    summary: 'Cantidad de notificaciones sin leer',
    responses: { 200: json('Contador', unreadCountDtoSchema), ...GUARD },
  });

  registry.registerPath({
    method: 'post',
    path: '/notifications/{id}/read',
    tags: ['Notifications'],
    security,
    summary: 'Marcar una como leída (idempotente)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      204: { description: 'Leída' },
      404: errorResponse('NOTIFICATION_NOT_FOUND'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/notifications/read-all',
    tags: ['Notifications'],
    security,
    summary: 'Marcar todas como leídas',
    responses: { 204: { description: 'Leídas' }, ...GUARD },
  });

  return registry;
}
