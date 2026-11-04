# Checklist QA – M0 Fundación

## Depende de
- `docs/modules/mod-0-fundacion/epics.md` (criterios de aceptación de H0.1, H0.2 y H0.3).
- `CLAUDE.md` (stack, arquitectura, convenciones e i18n).
- CI: `.github/workflows/ci.yml` (job `checks`: lint, typecheck, format:check y test con PostgreSQL; job `docker`).

**Estado:** criterios automatizados cubiertos; queda pendiente la verificación manual del layout a 360 px (ver `docs/qa/navegadores.md`).

Formato: `- [x] <story>.<criterio> <criterio> — <archivo de prueba> › <describe> › <prueba>`. Las reglas de lint sin prueba negativa automatizada se verificaron con `eslint --stdin` el 2026-11-04.

## H0.1 Monorepo, lint y TypeScript

### S0.1.1 Workspaces pnpm
- [x] S0.1.1.1 `pnpm install` instala los tres paquetes y `api`/`web` importan `@zentia/shared` por nombre — CI `.github/workflows/ci.yml` › checks › `pnpm install --frozen-lockfile` + `pnpm typecheck`
- [x] S0.1.1.2 `packages/shared` expone su API solo por `src/index.ts` (`enums/`, `schemas/`, `calc/`, `constants/`) — CI › checks › `pnpm lint` (`no-restricted-imports` prohíbe imports profundos) y `apps/web/src/lang/error-codes.test.ts` › error code translations (importa `ERROR_CODES` desde el barril)
- [x] S0.1.1.3 Los scripts raíz `dev`, `build`, `lint`, `typecheck` y `test` corren en todos los paquetes — CI › checks › `pnpm lint`, `pnpm typecheck`, `pnpm test` (`pnpm -r`)
- [x] S0.1.1.4 Versiones de Node y pnpm fijadas (`engines`, `packageManager`) y documentadas — revisión estática: `package.json`, `.nvmrc`, `README.md`
- [x] S0.1.1.5 Repositorio con `.gitignore` (incluye `.env`) y commit inicial `:tada:` — revisión estática: `.gitignore`, `git log --reverse`

### S0.1.2 tsconfig base
- [x] S0.1.2.1 `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` y `exactOptionalPropertyTypes` heredados por cada paquete — revisión estática: `tsconfig.base.json`; CI › checks › `pnpm typecheck`
- [x] S0.1.2.2 `pnpm typecheck` sin errores en los tres paquetes — CI › checks › `pnpm typecheck`
- [x] S0.1.2.3 `api` y `web` compilan contra `shared` sin pasos manuales — CI › checks › `pnpm typecheck`
- [x] S0.1.2.4 Un `any` implícito no compila — CI › checks › `pnpm typecheck` (`strict: true` → `noImplicitAny`)

### S0.1.3 ESLint y Prettier
- [x] S0.1.3.1 `pnpm lint` con cero warnings (`--max-warnings 0`) — CI › checks › `pnpm lint`
- [x] S0.1.3.2 `domain/` no importa otras capas ni librerías; `application/` no importa `infrastructure/` ni `presentation/` — manual (`eslint --stdin` sobre `modules/quotes/domain/tmp.ts` y `modules/quotes/application/tmp.ts`: error `no-restricted-imports`), regla en `eslint.config.js`
- [x] S0.1.3.3 Import profundo a otro módulo falla; desde el barril pasa — manual (`eslint --stdin` sobre `modules/orders/application/tmp.ts` con `../../quotes/domain/...`: error; `../quotes/index.js`: sin errores)
- [x] S0.1.3.4 `parseFloat`, `parseInt`, `Number()`, `+x` y `Math.round` fallan en `shared/src/calc` — manual (`eslint --stdin` sobre `packages/shared/src/calc/tmp.ts`: error `no-restricted-syntax`)
- [x] S0.1.3.5 `any` explícito prohibido — manual (`eslint --stdin`: error `@typescript-eslint/no-explicit-any`)
- [x] S0.1.3.6 Prettier formatea el repo y `pnpm format:check` no reporta diferencias — CI › checks › `pnpm format:check`

### S0.1.4 Pipeline CI
- [x] S0.1.4.1 Instala con `--frozen-lockfile` y ejecuta `lint`, `typecheck` y `test` en orden — `.github/workflows/ci.yml` › checks
- [x] S0.1.4.2 `test` incluye la paridad i18n — `apps/web/src/lang/lang-parity.test.ts` › web lang/ › es and en have the same keys; `apps/api/src/lang/lang-parity.test.ts` › api lang/ › es and en have the same keys
- [x] S0.1.4.3 PostgreSQL de servicio para los tests de integración — `.github/workflows/ci.yml` › checks › `services.postgres` + `TEST_DATABASE_URL`
- [x] S0.1.4.4 Un warning de lint hace fallar el pipeline — CI › checks › `pnpm lint` (`eslint . --max-warnings 0`)

