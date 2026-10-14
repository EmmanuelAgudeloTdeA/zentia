# M4 Cotizaciones – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/prd.md` §3, `docs/architecture.md` §4–§8; base de M0–M3.

## 1. Entidades Prisma
```prisma
enum QuoteStatus    { DRAFT SENT APPROVED REJECTED EXPIRED VOIDED }
enum QuoteEventType { DISCOUNT_OVERRIDE EXPIRY_CHANGED REASSIGNED STATE_CHANGED }

model QuoteSequence {
  key       String @id            // 'QUOTE'
  lastValue Int    @default(0)
}

model Quote {
  id              String      @id @default(uuid()) @db.Uuid
  number          Int         @unique
  customerId      String      @db.Uuid
  customer        Customer    @relation(fields: [customerId], references: [id])
  ownerId         String      @db.Uuid
  owner           User        @relation("QuoteOwner", fields: [ownerId], references: [id])
  createdById     String      @db.Uuid
  createdBy       User        @relation("QuoteCreator", fields: [createdById], references: [id])
  status          QuoteStatus @default(DRAFT)
  discountPct     Decimal     @default(0) @db.Decimal(5, 2)
  discountAmount  Decimal     @default(0) @db.Decimal(15, 0)
  shippingAmount  Decimal     @default(0) @db.Decimal(15, 0)
  shippingTaxable Boolean                         // snapshot del parámetro al crear
  subtotal        Decimal     @db.Decimal(15, 0)
  linesVat        Decimal     @db.Decimal(15, 0)
  shippingVat     Decimal     @db.Decimal(15, 0)
  total           Decimal     @db.Decimal(15, 0)
  expiresAt       DateTime?   @db.Date
  sentAt          DateTime?                       // último envío
  firstSentAt     DateTime?
  approvedAt      DateTime?
  currentVersion  Int         @default(0)         // 0 = nunca enviada
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  items           QuoteItem[]
  versions        QuoteVersion[]
  events          QuoteEvent[]

  @@index([ownerId, status])
  @@index([status, expiresAt])
  @@index([firstSentAt])
  @@index([customerId])
  @@index([updatedAt])
}

model QuoteItem {
  id          String  @id @default(uuid()) @db.Uuid
  quoteId     String  @db.Uuid
  quote       Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  productId   String  @db.Uuid
  product     Product @relation(fields: [productId], references: [id])
  position    Int
  productName String  @db.VarChar(150)
  category    String  @db.VarChar(80)
  unitPrice   Decimal @db.Decimal(15, 0)
  vatRate     VatRate
  quantity    Decimal @db.Decimal(12, 2)
  lineAmount  Decimal @db.Decimal(15, 0)

  @@unique([quoteId, productId])
  @@index([quoteId])
}

model QuoteVersion {
  id              String   @id @default(uuid()) @db.Uuid
  quoteId         String   @db.Uuid
  quote           Quote    @relation(fields: [quoteId], references: [id])
  number          Int
  snapshot        Json     // cliente, líneas, descuento, envío, totales, expiresAt
  changes         Json?    // null en v1
  customerRequest String?  @db.VarChar(1000)  // null solo en v1
  authorId        String   @db.Uuid
  createdAt       DateTime @default(now())

  @@unique([quoteId, number])
}

model QuoteEvent {
  id        String         @id @default(uuid()) @db.Uuid
  quoteId   String         @db.Uuid
  quote     Quote          @relation(fields: [quoteId], references: [id])
  type      QuoteEventType
  actorId   String?        @db.Uuid               // null = sistema
  versionId String?        @db.Uuid
  note      String?        @db.VarChar(1000)
  data      Json
  createdAt DateTime       @default(now())

  @@index([quoteId, createdAt])
}
```
**SQL adicional en la migración:**
- Fila semilla `QuoteSequence('QUOTE', 0)`.
- `CHECK (quantity > 0)` en `QuoteItem`.
- `CHECK (discountPct BETWEEN 0 AND 100)`, `CHECK (shippingAmount >= 0)` en `Quote`.
- `CHECK (status = 'DRAFT' OR expiresAt IS NOT NULL)`.

