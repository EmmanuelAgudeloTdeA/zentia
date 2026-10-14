# M10 Calidad y despliegue – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §7, §8 y §10; base de M0–M9.

## 1. Entidades Prisma
M10 no agrega modelos. Usa las migraciones de M1–M9 y los seeds idempotentes.

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/health` | Público (rate limit general) | — | 200 `{ status: "ok" }` | 503 `{ status: "error" }` |
| GET | `/*` (fuera de `/api`) | Público | — | Archivos estáticos de `apps/web/dist`; las rutas desconocidas devuelven `index.html` (SPA) | — |

## 3. Application: casos de uso y puertos
| Pieza | Ubicación | Notas |
|---|---|---|
| `HealthCheck` | `apps/api/src/core/health/` | `SELECT 1` con timeout de 1 s; no expone detalles |
| `StaticWebMiddleware` | `apps/api/src/core/http/` | `express.static` sobre `apps/web/dist` con `Cache-Control` largo para assets con hash e `index.html` sin caché; montado después de `/api` |
| `entrypoint.sh` | raíz de la imagen | `prisma migrate deploy` → `node dist/seed.js` → `node dist/main.js` (cada paso aborta si falla) |
| `p95.ts` | `apps/api/scripts/perf/` | `fetch` + `performance.now()`; login previo; percentiles calculados en el script (sin librerías nuevas) |

## 4. Front
- La web se sirve desde Express en el mismo origen; no hay cambios funcionales.
- El build de producción (`vite build`) se copia a la imagen.
- `VITE_*` no se usa para URLs: la API siempre es `/api`.

## 5. Claves de `lang/`
No agrega claves de UI. Los documentos de QA (`docs/qa/*.md`) no forman parte de `lang/`.

## 6. Reglas y configuración
**Plataforma** (decisión 171)
| Elemento | Elección | Alternativa descartada |
|---|---|---|
| Servicio | Render: *web service* con Docker, HTTPS administrado, health check en `/api/health` | Railway (equivalente; se puede cambiar sin tocar el código) · VPS propio (más mantenimiento) |
| Base de datos | Render PostgreSQL administrado, con backups diarios | Postgres en el mismo contenedor (sin backups ni persistencia confiable) |
| Entornos | `staging` (con `seed:demo`, decisión 163) y `production` (sin datos sintéticos), uno por empresa | Un solo entorno |
| Instancias | 1 por empresa (`SCHEDULER_ENABLED=true`) | Varias instancias (requiere resolver la deuda de `node-cron`) |
| Despliegue | Auto-deploy desde `main` con "esperar a que el CI pase" | Despliegue manual |

**Dockerfile (multi-etapa)**
1. `deps`: Node 24 + `corepack enable` + `pnpm install --frozen-lockfile`.
2. `build`: `pnpm -r build` (`shared` → `api` → `web`) y `prisma generate`.
3. `runtime`: Node 24 slim, usuario no root, solo `dist/`, `node_modules` de producción, `prisma/` y `entrypoint.sh`; `TZ=America/Bogota`.

**Variables de producción**
| Variable | Valor en producción |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | La del Postgres administrado (secreto) |
| `PORT` | El que asigne la plataforma |
| `TZ` | `America/Bogota` |
| `TRUST_PROXY` | `1` (un salto: el proxy HTTPS de la plataforma) |
| `CORS_ORIGIN` | El dominio público de la instalación |
| `DOCS_ENABLED` | `false` |
| `SCHEDULER_ENABLED` | `true` |
| `LOG_LEVEL` | `info` |
| `JWT_ACCESS_SECRET` | Aleatorio de 32 caracteres o más (secreto) |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | `15m` / `7d` |
| `BCRYPT_COST` | `12` |
| `LLM_PROVIDER` / `LLM_MODEL` / `LLM_API_KEY` / `LLM_TIMEOUT_MS` | `gemini` / modelo Flash vigente / secreto / `4000` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo en el primer despliegue; luego se eliminan |
| `ALLOW_DEMO_SEED` | Sin definir (solo `staging` usa `seed:demo`) |

**Health:** 200 si `SELECT 1` < 1 s; si no, 503. El cuerpo nunca incluye detalles.

**Criterios de verificación**
| RNF | Método | Umbral | Evidencia |
|---|---|---|---|
| RNF-01 | 3–5 participantes, 30 min de familiarización, 3 tareas sin ayuda | ≥ 80 % de participantes completa las 3 | `docs/qa/usabilidad.md` |
| RNF-05 | 100 solicitudes por escenario en staging | p95 < 5 s por escenario | `docs/qa/rendimiento.md` |
| RNF-06 | Checklist en las 2 últimas versiones de Chrome, Edge, Firefox y Safari, y 360 px | Todos los pasos OK | `docs/qa/navegadores.md` |

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `health.routes.spec` | Supertest | 200 con BD; 503 con BD caída (cliente simulado); sin detalles |
| `static-web.spec` | Supertest | `/` sirve `index.html`; rutas SPA devuelven `index.html`; `/api/*` no es capturado por los estáticos; encabezados de caché |
| `env.production.spec` | Unitaria | En `production`: `DOCS_ENABLED` por defecto `false`; rechaza un `JWT_ACCESS_SECRET` corto |
| `trust-proxy.spec` | Supertest | Con `TRUST_PROXY=1` y `X-Forwarded-For`, el rate limit usa la IP del cliente |
| Arranque del contenedor | Manual / CI | `docker build` + `docker run` contra un Postgres temporal: migraciones, seed y health en 200 |
| `p95.ts` | Script | Escenarios de la sección 6 |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 171–178) |
|---|---|
| Proveedor cloud | Render (servicio Docker + Postgres administrado); Railway como alternativa equivalente. |
| `trust proxy` (decisión 79) | `TRUST_PROXY=1` en producción (un proxy HTTPS delante). |
| Health con BD | El health también verifica la base (no solo el proceso), para que la plataforma reinicie si se pierde la conexión. |
| Express sirve la web | Mismo origen sin un proxy adicional; usa `express.static` (sin librerías nuevas). |
| Plan gratuito y "dormir" | Los planes gratuitos suspenden el servicio por inactividad; el primer request tarda y el scheduler no corre mientras está suspendido. La recuperación al arrancar (decisión 66) cubre los jobs perdidos; para producción real se recomienda un plan sin suspensión. |
| Safari en la matriz | Requiere un equipo con macOS o iOS; si el equipo no tiene uno, hay que conseguirlo para cerrar RNF-06. |
| Participantes de RNF-01 | Personas sin formación técnica ajenas al desarrollo; reclutarlas es responsabilidad del equipo. |
| Backups | Los del Postgres administrado (diarios); la restauración no se prueba en el MVP. |
