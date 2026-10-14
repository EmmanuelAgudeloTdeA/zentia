# M6 Seguimiento – Épicas

> Fuentes: `docs/fuente/desglose.md` (M6; decisiones 2, 20, 21, 39, 47, 52, 58, 61, 66, 69, 71, 72, 74, 128, 129, 131, 139–146), `CLAUDE.md`, `docs/prd.md` (RF-05, RF-07, RN-24, RN-33 a RN-35, RN-37), `docs/architecture.md` §8.

## Objetivo
Registrar las interacciones con los clientes y avisar a tiempo de las cotizaciones que vencen o están sin seguimiento, con un scheduler diario idempotente y notificaciones dentro de la app.

**Cubre:** RF-05 (observaciones por cliente) y RF-07 (alertas por reglas). El vencimiento automático de RF-04 lo programa este módulo (decisión 2), pero la regla la implementa M4.

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | Registro de módulos, errores, OpenAPI; advisory locks de Postgres vía Prisma (`$queryRaw`) |
| M1 · H1.2 | Guard, `Actor`, política de alcance; `User.isActive` para omitir dueños inactivos |
| M2 · S2.2.3 | `SettingsReader`: `expiringAlertDays` (X) y `followUpDays` (Y) |
| M3 · H3.1 | `CustomerReader` (H6.1 solo depende de M3) |
| M4 | `ExpireQuotesUseCase`, `Clock`, `QuoteReassignedListener`, tablas `Quote` (`status`, `ownerId`, `sentAt`, `expiresAt`) para el repositorio de solo lectura, `QuoteReader` para validar acceso al vincular una interacción |

## Lo desbloquea
| Módulo | Qué necesita de M6 |
|---|---|
| M8 Dashboard | Regla "sin seguimiento" (fecha de referencia y Y) para contar las pendientes de seguimiento |
| M9 IA | Interacciones (conteos y fechas) para la heurística; la regla de Y para destacar el asistente; las notificaciones, para ordenarlas por probabilidad (H9.3) |
| M10 | Scheduler con `SCHEDULER_ENABLED` para el despliegue |

---

## H6.1 Observaciones
**Objetivo:** registrar interacciones con los clientes, opcionalmente vinculadas a una cotización, y verlas en una línea de tiempo.
**Depende de:** M3 (H3.1); la vinculación a cotizaciones requiere M4.

