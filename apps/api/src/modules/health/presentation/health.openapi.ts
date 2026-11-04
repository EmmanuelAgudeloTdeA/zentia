import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { apiErrorSchema, healthErrorResponseSchema, healthResponseSchema } from '@zentia/shared';

export function createHealthOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Estado de la API',
    responses: {
      200: {
        description: 'La API y la base responden',
        content: { 'application/json': { schema: healthResponseSchema } },
      },
      503: {
        description: 'La base no responde en 1 s',
        content: { 'application/json': { schema: healthErrorResponseSchema } },
      },
      429: {
        description: 'RATE_LIMITED',
        content: { 'application/json': { schema: apiErrorSchema } },
      },
    },
  });
  return registry;
}
