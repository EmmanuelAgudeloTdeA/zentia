# M4 Cotizaciones – Épicas

> Fuentes: `docs/fuente/desglose.md` (M4; decisiones 3, 9, 13–15, 26, 28, 31, 33, 35–38, 41, 43–46, 50, 51, 55, 57, 59, 63–65, 98, 119–130), `CLAUDE.md`, `docs/prd.md` (RF-02, RF-04, RF-11, RF-12; RN-04 a RN-28, RN-42), `docs/architecture.md` §4–§6.

## Objetivo
Gestionar el ciclo de vida completo de la cotización: creación con cálculo exacto y consecutivo sin huecos, estados y vigencia, edición con versiones, eventos de trazabilidad, reactivación, duplicado y reasignación.

**Cubre:** RF-02, RF-04, RF-11 y RF-12.

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | `UnitOfWork` sobre Prisma, schemas de decimales (`moneyString`, `quantityString`, `percentString`), errores con códigos, OpenAPI, lint de `shared/calc` |
| M1 · H1.2 | `Actor`, guard, política de alcance (`resolveScope`, `assertCanAccess`, `scopeFilter`) |
| M1 · S1.3.2 | `GET /users/options` y su caso de uso, para validar y elegir el nuevo dueño al reasignar |
| M2 · S2.2.3 | `SettingsReader.getCommercialParameters()`: límites de descuento por rol, `validityDays`, `shippingTaxable` |
| M3 · H3.1 | `CustomerReader.getActiveById` / `getById` |
| M3 · H3.2 | `CatalogReader.getActiveByIds` / `getByIds` (snapshot de nombre, categoría, precio y tarifa) |

## Lo desbloquea
| Módulo | Qué necesita de M4 |
|---|---|
| M5 Documento y envío | `QuoteReader` (modelo para el PDF) y `SendQuoteUseCase` (los botones de wa.me y mailto pasan la cotización a Enviada) |
| M6 Seguimiento | `ExpireQuotesUseCase` (lo programa el scheduler de H6.2); `Quote.sentAt`, `expiresAt`, `ownerId`; punto de extensión `QuoteReassignedListener` para traspasar notificaciones (decisión 74) |
| M7 Pedidos | `QuoteReader` de cotizaciones Aprobadas (snapshot de líneas y totales) |
| M8 Dashboard | Tablas `Quote` y `QuoteItem` para los repositorios de solo lectura (decisión 72) |
| M9 IA | `QuoteVersion` (posteriores al envío), `QuoteItem.category`, `sentAt` y `expiresAt`, para la heurística |

---

## H4.1 Creación y cálculo
**Objetivo:** crear cotizaciones en Borrador con totales exactos, consecutivo sin huecos y descuento limitado por el rol de quien lo aplica.
**Depende de:** M1, M2 (S2.2.3), M3.

### S4.1.1 Crear borrador con líneas
Como vendedor, quiero crear una cotización eligiendo un cliente y productos con sus cantidades, para preparar la propuesta en un solo lugar.
- **RF de origen:** RF-02.1, RN-09, RN-18, decisión 55
- **Criterios de aceptación:**
  1. `POST /api/quotes` (cualquier rol) crea una cotización en `DRAFT` con el actor como dueño, un cliente activo y entre 1 y 100 líneas `{ productId, quantity }`; un cliente o producto inactivo responde 400 `CUSTOMER_INACTIVE` o `PRODUCT_INACTIVE` (con el id).
  2. Cada línea guarda el snapshot de nombre, categoría, precio y tarifa del producto al crearse; un mismo producto no puede repetirse (400 `DUPLICATE_PRODUCT_LINE`).
  3. `quantity` es `quantityString` > 0 con hasta 2 decimales; `shippingAmount` es `moneyString` ≥ 0 y opcional.
  4. `shippingTaxable` se toma del parámetro de la empresa al crear y queda como snapshot en la cotización.
  5. En el front, el editor tiene selector de cliente (búsqueda), selector de productos activos y tabla de líneas editable.
- **Depende de:** M3 (`CustomerReader`, `CatalogReader`)
- **Tamaño:** M

