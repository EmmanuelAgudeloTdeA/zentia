# Checklist QA – M6 Seguimiento

## Depende de
- `docs/modules/mod-6-seguimiento/epics.md` (criterios de aceptación de H6.1, H6.2 y H6.3).
- `CLAUDE.md` (reglas de seguimiento, jobs y notificaciones).
- M4 (`ExpireQuotesUseCase`, `QuoteReassignedListener`) y M9 (garantía de que la nota no va al LLM).

## Estado
Auditoría de M6 aplicada en la rama `mod-6-seguimiento-auditoria`. Los criterios marcados citan una prueba existente. Las pruebas de integración (`*.integration.test.ts`) requieren `TEST_DATABASE_URL` y no se ejecutaron en esta auditoría. Quedan pendientes las verificaciones manuales de UI y de despliegue.

Rutas abreviadas: `api/` = `apps/api/src/`, `web/` = `apps/web/src/`, `shared/` = `packages/shared/src/`.

## H6.1 Observaciones

### S6.1.1 Registrar observación
- [x] S6.1.1.1 `POST /api/interactions` con `customerId`, `type`, `note` y `quoteId` opcional — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interactions › registers an interaction linked to an own quote and lists it
- [x] S6.1.1.1 `note` de 1–2000 caracteres (2001 → 400) y `type` inválido → 400 — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › rejects a note longer than 2000 characters and an invalid type
- [x] S6.1.1.1 `occurredAt` futura rechazada (`INTERACTION_FUTURE_DATE`) — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interactions › rejects future dates, quotes of another customer and foreign quotes
- [x] S6.1.1.1 Tolerancia de 60 s al reloj del navegador (30 s aceptado, 5 min rechazado) — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › tolerates a client clock up to one minute ahead
- [x] S6.1.1.1 El front rechaza una fecha futura antes de llamar a la API — `web/features/follow-up/components/interaction-dialog.test.tsx` › InteractionDialog › rejects a future date before calling the API
- [x] S6.1.1.2 `quoteId` de otro cliente → 400 `INTERACTION_QUOTE_MISMATCH`; cotización ajena → 404 — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interactions › rejects future dates, quotes of another customer and foreign quotes
- [x] S6.1.1.3 Registro de solo agregar: `PUT`/`DELETE /api/interactions/:id` → 404 — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › does not expose edit or delete of interactions (append-only)
- [x] S6.1.1.4 El diálogo envía la cotización preseleccionada con la nota y el tipo — `web/features/follow-up/components/interaction-dialog.test.tsx` › InteractionDialog › sends the preselected quote with the note and type
- [ ] S6.1.1.4 El diálogo "Registrar observación" está disponible en el detalle del cliente y en el de la cotización — manual, pendiente
- [x] S6.1.1.5 La nota nunca se envía al LLM — `api/modules/ai/presentation/ai.routes.test.ts` › follow-up message › sends only anonymized signals to the LLM and cleans its answer

### S6.1.2 Ver historial del cliente
- [x] S6.1.2.1 Orden por `occurredAt` descendente — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › shows a manager every interaction ordered by occurredAt desc
- [x] S6.1.2.1 Respuesta con autor, tipo y número de la cotización vinculada — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interactions › registers an interaction linked to an own quote and lists it
- [x] S6.1.2.2 Un `SELLER` ve las sin cotización y las de sus cotizaciones, no las de cotizaciones ajenas — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › shows a seller interactions without quote and of own quotes only
- [x] S6.1.2.2 Un `MANAGER` ve todas — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › shows a manager every interaction ordered by occurredAt desc
- [x] S6.1.2.2 `GET` con `quoteId` ajeno → 404 — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › answers 404 when a seller filters by a foreign quoteId
- [x] S6.1.2.3 Línea de tiempo con el tipo traducido desde `lang/` — `web/features/follow-up/components/follow-up-section.test.tsx` › FollowUpSection › shows the translated type and does not refetch on equivalent parent re-renders
- [x] S6.1.2.3 El detalle de la cotización no recarga el historial en cada render — `web/features/follow-up/components/follow-up-section.test.tsx` › FollowUpSection › shows the translated type and does not refetch on equivalent parent re-renders
- [x] S6.1.2.3 "Ver más antiguas" conserva las páginas cargadas — `web/features/follow-up/components/follow-up-section.test.tsx` › FollowUpSection › keeps the older pages loaded across parent re-renders
- [ ] S6.1.2.3 La línea de tiempo se ve en el detalle del cliente y en el de la cotización — manual, pendiente

