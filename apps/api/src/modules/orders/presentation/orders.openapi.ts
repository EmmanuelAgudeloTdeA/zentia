import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  changeOrderStatusRequestSchema,
  listOrdersQuerySchema,
  orderDtoSchema,
  orderListDtoSchema,
  orderSummaryDtoSchema,
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

const params = z.object({ id: z.uuid() });

export function createOrdersOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];
  const tags = ['Orders'];

  registry.registerPath({
    method: 'post',
    path: '/quotes/{id}/order',
    tags,
    security,
    summary: 'Convertir una cotización Aprobada en pedido (copia fija de líneas y totales)',
    request: { params },
    responses: {
      201: json('Pedido PED-0001', orderDtoSchema),
      404: errorResponse('QUOTE_NOT_FOUND'),
      409: errorResponse('QUOTE_NOT_APPROVED, ORDER_ALREADY_EXISTS'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/quotes/{id}/order',
    tags,
    security,
    summary: 'Pedido de una cotización, si existe',
    request: { params },
    responses: {
      200: json('Resumen del pedido', orderSummaryDtoSchema),
      404: errorResponse('QUOTE_NOT_FOUND, ORDER_NOT_FOUND'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/orders',
    tags,
    security,
    summary: 'Listar pedidos (vendedor: los de sus cotizaciones); status en CSV',
    request: { query: listOrdersQuerySchema },
    responses: { 200: json('Página de pedidos', orderListDtoSchema), ...GUARD },
  });

  registry.registerPath({
    method: 'get',
    path: '/orders/{id}',
    tags,
    security,
    summary: 'Detalle del pedido con líneas, totales, fechas y allowedActions',
    request: { params },
    responses: {
      200: json('Pedido', orderDtoSchema),
      404: errorResponse('ORDER_NOT_FOUND'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/orders/{id}/status',
    tags,
    security,
    summary: 'Cambiar estado: IN_PROGRESS, DELIVERED o CANCELLED (con motivo opcional)',
    request: {
      params,
      body: { content: { 'application/json': { schema: changeOrderStatusRequestSchema } } },
    },
    responses: {
      200: json('Pedido', orderDtoSchema),
      404: errorResponse('ORDER_NOT_FOUND'),
      409: errorResponse('ORDER_INVALID_TRANSITION, ORDER_CONFLICT'),
      ...GUARD,
    },
  });

  return registry;
}
