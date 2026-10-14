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
pnpm db:up
```

## Variables de entorno (`apps/api/.env`)

| Variable       | Descripción                             | Valor por defecto                |
| -------------- | --------------------------------------- | -------------------------------- |
| `NODE_ENV`     | `development`, `test` o `production`    | `development`                    |
| `PORT`         | Puerto de la API                        | `3000`                           |
| `DATABASE_URL` | Conexión a PostgreSQL                   | — (obligatoria)                  |
| `TZ`           | Zona horaria del proceso                | `America/Bogota`                 |
| `LOG_LEVEL`    | Nivel de log de pino                    | `info`                           |
| `CORS_ORIGIN`  | Orígenes permitidos, separados por coma | `http://localhost:5173`          |
| `DOCS_ENABLED` | Swagger en `/api/docs`                  | `true` (`false` en `production`) |
| `TRUST_PROXY`  | `false`, `true` o número de proxies     | `false`                          |

La API valida las variables al arrancar y se detiene si alguna falta o es inválida.

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
