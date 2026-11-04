# Checklist de QA: M2 Configuración de empresa

> Fuente de criterios: `docs/modules/mod-2-configuracion-empresa/epics.md` y las reglas de `CLAUDE.md` que tocan este módulo. Cada criterio cita la prueba automática que lo cubre (`archivo › nombre de la prueba`). Las pruebas `*.integration.test.ts` solo corren con `TEST_DATABASE_URL` (en CI, con Postgres).

## Depende de
- M1 (H1.2): guard de autenticación y roles.
- M0 (H0.2): app Express, catálogo de errores, registro OpenAPI y `percentString`.

## Estado
Todos los criterios tienen prueba automática. Queda pendiente solo la revisión visual manual del encabezado y del login en navegadores reales.

Rutas abreviadas: `api/…` = `apps/api/src/modules/company-settings/…`; `web/…` = `apps/web/src/…`.

## H2.1 Datos y logo

### S2.1.1 Editar datos de empresa
- [x] S2.1.1.1 `PATCH /company/profile` (solo `ADMIN`) actualiza los campos enviados, incluido `documentLocale`, y no toca los demás — `api/presentation/company.routes.test.ts` › updates only the sent fields (ADMIN); › saves city, website and bank accounts and clears them with an empty string; › is forbidden for MANAGER and SELLER (en `PATCH /api/company/profile`)
- [x] S2.1.1.2 Formatos inválidos responden 400 `VALIDATION_ERROR` — `api/presentation/company.routes.test.ts` › answers VALIDATION_ERROR for bad formats
- [x] S2.1.1.3 `GET /company/settings` para cualquier usuario autenticado, con `hasLogo` y sin el logo — `api/presentation/company.routes.test.ts` › is readable by any authenticated user and never includes the logo; › requires authentication
- [x] S2.1.1.4 Pantalla "Ajustes" solo para `ADMIN`, validada con los schemas de `shared` — `web/features/company-settings/components/company-settings.test.tsx` › shows the forbidden page to non-admin roles; › validates the email format before calling the API; › saves only the changed part and updates the brand name in the header

### S2.1.2 Subir logo
- [x] S2.1.2.1 `PUT /company/logo` solo `ADMIN`, base64 en JSON con parser propio de 1 MB antes del global — `api/presentation/company.routes.test.ts` › only ADMIN can upload or delete; › answers LOGO_TOO_LARGE above 512 KB and PAYLOAD_TOO_LARGE above 1 MB of body; › keeps the 100 KB limit on every other route
- [x] S2.1.2.2 Solo PNG/JPEG con firma coherente; si no, 400 `LOGO_INVALID_TYPE` — `api/presentation/company.routes.test.ts` › rejects unsupported types and signatures that do not match the mimeType; `api/domain/company-settings-domain.test.ts` › requires a supported type whose signature matches; `api/infrastructure/signature-image-inspector.test.ts` › detects PNG and JPEG by their leading bytes
- [x] S2.1.2.3 Más de 512 KB decodificados → 400 `LOGO_TOO_LARGE`; body > 1 MB → 413 `PAYLOAD_TOO_LARGE` — `api/presentation/company.routes.test.ts` › answers LOGO_TOO_LARGE above 512 KB and PAYLOAD_TOO_LARGE above 1 MB of body; `api/application/company-settings-use-cases.test.ts` › rejects images over 512 KB decoded
- [x] S2.1.2.4 Guarda data URL y responde `{ hasLogo: true, logoVersion }` — `api/presentation/company.routes.test.ts` › uploads, serves with ETag and deletes idempotently; `api/application/company-settings-use-cases.test.ts` › stores a data URL and increments logoVersion on each upload; `api/infrastructure/prisma-company-settings.integration.test.ts` › maps decimals as strings and bumps the logo version atomically
- [x] S2.1.2.5 El front valida tipo y tamaño antes de enviar y muestra vista previa — `web/features/company-settings/components/company-settings.test.tsx` › rejects unsupported types and files over 512 KB in the browser; › previews the new logo and uploads it with the save button

### S2.1.3 Eliminar logo
- [x] S2.1.3.1 `DELETE /company/logo` (solo `ADMIN`) responde 204, también sin logo — `api/presentation/company.routes.test.ts` › uploads, serves with ETag and deletes idempotently; › only ADMIN can upload or delete
- [x] S2.1.3.2 Después, `GET /company/logo` → 404 `LOGO_NOT_FOUND` y branding con `hasLogo: false` — `api/presentation/company.routes.test.ts` › uploads, serves with ETag and deletes idempotently
- [x] S2.1.3.3 El front pide confirmación antes de eliminar — `web/features/company-settings/components/company-settings.test.tsx` › confirms before removing the logo