## H6.2 Scheduler

### S6.2.1 Job que marca Vencidas
- [x] S6.2.1.1 `expire-quotes` a las 00:05 y `follow-up-alerts` a las 07:00, en ese orden — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › createFollowUpJobs › returns expire-quotes at 00:05 and follow-up-alerts at 07:00, in that order
- [x] S6.2.1.1 `node-cron` con zona `America/Bogota` y sin solapamiento — `api/core/scheduler/scheduler.test.ts` › scheduler › schedules with the Bogota timezone and without overlapping runs
- [x] S6.2.1.1 `ExpireQuotesUseCase` de M4 vence una sola vez, con el sistema como actor — `api/modules/quotes/application/quote-use-cases.test.ts` › expiry, reactivation and duplicate › expires due quotes once, with the system as actor
- [x] S6.2.1.2 `SCHEDULER_ENABLED` desactivado por defecto — `api/core/scheduler/scheduler.test.ts` › scheduler › keeps the scheduler disabled by default
- [x] S6.2.1.2 Desactivado no registra nada — `api/core/scheduler/scheduler.test.ts` › startScheduler › registers nothing when disabled
- [x] S6.2.1.2 Sin lock el job no hace nada y devuelve 0 — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › createFollowUpJobs › yields 0 without running when another instance holds the lock
- [x] S6.2.1.2 Con lock devuelve la cantidad procesada — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › createFollowUpJobs › returns the processed count when the lock is acquired
- [x] S6.2.1.2 Solo una ejecución concurrente obtiene el advisory lock — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › lets only one concurrent job hold the lock
- [x] S6.2.1.3 Pasada de recuperación al arrancar: primero vencer y luego alertar — `api/core/scheduler/scheduler.test.ts` › startScheduler › registers the jobs and runs the recovery pass expire first, then alerts
- [x] S6.2.1.4 Log con nombre, cantidad, duración y errores, sin lanzar — `api/core/scheduler/scheduler.test.ts` › scheduler › logs processed counts and never throws on failures
- [ ] S6.2.1 Ejecución real a las 00:05 y 07:00 hora de Bogotá en el entorno desplegado — manual, pendiente

### S6.2.2 Regla "próxima a vencer" (X días)
- [x] S6.2.2.1 `QUOTE_EXPIRING` dentro de la ventana `expiresAt − X … expiresAt` — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › creates the expiring alert inside the X-day window
- [x] S6.2.2.1 El día del vencimiento aplica y el día siguiente no — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › allows both alerts on the expiry day and none after it
- [x] S6.2.2.1 Regla compartida, incluido el día del vencimiento — `shared/rules/follow-up.test.ts` › follow-up rules › flags quotes expiring within X days, including the expiry day
- [x] S6.2.2.1 Solo `SENT` con dueño activo — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › skips inactive owners and quotes that are not sent
- [x] S6.2.2.1 Las `EXPIRED` quedan fuera — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › excludes expired quotes
- [x] S6.2.2.1 El job usa `clock.today()` y X/Y de la configuración — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › RunFollowUpAlertsUseCase › uses clock.today() and the X/Y days from the settings
- [x] S6.2.2.2 Inserción idempotente por `(quoteId, type, referenceDate)` — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › inserts alerts idempotently and opens a new cycle after an interaction
- [x] S6.2.2.2 Reejecutar el job no duplica — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › RunFollowUpAlertsUseCase › creates nothing when Y has not elapsed and is idempotent on reruns
- [x] S6.2.2.3 Un `expiresAt` nuevo da otra fecha de referencia (ciclo nuevo) — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › opens a new expiring cycle when expiresAt changes
- [x] S6.2.2.4 Va al dueño sea cual sea su rol (p. ej., gerente) — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › addresses the alert to the owner whatever their role (e.g. a manager)
- [x] S6.2.2.4 `params` con `quoteId`, `quoteNumber`, `customerName` y `expiresAt` — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › creates the expiring alert inside the X-day window

