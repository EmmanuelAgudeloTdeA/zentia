# M0 Fundación – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §2–§4, §7, §9 y §10.

## 1. Entidades Prisma
M0 no define modelos de negocio. Entrega:
- `apps/api/prisma/schema.prisma` con `datasource db` (`postgresql`, `env("DATABASE_URL")`) y `generator client`.
- El Prisma client como singleton en `apps/api/src/core/prisma/`.
- Un script `prisma migrate dev` operativo y un `seed.ts` vacío que los módulos completan (M1: primer ADMIN; M2: `CompanySettings`).

Cada módulo agrega sus modelos en su propio hito (por ejemplo, `User` y `RefreshToken` en M1).

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/docs` | Público, solo si `DOCS_ENABLED=true` | — | HTML de Swagger UI | 404 `NOT_FOUND` si está deshabilitado |
| GET | `/api/docs/openapi.json` | Público, solo si `DOCS_ENABLED=true` | — | Documento OpenAPI 3 | 404 `NOT_FOUND` si está deshabilitado |
| * | `/api/*` sin ruta | — | — | — | 404 `NOT_FOUND` |

`GET /health` es de M10 (H10.1) y no se documenta aquí.

**Formato de error común** (todas las rutas de todos los módulos):
```json
{ "error": { "code": "VALIDATION_ERROR", "params": {}, "issues": [{ "path": "items.0.quantity", "code": "too_small" }] } }
```

| Código | HTTP | Origen |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod (body, params, query) |
| `MALFORMED_JSON` | 400 | Body que no es JSON válido |
| `NOT_FOUND` | 404 | Ruta inexistente |
| `PAYLOAD_TOO_LARGE` | 413 | Body mayor al límite (100 KB global) |
| `RATE_LIMITED` | 429 | `express-rate-limit` |
| `INTERNAL_ERROR` | 500 | Error no controlado |

Los códigos de negocio (por ejemplo, `QUOTE_NOT_FOUND`) se agregan al catálogo en el módulo que los usa.

## 3. Application: casos de uso y puertos
M0 no tiene casos de uso de negocio. Entrega piezas de `core/`, que no son un módulo:

| Pieza | Ubicación | Contrato |
|---|---|---|
| `env` | `apps/api/src/core/env/` | `loadEnv(): Env` (Zod); falla con código ≠ 0 |
| `logger` | `apps/api/src/core/logger/` | instancia `pino` + middleware `pino-http` con `requestId` y `redact` |
| `AppError` | `apps/api/src/core/http/` | `new AppError(code, status, params?)` |
| `errorHandler` | `apps/api/src/core/http/` | middleware final: `AppError`, `ZodError`, `SyntaxError` del parser, `PayloadTooLargeError` → formato común |
| `validate` | `apps/api/src/core/http/` | `validate({ body?, params?, query? })` con schemas de `shared` |
| `openapi` | `apps/api/src/core/openapi/` | `createRegistry()` por módulo; `buildDocument(registries[])` |
| `ModuleDefinition` | `apps/api/src/core/modules/` | `{ name, router, openapi }`; `app.ts` monta cada módulo bajo `/api` |
| `rateLimiters` | `apps/api/src/core/http/` | `generalLimiter` reutilizable; los límites específicos (login) los define M1 |
| `prisma` | `apps/api/src/core/prisma/` | singleton `PrismaClient`; desconexión en `SIGTERM` |

En `packages/shared`:
| Pieza | Ubicación | Contenido |
|---|---|---|
| Catálogo de errores | `shared/src/constants/error-codes.ts` | Códigos de la tabla de la sección 2 como `const` + tipo `ErrorCode` |
| Schema de error | `shared/src/schemas/api-error.schema.ts` | Zod de `{ error: { code, params?, issues? } }` |
| Decimales como `string` | `shared/src/schemas/decimal.schema.ts` | `moneyString` (entero, hasta 15 dígitos, sin signo salvo que el módulo lo permita), `quantityString` (hasta 10 enteros y 2 decimales, > 0), `percentString` (0–100, hasta 2 decimales); punto como separador decimal |

Los puertos de negocio (`Clock`, `UnitOfWork`, `LLMProvider`, `PasswordHasher`, `TokenService`, `PdfRenderer`, `Scheduler`) los crea el módulo que los usa primero (`architecture.md` §8).

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `NotFoundPage` | 404 de rutas del front |
| Pantalla | `ForbiddenPage` | Ruta no permitida para el rol (decisión 185) |
| Componente | `PrivateLayout` | Encabezado con navegación horizontal y panel lateral por debajo de 1024 px (decisión 179), área de contenido, selector de idioma |
| Componente | `PublicLayout` | Contenedor centrado para el login (M1), con selector de idioma |
| Componente | `ProtectedRoute` | Redirige a `/login` si no hay sesión; acepta `roles?` (el filtrado real lo implementa M1) |
| Componente | `LanguageSwitcher` | Cambia entre `es` y `en` |
| Componente | `PageLoader`, `ErrorMessage` | Estado de carga y error traducido desde `ApiError` |
| Store | `core/auth/session.store.ts` (Zustand) | Forma de la sesión: `{ user: null, accessToken: null, status: 'anonymous' }`; M1 implementa las acciones |
| Store | `core/i18n/locale.store.ts` (Zustand) | Idioma activo, persistido en `localStorage` |
| Service | `core/http-client` | `request<T>(method, path, { body?, query? })`; base `/api`; `ApiError` tipado; punto de extensión para el `Authorization` y el refresh (M1) |
| Registro | `core/router` y `core/navigation` | Cada feature exporta `routes` y `navItems` por su barril |

Estructura:
```
apps/web/src/
├── core/  auth/ · http-client/ · i18n/ · layout/ · navigation/ · router/
├── features/          # vacío; cada módulo agrega el suyo
├── lang/  es.json · en.json
└── main.tsx
```

## 5. Claves de `lang/`
**Front (`apps/web/src/lang/{es,en}.json`):**
- `app.name`
- `layout.nav.toggle`, `layout.language.label`, `layout.language.es`, `layout.language.en`
- `common.loading`, `common.retry`, `common.back`
- `notFound.title`, `notFound.description`, `notFound.goHome`
- `forbidden.title`, `forbidden.description`
- `errors.UNKNOWN`, `errors.NETWORK_ERROR`, `errors.VALIDATION_ERROR`, `errors.MALFORMED_JSON`, `errors.NOT_FOUND`, `errors.PAYLOAD_TOO_LARGE`, `errors.RATE_LIMITED`, `errors.INTERNAL_ERROR`
- `validation.<zodCode>` para los códigos genéricos de Zod que muestre la UI (por ejemplo, `validation.too_small`, `validation.invalid_type`)

**Back:** ninguna en M0 (la `lang/` del back nace con M5 o M9).

## 6. Reglas específicas
**Reglas de dependencia (lint, `no-restricted-imports`)**
| Archivo en | No puede importar |
|---|---|
| `apps/api/src/modules/*/domain/**` | `../application/**`, `../infrastructure/**`, `../presentation/**`, `@prisma/client`, `express`, cualquier paquete externo salvo `@zentia/shared` |
| `apps/api/src/modules/*/application/**` | `../infrastructure/**`, `../presentation/**`, `@prisma/client`, `express` |
| `apps/api/src/modules/<a>/**` | `apps/api/src/modules/<b>/<capa>/**` (solo `modules/<b>` vía barril) |
| `apps/web/src/features/<a>/**` | `features/<b>/<carpeta>/**` (solo barril) |
| `apps/web/src/**/components/**` | `core/http-client` (los componentes usan `services`) |
| `packages/shared/**` | `apps/**`, `@prisma/client`, `express`, `react` |
| `packages/shared/src/calc/**` | Uso de `parseFloat`, `parseInt`, `Number()`, `+x`, `Math.round` (`no-restricted-syntax` / `no-restricted-globals`) |

**Variables de entorno de M0**
| Variable | Tipo | Defecto | Obligatoria |
|---|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | No |
| `PORT` | entero | `3000` | No |
| `DATABASE_URL` | URL postgres | — | Sí |
| `TZ` | string | `America/Bogota` | No (debe ser `America/Bogota`) |
| `LOG_LEVEL` | nivel de pino | `info` | No |
| `CORS_ORIGIN` | lista de URLs | origen del front en desarrollo | Sí en producción |
| `DOCS_ENABLED` | boolean | `true` si no es `production`; `false` en `production` | No |
| `TRUST_PROXY` | boolean o número de saltos | `false` | No (M10 fija el valor de producción) |

**Middlewares (orden)**
`helmet` → `cors` → `pino-http` → rutas con parser propio (ninguna en M0; M2 agrega `PUT /company/logo`) → `express.json({ limit: '100kb' })` → rutas de módulos bajo `/api` → 404 → `errorHandler`.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `env.spec` | Unitaria | Una variable obligatoria faltante o inválida falla; los valores por defecto aplican; el mensaje no incluye el valor |
| `error-handler.spec` | Supertest | Formato común para `AppError`, `ZodError`, JSON mal formado, body > 100 KB, ruta inexistente y error inesperado; nunca hay stack en la respuesta |
| `docs.spec` | Supertest | `/api/docs` responde 200 con `DOCS_ENABLED=true` y 404 con `false` |
| `decimal.schema.spec` | Unitaria | Acepta y rechaza montos, cantidades y porcentajes según precisión y rango; rechaza `number` |
| `logger.spec` | Unitaria | `redact` oculta `authorization`, `cookie`, `password`, `logoDataUrl` y `data` |
| `lint-rules.spec` | Unitaria (API de ESLint sobre fixtures) | Cada regla de la tabla de la sección 6 rechaza su fixture prohibido y acepta el permitido |
| `i18n-parity.spec` | Unitaria | Mismas claves y mismos marcadores `{{...}}` entre `es` y `en` (front y back) |
| `http-client.spec` | Unitaria (front) | Parseo de `ApiError`, `NETWORK_ERROR` ante fallo de red |
| `protected-route.spec` | Testing Library | Sin sesión redirige a `/login`; con sesión simulada renderiza la ruta |
| `layout.spec` | Testing Library | Los textos salen de `lang/`; el cambio de idioma se aplica y persiste |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 84–88) |
|---|---|
| Proveedor de CI | GitHub Actions (`.github/workflows/ci.yml`), decisión 88. Falta crear el repositorio remoto. |
| Versión de Node | Node 24 LTS en `engines` y `.nvmrc` (decisión 88). |
| Prisma sin modelos | `prisma generate` funciona sin modelos, pero la primera migración real la crea M1. M0 solo verifica la conexión. |
| `trust proxy` (decisión 79) | Se deja como variable `TRUST_PROXY` (por defecto desactivada) en M0; el valor de producción lo fija M10 según el proveedor. |
| Lint de `+x` | `no-restricted-syntax` sobre `UnaryExpression[operator='+']` también bloquea `+` unario legítimo; en `calc` no hay usos legítimos, así que se acepta. |
| Esqueleto de sesión | La forma del store de sesión se define aquí y M1 la implementa; si M1 necesita otra forma, M1 la ajusta sin tocar `ProtectedRoute`. |
