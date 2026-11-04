# Checklist QA – M10 Calidad y despliegue

## Depende de
- `docs/modules/mod-10-calidad-despliegue/epics.md` (criterios de aceptación de H10.1 y H10.2).
- `CLAUDE.md` (rutas públicas con rate limit, `/api/docs` deshabilitado en producción, variables de entorno validadas, jobs con una sola instancia).
- M0 y M1: `docs/qa/checklists/mod-0-fundacion.md` y `docs/qa/checklists/mod-1-acceso-usuarios.md`.
- Evidencia manual: `docs/qa/usabilidad.md`, `docs/qa/navegadores.md` y `docs/qa/rendimiento.md`.

**Estado:** H10.1 cubierto por pruebas, CI y revisión de la configuración; H10.2 (RNF-01, RNF-05 oficial y RNF-06) pendiente de ejecutar en staging.

Formato: `- [x] <story>.<criterio> <criterio> — <archivo de prueba> › <describe> › <prueba>`; lo que no se automatiza va como `- [ ] … — manual, pendiente`.

## H10.1 Despliegue en la nube

### S10.1.1 Migraciones en despliegue
- [x] S10.1.1.1a Imagen Docker multi-etapa que compila `shared`, `api` y `web` — CI `.github/workflows/ci.yml` › docker › `docker build -t zentia:ci .`
- [x] S10.1.1.1b Express sirve la API en `/api` y la web en `/` (mismo origen) — `apps/api/src/core/http/static-web.test.ts` › static web › serves index.html at / and on client routes without cache; › never captures /api routes; › caches hashed assets for a year
- [x] S10.1.1.2a Seed idempotente de `CompanySettings` y del primer `ADMIN` — `apps/api/src/modules/company-settings/application/company-settings-use-cases.test.ts` › SeedCompanySettingsUseCase › creates the row once and leaves an existing one untouched; `apps/api/src/modules/company-settings/infrastructure/prisma-company-settings.integration.test.ts` › seeds the defaults once and never overwrites an existing row; `apps/api/src/modules/auth/application/auth-use-cases.test.ts` › SeedFirstAdminUseCase › creates the first admin with mustChangePassword only once
- [ ] S10.1.1.2b `docker/entrypoint.sh` corre `migrate deploy` y el seed antes de arrancar; si la migración falla, el contenedor no arranca (`set -e`) — manual, pendiente (`docker run` contra una base sin migrar y con una migración rota)
- [ ] S10.1.1.3 Un despliegue sin cambios de schema no modifica la base — manual, pendiente (segundo `docker run` sobre la misma base: `migrate deploy` sin migraciones pendientes y seed sin cambios)
- [x] S10.1.1.4 Despliegue al hacer merge a `main` solo si el CI pasa — revisión estática: `render.yaml` (`branch: main`, `autoDeployTrigger: checksPass`)

### S10.1.2 Variables de entorno productivas
- [x] S10.1.2.1 `.env.example` documenta todas las variables; producción las define en el gestor del proveedor — revisión estática: `apps/api/.env.example`, `README.md` (tabla de variables) y `render.yaml` (`sync: false` para secretos)
- [x] S10.1.2.2a `NODE_ENV=production` deshabilita `/api/docs` por defecto — `apps/api/src/core/env/load-env.test.ts` › loadEnv › disables docs by default in production; `apps/api/src/app.test.ts` › API base › answers 404 for the Swagger UI when docs are disabled
- [x] S10.1.2.2b En producción `CORS_ORIGIN` es obligatorio (no cae en `localhost`) — `apps/api/src/core/env/load-env.test.ts` › loadEnv › requires CORS_ORIGIN in production
- [x] S10.1.2.2c `JWT_ACCESS_SECRET` de 32 caracteres o más y `TZ=America/Bogota` — `apps/api/src/core/env/load-env.test.ts` › loadEnv › requires a JWT secret of at least 32 characters; › applies defaults
- [x] S10.1.2.2d `SCHEDULER_ENABLED` apagado por defecto y activado en una sola instancia — `apps/api/src/core/scheduler/scheduler.test.ts` › scheduler › keeps the scheduler disabled by default; revisión estática: `render.yaml` (`SCHEDULER_ENABLED: 'true'`, una instancia)
- [x] S10.1.2.2e `LLM_PROVIDER` por defecto `gemini`; sin `LLM_API_KEY` usa la plantilla de respaldo — `apps/api/src/core/env/load-env.test.ts` › loadEnv › defaults LLM_PROVIDER to gemini (Gemini Flash); `apps/api/src/modules/ai/ai-infrastructure.test.ts` › createPrismaAiInfrastructure › falls back to the template provider when gemini has no API key
- [ ] S10.1.2.3 `ADMIN_EMAIL` y `ADMIN_PASSWORD` se eliminan tras el primer despliegue — manual, pendiente (paso 3 de "Render" en `README.md`)
- [x] S10.1.2.4a Con `TRUST_PROXY=1` el rate limit usa la IP real del cliente — `apps/api/src/core/http/trust-proxy.test.ts` › TRUST_PROXY › rate-limits by the real client IP behind one proxy
- [x] S10.1.2.4b Cookie de refresh `Secure` — `apps/api/src/modules/auth/presentation/auth.routes.test.ts` › POST /api/auth/login › returns the session and a hardened refresh cookie
- [ ] S10.1.2.4c La cookie `Secure` funciona detrás del proxy HTTPS de la plataforma — manual, pendiente (login y recarga en staging; ver `docs/qa/navegadores.md`)

