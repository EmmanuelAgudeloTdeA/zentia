# M0 Fundación – Épicas

> Fuentes: `docs/fuente/desglose.md` (M0 y decisiones 84–88), `CLAUDE.md`, `docs/architecture.md` §2–§4, §7, §9.

## Objetivo
Dejar la base técnica común sobre la que se construyen los demás módulos: un monorepo tipado y con lint, un CI, una API Express con Prisma, errores con códigos y Swagger, y un front React con i18n, layout y rutas protegidas en esqueleto. Este módulo no incluye funcionalidad de negocio.

**Cubre:** RNF-04 (agregar módulos sin tocar el `domain` de otros) y RNF-07 (Clean Architecture, barriles, lint con cero warnings, CI). No cubre ningún RF.

## Depende de
Nada. Es el primer módulo.

## Lo desbloquea
| Módulo | Qué necesita de M0 |
|---|---|
| M1 Acceso y usuarios | App Express con su cadena de middlewares (H0.2); manejo de errores con códigos y catálogo en `shared` (S0.2.3); validación de env, que M1 extiende con `JWT_*` y `BCRYPT_COST` (S0.2.4); Swagger para documentar las rutas de auth (S0.2.2); esqueleto de rutas protegidas y del store de sesión que M1 completa (S0.3.3); `http-client` (S0.3.1) |
| M2–M9 | Estructura de módulos y barriles, reglas de lint por capa, Prisma client, registro OpenAPI por módulo, `lang/` del front, layout con navegación extensible |
| M10 Calidad y despliegue | Pipeline de CI (S0.1.4) y validación de env (S0.2.4) |

---

## H0.1 Monorepo, lint y TypeScript
**Objetivo:** un monorepo pnpm con TypeScript estricto, lint con cero warnings que hace cumplir las capas, y un CI que valida cada cambio.
**Depende de:** nada.

### S0.1.1 Workspaces pnpm
Como desarrollador del equipo, quiero un monorepo pnpm con `apps/api`, `apps/web` y `packages/shared`, para compartir tipos y schemas sin publicar paquetes.
- **RF de origen:** — (RNF-04, RNF-07)
- **Criterios de aceptación:**
  1. `pnpm install` en la raíz instala los tres paquetes sin errores; `apps/api` y `apps/web` importan `@zentia/shared` por nombre.
  2. `packages/shared` expone su API pública solo por `src/index.ts`, con las carpetas `enums/`, `schemas/`, `calc/` y `constants/` (vacías salvo lo que entregan S0.2.3 y S0.2.4).
  3. Los scripts raíz `dev`, `build`, `lint`, `typecheck` y `test` se ejecutan en todos los paquetes.
  4. Las versiones de Node y pnpm están fijadas (`engines` y `packageManager`) y documentadas en el `README.md`.
  5. El repositorio git está inicializado con `.gitignore` (incluye `.env`) y un commit inicial `:tada:`.
- **Depende de:** —
- **Tamaño:** S

### S0.1.2 tsconfig base
Como desarrollador del equipo, quiero un `tsconfig` base estricto heredado por todos los paquetes, para tener las mismas garantías de tipos en todo el monorepo.
- **RF de origen:** — (RNF-07)
- **Criterios de aceptación:**
  1. `tsconfig.base.json` tiene `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride` y `exactOptionalPropertyTypes`, y cada paquete lo extiende.
  2. `pnpm typecheck` termina sin errores en los tres paquetes.
  3. Las referencias entre proyectos permiten que `api` y `web` compilen contra `shared` sin pasos manuales.
  4. Un archivo con `any` implícito no compila.
- **Depende de:** S0.1.1
- **Tamaño:** S

### S0.1.3 ESLint y Prettier
Como desarrollador del equipo, quiero ESLint y Prettier con las reglas de arquitectura del proyecto, para que el lint impida romper las capas y la precisión de los cálculos.
- **RF de origen:** — (RNF-04, RNF-07)
- **Criterios de aceptación:**
  1. `pnpm lint` termina con cero errores y cero warnings; cualquier warning hace fallar el comando (`--max-warnings 0`).
  2. Con `no-restricted-imports`, un archivo de `domain/` que importe `application/`, `infrastructure/`, `presentation/` o una librería externa falla; un archivo de `application/` que importe `infrastructure/` o `presentation/` falla.
  3. Un import profundo hacia otro módulo (`modules/x/domain/...` desde `modules/y`) falla; el import desde el barril `modules/x` pasa.
  4. En `packages/shared/src/calc`, `parseFloat`, `parseInt`, `Number()`, `+x` y `Math.round` fallan.
  5. Se prohíbe `any` explícito (`@typescript-eslint/no-explicit-any`, salvo con comentario de justificación de una línea).
  6. Prettier formatea todo el repo y `pnpm format:check` no reporta diferencias.