Las líneas se reemplazan dentro de la transacción de edición; por eso `onDelete: Cascade` aplica solo a `QuoteItem`. Las cotizaciones nunca se borran.

## 2. Endpoints
Todas las rutas exigen autenticación y aplican el alcance de M1 (`SELLER`: solo propias; una ajena responde 404 `QUOTE_NOT_FOUND`). Las mutaciones, salvo crear y duplicar, exigen `updatedAt` en el body (409 `QUOTE_CONFLICT` si no coincide).

| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/quotes` | Todos | query `{ status?[], customerId?, ownerId? (M/A), q?, page, pageSize }` | 200 `{ items: QuoteSummaryDto[], total, page, pageSize }` | 400 |
| GET | `/api/quotes/:id` | Todos | — | 200 `QuoteDto` | 404 `QUOTE_NOT_FOUND` |
| POST | `/api/quotes` | Todos | `{ customerId, items: [{ productId, quantity }], discountPct?, shippingAmount? }` | 201 `QuoteDto` | 400 `VALIDATION_ERROR`, `CUSTOMER_INACTIVE`, `PRODUCT_INACTIVE`, `PRODUCT_NOT_FOUND`, `DUPLICATE_PRODUCT_LINE`, `QUOTE_EMPTY`; 403 `DISCOUNT_LIMIT_EXCEEDED` |
| PATCH | `/api/quotes/:id` | Todos (alcance) | `{ customerId? (solo DRAFT), items?: [{ id?, productId, quantity }], discountPct?, shippingAmount?, customerRequest? (obligatorio en SENT), updatedAt }` | 200 `{ quote: QuoteDto, changed: boolean, versionNumber? }` | 400 (los de crear) + `CUSTOMER_REQUEST_REQUIRED`, `QUOTE_CUSTOMER_LOCKED`; 403 `DISCOUNT_LIMIT_EXCEEDED`; 404; 409 `QUOTE_NOT_EDITABLE`, `QUOTE_CONFLICT` |
| POST | `/api/quotes/:id/send` | Todos (alcance) | `{ updatedAt }` | 200 `QuoteDto` | 404; 409 `QUOTE_INVALID_TRANSITION`, `QUOTE_CONFLICT` |
| POST | `/api/quotes/:id/status` | Todos (alcance) | `{ to: 'APPROVED' \| 'REJECTED', updatedAt }` | 200 `QuoteDto` | 404; 409 `QUOTE_INVALID_TRANSITION`, `QUOTE_EXPIRED`, `QUOTE_CONFLICT` |
| POST | `/api/quotes/:id/void` | Todos (alcance) | `{ reason, updatedAt }` | 200 `QuoteDto` | 400; 404; 409 `QUOTE_INVALID_TRANSITION`, `QUOTE_CONFLICT` |
| PATCH | `/api/quotes/:id/expiry` | Dueño, `MANAGER`, `ADMIN` | `{ expiresAt: 'YYYY-MM-DD', updatedAt }` | 200 `QuoteDto` | 400 `INVALID_EXPIRY_DATE`; 404; 409 `QUOTE_NOT_EDITABLE`, `QUOTE_CONFLICT` |
| POST | `/api/quotes/:id/reassign` | `MANAGER`, `ADMIN` | `{ ownerId, updatedAt }` | 200 `QuoteDto` | 400 `REASSIGN_TARGET_INVALID`, `REASSIGN_SAME_OWNER`; 404; 409 `QUOTE_INVALID_TRANSITION` (si está `VOIDED`), `QUOTE_CONFLICT` |
| GET | `/api/quotes/:id/reactivation-preview` | Todos (alcance) | — | 200 `{ lines: [{ itemId, productName, currentPrice, catalogPrice, productActive }] }` | 404; 409 `QUOTE_INVALID_TRANSITION` |
| POST | `/api/quotes/:id/reactivate` | Todos (alcance) | `{ customerRequest, updatePrices, updatedAt }` | 200 `{ quote: QuoteDto, versionNumber?, keptInactiveProductIds }` | 400 `CUSTOMER_REQUEST_REQUIRED`; 404; 409 `QUOTE_INVALID_TRANSITION`, `QUOTE_CONFLICT` |
| POST | `/api/quotes/:id/duplicate` | Todos (alcance) | — | 201 `{ quote: QuoteDto, omittedProductIds, discountReset }` | 400 `CUSTOMER_INACTIVE`, `QUOTE_EMPTY`; 404; 409 `QUOTE_NOT_DUPLICABLE` |
| GET | `/api/quotes/:id/history` | Todos (alcance) | — | 200 `HistoryEntryDto[]` | 404 |

**DTOs**
- `QuoteSummaryDto = { id, number, displayNumber, status, customer: { id, name }, owner: { id, name }, total, expiresAt, updatedAt }`
- `QuoteDto = QuoteSummaryDto + { items: QuoteItemDto[], discountPct, discountAmount, shippingAmount, shippingTaxable, subtotal, linesVat, shippingVat, sentAt, firstSentAt, approvedAt, currentVersion, voidReason, allowedActions[], createdAt }`
- `QuoteItemDto = { id, productId, productName, category, unitPrice, vatRate, quantity, lineAmount }`
- `HistoryEntryDto = { kind: 'VERSION' | 'EVENT', at, actor: { id, name } | null, version?: { number, changes, customerRequest }, events?: EventDto[] }`
- `allowedActions ⊆ { edit, send, approve, reject, void, changeExpiry, reassign, reactivate, duplicate }` más las que aporten otros módulos por `AllowedActionsContributor` (M5: `downloadPdf`, `share`), calculado para el actor según estado, rol y propiedad.

## 3. Application: casos de uso y puertos
| Caso de uso | Transacción | Escribe |
|---|---|---|
| `CreateQuoteUseCase` | Sí | `QuoteSequence`, `Quote`, `QuoteItem`; `DISCOUNT_OVERRIDE` si aplica |
| `UpdateQuoteUseCase` | Sí | `Quote`, `QuoteItem`; en `SENT`: `QuoteVersion`; en `DRAFT`: `DISCOUNT_OVERRIDE` si aplica |
| `SendQuoteUseCase` (público) | Sí | `Quote` (`SENT`, `sentAt`, `firstSentAt`, `expiresAt`, `currentVersion = 1`), `QuoteVersion` v1, `STATE_CHANGED` con `versionId` |
| `ChangeQuoteStatusUseCase` | Sí | `Quote` (+ `approvedAt`), `STATE_CHANGED` |
| `VoidQuoteUseCase` | Sí | `Quote`, `STATE_CHANGED` con `note = reason` |
| `ChangeExpiryUseCase` | Sí | `Quote.expiresAt`, `EXPIRY_CHANGED` |
| `ReassignQuoteUseCase` | Sí | `Quote.ownerId`, `REASSIGNED`; llama a `QuoteReassignedListener[]` dentro de la transacción |
| `GetReactivationPreviewUseCase` | No | — |
| `ReactivateQuoteUseCase` | Sí | `Quote` (`SENT`, `sentAt`, `expiresAt`), `QuoteItem` si cambian precios, `QuoteVersion` si hay cambio, `STATE_CHANGED` |
| `DuplicateQuoteUseCase` | Sí | Igual que crear |
| `ExpireQuotesUseCase` (público, lo programa M6) | Sí por lote | `Quote` (`EXPIRED`) y `STATE_CHANGED` (`actorId = null`); `UPDATE ... WHERE status = 'SENT' AND "expiresAt" < today() RETURNING` |
| `ListQuotesUseCase`, `GetQuoteUseCase`, `GetQuoteHistoryUseCase` | No | — |

**Dominio (`modules/quotes/domain`)**
- `Quote` (agregado): `canEdit()`, `assertTransition(to)`, `applyItems()`, `applyDiscount(actorRole, limits)`, `diff(previousSnapshot)`.
- `quote-status.ts`: tabla de transiciones.
- `allowed-actions.ts`: cálculo de `allowedActions`.

**Puertos**
| Puerto | Implementación | Origen |
|---|---|---|
| `QuoteRepository` | `PrismaQuoteRepository` (mapper `Prisma.Decimal` ↔ `decimal.js`, `voidReason` derivado) | M4 |
| `QuoteSequence` | `PrismaQuoteSequence` (`UPDATE ... RETURNING`) | M4 |
| `UnitOfWork` | `PrismaUnitOfWork` | M0 |
| `Clock` | `SystemClock` (`now()`, `today()` en Bogotá) | Nace en M4 (`core/`), lo reutilizan M6, M8 y M9 |
| `SettingsReader` | — | M2 |
| `CustomerReader`, `CatalogReader` | — | M3 |
| `UserDirectory` | `isActiveUser(id)` sobre el barril de `users` | M1 |
| `QuoteReassignedListener` | Registro de listeners `(tx, { quoteId, from, to }) => Promise<void>`; vacío hasta M6 | Punto de extensión de M4 |
| `QuoteReader` (público) | `getForDocument(id, actor)`, `getApprovedSnapshot(id, actor)` | Para M5 y M7 |
| `AllowedActionsContributor` | Registro de funciones `(quote, actor) => Action[]` que suman acciones a `allowedActions`; M5 aporta `downloadPdf` y `share` (decisión 136) | Punto de extensión de M4 |

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `QuotesListPage` (`/quotes`) | Filtros de estado, cliente, dueño (`MANAGER`/`ADMIN`) y texto; paginación; crear |
| Pantalla | `QuoteEditorPage` (`/quotes/new`, `/quotes/:id/edit`) | Cliente, líneas, descuento con el límite del rol, envío, vista previa de totales con `shared/calc` |
| Pantalla | `QuoteDetailPage` (`/quotes/:id`) | Encabezado (número, estado, dueño, cliente, vencimiento), líneas, totales, acciones según `allowedActions`, historial |
| Componente | `CustomerPicker`, `ProductPicker`, `QuoteLinesTable`, `QuoteTotals`, `QuoteStatusBadge` | Edición y presentación |
| Componente | `CustomerRequestDialog` | Texto obligatorio al guardar cambios de un `SENT` |
| Componente | `VoidQuoteDialog`, `ChangeExpiryDialog`, `ReassignDialog`, `ReactivateDialog` (con vista previa), `DuplicateResultNotice` | Acciones |
| Componente | `QuoteHistoryTimeline` | Versiones con diff y eventos agrupados; actor "Sistema" |
| Hook | `useQuoteTotals(items, discountPct, shipping, shippingTaxable)` | Vista previa con `shared/calc` |
| Store | `features/quotes/store/quote-filters.store.ts` | Filtros y página |
| Service | `features/quotes/services/quotes.service.ts` | Todas las rutas de la sección 2; envía `updatedAt` en las mutaciones y ante `QUOTE_CONFLICT` ofrece recargar |

## 5. Claves de `lang/` (front)
- `nav.quotes`
- `quotes.title`, `quotes.new`, `quotes.number`, `quotes.customer`, `quotes.owner`, `quotes.total`, `quotes.expiresAt`, `quotes.filters.status`, `quotes.filters.owner`, `quotes.filters.search`
- `quotes.editor.title`, `quotes.editor.addProduct`, `quotes.editor.quantity`, `quotes.editor.unitPrice`, `quotes.editor.vatRate`, `quotes.editor.lineAmount`, `quotes.editor.discountPct`, `quotes.editor.discountLimitHint`, `quotes.editor.shippingAmount`, `quotes.editor.shippingTaxable`, `quotes.editor.save`
- `quotes.totals.subtotal`, `quotes.totals.discount`, `quotes.totals.linesVat`, `quotes.totals.shippingVat`, `quotes.totals.shipping`, `quotes.totals.total`
- `quotes.actions.edit`, `quotes.actions.send`, `quotes.actions.approve`, `quotes.actions.reject`, `quotes.actions.void`, `quotes.actions.changeExpiry`, `quotes.actions.reassign`, `quotes.actions.reactivate`, `quotes.actions.duplicate`
- `quotes.customerRequest.title`, `quotes.customerRequest.label`
- `quotes.void.title`, `quotes.void.reason`, `quotes.voidReason`
- `quotes.expiry.title`, `quotes.reassign.title`, `quotes.reassign.target`
- `quotes.reactivate.title`, `quotes.reactivate.updatePrices`, `quotes.reactivate.inactiveProductNotice`, `quotes.reactivate.priceChange`
- `quotes.duplicate.omittedProducts`, `quotes.duplicate.discountReset`
- `quotes.conflict.reload`
- `history.title`, `history.actor.system`, `history.version`, `history.changes.added`, `history.changes.removed`, `history.changes.modified`, `history.changes.discount`, `history.changes.shipping`, `history.customerRequest`
- `enums.QuoteStatus.DRAFT`, `.SENT`, `.APPROVED`, `.REJECTED`, `.EXPIRED`, `.VOIDED`
- `enums.QuoteEventType.DISCOUNT_OVERRIDE`, `.EXPIRY_CHANGED`, `.REASSIGNED`, `.STATE_CHANGED`
- `errors.QUOTE_NOT_FOUND`, `errors.QUOTE_CONFLICT`, `errors.QUOTE_INVALID_TRANSITION`, `errors.QUOTE_NOT_EDITABLE`, `errors.QUOTE_EXPIRED`, `errors.QUOTE_EMPTY`, `errors.QUOTE_CUSTOMER_LOCKED`, `errors.QUOTE_NOT_DUPLICABLE`, `errors.DUPLICATE_PRODUCT_LINE`, `errors.DISCOUNT_LIMIT_EXCEEDED`, `errors.CUSTOMER_REQUEST_REQUIRED`, `errors.INVALID_EXPIRY_DATE`, `errors.REASSIGN_TARGET_INVALID`, `errors.REASSIGN_SAME_OWNER`

## 6. Reglas de negocio
**Cálculo (`shared/calc/quote-totals.ts`, RN-05)**
| Concepto | Fórmula | Redondeo |
|---|---|---|
| `lineAmount` | `unitPrice × quantity` | half-up a peso |
| `subtotal` | `Σ lineAmount` | — (suma de enteros) |
| `discountAmount` | `subtotal × discountPct / 100` | half-up a peso |
| `linesVat` | `(1 − discountPct/100) × Σ(lineAmount × tasa)` | half-up a peso, una sola vez |
| `shippingVat` | `shippingTaxable ? shippingAmount × 0,19 : 0` | half-up a peso |
| `total` | `subtotal − discountAmount + linesVat + shippingVat + shippingAmount` | — |

Tasas: `GENERAL_19` = 0,19 · `REDUCED_5` = 0,05 · `EXEMPT` = 0.

| Caso de prueba | Datos | Total |
|---|---|---|
| PPI | 2 × 2.500.000 (19 %), d = 10 %, envío 20.000 no gravado | 5.375.000 |
| PPI con envío gravado | Ídem, envío gravado | 5.378.800 |
| Decimales | 1,5 × 33.333 (19 %), d = 7,5 % | `lineAmount` 50.000 (49.999,5 → 50.000) |

**Transiciones (RN-19)**
| Desde \ Hacia | SENT | APPROVED | REJECTED | EXPIRED | VOIDED |
|---|---|---|---|---|---|
| DRAFT | `send` | — | — | — | `void` |
| SENT | — | `status` | `status` | sistema | `void` |
| EXPIRED | `reactivate` | — | — | — | — |
| APPROVED, REJECTED, VOIDED | — | — | — | — | — |

**Descuento (RN-11 a RN-14)**
| Actor | Situación | Resultado |
|---|---|---|
| Cualquiera | Nuevo `discountPct` > límite de su rol | 403 `DISCOUNT_LIMIT_EXCEEDED` |
| `SELLER` | No cambia el descuento (aunque supere su límite) | Permitido (RN-14) |
| `MANAGER`/`ADMIN` | Nuevo descuento > límite de `SELLER`, en `DRAFT` (al crear o editar) | `DISCOUNT_OVERRIDE` |
| `MANAGER`/`ADMIN` | Ídem en `SENT` | Solo versión (sin evento) |

**Versiones y eventos**
| Operación | `QuoteVersion` | `QuoteEvent` |
|---|---|---|
| Editar `DRAFT` | No | `DISCOUNT_OVERRIDE` si aplica |
| Enviar (`DRAFT` → `SENT`) | v1 (snapshot) | `STATE_CHANGED` + `versionId` |
| Editar `SENT` con cambios | v(n+1) + `customerRequest` | — |
| Aprobar, rechazar, anular | No | `STATE_CHANGED` (anular: `note = reason`) |
| Vencer (job) | No | `STATE_CHANGED`, `actorId = null` |
| Reactivar sin cambio de precios | No | `STATE_CHANGED`, `note = customerRequest` |
| Reactivar con cambio de precios | v(n+1) + `customerRequest` | `STATE_CHANGED` + `versionId` |
| Cambiar vencimiento | No | `EXPIRY_CHANGED` |
| Reasignar | No | `REASSIGNED` |

**Vigencia:** `expiresAt = today(Bogotá) + validityDays` al enviar y al reactivar. Es válida hasta el final de `expiresAt`. Vence si `expiresAt < today()`.

**Límites de entrada:** 1–100 líneas; `quantity` > 0 y ≤ 9.999.999.999,99; `customerRequest` 1–1000 caracteres; `reason` 1–500 caracteres.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `quote-totals.spec` | Unitaria (`shared`) | Tabla de casos de la sección 6, exentos, envío gravado y no gravado, redondeo por concepto, descuento 0 y 100 |
| `quote-status.spec` | Unitaria (dominio) | Las 36 combinaciones de la tabla de transiciones |
| `discount-policy.spec` | Unitaria | Tabla de descuento por rol y estado |
| `allowed-actions.spec` | Unitaria | Acciones por estado, rol y propiedad |
| `quote-diff.spec` | Unitaria | Líneas agregadas, quitadas y modificadas; descuento y envío; `changed: false` |
| `*.use-case.spec` | Unitaria (fakes + `Clock`) | Versión y evento por operación (tabla de la sección 6), `QUOTE_EXPIRED`, reactivación con productos inactivos, duplicado con omitidos y `discountReset`, listeners de reasignación |
| `quote-sequence.spec` | Integración (Postgres) | 50 creaciones concurrentes sin huecos; rollback que no consume número |
| `quote.repository.spec` | Integración | Transacción versión + evento; `CHECK`; mapper de decimales; `voidReason` derivado |
| `expire-quotes.spec` | Integración | Solo `SENT` con `expiresAt < hoy`; idempotente; `actorId = null` |
| `quotes.routes.spec` | Supertest | Alcance (404 para ajenas), `QUOTE_CONFLICT`, códigos de cada ruta, decimales como `string` |
| `quote-editor.spec`, `quote-detail.spec` | Testing Library | Vista previa igual a la API, diálogo de `customerRequest`, acciones según `allowedActions`, recarga ante conflicto |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 119–130) |
|---|---|
| "Marcar como enviada" manual | M4 expone `POST /quotes/:id/send` y un botón propio, además de los accesos de M5, para envíos por otros canales. |
| Concurrencia optimista (decisión 79) | Se compara el `updatedAt` del body con el de la BD en cada mutación (`QUOTE_CONFLICT`). |
| Aprobar entre la medianoche y el job de las 00:05 | Si `expiresAt < hoy`, aprobar o rechazar responde `QUOTE_EXPIRED` aunque el estado siga en `SENT`. |
| Dueño al duplicar | El actor que duplica queda como dueño. |
| Descuento al duplicar | Se copia solo si no supera el límite del actor; si lo supera, queda en 0 con aviso. |
| Cliente en un `SENT` | No se puede cambiar (`QUOTE_CUSTOMER_LOCKED`); para otro cliente se anula y se crea otra. |
| Snapshot de `shippingTaxable` | Se toma al crear y no cambia en ediciones ni reactivaciones; duplicar toma el parámetro vigente. |
| Reasignar en cualquier estado salvo `VOIDED` | Permite reasignar aprobadas para que el nuevo dueño gestione su pedido (M7). |
| Producto repetido en líneas | No se permite (`DUPLICATE_PRODUCT_LINE`); se ajusta la cantidad de la línea existente. |
| Límite de 100 líneas | Propuesto para acotar el tamaño de la cotización y del PDF (RNF-05). |
| `Clock` nace en M4 | Primer módulo que lo necesita; vive en `core/` para M6, M8 y M9. |
| `QuoteReassignedListener` | Punto de extensión: M6 se registra para traspasar notificaciones en la misma transacción (decisión 74). |
