# Checklist de QA – M4 Cotizaciones

> Criterios de aceptación de `docs/modules/mod-4-cotizaciones/epics.md` y reglas críticas de `CLAUDE.md`, cada uno con la prueba que lo cubre (`archivo › nombre del test`). Las pruebas `*.integration.test.ts` requieren `TEST_DATABASE_URL` y corren en CI.

## Depende de
- M4 implementado (H4.1, H4.2 y H4.3) y la auditoría de la rama `mod-4-cotizaciones-auditoria`.
- M0 (CI con Postgres para las pruebas de integración), M1, M2 y M3.

## Estado
Automatizado casi todo. Quedan pendientes las verificaciones visuales (selectores del editor, colores de estado) y la ausencia de rutas de borrado, que se revisan a mano.

Rutas abreviadas:
- `api/quote-use-cases` = `apps/api/src/modules/quotes/application/quote-use-cases.test.ts`
- `api/quotes-domain` = `apps/api/src/modules/quotes/domain/quotes-domain.test.ts`
- `api/quotes.routes` = `apps/api/src/modules/quotes/presentation/quotes.routes.test.ts`
- `api/prisma-quote.integration` = `apps/api/src/modules/quotes/infrastructure/prisma-quote.integration.test.ts`
- `shared/quote-totals` = `packages/shared/src/calc/quote-totals.test.ts`
- `shared/quotes.schema` = `packages/shared/src/schemas/quotes.schema.test.ts`
- `web/quotes` = `apps/web/src/features/quotes/components/quotes.test.tsx`

## H4.1 Creación y cálculo

### S4.1.1 Crear borrador con líneas
- [x] S4.1.1.1 Crea `DRAFT` con el actor como dueño; cliente o producto inactivo → 400 con el id — `api/quote-use-cases` › creates the PPI example as a draft with consecutive numbers; › rejects inactive customers and products, and repeated products
- [x] S4.1.1.1 Entre 1 y 100 líneas — `shared/quotes.schema` › defaults discount and shipping and limits lines to 1–100
- [x] S4.1.1.2 Snapshot de nombre, categoría, precio y tarifa; producto repetido → 400 `DUPLICATE_PRODUCT_LINE` — `api/quote-use-cases` › edits a draft without versions and keeps line snapshots; › rejects inactive customers and products, and repeated products
- [x] S4.1.1.3 `quantity` > 0 con hasta 2 decimales — `shared/quotes.schema` › accepts quantity %s; › rejects quantity %s
- [x] S4.1.1.3 `shippingAmount` `moneyString` ≥ 0 y opcional — `shared/quotes.schema` › defaults discount and shipping and limits lines to 1–100
- [x] S4.1.1.4 `shippingTaxable` se toma al crear y queda como snapshot aunque cambie el parámetro — `api/quote-use-cases` › keeps the shippingTaxable snapshot after the parameter changes
- [ ] S4.1.1.5 Editor con selector de cliente, selector de productos activos y tabla de líneas editable — manual, pendiente

### S4.1.2 Cálculo de totales
- [x] S4.1.2.1 `decimal.js` half-up por concepto, sin redondeo del IVA por línea — `shared/quote-totals` › rounds each concept half-up independently; › does not round VAT per line; › handles exempt lines and 0 % / 100 % discounts
- [x] S4.1.2.2 Ejemplo del PPI 5.375.000 y con envío gravado 5.378.800 — `shared/quote-totals` › matches the PPI example (5.375.000); › adds 19 % VAT to taxable shipping (5.378.800)
- [x] S4.1.2.3 El back recalcula e ignora los totales del cliente — `api/quotes.routes` › creates the PPI quote with amounts as strings, ignoring client totals
- [x] S4.1.2.4 El front usa la misma función y muestra los mismos valores que la API — `web/quotes` › previews the same totals as the API and recalculates live
- [x] S4.1.2.5 Montos, cantidades y porcentajes como `string` — `api/quotes.routes` › creates the PPI quote with amounts as strings, ignoring client totals