### S4.1.2 Cálculo de totales
Como vendedor, quiero que el subtotal, el descuento, el IVA y el total se calculen solos, para evitar errores al cotizar.
- **RF de origen:** RF-02.3, RN-04 a RN-08, RN-10, decisiones 15, 33, 41
- **Criterios de aceptación:**
  1. `shared/calc/quote-totals` implementa RN-05 con `decimal.js` (`ROUND_HALF_UP`, redondeo independiente por concepto) y devuelve `lineAmounts`, `subtotal`, `discountAmount`, `linesVat`, `shippingVat` y `total`.
  2. El ejemplo del PPI da 5.375.000: 2 × 2.500.000 al 19 %, descuento 10 %, envío 20.000 no gravado. Con el envío gravado da 5.378.800.
  3. El back recalcula siempre e ignora cualquier total enviado por el cliente.
  4. El front usa la misma función para la vista previa en vivo y muestra los mismos valores que devuelve la API.
  5. Montos, cantidades y porcentajes viajan como `string` en la API.
- **Depende de:** M0 (lint de `calc`, schemas de decimales)
- **Tamaño:** M

### S4.1.3 Consecutivo en transacción
Como gerente comercial, quiero que cada cotización tenga un número único y sin huecos, para controlarlas y referirlas con el cliente.
- **RF de origen:** RF-02.2, RN-15, decisiones 9 y 63
- **Criterios de aceptación:**
  1. La creación toma el número con `UPDATE "QuoteSequence" ... RETURNING` dentro de la misma transacción que inserta la cotización.
  2. Si la creación falla después de tomar el número, la transacción se revierte y el número no se pierde.
  3. 50 creaciones concurrentes producen 50 números consecutivos distintos (test de integración).
  4. La API y el front muestran `COT-` + el número con al menos 4 dígitos (`COT-0001`, `COT-12345`); en la BD el número es `Int`.
  5. Duplicar también toma un número nuevo del mismo contador.
- **Depende de:** S4.1.1
- **Tamaño:** S

### S4.1.4 Validar límite de descuento
Como administrador, quiero que el descuento no supere el límite del rol de quien lo aplica, para proteger los márgenes.
- **RF de origen:** RF-02.4, RN-11, RN-12, RN-14
- **Criterios de aceptación:**
  1. `discountPct` es `percentString` (0–100, hasta 2 decimales); se guardan el porcentaje y el valor calculado.
  2. Si el actor cambia el descuento a un valor mayor que el límite de su rol, la API responde 403 `DISCOUNT_LIMIT_EXCEEDED` con `params: { limit }`.
  3. Un `SELLER` puede editar líneas de una cotización cuyo descuento supera su límite, siempre que no cambie el descuento (RN-14).
  4. Los límites se leen de `SettingsReader` en cada operación (decisión 108).
  5. El front muestra el límite del rol del usuario junto al campo de descuento.
- **Depende de:** S4.1.2, M2 (S2.2.3)
- **Tamaño:** S

### S4.1.5 Descuento por gerente o administrador
Como gerente comercial, quiero aplicar un descuento mayor al límite del vendedor, para cerrar negociaciones especiales dejando la traza de quién lo hizo.
- **RF de origen:** RF-02.4, RN-13, decisiones 37 y 45
- **Criterios de aceptación:**
  1. `MANAGER` y `ADMIN` pueden fijar un descuento hasta el límite de su propio rol en cotizaciones que pueden editar, aunque sean de otro dueño.
  2. En un `DRAFT`, si el nuevo descuento supera el límite de `SELLER`, se crea un evento `DISCOUNT_OVERRIDE` con `data: { from, to, sellerLimit }` y el actor.
  3. En un `SENT`, el cambio queda en la versión nueva (S4.3.1) y no se crea `DISCOUNT_OVERRIDE`.
  4. Si la cotización se crea directamente con un descuento mayor al límite de `SELLER` (por un `MANAGER` o `ADMIN`), también se registra `DISCOUNT_OVERRIDE`.
- **Depende de:** S4.1.4, S4.3.4
- **Tamaño:** S

---

## H4.2 Máquina de estados
**Objetivo:** que la cotización solo cambie de estado por transiciones válidas, con vigencia, anulación con motivo, reasignación y un listado filtrable.
**Depende de:** H4.1.