## H0.2 API base

### S0.2.1 App Express con Prisma
- [x] S0.2.1.1 La API monta todas las rutas bajo `/api` — `apps/api/src/app.test.ts` › API base › GET /api/health responds 200 with status ok
- [x] S0.2.1.2 Prisma client singleton conectado a `DATABASE_URL`; migraciones sin errores — CI › checks › `prisma:deploy` (integración: `apps/api/src/modules/auth/infrastructure/prisma-auth.integration.test.ts`)
- [x] S0.2.1.3a `express.json()` con límite de 100 KB — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › answers PAYLOAD_TOO_LARGE for a JSON body over 100 KB
- [x] S0.2.1.3b `pino-http` con `requestId` — `apps/api/src/app.test.ts` › API base › tags every response with a unique x-request-id for the logs
- [x] S0.2.1.3c `redact` de `authorization`, `cookie`, `set-cookie`, `password`, `logoDataUrl` y `data` — `apps/api/src/core/logger/logger.test.ts` › createLogger redaction › redacts auth headers, cookies, passwords, logos and base64 payloads
- [x] S0.2.1.3d Rate limit para rutas públicas (sesión y recursos separados) — `apps/api/src/modules/auth/presentation/auth.routes.test.ts` › public rate limits › keeps refresh available after the public resources limit is exhausted
- [x] S0.2.1.3e `cors` con orígenes desde env — `apps/api/src/core/env/load-env.test.ts` › loadEnv › requires CORS_ORIGIN in production
- [x] S0.2.1.4 Los módulos se registran desde su `index.ts` sin tocar `core/` — `apps/web/src/core/router/router.test.ts` › router › registers the routes of every feature (front); API: revisión estática de `apps/api/src/modules/index.ts`
- [x] S0.2.1.5 El proceso corre con `TZ=America/Bogota` — `apps/api/src/core/env/load-env.test.ts` › loadEnv › applies defaults

### S0.2.2 Swagger en `/api/docs`
- [x] S0.2.2.1 Cada módulo registra su OpenAPI y el core los combina — `apps/api/src/modules/company-settings/presentation/company.routes.test.ts` › GET /api/company/branding › is documented in OpenAPI along with the other company routes
- [x] S0.2.2.2 Con `DOCS_ENABLED=true` se sirven Swagger UI y `openapi.json` — `apps/api/src/app.test.ts` › API base › serves the Swagger UI when docs are enabled; › serves the OpenAPI document when docs are enabled
- [x] S0.2.2.3 Con `DOCS_ENABLED=false` (defecto en producción) ambas rutas responden 404 — `apps/api/src/app.test.ts` › API base › hides the docs when DOCS_ENABLED is false; › answers 404 for the Swagger UI when docs are disabled; `apps/api/src/core/env/load-env.test.ts` › loadEnv › disables docs by default in production
- [x] S0.2.2.4 El documento declara el esquema de error común — `apps/api/src/app.test.ts` › API base › documents the common error body as the ApiError component

### S0.2.3 Manejo de errores con códigos
- [x] S0.2.3.1 `AppError` en `core/` y catálogo en `shared/constants/error-codes.ts` — `apps/web/src/lang/error-codes.test.ts` › error code translations › %s translates every API and client error code (es, en)
- [x] S0.2.3.2 Schema de decimales como `string` compartido — `packages/shared/src/schemas/products.schema.test.ts` › moneyString and product queries › accepts zero as money but only canonical integers; `packages/shared/src/schemas/quotes.schema.test.ts` › accepts quantity %s; `packages/shared/src/schemas/company-settings.schema.test.ts` › percentString › accepts 0–100 with up to 2 decimals
- [x] S0.2.3.3 Forma `{ error: { code, params?, issues? } }` sin texto ni stack — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › answers a generic INTERNAL_ERROR without message or stack
- [x] S0.2.3.4 Zod → 400 `VALIDATION_ERROR` con `issues: [{ path, code }]` — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › maps a ZodError to VALIDATION_ERROR with path and code issues
- [x] S0.2.3.5a Ruta inexistente → 404 `NOT_FOUND` — `apps/api/src/app.test.ts` › API base › unknown routes respond NOT_FOUND with the common error body
- [x] S0.2.3.5b JSON mal formado → 400 `MALFORMED_JSON` — `apps/api/src/app.test.ts` › API base › malformed JSON responds MALFORMED_JSON
- [x] S0.2.3.5c Body mayor al límite → 413 `PAYLOAD_TOO_LARGE` — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › answers PAYLOAD_TOO_LARGE for a JSON body over 100 KB
- [x] S0.2.3.5d Rate limit → 429 `RATE_LIMITED` — `apps/api/src/core/http/trust-proxy.test.ts` › TRUST_PROXY › rate-limits by the real client IP behind one proxy
- [x] S0.2.3.5e Otros rechazos 4xx de body-parser (charset no soportado) → 400 `VALIDATION_ERROR`, no 500 — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › answers VALIDATION_ERROR for an unsupported charset instead of 500
- [x] S0.2.3.6 Error no controlado → 500 `INTERNAL_ERROR`, registrado con el `requestId` — `apps/api/src/core/http/error-handler.test.ts` › errorHandler › answers a generic INTERNAL_ERROR without message or stack; `apps/api/src/app.test.ts` › API base › tags every response with a unique x-request-id for the logs