### S4.1.3 Consecutivo en transacción
- [x] S4.1.3.1 Número tomado en la misma transacción — `api/prisma-quote.integration` › gives 50 concurrent creations 50 consecutive numbers
- [x] S4.1.3.2 Rollback sin perder el número — `api/prisma-quote.integration` › does not consume a number when the transaction rolls back
- [x] S4.1.3.3 50 creaciones concurrentes, 50 números consecutivos — `api/prisma-quote.integration` › gives 50 concurrent creations 50 consecutive numbers
- [x] S4.1.3.4 Formato `COT-` con al menos 4 dígitos — `shared/quotes.schema` › formats quote numbers with at least 4 digits
- [x] S4.1.3.5 Duplicar toma un número nuevo — `api/quote-use-cases` › duplicates final quotes with current prices, omitting inactive products and resetting the discount

### S4.1.4 Validar límite de descuento
- [x] S4.1.4.1 `percentString` 0–100 con 2 decimales; se guardan porcentaje y valor — `api/quote-use-cases` › creates the PPI example as a draft with consecutive numbers
- [x] S4.1.4.2 Superar el límite del propio rol → 403 `DISCOUNT_LIMIT_EXCEEDED` con `limit` — `api/quote-use-cases` › limits the discount by the role of who applies it and records overrides; `api/quotes-domain` › validates only when the discount changes, against the actor limit
- [x] S4.1.4.3 (RN-14) Un vendedor edita líneas con descuento sobre su límite sin cambiarlo — `api/quote-use-cases` › lets a seller edit lines but not a discount above their limit (RN-14)
- [x] S4.1.4.3 (RN-14) Un vendedor no modifica ese descuento, ni para bajarlo — `api/quotes-domain` › RN-14: a seller cannot change a discount above the seller limit, not even to lower it; `api/quote-use-cases` › RN-14: a seller cannot lower a discount above their limit, in draft or sent
- [x] S4.1.4.3 (RN-14) En el front el campo queda de solo lectura — `web/quotes` › shows the discount read-only to a seller when it exceeds the seller limit (RN-14)
- [x] S4.1.4.4 Límites leídos en cada operación — `api/quote-use-cases` › reads the discount limits on every operation
- [x] S4.1.4.5 El front muestra el límite del rol junto al campo — `web/quotes` › blocks a seller from raising the discount above the limit

### S4.1.5 Descuento por gerente o administrador
- [x] S4.1.5.1 Gerente fija un descuento hasta su límite en una cotización de otro dueño — `api/quote-use-cases` › records DISCOUNT_OVERRIDE when a manager raises a draft discount above the seller limit
- [x] S4.1.5.2 En `DRAFT`, `DISCOUNT_OVERRIDE` con `{ from, to, sellerLimit }` y actor — `api/quote-use-cases` › records DISCOUNT_OVERRIDE when a manager raises a draft discount above the seller limit; `api/quotes-domain` › records an override only in DRAFT and only above the seller limit
- [x] S4.1.5.3 En `SENT`, el cambio queda en la versión y sin `DISCOUNT_OVERRIDE` — `api/quote-use-cases` › keeps a manager discount change on a sent quote in the version, without DISCOUNT_OVERRIDE
- [x] S4.1.5.4 Creación directa con descuento sobre el límite del vendedor registra `DISCOUNT_OVERRIDE` — `api/quote-use-cases` › limits the discount by the role of who applies it and records overrides

## H4.2 Máquina de estados