- **Depende de:** S0.1.2
- **Tamaño:** M

### S0.1.4 Pipeline CI (lint, typecheck, test)
Como desarrollador del equipo, quiero un pipeline de CI que ejecute lint, typecheck y test en cada push y pull request, para detectar errores antes de integrar.
- **RF de origen:** — (RNF-07)
- **Criterios de aceptación:**
  1. El pipeline instala con `pnpm install --frozen-lockfile` y ejecuta, en orden, `lint`, `typecheck` y `test`; si alguno falla, falla el pipeline.
  2. El paso `test` incluye el test de paridad i18n (S0.3.2).
  3. El pipeline levanta un PostgreSQL de servicio para los tests de integración que lo necesiten.
  4. Un cambio que introduce un warning de lint hace fallar el pipeline.
- **Depende de:** S0.1.3
- **Tamaño:** M

---

## H0.2 API base
**Objetivo:** una API Express arrancable bajo `/api`, con Prisma conectado, middlewares de seguridad y logging, errores con códigos, Swagger condicionado por entorno y env validado.
**Depende de:** H0.1.

### S0.2.1 App Express con Prisma
Como desarrollador del equipo, quiero una app Express bajo `/api` con Prisma, logging y middlewares de seguridad, para que cada módulo solo agregue sus rutas.
- **RF de origen:** — (RNF-04)
- **Criterios de aceptación:**
  1. `pnpm --filter api dev` arranca la API con `tsx` y monta todas las rutas bajo `/api`.
  2. El Prisma client es un singleton en `core/` y se conecta a `DATABASE_URL`; `prisma migrate dev` corre sin errores.
  3. La cadena de middlewares incluye `helmet`, `cors` (orígenes desde env), `express.json()` con límite de 100 KB, `pino-http` con `requestId` y `redact` (`authorization`, `cookie`, `password`, `logoDataUrl`, `data`), y un rate limit general disponible para las rutas que lo requieran.
  4. Los módulos se registran desde `modules/<m>/index.ts` sin modificar `core/` (punto de extensión único).
  5. El proceso corre con `TZ=America/Bogota`.
- **Depende de:** S0.1.3
- **Tamaño:** M

### S0.2.2 Swagger en `/api/docs`
Como desarrollador del equipo, quiero la documentación OpenAPI generada desde los schemas Zod, para consultar y probar la API durante el desarrollo.
- **RF de origen:** — (RNF-03, decisiones 53 y 54)
- **Criterios de aceptación:**
  1. Cada módulo registra sus rutas en un registro OpenAPI propio (`*.openapi.ts`) y el core los combina.
  2. Con `DOCS_ENABLED=true`, `GET /api/docs` sirve Swagger UI y `GET /api/docs/openapi.json` el documento.
  3. Con `DOCS_ENABLED=false` (valor por defecto cuando `NODE_ENV=production`) ambas rutas responden 404.
  4. El documento declara el esquema de respuesta de error común (S0.2.3).
- **Depende de:** S0.2.1
- **Tamaño:** S

### S0.2.3 Manejo de errores con códigos
Como desarrollador del equipo, quiero que la API responda los errores con un código estable y sin texto, para que el front los traduzca y los módulos compartan el mismo formato.
- **RF de origen:** — (CLAUDE.md i18n)
- **Criterios de aceptación:**
  1. `AppError { code, status, params? }` existe en `core/` y el catálogo de códigos vive en `shared/constants/error-codes.ts`.
  2. `shared/schemas` expone el schema Zod de decimales como `string` (montos `Decimal(15,0)`, cantidades y porcentajes con hasta 2 decimales) que usan todos los módulos (decisiones 65 y 84).
  3. Toda respuesta de error tiene la forma `{ error: { code, params?, issues? } }` y nunca incluye mensajes de texto ni el stack.
  4. Un fallo de Zod responde 400 `VALIDATION_ERROR` con `issues: [{ path, code }]`.
  5. Una ruta inexistente responde 404 `NOT_FOUND`; un body JSON mal formado responde 400 `MALFORMED_JSON`; un body mayor al límite responde 413 `PAYLOAD_TOO_LARGE`; el rate limit responde 429 `RATE_LIMITED`.
  6. Un error no controlado responde 500 `INTERNAL_ERROR` y se registra con el `requestId`.
