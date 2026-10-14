import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { apiErrorSchema } from '@zentia/shared';

export function createCoreRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  registry.register('ApiError', apiErrorSchema);
  return registry;
}

export function buildOpenApiDocument(registries: OpenAPIRegistry[]) {
  const generator = new OpenApiGeneratorV31(registries.flatMap((registry) => registry.definitions));
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'Zentia API', version: '0.1.0' },
    servers: [{ url: '/api' }],
  });
}
