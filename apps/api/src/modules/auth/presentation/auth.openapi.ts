import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  authSessionSchema,
  changePasswordRequestSchema,
  loginRequestSchema,
} from '@zentia/shared';
import { REFRESH_COOKIE } from './refresh-cookie.js';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

const sessionResponse: ResponseConfig = {
  description: `Sesión iniciada; define la cookie ${REFRESH_COOKIE} (httpOnly, Secure, SameSite=Strict, Path=/api/auth)`,
  content: { 'application/json': { schema: authSessionSchema } },
};

export function createAuthOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  const refreshCookie = registry.registerComponent('securitySchemes', 'refreshCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: REFRESH_COOKIE,
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    summary: 'Iniciar sesión con correo y contraseña',
    request: { body: { content: { 'application/json': { schema: loginRequestSchema } } } },
    responses: {
      200: sessionResponse,
      400: errorResponse('VALIDATION_ERROR'),
      401: errorResponse('INVALID_CREDENTIALS'),
      429: errorResponse('RATE_LIMITED (5 intentos fallidos por IP y correo en 15 min)'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: ['Auth'],
    summary: 'Renovar la sesión con la cookie de refresh (rotación)',
    security: [{ [refreshCookie.name]: [] }],
    responses: {
      200: sessionResponse,
      401: errorResponse('INVALID_REFRESH_TOKEN, REFRESH_TOKEN_REUSED'),
      409: errorResponse('REFRESH_IN_PROGRESS'),
      429: errorResponse('RATE_LIMITED'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['Auth'],
    summary: 'Cerrar sesión: revoca la familia del refresh y borra la cookie',
    security: [{ [refreshCookie.name]: [] }],
    responses: { 204: { description: 'Siempre 204' } },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/change-password',
    tags: ['Auth'],
    summary: 'Cambiar la propia contraseña (revoca las demás sesiones)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: { content: { 'application/json': { schema: changePasswordRequestSchema } } },
    },
    responses: {
      200: sessionResponse,
      400: errorResponse('VALIDATION_ERROR, INVALID_CURRENT_PASSWORD, PASSWORD_REUSED'),
      401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
    },
  });

  return registry;
}
