import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  calibrationStatusDtoSchema,
  followUpMessageDtoSchema,
  probabilitiesQuerySchema,
  probabilityDtoSchema,
} from '@zentia/shared';
import { z } from 'zod';

function errorResponse(codes: string): ResponseConfig {
  return { description: codes, content: { 'application/json': { schema: apiErrorSchema } } };
}

const GUARD = {
  401: errorResponse('UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID, USER_INACTIVE'),
  403: errorResponse('FORBIDDEN, PASSWORD_CHANGE_REQUIRED'),
};

export function createAiOpenApi(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  const security = [{ bearerAuth: [] }];
  const tags = ['AI'];

  registry.registerPath({
    method: 'post',
    path: '/quotes/{id}/follow-up-message',
    tags,
    security,
    summary:
      'Mensaje de seguimiento sugerido (solo Enviadas). El LLM recibe solo señales anonimizadas; si falla, plantilla con 200',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      200: {
        description: 'Mensaje editable',
        content: { 'application/json': { schema: followUpMessageDtoSchema } },
      },
      404: errorResponse('QUOTE_NOT_FOUND'),
      409: errorResponse('QUOTE_INVALID_TRANSITION'),
      429: errorResponse('RATE_LIMITED (10 por usuario por minuto)'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/ai/probabilities',
    tags,
    security,
    summary:
      'Probabilidad de cierre (estimación por reglas) de las Enviadas pedidas; máximo 50 ids en CSV',
    request: { query: probabilitiesQuerySchema },
    responses: {
      200: {
        description: 'Probabilidades',
        content: { 'application/json': { schema: z.array(probabilityDtoSchema) } },
      },
      400: errorResponse('VALIDATION_ERROR'),
      ...GUARD,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/ai/calibration-status',
    tags,
    security,
    summary:
      'Cotizaciones cerradas (sin sintéticas) frente al umbral de calibración (MANAGER, ADMIN)',
    responses: {
      200: {
        description: 'Estado',
        content: { 'application/json': { schema: calibrationStatusDtoSchema } },
      },
      ...GUARD,
    },
  });

  return registry;
}