### S2.1.4 Branding público para el login
- [x] S2.1.4.1 `GET /company/branding` público, con rate limit, solo `{ name, hasLogo, logoVersion }` y `Cache-Control: no-cache` — `api/presentation/company.routes.test.ts` › is public and returns only name, hasLogo and logoVersion; › applies the resource rate limit to the public branding and logo routes
- [x] S2.1.4.2 `GET /company/logo` público, con rate limit, `Content-Type`, `Cache-Control: public, max-age=300`, `ETag` por `logoVersion` y 404 sin logo — `api/presentation/company.routes.test.ts` › uploads, serves with ETag and deletes idempotently; › applies the resource rate limit to the public branding and logo routes
- [x] S2.1.4.3 Login con logo (`?v=logoVersion`) y nombre; encabezado solo con el logo y el nombre como etiqueta accesible (decisión posterior); menú móvil con el nombre; `app.name` si no hay nombre — `web/features/company-settings/components/company-settings.test.tsx` › shows the logo and name on the login and falls back to the Zentia mark if it breaks; › shows only the logo in the header and keeps the name as its accessible label; › falls back to app.name when the company has no name; `web/core/layout/layout.test.tsx` › opens the navigation drawer with the brand name and closes it with Escape
- [ ] S2.1.4.3 Revisión visual del encabezado y del login en navegadores reales — manual, pendiente
- [x] S2.1.4.4 Tras subir o eliminar el logo, el layout se actualiza sin recargar — `web/features/company-settings/components/company-settings.test.tsx` › previews the new logo and uploads it with the save button; › confirms before removing the logo

## H2.2 Parámetros comerciales

### S2.2.1 Editar parámetros
- [x] S2.2.1.1 `PATCH /company/parameters` (solo `ADMIN`) actualiza los nueve parámetros — `api/presentation/company.routes.test.ts` › updates parameters and returns limits as percent strings; › is forbidden for MANAGER and SELLER (en `PATCH /api/company/parameters`)
- [x] S2.2.1.2 Rangos validados sobre el resultado combinado, con el issue en el campo — `api/presentation/company.routes.test.ts` › validates X < N over the combined values with the issue on the field; `api/domain/company-settings-domain.test.ts` › validates X < N over the combined result, not only the patch; › accepts raising X and N together
- [x] S2.2.1.3 Límites de descuento como `percentString` (0–100, hasta 2 decimales), con mensaje "demasiado grande" por encima de 100 — `api/presentation/company.routes.test.ts` › rejects out-of-range values; `web/features/company-settings/components/company-settings.test.tsx` › sends percent strings with a dot and places server issues on their field; `web/features/company-settings/components/field-errors.test.ts` › maps a percent above 100 to too_big instead of the generic message; › never produces a key that is missing from lang
- [x] S2.2.1.4 "Ajustes" explica que los cambios aplican a operaciones futuras — `web/features/company-settings/components/company-settings.test.tsx` › explains that changes apply to future quotes and validates X < N live

### S2.2.2 Valores por defecto del seed
- [x] S2.2.2.1 El seed crea la fila `id = 1` con los valores por defecto — `api/application/company-settings-use-cases.test.ts` › creates the row once and leaves an existing one untouched; `api/infrastructure/prisma-company-settings.integration.test.ts` › seeds the defaults once and never overwrites an existing row
- [x] S2.2.2.2 Si la fila existe, el seed no la modifica — mismas pruebas que S2.2.2.1
- [x] S2.2.2.3 La migración tiene `CHECK (id = 1)` y los `CHECK` de rango — `api/infrastructure/prisma-company-settings.integration.test.ts` › enforces the range CHECKs in the database; › rejects a second row
- [x] S2.2.2.4 La BD rechaza una segunda fila — `api/infrastructure/prisma-company-settings.integration.test.ts` › rejects a second row

### S2.2.3 Lectura de parámetros por otros módulos
- [x] S2.2.3.1 `SettingsReader` con DTOs de solo lectura — `api/application/company-settings-use-cases.test.ts` › returns read-only DTOs that reflect changes on the next read
- [x] S2.2.3.2 Sin caché: un cambio aplica en la siguiente lectura — `api/application/company-settings-use-cases.test.ts` › returns read-only DTOs that reflect changes on the next read
- [x] S2.2.3.3 `getDocumentProfile()` incluye `logoDataUrl`; `GET /company/settings` nunca — `api/application/company-settings-use-cases.test.ts` › includes the logo data URL only in the document profile; `api/presentation/company.routes.test.ts` › is readable by any authenticated user and never includes the logo
- [x] S2.2.3.4 Ningún módulo importa el repositorio Prisma de `CompanySettings` — `eslint.config.js` › `no-restricted-imports` (imports profundos entre módulos), verificado por `pnpm lint` en CI

## Reglas críticas de `CLAUDE.md`
- [x] Una sola fila de `CompanySettings` — `api/infrastructure/prisma-company-settings.integration.test.ts` › rejects a second row
- [x] X ≥ 1, Y ≥ 1, X < días de vigencia; umbral de RF-09 entre 30 y 50 — `api/presentation/company.routes.test.ts` › rejects out-of-range values; › validates X < N over the combined values with the issue on the field
- [x] Logo PNG/JPG de hasta 512 KB en base64 dentro del JSON, límite de 1 MB solo en esa ruta — `api/presentation/company.routes.test.ts` › answers LOGO_TOO_LARGE above 512 KB and PAYLOAD_TOO_LARGE above 1 MB of body; › keeps the 100 KB limit on every other route
- [x] Rutas públicas con rate limit (`/company/branding`, `/company/logo`) — `api/presentation/company.routes.test.ts` › applies the resource rate limit to the public branding and logo routes
- [x] Toda ruta documentada en OpenAPI — `api/presentation/company.routes.test.ts` › is documented in OpenAPI along with the other company routes
- [x] Montos y porcentajes viajan como `string` — `api/presentation/company.routes.test.ts` › updates parameters and returns limits as percent strings
- [x] Sin texto fijo en la UI: claves iguales en `es` y `en` — `apps/web/src/lang/lang-parity.test.ts` › es and en have the same keys; › es and en use the same markers per key