### S4.2.1 Cambiar estado con transiciones válidas
Como vendedor, quiero enviar una cotización y registrar si el cliente la aprobó o rechazó, para saber en qué va cada oportunidad.
- **RF de origen:** RF-04.1, RN-18 a RN-20, decisión 50
- **Criterios de aceptación:**
  1. Las transiciones permitidas son las de RN-19; cualquier otra responde 409 `QUOTE_INVALID_TRANSITION` con `params: { from, to }`. `EXPIRED` solo la asigna el sistema.
  2. `POST /api/quotes/:id/send` (`DRAFT` → `SENT`) crea la versión 1 (snapshot) y un `STATE_CHANGED` con `versionId` en una transacción; fija `sentAt` y `firstSentAt`. Lo usan el botón "Marcar como enviada" y los accesos de M5.
  3. `POST /api/quotes/:id/status` con `to: APPROVED | REJECTED` (desde `SENT`) registra `STATE_CHANGED` y, si aprueba, `approvedAt`.
  4. Si una `SENT` ya pasó su `expiresAt` pero el job aún no la marcó, aprobar o rechazar responde 409 `QUOTE_EXPIRED`.
  5. Toda operación que modifica la cotización exige el `updatedAt` leído por el cliente; si no coincide responde 409 `QUOTE_CONFLICT` (concurrencia optimista).
- **Depende de:** S4.1.1, S4.3.4
- **Tamaño:** M

### S4.2.2 Anular con motivo
Como vendedor, quiero anular una cotización indicando el motivo, para sacarla del proceso sin borrarla ni perder su número.
- **RF de origen:** RF-04.2, RN-21, decisión 57
- **Criterios de aceptación:**
  1. `POST /api/quotes/:id/void` con `reason` (1–500 caracteres) anula una `DRAFT` o `SENT`; sin motivo, 400 `VALIDATION_ERROR`.
  2. El motivo se guarda en la `note` del `STATE_CHANGED` a `VOIDED` y el DTO lo expone como `voidReason`.
  3. Una `APPROVED`, `REJECTED`, `EXPIRED` o `VOIDED` responde 409 `QUOTE_INVALID_TRANSITION`.
  4. La cotización anulada conserva su número y deja de ser editable.
- **Depende de:** S4.2.1
- **Tamaño:** S

### S4.2.3 Fecha de vencimiento al enviar
Como vendedor, quiero que la cotización tome automáticamente su fecha de vencimiento al enviarla, para que el cliente sepa hasta cuándo es válida.
- **RF de origen:** RF-04.3, RN-22, decisión 59
- **Criterios de aceptación:**
  1. Al pasar a `SENT`, `expiresAt` (`DATE`) = fecha de hoy en `America/Bogota` + `validityDays`.
  2. Un `DRAFT` no tiene `expiresAt`.
  3. `ExpireQuotesUseCase` pasa a `EXPIRED` las `SENT` con `expiresAt < today()`, con un `STATE_CHANGED` por cotización y `actorId = null`; es idempotente. Se exporta para el scheduler de M6.
  4. Con `expiresAt = hoy`, la cotización sigue siendo `SENT` durante todo el día.
- **Depende de:** S4.2.1
- **Tamaño:** S

### S4.2.4 Modificar fecha de vencimiento
Como vendedor, quiero cambiar la fecha de vencimiento de una cotización enviada, para dar más plazo al cliente sin reenviarla.
- **RF de origen:** RF-04.3, RN-23, decisión 31
- **Criterios de aceptación:**
  1. `PATCH /api/quotes/:id/expiry` con `expiresAt` (fecha futura, > hoy) lo pueden usar el dueño, `MANAGER` y `ADMIN`, solo en `SENT`.
  2. Una fecha de hoy o pasada responde 400 `INVALID_EXPIRY_DATE`; otro estado, 409 `QUOTE_NOT_EDITABLE`.
  3. Se registra un evento `EXPIRY_CHANGED` con `data: { from, to }`, sin crear versión ni exigir lo que pidió el cliente.
- **Depende de:** S4.2.3, S4.3.4
- **Tamaño:** S

### S4.2.5 Reasignar cotización
Como gerente comercial, quiero reasignar una cotización a otro usuario, para que alguien la atienda cuando el dueño no esté.
- **RF de origen:** RF-04.4, RN-17, decisiones 26 y 74
- **Criterios de aceptación:**
  1. `POST /api/quotes/:id/reassign` con `ownerId` (solo `MANAGER` y `ADMIN`) cambia el dueño a un usuario activo; un usuario inexistente o inactivo responde 400 `REASSIGN_TARGET_INVALID`.
  2. Se permite en cualquier estado salvo `VOIDED`; reasignar al mismo dueño responde 400 `REASSIGN_SAME_OWNER`.
  3. Se registra un evento `REASSIGNED` con `data: { from, to }`.
  4. En la misma transacción se llaman los `QuoteReassignedListener` registrados (M6 traspasa las notificaciones no leídas).
  5. En el front, el diálogo usa `GET /users/options`.
