# Zentia

Sistema web para que las pymes gestionen cotizaciones comerciales: crear, enviar, dar seguimiento y analizar, con apoyo de IA. Una instalación por empresa.

La documentación del proyecto (brief, PRD, arquitectura, módulos y decisiones) está en [`docs/`](docs/). Las reglas de trabajo están en [`CLAUDE.md`](CLAUDE.md).

## Requisitos

| Herramienta | Versión                                     |
| ----------- | ------------------------------------------- |
| Node.js     | 24 LTS o superior (`.nvmrc`)                |
| pnpm        | 10 (`corepack enable` o `npm i -g pnpm@10`) |
| Docker      | Para la base de datos local (PostgreSQL 17) |

## Instalación

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# Completa en apps/api/.env antes de seguir:
#   JWT_ACCESS_SECRET → genérala con el comando de abajo
#   ADMIN_EMAIL / ADMIN_PASSWORD → la contraseña necesita mínimo 10 caracteres, con letras y números
pnpm db:up
pnpm --filter @zentia/api prisma:migrate   # aplica las migraciones
pnpm --filter @zentia/api db:seed          # crea el primer administrador (ADMIN_EMAIL / ADMIN_PASSWORD)
```

El primer administrador entra con `mustChangePassword` y debe cambiar la contraseña al iniciar sesión.

`JWT_ACCESS_SECRET` es la clave con la que la API firma los access tokens. Cada `.env` necesita una propia, aleatoria y de al menos 32 caracteres; nunca se sube al repositorio. Para generarla:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Si falta, la API se detiene al arrancar con `Invalid environment variables` y el login no responde.

## Variables de entorno (`apps/api/.env`)

| Variable                        | Descripción                                                       | Valor por defecto                                     |
| ------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                      | `development`, `test` o `production`                              | `development`                                         |
| `PORT`                          | Puerto de la API                                                  | `3000`                                                |
| `DATABASE_URL`                  | Conexión a PostgreSQL                                             | — (obligatoria)                                       |
| `TZ`                            | Zona horaria del proceso                                          | `America/Bogota`                                      |
| `LOG_LEVEL`                     | Nivel de log de pino                                              | `info`                                                |
| `CORS_ORIGIN`                   | Orígenes permitidos, separados por coma                           | `http://localhost:5173` (obligatoria en `production`) |
| `DOCS_ENABLED`                  | Swagger en `/api/docs`                                            | `true` (`false` en `production`)                      |
| `TRUST_PROXY`                   | `false`, `true` o número de proxies                               | `false`                                               |
| `JWT_ACCESS_SECRET`             | Secreto HS256 del access token (≥ 32 caracteres)                  | — (obligatoria)                                       |
| `ACCESS_TOKEN_TTL`              | Duración del access token                                         | `15m`                                                 |
| `REFRESH_TOKEN_TTL`             | Duración del refresh token                                        | `7d`                                                  |
| `BCRYPT_COST`                   | Costo de bcrypt (4–15)                                            | `12`                                                  |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo para el seed del primer administrador                        | —                                                     |
| `SCHEDULER_ENABLED`             | Jobs diarios (vencimiento y alertas)                              | `false`                                               |
| `LLM_PROVIDER`                  | `gemini` o `none` (siempre plantilla); sin clave usa la plantilla | `gemini`                                              |
| `LLM_MODEL`, `LLM_API_KEY`      | Modelo y clave del asistente de IA                                | `gemini-2.5-flash`, —                                 |
| `LLM_TIMEOUT_MS`                | Tiempo límite del asistente                                       | `4000`                                                |
| `WEB_DIST_DIR`                  | Web compilada que sirve la API (mismo origen)                     | — (sin estáticos)                                     |
| `ALLOW_DEMO_SEED`               | Permite `seed:demo` con `NODE_ENV=production`                     | —                                                     |

La API valida las variables al arrancar y se detiene si alguna falta o es inválida.

Los tests de integración con PostgreSQL solo corren si se define `TEST_DATABASE_URL` apuntando a una base migrada (por ejemplo, `zentia_test`).

## Levantar el proyecto

| Qué           | Comando                                | URL                                                |
| ------------- | -------------------------------------- | -------------------------------------------------- |
| Base de datos | `pnpm db:up` (detener: `pnpm db:down`) | `postgresql://zentia:zentia@localhost:5432/zentia` |
| API           | `pnpm --filter @zentia/api dev`        | http://localhost:3000/api                          |
| Web           | `pnpm --filter @zentia/web dev`        | http://localhost:5173                              |
| API + Web     | `pnpm dev`                             | —                                                  |