- **Depende de:** S0.2.1
- **Tamaño:** M

### S0.2.4 Validación de env
Como desarrollador del equipo, quiero que las variables de entorno se validen al arrancar, para fallar temprano con un mensaje claro en vez de fallar en producción.
- **RF de origen:** — (CLAUDE.md convenciones)
- **Criterios de aceptación:**
  1. Un schema Zod en `core/env` valida `NODE_ENV`, `PORT`, `DATABASE_URL`, `TZ`, `LOG_LEVEL`, `CORS_ORIGIN`, `DOCS_ENABLED` y `TRUST_PROXY`, con valores por defecto donde aplique.
  2. Si falta una variable obligatoria o tiene un formato inválido, el proceso termina con código distinto de cero y un log que nombra la variable, sin imprimir su valor.
  3. El resto del código lee la configuración solo desde el objeto validado, nunca desde `process.env`.
  4. `.env.example` lista todas las variables de M0 con comentarios de una línea; los módulos posteriores lo extienden.
- **Depende de:** S0.2.1
- **Tamaño:** S

---

## H0.3 Front base
**Objetivo:** una SPA React con Vite y Tailwind v4, i18n `es`/`en`, cliente HTTP común, layout y un esqueleto de rutas protegidas que M1 completa.
**Depende de:** H0.1. S0.3.1 requiere el catálogo de errores de S0.2.3.

### S0.3.1 App React con Vite
Como desarrollador del equipo, quiero una SPA React con Vite, Tailwind v4, router y un cliente HTTP común, para que cada feature solo agregue sus pantallas y services.
- **RF de origen:** — (RNF-04)
- **Criterios de aceptación:**
  1. `pnpm --filter web dev` arranca la SPA; en desarrollo, Vite hace proxy de `/api` a la API (mismo origen, decisión 62).
  2. Tailwind v4 está configurado y `react-router` monta las rutas desde `core/router`; cada feature registra sus rutas por su barril.
  3. `core/http-client` usa `fetch` con base `/api`, envía JSON, devuelve datos tipados y convierte las respuestas de error en un `ApiError` con `code`, `params` e `issues`.
  4. Un error de red se convierte en `ApiError` con el código `NETWORK_ERROR`.
  5. Los componentes no importan `http-client` directamente (regla de lint por carpeta).
- **Depende de:** S0.1.3, S0.2.3
- **Tamaño:** M

### S0.3.2 Carga de `lang/`
Como usuario de la aplicación, quiero ver la interfaz en español por defecto y poder usarla en inglés, para trabajar en mi idioma.
- **RF de origen:** — (CLAUDE.md i18n)
- **Criterios de aceptación:**
  1. `i18next` + `react-i18next` cargan `apps/web/src/lang/es.json` y `en.json`; el idioma por defecto es `es`.
  2. El idioma elegido se recuerda entre sesiones en el navegador.
  3. Un `ApiError` se muestra con la clave `errors.<CODE>`; si el código no tiene clave, se muestra `errors.UNKNOWN`.
  4. Un test compara `es` y `en` (front y, cuando exista, back) y falla si difieren las claves o los marcadores `{{...}}`.
  5. Ningún texto visible del layout está escrito en el código: todo sale de `lang/`.
- **Depende de:** S0.3.1
- **Tamaño:** S

### S0.3.3 Layout y rutas protegidas (esqueleto)
Como usuario de la aplicación, quiero un layout con navegación y que las pantallas privadas me pidan iniciar sesión, para moverme por la aplicación con una estructura coherente.
- **RF de origen:** — (base para RF-10)
- **Criterios de aceptación:**
  1. Existe un layout privado (encabezado con navegación horizontal que pasa a un panel lateral por debajo de 1024 px, área de contenido y selector de idioma) y uno público (para el login de M1, con selector de idioma) (decisiones 179 y 185).
  2. La navegación se construye con entradas que cada feature registra; un rol puede filtrar las entradas (el filtrado real lo implementa M1).
  3. El componente `ProtectedRoute` lee el estado de sesión de `core/auth` (store Zustand con la forma de sesión) y redirige a `/login` si no hay sesión; mientras M1 no exista, la sesión siempre está vacía.
  4. Hay una página 404, una página "sin permiso" y un estado de carga común.
  5. El layout funciona desde 360 px de ancho sin scroll horizontal.
- **Depende de:** S0.3.2
- **Tamaño:** M