### S4.2.1 Cambiar estado con transiciones válidas
- [x] S4.2.1.1 Solo las transiciones de RN-19 — `api/quotes-domain` › %s → %s
- [x] S4.2.1.1 Transición inválida → 409 `QUOTE_INVALID_TRANSITION` con `{ from, to }` — `api/quote-use-cases` › rejects invalid transitions with from and to params
- [x] S4.2.1.1 `EXPIRED` solo la asigna el sistema — `api/quote-use-cases` › expires due quotes once, with the system as actor
- [x] S4.2.1.2 Enviar crea versión 1 y `STATE_CHANGED` con `versionId`; fija `sentAt` y `firstSentAt` — `api/quote-use-cases` › sends with version 1, expiry date and a STATE_CHANGED linked to the version
- [x] S4.2.1.2 Enviar con cliente inactivo → 400 `CUSTOMER_INACTIVE` — `api/quote-use-cases` › does not send a quote whose customer became inactive
- [x] S4.2.1.3 Aprobar o rechazar desde `SENT` con `approvedAt` — `api/quote-use-cases` › approves only before the expiry date and then blocks edits; `web/quotes` › approves after confirmation and refreshes the badge
- [x] S4.2.1.4 `SENT` vencida sin job → 409 `QUOTE_EXPIRED` — `api/quote-use-cases` › approves only before the expiry date and then blocks edits; `api/quotes-domain` › hides approve and reject once the date passed, before the job runs
- [x] S4.2.1.5 Concurrencia optimista con `updatedAt` → 409 `QUOTE_CONFLICT` — `api/quotes.routes` › detects concurrent edits with updatedAt; `web/quotes` › offers to reload on a concurrent change

### S4.2.2 Anular con motivo
- [x] S4.2.2.1 Anula `DRAFT` o `SENT`; sin motivo → 400 `VALIDATION_ERROR` — `api/quotes.routes` › requires a reason to void
- [x] S4.2.2.2 Motivo en la `note` y expuesto como `voidReason` — `api/quote-use-cases` › voids with a reason that is exposed as voidReason; `api/prisma-quote.integration` › derives voidReason and stores versions and events
- [x] S4.2.2.3 `APPROVED`, `EXPIRED` o `VOIDED` → 409 `QUOTE_INVALID_TRANSITION` — `api/quote-use-cases` › does not void approved or expired quotes; › voids with a reason that is exposed as voidReason
- [x] S4.2.2.4 Conserva su número y deja de ser editable — `api/quote-use-cases` › voids with a reason that is exposed as voidReason; `api/quotes-domain` › follows the state for the owner

### S4.2.3 Fecha de vencimiento al enviar
- [x] S4.2.3.1 `expiresAt` = hoy en Bogotá + `validityDays` — `api/quote-use-cases` › sends with version 1, expiry date and a STATE_CHANGED linked to the version; `apps/api/src/core/clock/clock.test.ts` › returns the calendar day in America/Bogota, not in UTC
- [x] S4.2.3.2 Un `DRAFT` no tiene `expiresAt` — `api/quote-use-cases` › creates the PPI example as a draft with consecutive numbers
- [x] S4.2.3.3 Job idempotente con `actorId = null` — `api/quote-use-cases` › expires due quotes once, with the system as actor; `api/prisma-quote.integration` › maps decimals, enforces CHECKs and expires due quotes once
- [x] S4.2.3.4 Con `expiresAt = hoy` sigue `SENT` todo el día — `api/quotes-domain` › adds days across months and compares by date

### S4.2.4 Modificar fecha de vencimiento
- [x] S4.2.4.1 Solo en `SENT`, fecha futura — `api/quote-use-cases` › changes the expiry date only to a future date
- [x] S4.2.4.2 Hoy o pasada → 400 `INVALID_EXPIRY_DATE`; otro estado (`DRAFT`, `EXPIRED`) → 409 `QUOTE_NOT_EDITABLE` — `api/quote-use-cases` › changes the expiry date only to a future date; › changes the expiry date only on sent quotes
- [x] S4.2.4.3 Evento `EXPIRY_CHANGED` con `{ from, to }`, sin versión — `api/quote-use-cases` › changes the expiry date only to a future date

