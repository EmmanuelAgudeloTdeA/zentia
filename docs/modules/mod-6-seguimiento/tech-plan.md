# M6 Seguimiento – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §5 y §8; base de M0–M4.

## 1. Entidades Prisma
```prisma
enum InteractionType  { CALL EMAIL WHATSAPP MEETING OTHER }
enum NotificationType { QUOTE_EXPIRING QUOTE_NO_FOLLOW_UP }

model Interaction {
  id         String          @id @default(uuid()) @db.Uuid
  customerId String          @db.Uuid
  customer   Customer        @relation(fields: [customerId], references: [id])
  quoteId    String?         @db.Uuid
  quote      Quote?          @relation(fields: [quoteId], references: [id])
  type       InteractionType
  note       String          @db.VarChar(2000)
  occurredAt DateTime
  authorId   String          @db.Uuid
  author     User            @relation(fields: [authorId], references: [id])
  createdAt  DateTime        @default(now())

  @@index([customerId, occurredAt])
  @@index([quoteId, occurredAt])
}

model Notification {
  id            String           @id @default(uuid()) @db.Uuid
  userId        String           @db.Uuid               // dueño actual de la cotización
  user          User             @relation(fields: [userId], references: [id])
  quoteId       String           @db.Uuid
  quote         Quote            @relation(fields: [quoteId], references: [id])
  type          NotificationType
  params        Json
  referenceDate DateTime         @db.Date               // en America/Bogota
  readAt        DateTime?
  createdAt     DateTime         @default(now())

  @@unique([quoteId, type, referenceDate])
  @@index([userId, readAt])
}
```
Las interacciones no tienen `updatedAt`: son de solo agregar.

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/api/interactions` | Todos | `{ customerId, quoteId?, type, note, occurredAt? }` | 201 `InteractionDto` | 400 `VALIDATION_ERROR`, `INTERACTION_QUOTE_MISMATCH`, `INTERACTION_FUTURE_DATE`; 404 `CUSTOMER_NOT_FOUND`, `QUOTE_NOT_FOUND` |
| GET | `/api/interactions` | Todos | query `{ customerId?, quoteId?, page=1, pageSize=20 }` (al menos uno de los dos) | 200 `{ items: InteractionDto[], total, page, pageSize }` | 400; 404 `QUOTE_NOT_FOUND` (si `quoteId` es ajena para un `SELLER`) |
| GET | `/api/notifications` | Todos (solo propias) | query `{ unreadOnly?, sort? ('date' \| 'probability', este último solo si M9 registró su proveedor), page=1, pageSize=20 }` | 200 `{ items: NotificationDto[], total, page, pageSize }` | 400 |
| GET | `/api/notifications/unread-count` | Todos | — | 200 `{ count }` | — |
| POST | `/api/notifications/:id/read` | Todos (solo propias) | — | 204 | 404 `NOTIFICATION_NOT_FOUND` |
| POST | `/api/notifications/read-all` | Todos | — | 204 | — |

- `InteractionDto = { id, customerId, quote: { id, displayNumber } | null, type, note, occurredAt, author: { id, name }, createdAt }`.
- `NotificationDto = { id, type, params, referenceDate, readAt, createdAt, quote: { id, displayNumber, status } }`.

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `RegisterInteractionUseCase` | `InteractionRepository`, `CustomerReader` (M3), `QuoteReader` (M4), `Clock` | Valida cliente, pertenencia y acceso a la cotización; `occurredAt ≤ now()` |
| `ListInteractionsUseCase` | `InteractionRepository` | Filtro de alcance para `SELLER` |
| `RunExpireQuotesJob` | `ExpireQuotesUseCase` (M4), `JobLock` | Envoltorio del job con lock y log |
| `RunFollowUpAlertsJob` | `FollowUpReadRepository`, `NotificationRepository`, `SettingsReader`, `Clock`, `JobLock` | Ambas reglas; inserción idempotente |
| `ListNotificationsUseCase`, `CountUnreadUseCase`, `MarkReadUseCase`, `MarkAllReadUseCase` | `NotificationRepository` | Solo del actor |
| `TransferNotificationsOnReassign` | `NotificationRepository` | Implementa `QuoteReassignedListener` de M4: `UPDATE ... SET userId = :to WHERE quoteId = :id AND readAt IS NULL` dentro de la transacción recibida |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `Scheduler` | `register(name, cron, job)`, `runNow(name)` | `NodeCronScheduler` (`core/`, zona `America/Bogota`) |
| `JobLock` | `withLock(name, fn)` | `pg_try_advisory_lock(hashtext(name))` + `pg_advisory_unlock` |
| `FollowUpReadRepository` (solo lectura, decisión 72) | `findExpiring(today, x)`, `findWithoutFollowUp(today, y)` → DTOs `{ quoteId, ownerId, number, customerName, expiresAt, referenceDate }` | SQL sobre `Quote`, `Customer`, `User`, `Interaction` |
| `NotificationRepository` | `insertIgnoringDuplicates(batch)`, `listForUser`, `countUnread`, `markRead`, `markAllRead`, `transferUnread(tx, quoteId, to)` | Prisma |
| `InteractionRepository` | `create`, `list` | Prisma |
| `NotificationSortProvider` | Punto de extensión: `(userId, notifications) => ordered`; sin proveedor, el orden es por fecha; M9 registra `probability` (decisión 170) | Registro en el barril de `follow-up` |

**Exportado por el barril (para M8 y M9):** `followUpReferenceDate(lastInteractionAt, sentAt)`, `isWithoutFollowUp(referenceDate, today, y)`, y el fragmento SQL equivalente para los repositorios de solo lectura.

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Componente | `InteractionDialog` | Tipo, nota, fecha (por defecto ahora, sin futuro) y cotización opcional (solo las del cliente a las que el usuario tiene acceso) |
| Componente | `InteractionTimeline` | Lista cronológica; se monta en `CustomerDetailPage` (M3) y en `QuoteDetailPage` (M4) |
| Componente | `NotificationBell` (en `PrivateLayout`) | Contador, panel con las 10 más recientes, polling cada 60 s con la pestaña visible |
| Pantalla | `NotificationsPage` (`/notifications`) | Filtro "solo no leídas", marcar todas, paginación; las resueltas aparecen atenuadas |
| Store | `core/notifications/notifications.store.ts` (Zustand) | `unreadCount`, `refresh()`; se actualiza al marcar como leídas |
| Service | `features/follow-up/services/interactions.service.ts`, `features/notifications/services/notifications.service.ts` | Llamadas a la API |

## 5. Claves de `lang/` (front)
- `nav.notifications`
- `interactions.title`, `interactions.new`, `interactions.fields.type`, `interactions.fields.note`, `interactions.fields.occurredAt`, `interactions.fields.quote`, `interactions.none`, `interactions.linkedQuote`
- `enums.InteractionType.CALL`, `.EMAIL`, `.WHATSAPP`, `.MEETING`, `.OTHER`
- `notifications.title`, `notifications.unreadOnly`, `notifications.markAllRead`, `notifications.empty`, `notifications.viewAll`, `notifications.resolved`
- `notifications.QUOTE_EXPIRING` (marcadores `{{quoteNumber}}`, `{{customerName}}`, `{{expiresAt}}`)
- `notifications.QUOTE_NO_FOLLOW_UP` (marcadores `{{quoteNumber}}`, `{{customerName}}`, `{{days}}`)
- `errors.INTERACTION_QUOTE_MISMATCH`, `errors.INTERACTION_FUTURE_DATE`, `errors.NOTIFICATION_NOT_FOUND`

## 6. Reglas de negocio
**Jobs** (`America/Bogota`, `SCHEDULER_ENABLED=true`, un lock por job)
| Job | Cron | Acción |
|---|---|---|
| `expire-quotes` | `5 0 * * *` | `ExpireQuotesUseCase` (M4) |
| `follow-up-alerts` | `0 7 * * *` | Reglas de alertas y luego inserción idempotente |
| Recuperación | Al arrancar | `runNow` de ambos jobs, en ese orden |

**Reglas de alerta** (solo `status = SENT` y dueño con `isActive = true`)
| Tipo | Condición | `referenceDate` | `params` |
|---|---|---|---|
| `QUOTE_EXPIRING` | `expiresAt − X ≤ today ≤ expiresAt` | `expiresAt` | `quoteId`, `quoteNumber`, `customerName`, `expiresAt` |
| `QUOTE_NO_FOLLOW_UP` | `today ≥ referenceDate + Y` | `date(max(lastInteraction, sentAt))` en Bogotá | `quoteId`, `quoteNumber`, `customerName`, `days = today − referenceDate` |

`lastInteraction` = máximo `occurredAt` entre las interacciones con `quoteId` = la cotización y las del mismo cliente sin `quoteId`.

**Deduplicación:** `UNIQUE (quoteId, type, referenceDate)` + `ON CONFLICT DO NOTHING`. Un ciclo nuevo cambia `referenceDate`.

**Destinatario:** el dueño actual (`Quote.ownerId`) al generar; al reasignar, las no leídas pasan al nuevo dueño.

**Alcance de interacciones para `SELLER`:** ve las del cliente sin cotización y las vinculadas a cotizaciones propias; `MANAGER` y `ADMIN` ven todas.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `follow-up-rule.spec` | Unitaria | `followUpReferenceDate` y `isWithoutFollowUp` con fechas límite (cambio de día en Bogotá, Y exacto) |
| `alert-rules.spec` | Integración (Postgres + `Clock` fijo) | Ventana de `QUOTE_EXPIRING` (X − 1, X, día de vencimiento, día siguiente); `QUOTE_NO_FOLLOW_UP` con interacción de la cotización, del cliente, de otro cliente; dueño inactivo omitido; estados distintos de `SENT` omitidos |
| `alerts-idempotency.spec` | Integración | Dos ejecuciones el mismo día no duplican; una interacción nueva genera una alerta en el ciclo siguiente |
| `job-lock.spec` | Integración | Dos ejecuciones concurrentes: solo una procesa |
| `scheduler.spec` | Unitaria | Registro con zona `America/Bogota`; `SCHEDULER_ENABLED=false` no registra; recuperación al arrancar |
| `register-interaction.spec` | Unitaria | `INTERACTION_QUOTE_MISMATCH`, fecha futura, acceso a la cotización |
| `transfer-notifications.spec` | Integración | Al reasignar, solo las no leídas cambian de dueño, en la misma transacción (rollback revierte) |
| `notifications.routes.spec` | Supertest | Solo propias; 404 ajena; `read` idempotente; `read-all` |
| `notification-bell.spec`, `interaction-dialog.spec` | Testing Library | Polling con la pestaña visible, contador tras marcar, texto con marcadores, fecha futura rechazada |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 139–146) |
|---|---|
| Qué interacciones cuentan para "sin seguimiento" | Las vinculadas a la cotización y las del cliente sin cotización; un contacto general con el cliente cuenta como seguimiento de sus cotizaciones. |
| Interacciones inmutables | No se editan ni se borran: son registro histórico y señal para la IA. |
| Fecha de la interacción | Se permite registrar un contacto pasado (`occurredAt` ≤ ahora), no uno futuro. |
| Alcance de interacciones de un `SELLER` | No ve las vinculadas a cotizaciones ajenas del mismo cliente. |
| Notificaciones de cotizaciones resueltas | No se borran ni se marcan solas; se muestran atenuadas según el estado actual de la cotización. |
| Polling de la campana | Cada 60 s con la pestaña visible (sin push, RN-34). |
| `referenceDate` como `DATE` en Bogotá (decisión 79) | Se calcula con `Clock` y la zona del proceso; los tests fijan el reloj en el cambio de día. |
| Varias instancias | `SCHEDULER_ENABLED` + advisory lock + idempotencia (deuda de `node-cron`). |