- **Depende de:** S4.3.4, M1 (S1.3.2)
- **Tamaño:** S

### S4.2.6 Ver estado y listado
Como vendedor, quiero ver mis cotizaciones con su estado y filtrarlas, para priorizar mi trabajo.
- **RF de origen:** RF-04.5, RN-01
- **Criterios de aceptación:**
  1. `GET /api/quotes` aplica `scopeFilter` (vendedor: solo propias) y filtra por `status[]`, `customerId`, `ownerId` (solo `MANAGER`/`ADMIN`), `q` (número o cliente) y `page`/`pageSize`; ordena por `updatedAt` descendente.
  2. `GET /api/quotes/:id` devuelve el detalle con líneas, totales, dueño, cliente, `expiresAt`, `voidReason` y `allowedActions` calculadas para el actor; una cotización ajena para un `SELLER` responde 404 `QUOTE_NOT_FOUND`.
  3. El estado se muestra con una etiqueta desde `lang/` y un color por estado.
  4. Las acciones del detalle se muestran según `allowedActions`.
- **Depende de:** S4.2.1
- **Tamaño:** M

---

## H4.3 Edición y versiones
**Objetivo:** editar sin reiniciar la cotización, con versiones de contenido, eventos de lo demás, historial unificado, reactivación y duplicado.
**Depende de:** H4.1; S4.3.1 requiere S4.2.1 (versión 1 al enviar).

### S4.3.1 Editar cotización pendiente
Como vendedor, quiero modificar productos, cantidades, descuento o envío de una cotización pendiente, para ajustarla a lo que pide el cliente sin crearla de nuevo.
- **RF de origen:** RF-11.1, RN-14, RN-25, RN-26
- **Criterios de aceptación:**
  1. `PATCH /api/quotes/:id` acepta `items` (las líneas con `id` conservan su snapshot de precio; las nuevas toman el precio vigente), `discountPct`, `shippingAmount` y `updatedAt`; solo en `DRAFT` o `SENT`; otro estado responde 409 `QUOTE_NOT_EDITABLE`.
  2. En `DRAFT` el cliente también se puede cambiar; en `SENT`, no (400 `QUOTE_CUSTOMER_LOCKED`).
  3. Editar un `DRAFT` no crea versión. Editar un `SENT` conserva el estado, el `expiresAt` y el `sentAt`, y crea una versión nueva.
  4. Los totales se recalculan en el back (S4.1.2) y las reglas de descuento aplican (S4.1.4, S4.1.5).
  5. Si la edición de un `SENT` no cambia el contenido, no se crea versión y la respuesta lo indica (`changed: false`).
- **Depende de:** S4.1.2, S4.2.1, S4.3.2
- **Tamaño:** L

### S4.3.2 Registrar qué pidió el cliente
Como vendedor, quiero registrar lo que pidió el cliente en cada cambio de una cotización enviada, para entender cómo evolucionó la negociación.
- **RF de origen:** RF-11.2, RN-26
- **Criterios de aceptación:**
  1. Editar un `SENT` exige `customerRequest` (1–1000 caracteres); sin él, 400 `CUSTOMER_REQUEST_REQUIRED`.
  2. Editar un `DRAFT` no lo pide.
  3. Se guarda en la versión creada.
  4. En el front, al guardar cambios de un `SENT` se abre un diálogo obligatorio para ese texto.
- **Depende de:** —
- **Tamaño:** S

### S4.3.3 Historial de versiones
Como gerente comercial, quiero ver las versiones de una cotización con lo que cambió en cada una, para revisar la negociación.
- **RF de origen:** RF-12.1, RN-26, decisiones 36 y 43
- **Criterios de aceptación:**
  1. La versión 1 es el snapshot completo al primer envío, sin `customerRequest`.
  2. Cada versión posterior guarda el snapshot completo, el diff (líneas agregadas, quitadas y modificadas; descuento y envío antes y después), el autor, la fecha y `customerRequest`.
  3. `(quoteId, number)` es único y `currentVersion` en la cotización apunta a la última.
  4. Un cambio de descuento en un `SENT` queda en la versión con el valor anterior y el nuevo (decisión 45).