### S10.1.3 Endpoint de health
- [x] S10.1.3.1a `GET /api/health` público → 200 `{ status: "ok" }` si `SELECT 1` responde en menos de 1 s — `apps/api/src/app.test.ts` › API base › GET /api/health responds 200 with status ok; `apps/api/src/modules/health/presentation/health.routes.test.ts` › PrismaHealthCheck › is healthy when SELECT 1 answers
- [x] S10.1.3.1b Con rate limit propio de recursos públicos (separado del refresh) — `apps/api/src/core/http/trust-proxy.test.ts` › TRUST_PROXY › rate-limits by the real client IP behind one proxy; `apps/api/src/modules/auth/presentation/auth.routes.test.ts` › public rate limits › keeps refresh available after the public resources limit is exhausted
- [x] S10.1.3.2 Base caída o lenta → 503 `{ status: "error" }` sin detalles — `apps/api/src/modules/health/presentation/health.routes.test.ts` › GET /api/health › responds 503 without internal details when the database is down; › PrismaHealthCheck › is unhealthy on error or after the timeout
- [x] S10.1.3.3 La plataforma usa la ruta como health check — revisión estática: `render.yaml` (`healthCheckPath: /api/health`)

## H10.2 Verificación

### S10.2.1 Usabilidad (RNF-01)
- [ ] S10.2.1.1 Entre 3 y 5 participantes sin formación técnica ajenos al desarrollo — manual, pendiente (`docs/qa/usabilidad.md`)
- [ ] S10.2.1.2 30 min de familiarización en staging y tres tareas sin ayuda (cotización, PDF, estado) — manual, pendiente (`docs/qa/usabilidad.md`)
- [ ] S10.2.1.3 Registro por participante y tarea (completó, tiempo, errores) — manual, pendiente (`docs/qa/usabilidad.md`)
- [ ] S10.2.1.4 Al menos 80 % completa las tres tareas sin ayuda — manual, pendiente (`docs/qa/usabilidad.md`)
- [ ] S10.2.1.5 Resultados y hallazgos en `docs/qa/usabilidad.md` — manual, pendiente (plantilla lista)

### S10.2.2 Navegadores (RNF-06)
- [ ] S10.2.2.1 Dos últimas versiones de Chrome, Edge, Firefox y Safari — manual, pendiente (`docs/qa/navegadores.md`, estado parcial)
- [ ] S10.2.2.2 Checklist por navegador: login, cotización, PDF, WhatsApp y correo, estado y dashboard — manual, pendiente (`docs/qa/navegadores.md`)
- [ ] S10.2.2.3 Ancho de 360 px en un navegador móvil — manual, pendiente (`docs/qa/navegadores.md`)
- [ ] S10.2.2.4 Resultados con versión, fecha y paso; los fallos bloqueantes se corrigen antes de cerrar — manual, pendiente (`docs/qa/navegadores.md`)

### S10.2.3 Rendimiento p95 (RNF-05)
- [x] S10.2.3.1 Script `apps/api/scripts/perf/p95.ts` con 100 solicitudes secuenciales por escenario y p50, p95 y máximo — revisión estática: `apps/api/scripts/perf/p95.ts`; ejecución local en `docs/qa/rendimiento.md` (resultado preliminar)
- [ ] S10.2.3.2 Escenarios PDF 10 y 100 líneas, asistente con Gemini y con plantilla — manual, pendiente en staging (Gemini requiere `LLM_API_KEY`; `docs/qa/rendimiento.md`)
- [ ] S10.2.3.3 p95 menor a 5 s en cada escenario — manual, pendiente en staging (`docs/qa/rendimiento.md`, "Resultado en staging (oficial)")
- [ ] S10.2.3.4 Referencia de `GET /api/quotes` y `GET /api/dashboard/summary` — manual, pendiente en staging (`docs/qa/rendimiento.md`)
- [ ] S10.2.3.5 Resultados con fecha, entorno y versión desplegada — manual, pendiente en staging (`docs/qa/rendimiento.md`)