### S4.2.5 Reasignar cotización
- [x] S4.2.5.1 Solo `MANAGER`/`ADMIN`; destino inactivo → 400 `REASSIGN_TARGET_INVALID` — `api/quotes.routes` › restricts reassign to managers and filters by status CSV; `api/quote-use-cases` › reassigns to an active user and notifies the listeners
- [x] S4.2.5.2 Cualquier estado salvo `VOIDED` (409); mismo dueño → 400 `REASSIGN_SAME_OWNER` — `api/quote-use-cases` › rejects reassigning a voided quote; › reassigns to an active user and notifies the listeners; `api/quotes-domain` › adds reassign for managers except on voided quotes
- [x] S4.2.5.3 Evento `REASSIGNED` con `{ from, to }` — `api/quote-use-cases` › reassigns to an active user and notifies the listeners
- [x] S4.2.5.4 `QuoteReassignedListener` en la misma transacción — `api/quote-use-cases` › reassigns to an active user and notifies the listeners
- [x] S4.2.5.5 El diálogo usa `GET /users/options` y excluye al dueño actual — `web/quotes` › ReassignDialog lists users from the options service without the current owner

### S4.2.6 Ver estado y listado
- [x] S4.2.6.1 Alcance del vendedor, filtros por estado y `q` — `api/quote-use-cases` › lists only own quotes for sellers and searches by number; `api/quotes.routes` › restricts reassign to managers and filters by status CSV
- [x] S4.2.6.1 Orden por `updatedAt` descendente — `api/prisma-quote.integration` › lists by updatedAt desc
- [x] S4.2.6.2 Detalle con `allowedActions`; ajena para `SELLER` → 404 — `api/quote-use-cases` › rejects stale updates and foreign quotes; `api/quotes.routes` › hides foreign quotes from another seller and validates ids; `api/quotes-domain` › follows the state for the owner
- [ ] S4.2.6.3 Etiqueta desde `lang/` y color por estado — manual, pendiente
- [x] S4.2.6.4 Acciones según `allowedActions` — `web/quotes` › shows the actions allowed by the API and the system actor in the history

## H4.3 Edición y versiones

### S4.3.1 Editar cotización pendiente
- [x] S4.3.1.1 Líneas con `id` conservan snapshot, nuevas toman precio vigente — `api/quote-use-cases` › edits a draft without versions and keeps line snapshots
- [x] S4.3.1.1 Otro estado → 409 `QUOTE_NOT_EDITABLE` — `api/quote-use-cases` › approves only before the expiry date and then blocks edits
- [x] S4.3.1.2 Cliente bloqueado en `SENT` → 400 `QUOTE_CUSTOMER_LOCKED` — `api/quote-use-cases` › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.1.3 `DRAFT` sin versión; `SENT` conserva estado y `expiresAt` y crea versión — `api/quote-use-cases` › edits a draft without versions and keeps line snapshots; › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.1.4 Recalcula en el back y aplica reglas de descuento — `api/quote-use-cases` › RN-14: a seller cannot lower a discount above their limit, in draft or sent; › records DISCOUNT_OVERRIDE when a manager raises a draft discount above the seller limit
- [x] S4.3.1.5 `SENT` sin cambios → `changed: false` sin versión — `api/quote-use-cases` › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.1.5 En el front, una `SENT` sin cambios no abre el diálogo — `web/quotes` › does not ask for the customer request when a sent quote has no changes

### S4.3.2 Registrar qué pidió el cliente
- [x] S4.3.2.1 Sin `customerRequest` en `SENT` → 400 `CUSTOMER_REQUEST_REQUIRED` — `api/quote-use-cases` › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.2.2 Un `DRAFT` no lo pide — `api/quote-use-cases` › edits a draft without versions and keeps line snapshots
- [x] S4.3.2.3 Se guarda en la versión — `api/quote-use-cases` › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.2.4 Diálogo obligatorio en el front — `web/quotes` › asks what the customer requested before saving a sent quote