- **Depende de:** S4.3.1
- **Tamaño:** M

### S4.3.4 Registrar eventos de cotización
Como desarrollador del equipo, quiero un registro único de eventos que no son de contenido, para que cada caso de uso deje su traza de forma consistente.
- **RF de origen:** RF-12.2, RN-42, decisiones 35, 46, 50 y 51
- **Criterios de aceptación:**
  1. `QuoteEvent` guarda `type` (`DISCOUNT_OVERRIDE`, `EXPIRY_CHANGED`, `REASSIGNED`, `STATE_CHANGED`), `actorId` opcional (`null` = sistema), `note` opcional, `versionId` opcional y `data`.
  2. `STATE_CHANGED` se registra en toda transición, también cuando la misma operación crea una versión; en ese caso lleva `versionId`.
  3. La versión y el evento de una misma operación se crean en una sola transacción.
  4. `DISCOUNT_OVERRIDE` solo se crea donde no hay versión (`DRAFT`).
- **Depende de:** S4.1.1
- **Tamaño:** S

### S4.3.5 Historial unificado
Como vendedor, quiero ver en una sola línea de tiempo las versiones y los eventos de una cotización, para entender su historia completa.
- **RF de origen:** RF-12.3, RN-42
- **Criterios de aceptación:**
  1. `GET /api/quotes/:id/history` devuelve versiones y eventos ordenados por fecha; un evento con `versionId` aparece agrupado con su versión.
  2. El actor `null` se muestra con la clave `history.actor.system`.
  3. Cada entrada muestra su tipo, actor, fecha y detalle (diff, de/a, motivo o nota) con textos desde `lang/`.
  4. Respeta el alcance: una cotización ajena para un `SELLER` responde 404.
- **Depende de:** S4.3.3, S4.3.4
- **Tamaño:** M

### S4.3.6 Reactivar vencida con actualización de precios
Como vendedor, quiero reactivar una cotización vencida, con la opción de actualizar precios, para retomar la negociación sin empezar de cero.
- **RF de origen:** RF-11.3, RN-26, RN-27, decisiones 38 y 44
- **Criterios de aceptación:**
  1. `GET /api/quotes/:id/reactivation-preview` (solo `EXPIRED`) devuelve cada línea con su precio actual en la cotización, el precio vigente y si el producto está inactivo.
  2. `POST /api/quotes/:id/reactivate` con `customerRequest` (obligatorio), `updatePrices` (boolean) y `updatedAt` pasa a `SENT`, fija un nuevo `sentAt` y `expiresAt = hoy + validityDays`; `firstSentAt` no cambia.
  3. Con `updatePrices = true`, las líneas de productos activos toman el precio vigente y las de inactivos conservan su snapshot; si cambia algún precio se crea una versión con `customerRequest` y un `STATE_CHANGED` con `versionId`.
  4. Sin cambios de contenido no se crea versión: el `STATE_CHANGED` lleva `customerRequest` como `note`.
  5. En el front, el diálogo muestra la vista previa con avisos de productos inactivos y pide confirmación.
- **Depende de:** S4.2.3, S4.3.3, S4.3.4
- **Tamaño:** M

### S4.3.7 Duplicar
Como vendedor, quiero duplicar una cotización aprobada o rechazada, para crear una nueva parecida sin reescribirla.
- **RF de origen:** RF-11.3, RN-28, decisión 14
- **Criterios de aceptación:**
  1. `POST /api/quotes/:id/duplicate` (solo desde `APPROVED` o `REJECTED`) crea un `DRAFT` nuevo con número nuevo, dueño = actor, mismo cliente (debe estar activo), mismas cantidades y envío, y precios vigentes del catálogo.
  2. Las líneas de productos inactivos se omiten y la respuesta las lista en `omittedProductIds`; si todas quedan omitidas, 400 `QUOTE_EMPTY`.
  3. El descuento se copia solo si no supera el límite del rol del actor; si lo supera, queda en 0 y la respuesta lo indica (`discountReset: true`).
  4. Otro estado responde 409 `QUOTE_NOT_DUPLICABLE`.
  5. El front abre el editor del nuevo borrador y muestra los avisos.
- **Depende de:** S4.1.1, S4.1.3, S4.1.4
- **Tamaño:** S