### S6.1.1 Registrar observación
Como vendedor, quiero registrar cada contacto con un cliente indicando la fecha, el tipo y una nota, para no perder el contexto de la relación.
- **RF de origen:** RF-05.1, RN-35, decisión 61
- **Criterios de aceptación:**
  1. `POST /api/interactions` (cualquier rol) con `customerId`, `type` (`CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `OTHER`), `note` (1–2000 caracteres), `occurredAt` (opcional; por defecto ahora; no puede ser futura) y `quoteId` opcional.
  2. Si se envía `quoteId`, la cotización debe pertenecer al cliente (400 `INTERACTION_QUOTE_MISMATCH`) y el actor debe tener acceso a ella (404 `QUOTE_NOT_FOUND`).
  3. Las interacciones no se editan ni se borran (registro de solo agregar).
  4. En el front, el diálogo "Registrar observación" está en el detalle del cliente y en el detalle de la cotización (con la cotización preseleccionada).
  5. La nota nunca se envía al LLM (RN-37); es texto libre.
- **Depende de:** M3 (H3.1); M4 para `quoteId`
- **Tamaño:** S

### S6.1.2 Ver historial del cliente
Como vendedor, quiero ver en orden cronológico las interacciones con un cliente, para retomar una negociación sabiendo qué pasó.
- **RF de origen:** RF-05.2
- **Criterios de aceptación:**
  1. `GET /api/interactions?customerId=&quoteId=&page=` devuelve las interacciones ordenadas por `occurredAt` descendente, con autor, tipo, nota y la cotización vinculada (número).
  2. Un `SELLER` ve las interacciones del cliente que no están vinculadas a cotizaciones o que están vinculadas a cotizaciones propias.
  3. El detalle del cliente (sección reservada en M3) y el de la cotización muestran la línea de tiempo con el tipo traducido desde `lang/`.
- **Depende de:** S6.1.1
- **Tamaño:** S

---

## H6.2 Scheduler
**Objetivo:** ejecutar a diario y de forma idempotente el vencimiento de cotizaciones y la generación de alertas.
**Depende de:** M4; S6.2.3 requiere H6.1.

### S6.2.1 Job que marca Vencidas
Como gerente comercial, quiero que las cotizaciones se marquen como vencidas solas al pasar su fecha, para que los estados reflejen la realidad.
- **RF de origen:** RF-04.3, RN-24, decisiones 2 y 66
- **Criterios de aceptación:**
  1. El puerto `Scheduler` (`NodeCronScheduler` en `core/`) registra `expire-quotes` a las 00:05 `America/Bogota` y llama a `ExpireQuotesUseCase` de M4.
  2. Solo corre si `SCHEDULER_ENABLED=true`, y toma `pg_try_advisory_lock` por job; si no consigue el lock, no hace nada.
  3. Al arrancar la API se ejecuta una pasada de recuperación de ambos jobs.
  4. Cada ejecución registra en el log el inicio, la cantidad procesada, la duración y los errores, con el nombre del job.
- **Depende de:** M4 (`ExpireQuotesUseCase`)
- **Tamaño:** M

### S6.2.2 Regla "próxima a vencer" (X días)
Como vendedor, quiero un aviso cuando una cotización mía esté por vencer, para contactar al cliente antes de perderla.
- **RF de origen:** RF-07.1, RN-33, RN-34, decisiones 69 y 71
- **Criterios de aceptación:**
  1. El job `follow-up-alerts` (07:00 Bogotá) crea `QUOTE_EXPIRING` para cada `SENT` con dueño activo y `today() ≥ expiresAt − X` y `today() ≤ expiresAt`.
  2. `referenceDate = expiresAt`; la clave única `(quoteId, type, referenceDate)` evita duplicados (`INSERT ... ON CONFLICT DO NOTHING`).
  3. Si se cambia `expiresAt` (M4), la nueva fecha de referencia puede generar una alerta nueva.
  4. La notificación va al dueño actual, sea cual sea su rol, con `params: { quoteId, quoteNumber, customerName, expiresAt }`.
- **Depende de:** S6.2.1
- **Tamaño:** S

### S6.2.3 Regla "sin seguimiento" (Y días)
Como vendedor, quiero un aviso cuando una cotización mía lleve Y días sin seguimiento, para no dejarla olvidada.
- **RF de origen:** RF-07.1, RN-33, RN-34, decisiones 39 y 47
- **Criterios de aceptación:**
  1. `referenceDate` = fecha en Bogotá de max(última interacción de la cotización o del cliente sin cotización vinculada, último `sentAt`).
  2. El job crea `QUOTE_NO_FOLLOW_UP` para cada `SENT` con dueño activo y `today() ≥ referenceDate + Y`.
  3. Cada interacción nueva o reenvío (reactivación) cambia la fecha de referencia y abre un ciclo nuevo; en el mismo ciclo no se repite la alerta.
  4. La regla (cálculo de la fecha de referencia y del vencimiento de Y) se exporta por el barril para que M8 y M9 la reutilicen.
- **Depende de:** S6.2.1, H6.1
- **Tamaño:** M

---

## H6.3 Notificaciones in-app
**Objetivo:** mostrar las alertas al dueño en la app con un contador y una sección propia, y traspasarlas al reasignar.
**Depende de:** H6.2.

### S6.3.1 Campana con contador
Como vendedor, quiero ver en el encabezado cuántas alertas tengo sin leer, para saber si algo requiere mi atención.
- **RF de origen:** RF-07.2
- **Criterios de aceptación:**
  1. `GET /api/notifications/unread-count` devuelve `{ count }` del actor.
  2. La campana del layout consulta el contador al iniciar sesión, al navegar y cada 60 s mientras la pestaña está visible (sin push ni websockets).
  3. Al hacer clic se abre un panel con las 10 más recientes y un enlace a la sección completa.
- **Depende de:** S6.3.2
- **Tamaño:** S

### S6.3.2 Sección de notificaciones
Como vendedor, quiero una sección con todas mis alertas, para revisarlas y abrir la cotización correspondiente.
- **RF de origen:** RF-07.2, RN-27
- **Criterios de aceptación:**
  1. `GET /api/notifications?unreadOnly=&page=` devuelve solo las del actor, ordenadas por fecha de creación descendente, con `type`, `params`, `readAt` y el estado actual de la cotización.
  2. El texto se arma en el front con `notifications.<TYPE>` y los `params`; las de cotizaciones que ya no están en `SENT` se muestran atenuadas como "resueltas".
  3. Al hacer clic en una notificación se marca como leída y se abre la cotización.
  4. Con M9, la lista se puede ordenar por probabilidad de cierre (lo implementa H9.3).
- **Depende de:** H6.2
- **Tamaño:** S

### S6.3.3 Marcar como leída
Como vendedor, quiero marcar mis alertas como leídas, una a una o todas, para mantener limpia mi bandeja.
- **RF de origen:** RF-07.2
- **Criterios de aceptación:**
  1. `POST /api/notifications/:id/read` marca una (solo si es del actor; si no, 404 `NOTIFICATION_NOT_FOUND`); es idempotente.
  2. `POST /api/notifications/read-all` marca todas las del actor.
  3. Al reasignar una cotización (M4), el listener de M6 pasa sus notificaciones no leídas al nuevo dueño dentro de la misma transacción (decisión 74).
- **Depende de:** S6.3.2, M4 (`QuoteReassignedListener`)
- **Tamaño:** S