### S4.3.3 Historial de versiones
- [x] S4.3.3.1 Versión 1 = snapshot al primer envío sin `customerRequest` — `api/quote-use-cases` › sends with version 1, expiry date and a STATE_CHANGED linked to the version
- [x] S4.3.3.2 Diff de líneas, descuento y envío; autor y `customerRequest` — `api/quotes-domain` › reports added, removed and modified lines and discount changes; `api/quote-use-cases` › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.3.3 `(quoteId, number)` único — `api/prisma-quote.integration` › rejects a repeated version number for the same quote
- [x] S4.3.3.3 `currentVersion` apunta a la última — `api/quote-use-cases` › sends with version 1, expiry date and a STATE_CHANGED linked to the version; › requires what the customer asked for and creates a version when a sent quote changes
- [x] S4.3.3.4 Cambio de descuento en `SENT` en la versión con antes y después — `api/quote-use-cases` › keeps a manager discount change on a sent quote in the version, without DISCOUNT_OVERRIDE

### S4.3.4 Registrar eventos de cotización
- [x] S4.3.4.1 `QuoteEvent` con tipo, `actorId` opcional, `note`, `versionId` y `data` — `api/prisma-quote.integration` › derives voidReason and stores versions and events
- [x] S4.3.4.2 `STATE_CHANGED` en toda transición, con `versionId` si hay versión — `api/quote-use-cases` › sends with version 1, expiry date and a STATE_CHANGED linked to the version; › reactivates updating active prices into a new version and keeps inactive snapshots
- [x] S4.3.4.3 Versión y evento en una sola transacción (rollback) — `api/prisma-quote.integration` › rolls back the version when addEvents fails in the same unit of work
- [x] S4.3.4.4 `DISCOUNT_OVERRIDE` solo en `DRAFT` — `api/quotes-domain` › records an override only in DRAFT and only above the seller limit; `api/quote-use-cases` › keeps a manager discount change on a sent quote in the version, without DISCOUNT_OVERRIDE

### S4.3.5 Historial unificado
- [x] S4.3.5.1 Ordenado por fecha y eventos agrupados con su versión — `api/quote-use-cases` › groups version and event of the same operation in the history; `api/quotes.routes` › returns the unified history
- [x] S4.3.5.2 Actor `null` como `history.actor.system` — `web/quotes` › shows the actions allowed by the API and the system actor in the history
- [x] S4.3.5.3 Detalle con textos de `lang/` — `web/quotes` › shows the actions allowed by the API and the system actor in the history
- [x] S4.3.5.4 Ajena para `SELLER` → 404 — `api/quote-use-cases` › hides the history of a foreign quote from a seller

### S4.3.6 Reactivar vencida
- [x] S4.3.6.1 Vista previa con precio actual, vigente e inactivos — `api/quote-use-cases` › reactivates updating active prices into a new version and keeps inactive snapshots
- [x] S4.3.6.2 Pasa a `SENT` con nuevo `sentAt` y `expiresAt`; `firstSentAt` no cambia; `customerRequest` obligatorio — `api/quote-use-cases` › reactivates without price changes keeping the request in the event note
- [x] S4.3.6.3 Actualiza precios activos, conserva inactivos y crea versión — `api/quote-use-cases` › reactivates updating active prices into a new version and keeps inactive snapshots
- [x] S4.3.6.4 Sin cambios de contenido, `customerRequest` en la `note` — `api/quote-use-cases` › reactivates without price changes keeping the request in the event note
- [x] S4.3.6.5 Diálogo con avisos de inactivos y confirmación — `web/quotes` › ReactivateDialog warns about inactive products and sends the request and the price choice

### S4.3.7 Duplicar
- [x] S4.3.7.1 `DRAFT` nuevo con dueño = actor, mismas cantidades y snapshot vigente (nombre, categoría, precio e IVA) — `api/quote-use-cases` › duplicates with the current product snapshot (name, category, price and VAT) and the source quantity; › duplicates final quotes with current prices, omitting inactive products and resetting the discount
- [x] S4.3.7.1 Cliente inactivo → 400 `CUSTOMER_INACTIVE` — `api/quote-use-cases` › rejects a duplicate when every product is inactive or the customer is inactive
- [x] S4.3.7.2 Omite inactivos (`omittedProductIds`); todos omitidos → 400 `QUOTE_EMPTY` — `api/quote-use-cases` › duplicates final quotes with current prices, omitting inactive products and resetting the discount; › rejects a duplicate when every product is inactive or the customer is inactive
- [x] S4.3.7.3 Descuento copiado solo dentro del límite del actor (`discountReset`) — `api/quotes-domain` › copies the discount on duplicate only within the actor limit; `api/quote-use-cases` › duplicates final quotes with current prices, omitting inactive products and resetting the discount
- [x] S4.3.7.4 Otro estado → 409 `QUOTE_NOT_DUPLICABLE` — `api/quote-use-cases` › duplicates final quotes with current prices, omitting inactive products and resetting the discount
- [x] S4.3.7.5 El front abre el editor con los avisos — `web/quotes` › duplicates into the editor with the omitted products and the discount reset notice

