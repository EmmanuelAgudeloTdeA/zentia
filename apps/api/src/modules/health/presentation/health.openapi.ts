import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { apiErrorSchema, healthResponseSchema } from '@zentia/shared';

export function createHealthOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Estado de la API',
    responses: {
      200: {
        description: 'La API responde',
        content: { 'application/json': { schema: healthResponseSchema } },
      },
      429: {
        description: 'RATE_LIMITED',
        content: { 'application/json': { schema: apiErrorSchema } },
      },
    },
  });
  return registry;
}
