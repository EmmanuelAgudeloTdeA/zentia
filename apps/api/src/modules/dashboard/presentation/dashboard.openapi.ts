import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { apiErrorSchema, dashboardQuerySchema, dashboardSummaryDtoSchema } from '@zentia/shared';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

export function createDashboardOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  registry.registerPath({
    method: 'get',
    path: '/dashboard/summary',
    tags: ['Dashboard'],
    security: [{ bearerAuth: [] }],
    summary:
      'Indicadores: activas y pendientes (estado actual) y cohorte por firstSentAt en el período (por defecto, el mes en curso)',
    request: { query: dashboardQuerySchema },
    responses: {
      200: {
        description: 'Indicadores; un vendedor solo ve los suyos',
        content: { 'application/json': { schema: dashboardSummaryDtoSchema } },
      },
      400: errorResponse('VALIDATION_ERROR, DASHBOARD_INVALID_PERIOD'),
      401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
      403: errorResponse('PASSWORD_CHANGE_REQUIRED'),
    },
  });
  return registry;
}