### S6.2.3 Regla "sin seguimiento" (Y días)
- [x] S6.2.3.1 Referencia = max(última interacción, último `sentAt`) — `shared/rules/follow-up.test.ts` › follow-up rules › uses the latest of the last interaction and the last send
- [x] S6.2.3.1 Fechas en Bogotá y solo interacciones de la cotización o del cliente sin cotización — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › reads Bogotá dates and the latest relevant interaction
- [x] S6.2.3.1 Una interacción vinculada a otra cotización del mismo cliente no cuenta — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › ignores interactions linked to another quote of the same customer
- [x] S6.2.3.2 `QUOTE_NO_FOLLOW_UP` desde exactamente Y días — `shared/rules/follow-up.test.ts` › follow-up rules › flags a quote without follow-up from exactly Y days
- [x] S6.2.3.2 Alerta desde el último contacto — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › creates the no follow-up alert from the latest contact
- [x] S6.2.3.2 El parámetro `days` es el correcto — `api/modules/follow-up/domain/alert-rules.test.ts` › alertsFor › reports the days elapsed since the reference date
- [x] S6.2.3.3 Una interacción nueva abre un ciclo nuevo — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › inserts alerts idempotently and opens a new cycle after an interaction
- [x] S6.2.3.3 Un reenvío (nuevo `sentAt`) abre un ciclo nuevo — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › opens a new no follow-up cycle when the quote is resent
- [x] S6.2.3.4 La regla se exporta para M8 y M9 (en `packages/shared`) — `shared/rules/follow-up.test.ts` › follow-up rules › uses the latest of the last interaction and the last send

## H6.3 Notificaciones in-app

### S6.3.1 Campana con contador
- [x] S6.3.1.1 `GET /api/notifications/unread-count` devuelve `{ count }` del actor — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › lists, counts and marks only the own notifications
- [x] S6.3.1.2 Contador al iniciar y polling de 60 s con la pestaña visible — `web/features/notifications/components/notifications.test.tsx` › NotificationBell › polls every 60 seconds while the tab is visible
- [x] S6.3.1.2 Sin polling con la pestaña oculta — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › does not poll while the tab is hidden
- [x] S6.3.1.2 Al cerrar sesión se limpia el contador (el siguiente usuario no ve el anterior) — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › clears the count when the session is cleared (next user in the same tab)
- [x] S6.3.1.3 El panel pide las 10 más recientes por fecha — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › asks the panel for the latest 10 notifications sorted by date
- [ ] S6.3.1.3 Enlace "Ver todas" del panel lleva a la sección completa — manual, pendiente

### S6.3.2 Sección de notificaciones
- [x] S6.3.2.1 Solo las del actor, por fecha descendente, con el estado de la cotización — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › lists, counts and marks only the own notifications
- [x] S6.3.2.2 Texto con marcadores y resueltas atenuadas — `web/features/notifications/components/notifications.test.tsx` › NotificationsPage › renders texts with their markers and dims resolved quotes
- [x] S6.3.2.2 Plural de días ("1 día") — `web/features/notifications/components/notifications.test.tsx` › NotificationsPage › uses the singular for a single day without follow-up
- [x] S6.3.2.3 Clic marca como leída, abre la cotización y baja el contador — `web/features/notifications/components/notifications.test.tsx` › NotificationBell › shows the unread count, opens a notification and lowers the count
- [x] S6.3.2.3 Si falla marcar como leída, el contador no baja — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › does not lower the count when marking one as read fails
- [x] S6.3.2.4 Orden por probabilidad con aviso de respaldo por fecha — `web/features/notifications/components/notifications.test.tsx` › NotificationsPage › sorts by probability by default, shows compact badges and the date fallback notice

