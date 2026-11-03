import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  categorySuggestionsQuerySchema,
  createProductRequestSchema,
  listProductsQuerySchema,
  productDtoSchema,
  productListDtoSchema,
  updateProductRequestSchema,
} from '@zentia/shared';
import { z } from 'zod';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

function jsonResponse(description: string, schema: z.ZodType): ResponseConfig {
  return { description, content: { 'application/json': { schema } } };
}

const GUARD_ERRORS = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('FORBIDDEN, PASSWORD_CHANGE_REQUIRED'),
};

const idParams = z.object({ id: z.uuid() });

export function createProductsOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];

  registry.registerPath({
    method: 'get',
    path: '/products',
    tags: ['Products'],
    summary: 'Listar productos; vendedor y gerente solo ven activos',
    security,
    request: { query: listProductsQuerySchema },
    responses: {
      200: jsonResponse('Página de productos (precio sin IVA como string)', productListDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/products/categories',
    tags: ['Products'],
    summary: 'Sugerir hasta 10 categorías existentes (sin tildes ni mayúsculas)',
    security,
    request: { query: categorySuggestionsQuerySchema },
    responses: { 200: jsonResponse('Categorías', z.array(z.string())), ...GUARD_ERRORS },
  });

  registry.registerPath({
    method: 'get',
    path: '/products/{id}',
    tags: ['Products'],
    summary: 'Ver un producto (también inactivo)',
    security,
    request: { params: idParams },
    responses: {
      200: jsonResponse('Producto', productDtoSchema),
      404: errorResponse('PRODUCT_NOT_FOUND'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/products',
    tags: ['Products'],
    summary: 'Crear producto con precio sin IVA (ADMIN)',
    security,
    request: { body: { content: { 'application/json': { schema: createProductRequestSchema } } } },
    responses: {
      201: jsonResponse('Producto creado', productDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/products/{id}',
    tags: ['Products'],
    summary: 'Editar, activar o desactivar un producto; no afecta cotizaciones existentes (ADMIN)',
    security,
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: updateProductRequestSchema } } },
    },
    responses: {
      200: jsonResponse('Producto actualizado', productDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      404: errorResponse('PRODUCT_NOT_FOUND'),
      ...GUARD_ERRORS,
    },
  });

  return registry;
}