- Salud de la API: `GET http://localhost:3000/api/health`
- Documentación de la API: http://localhost:3000/api/docs
- En desarrollo, la web reenvía `/api` a la API (mismo origen).
- Datos de demostración (marcados `[DEMO]`): `pnpm --filter @zentia/api seed:demo`.

## Despliegue

Una instalación por empresa: un contenedor Docker (API + web en el mismo dominio) y un PostgreSQL administrado. El CI (`.github/workflows/ci.yml`) ejecuta lint, typecheck, formato, pruebas con PostgreSQL y el build de la imagen.

**Imagen.** `docker build -t zentia .` compila `shared`, `api` y `web`. Al arrancar, `docker/entrypoint.sh` aplica `prisma migrate deploy`, ejecuta el seed idempotente (primer administrador y configuración) y levanta la API; si la migración falla, el contenedor no arranca. Express sirve la API en `/api` y la web en `/`.

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... -e JWT_ACCESS_SECRET=<32+ caracteres> \
  -e CORS_ORIGIN=http://localhost:3000 -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... zentia
```

**Render** (`render.yaml`):

1. En Render, _New → Blueprint_ y elegir este repositorio: crea el servicio `zentia` y la base `zentia-db`.
2. Completar los secretos marcados: `CORS_ORIGIN` (dominio público), `LLM_API_KEY`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. `JWT_ACCESS_SECRET` se genera solo.
3. Tras el primer despliegue, iniciar sesión, cambiar la contraseña temporal y **eliminar** `ADMIN_EMAIL` y `ADMIN_PASSWORD` del panel.
4. Los despliegues siguientes salen de `main` solo cuando el CI pasa (`autoDeployTrigger: checksPass`). La plataforma usa `GET /api/health` (verifica la base) como health check.

- **Staging:** el mismo blueprint con otro nombre; después del primer despliegue, ejecutar `ALLOW_DEMO_SEED=true node dist/seed-demo.js` desde la consola del servicio. Producción nunca lleva datos sintéticos.
- **Una sola instancia** por empresa (`SCHEDULER_ENABLED=true`): con varias, los jobs se duplicarían.
- **Plan gratuito** (el que usa `render.yaml`): el servicio se suspende por inactividad, así que el primer acceso tarda y los jobs no corren mientras está suspendido (la pasada de recuperación al arrancar los pone al día); no hay consola _Shell_ y la base gratuita vence a los 30 días. Para uso real, cambiar `plan` a uno de pago (p. ej. `starter` y `basic-256mb`).

## Scripts (raíz)

| Script                              | Qué hace                                                    |
| ----------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                          | API y web en modo desarrollo                                |
| `pnpm build`                        | Compila `shared`, `api` (incluye `prisma generate`) y `web` |
| `pnpm lint`                         | ESLint en todo el repo, sin warnings                        |
| `pnpm typecheck`                    | TypeScript en los tres paquetes                             |
| `pnpm test`                         | Vitest en los tres paquetes                                 |
| `pnpm format` / `pnpm format:check` | Prettier                                                    |
| `pnpm db:up` / `pnpm db:down`       | PostgreSQL local con Docker                                 |

## Estructura

```
zentia/
├── apps/
│   ├── api/                 # Express + Prisma
│   │   ├── prisma/          # schema.prisma (sin modelos de negocio todavía)
│   │   └── src/
│   │       ├── core/        # env, http (errores, rate limit), logger, openapi, prisma, modules
│   │       ├── modules/     # un módulo por carpeta, con barril index.ts (ej.: health)
│   │       ├── lang/        # es.json, en.json (textos que genera el back: PDF, IA)
│   │       ├── app.ts
│   │       └── main.ts
│   └── web/                 # React + Vite + Zustand + Tailwind
│       └── src/
│           ├── core/        # i18n, layout, router
│           ├── features/    # una carpeta por módulo, con barril index.ts
│           └── lang/        # es.json, en.json
├── packages/
│   └── shared/              # schemas Zod, enums y constantes comunes
├── docs/                    # brief, PRD, arquitectura, módulos y fuentes
├── docker-compose.yml       # solo PostgreSQL local
├── CLAUDE.md
└── README.md
```