### S6.3.3 Marcar como leída
- [x] S6.3.3.1 Marca una solo si es del actor (si no, 404) y es idempotente — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › lists, counts and marks only the own notifications
- [x] S6.3.3.2 `read-all` marca todas las del actor — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › lists, counts and marks only the own notifications
- [x] S6.3.3.2 En la campana, "Marcar todas" deja el contador en 0 — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › sets the count to 0 after marking all as read
- [x] S6.3.3.2 Si "Marcar todas" falla, se muestra el error traducido y el contador se conserva — `web/features/notifications/components/notifications.test.tsx` › NotificationBell (audit) › shows a translated toast and keeps the count when marking all fails
- [x] S6.3.3.3 Al reasignar, las no leídas pasan al nuevo dueño — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › moves unread notifications to the new owner when the quote is reassigned
- [x] S6.3.3.3 El traspaso ocurre dentro de la transacción y se revierte con ella — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › transfers unread notifications inside the transaction and rolls back with it

### Reasignación y deduplicación por destinatario
- [x] Tras reasignar, el nuevo dueño recibe la alerta del ciclo aunque el anterior la haya leído, sin duplicarse — `api/follow-up-use-cases` › alerts the new owner after a reassignment even if the previous one read the alert
- [x] Clave única por destinatario y traspaso de ida y vuelta (A → B → A) sin conflicto — `api/prisma-follow-up.integration` › deduplicates per recipient and moves alerts back and forth without conflicts

## Reglas de `CLAUDE.md`
- [x] Tipos de interacción `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `OTHER` (otro valor → 400) — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › interaction visibility and validation › rejects a note longer than 2000 characters and an invalid type
- [x] "Sin seguimiento" = Y días desde max(última interacción, último `sentAt`) — `shared/rules/follow-up.test.ts` › follow-up rules › uses the latest of the last interaction and the last send
- [x] "Próxima a vencer" = hoy ≥ `expiresAt` − X y hoy ≤ `expiresAt` — `shared/rules/follow-up.test.ts` › follow-up rules › flags quotes expiring within X days, including the expiry day
- [x] Las alertas las recibe el dueño sea cual sea su rol — `api/modules/follow-up/application/follow-up-use-cases.test.ts` › RunFollowUpAlertsUseCase › uses clock.today() and the X/Y days from the settings
- [x] Al reasignar, las no leídas pasan al nuevo dueño — `api/modules/follow-up/presentation/follow-up.routes.test.ts` › notifications › moves unread notifications to the new owner when the quote is reassigned
- [x] Deduplicación por cotización + tipo + fecha de referencia — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › inserts alerts idempotently and opens a new cycle after an interaction
- [x] El job omite dueños inactivos — `api/modules/follow-up/infrastructure/prisma-follow-up.integration.test.ts` › Prisma follow-up (integration) › skips inactive owners and quotes that are not sent
- [x] Jobs diarios en `America/Bogota` (00:05 y 07:00), idempotentes, con pasada de recuperación al arrancar — `api/core/scheduler/scheduler.test.ts` › startScheduler › registers the jobs and runs the recovery pass expire first, then alerts
- [x] Las notificaciones se guardan como tipo + parámetros y el front las traduce — `web/features/notifications/components/notifications.test.tsx` › NotificationsPage › renders texts with their markers and dims resolved quotes
- [ ] Con varias instancias, el cron corre en cada una y el advisory lock evita el doble procesamiento (deuda conocida) — manual, pendiente
