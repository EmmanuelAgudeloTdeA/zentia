import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  createCustomerRequestSchema,
  customerDtoSchema,
  customerListDtoSchema,
  listCustomersQuerySchema,
  updateCustomerRequestSchema,
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
  403: errorResponse('PASSWORD_CHANGE_REQUIRED'),
};

const WRITE_ERRORS = {
  400: errorResponse('VALIDATION_ERROR, CUSTOMER_CONTACT_REQUIRED, INVALID_PHONE'),
  409: errorResponse('CUSTOMER_DOCUMENT_TAKEN'),
};

const idParams = z.object({ id: z.uuid() });

export function createCustomersOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];

  registry.registerPath({
    method: 'get',
    path: '/customers',
    tags: ['Customers'],
    summary: 'Buscar clientes por nombre, documento, teléfono o correo (sin tildes)',
    security,
    request: { query: listCustomersQuerySchema },
    responses: {
      200: jsonResponse('Página de clientes ordenada por nombre', customerListDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/customers/{id}',
    tags: ['Customers'],
    summary: 'Ver un cliente (también inactivo)',
    security,
    request: { params: idParams },
    responses: {
      200: jsonResponse('Cliente', customerDtoSchema),
      404: errorResponse('CUSTOMER_NOT_FOUND'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/customers',
    tags: ['Customers'],
    summary: 'Crear cliente; documento y teléfono se normalizan',
    security,
    request: {
      body: { content: { 'application/json': { schema: createCustomerRequestSchema } } },
    },
    responses: {
      201: jsonResponse('Cliente creado', customerDtoSchema),
      ...WRITE_ERRORS,
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/customers/{id}',
    tags: ['Customers'],
    summary: 'Editar, activar o desactivar un cliente (cualquier rol)',
    security,
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: updateCustomerRequestSchema } } },
    },
    responses: {
      200: jsonResponse('Cliente actualizado', customerDtoSchema),
      404: errorResponse('CUSTOMER_NOT_FOUND'),
      ...WRITE_ERRORS,
      ...GUARD_ERRORS,
    },
  });

  return registry;
}
