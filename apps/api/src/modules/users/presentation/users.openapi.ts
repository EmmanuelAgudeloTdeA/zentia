import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  createUserRequestSchema,
  createUserResultSchema,
  listUsersQuerySchema,
  temporaryPasswordResultSchema,
  updateUserRequestSchema,
  userDtoSchema,
  userListDtoSchema,
  userOptionDtoSchema,
  userOptionsQuerySchema,
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

export function createUsersOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];

  registry.registerPath({
    method: 'get',
    path: '/users',
    tags: ['Users'],
    summary: 'Listar usuarios con filtros y paginación (ADMIN)',
    security,
    request: { query: listUsersQuerySchema },
    responses: {
      200: jsonResponse('Página de usuarios', userListDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/users/options',
    tags: ['Users'],
    summary:
      'Usuarios para reasignar (activos) o filtrar por dueño (includeInactive) (MANAGER, ADMIN)',
    security,
    request: { query: userOptionsQuerySchema },
    responses: {
      200: jsonResponse('Usuarios activos', z.array(userOptionDtoSchema)),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/users/{id}',
    tags: ['Users'],
    summary: 'Ver un usuario (ADMIN)',
    security,
    request: { params: idParams },
    responses: {
      200: jsonResponse('Usuario', userDtoSchema),
      404: errorResponse('USER_NOT_FOUND'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/users',
    tags: ['Users'],
    summary: 'Crear usuario; devuelve la contraseña temporal una sola vez (ADMIN)',
    security,
    request: { body: { content: { 'application/json': { schema: createUserRequestSchema } } } },
    responses: {
      201: jsonResponse('Usuario creado', createUserResultSchema),
      400: errorResponse('VALIDATION_ERROR'),
      409: errorResponse('EMAIL_TAKEN'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/users/{id}',
    tags: ['Users'],
    summary: 'Editar, activar o desactivar un usuario; desactivar revoca sus sesiones (ADMIN)',
    security,
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: updateUserRequestSchema } } },
    },
    responses: {
      200: jsonResponse('Usuario actualizado', userDtoSchema),
      400: errorResponse('VALIDATION_ERROR'),
      404: errorResponse('USER_NOT_FOUND'),
      409: errorResponse('EMAIL_TAKEN, CANNOT_MODIFY_SELF, LAST_ADMIN'),
      ...GUARD_ERRORS,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/users/{id}/reset-password',
    tags: ['Users'],
    summary: 'Restablecer la contraseña con una temporal y revocar sesiones (ADMIN)',
    security,
    request: { params: idParams },
    responses: {
      200: jsonResponse('Contraseña temporal', temporaryPasswordResultSchema),
      404: errorResponse('USER_NOT_FOUND'),
      ...GUARD_ERRORS,
    },
  });

  return registry;
}