## Reglas críticas de `CLAUDE.md`
- [x] Fórmulas: `línea`, `subtotal`, `descuento`, `ivaLíneas` sin redondeo por línea, `ivaEnvío`, `total`; half-up por concepto — `shared/quote-totals` › rounds each concept half-up independently; › does not round VAT per line; › adds 19 % VAT to taxable shipping (5.378.800)
- [x] Prohibidos `parseFloat`, `Number()`, `Math.round`… en `shared/calc` — `eslint.config.js` (regla sobre `packages/shared/src/calc/**`, `pnpm lint` en CI)
- [x] Montos que no caben en `Decimal(15,0)` → 400 `QUOTE_AMOUNT_TOO_LARGE`, no 500 — `api/quote-use-cases` › rejects amounts that do not fit Decimal(15,0) with QUOTE_AMOUNT_TOO_LARGE; `api/quotes.routes` › answers 400 instead of 500 when the amounts overflow Decimal(15,0)
- [x] Máquina de estados completa (finales sin salida, `EXPIRED` → `SENT` solo por reactivación) — `api/quotes-domain` › %s → %s
- [x] Consecutivo con `QuoteSequence` en transacción — `api/prisma-quote.integration` › gives 50 concurrent creations 50 consecutive numbers; › does not consume a number when the transaction rolls back
- [ ] Las cotizaciones no se eliminan (no existe ruta `DELETE /quotes/:id`) — manual, pendiente (revisión de `quotes.routes.ts` y Swagger)
- [x] Versiones y eventos de una operación en una transacción — `api/prisma-quote.integration` › rolls back the version when addEvents fails in the same unit of work
- [x] Límite de descuento del rol de quien aplica, no del dueño — `api/quote-use-cases` › records DISCOUNT_OVERRIDE when a manager raises a draft discount above the seller limit; › RN-14: a seller cannot lower a discount above their limit, in draft or sent
- [x] Zona horaria `America/Bogota` para "hoy" — `apps/api/src/core/clock/clock.test.ts` › returns the calendar day in America/Bogota, not in UTC
- [x] Cohorte por `firstSentAt` en días de Bogotá `[from 05:00Z, to+1 05:00Z)` para enlazar el tablero con la lista (`sentFrom`/`sentTo`) — `packages/shared/src/rules/dashboard.test.ts` › maps Bogota days to UTC bounds [from 05:00Z, to+1 05:00Z); `api/quote-use-cases` › filters the list by first-sent date in Bogota days; `api/quotes.routes` › filters by first-sent date (sentFrom/sentTo) and validates the range; `api/prisma-quote.integration` › filters the first-sent cohort with Bogota day boundaries [from 05:00Z, to+1 05:00Z); `shared/quotes.schema` › accepts a first-sent range only with valid dates and from <= to
- [x] Chip "Primer envío" removible en la lista, que envía `sentFrom`/`sentTo` — `web/quotes` › opens the list with the first-sent period chip, sends it and lets the user remove it
- [x] Vista previa confiable: sin parámetros comerciales no se guarda una cotización nueva — `web/quotes` › shows an error with retry and disables saving when the parameters fail on a new quote
- [x] i18n: `es` y `en` con las mismas claves y marcadores — `apps/web/src/lang/lang-parity.test.ts` › es and en have the same keys; › es and en use the same markers per key