### S0.2.4 Validación de env
- [x] S0.2.4.1 Schema Zod valida las variables de M0 con valores por defecto — `apps/api/src/core/env/load-env.test.ts` › loadEnv › applies defaults; › defaults CORS_ORIGIN to the Vite dev server outside production
- [x] S0.2.4.2 Variable obligatoria ausente o inválida → error que la nombra sin imprimir su valor — `apps/api/src/core/env/load-env.test.ts` › loadEnv › names invalid variables without exposing their values; › requires CORS_ORIGIN in production
- [x] S0.2.4.3 El código lee la configuración solo del objeto validado — revisión estática: `process.env` solo en `core/env/load-env.ts`, `main.ts` (fija `TZ`) y los scripts de seed
- [x] S0.2.4.4 `.env.example` lista las variables con comentario de una línea — revisión estática: `apps/api/.env.example`

## H0.3 Front base

### S0.3.1 App React con Vite
- [x] S0.3.1.1 `pnpm --filter web dev` arranca con proxy de `/api` — revisión estática: `apps/web/vite.config.ts`
- [x] S0.3.1.2 Tailwind v4 y rutas desde `core/router` registradas por barril — `apps/web/src/core/router/router.test.ts` › router › registers the routes of every feature
- [x] S0.3.1.3 `http-client` con base `/api`, JSON tipado y `ApiError { code, params, issues }` — `apps/web/src/core/http-client/http-client.test.ts` › http-client › prefixes /api, serializes the query and returns the JSON body; › converts an error response into a typed ApiError
- [x] S0.3.1.4 Error de red → `NETWORK_ERROR` — `apps/web/src/core/http-client/http-client.test.ts` › http-client › converts a network failure into NETWORK_ERROR
- [x] S0.3.1.5 Los componentes no importan `http-client` — manual (`eslint --stdin` sobre `features/users/components/tmp.tsx`: error `no-restricted-imports`)

### S0.3.2 Carga de `lang/`
- [x] S0.3.2.1 `es` y `en` cargados, `es` por defecto — `apps/web/src/core/layout/layout.test.tsx` › PrivateLayout › renders texts from lang/ and filters navigation by role
- [x] S0.3.2.2 El idioma se recuerda entre sesiones — `apps/web/src/core/layout/layout.test.tsx` › PrivateLayout › applies the language change and persists it
- [x] S0.3.2.3 `ApiError` → `errors.<CODE>`; sin clave → `errors.UNKNOWN`; todo código tiene traducción — `apps/web/src/core/http-client/http-client.test.ts` › http-client › builds the translation key for any error; › maps an unexpected error body to UNKNOWN; `apps/web/src/lang/error-codes.test.ts` › error code translations › %s translates every API and client error code (es, en)
- [x] S0.3.2.4 Test de paridad de claves y marcadores (front y back) — `apps/web/src/lang/lang-parity.test.ts` › web lang/ › es and en use the same markers per key; `apps/api/src/lang/lang-parity.test.ts` › api lang/ markers › es and en use the same {{markers}} in each key
- [x] S0.3.2.5 Ningún texto visible del layout en código — `apps/web/src/core/layout/layout.test.tsx` › PrivateLayout › renders texts from lang/ and filters navigation by role

### S0.3.3 Layout y rutas protegidas
- [x] S0.3.3.1 Layout privado con panel lateral bajo 1024 px y selector de idioma; layout público con selector — `apps/web/src/core/layout/layout.test.tsx` › PrivateLayout › opens the navigation drawer and closes it with Escape; › PublicLayout › offers the language switch
- [x] S0.3.3.2 Navegación por entradas registradas y filtrada por rol — `apps/web/src/core/layout/layout.test.tsx` › PrivateLayout › renders texts from lang/ and filters navigation by role
- [x] S0.3.3.3 `ProtectedRoute` redirige a `/login` sin sesión — `apps/web/src/core/router/protected-route.test.tsx` › ProtectedRoute › redirects to the login when there is no session and keeps the requested route
- [x] S0.3.3.4 Página 404, "sin permiso" y carga común — `apps/web/src/core/router/protected-route.test.tsx` › ProtectedRoute › shows the forbidden page when the role is not allowed (404 y carga: revisión estática de `core/router`)
- [ ] S0.3.3.5 Layout sin scroll horizontal desde 360 px — manual, pendiente (`docs/qa/navegadores.md`, paso 360 px)
