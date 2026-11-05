# Checklist de QA – M8 Dashboard

## Depende de
- `docs/modules/mod-8-dashboard/epics.md` (criterios de aceptación de S8.1.1 a S8.2.2).
- `CLAUDE.md` (reglas de indicadores del dashboard, alcance por rol y dinero como `string`).
- M9 (bloque "Mayor probabilidad de cierre" y estado de calibración como `DashboardSection`).

## Estado
Auditoría de M8 aplicada en la rama `mod-9-ia-auditoria`: la página se carga de forma diferida, los filtros se reinician al cambiar de sesión, el selector de vendedor tiene la opción "Todos" y las tarjetas de cohorte abren la lista de cotizaciones con el mismo estado, período (`firstSentAt`) y vendedor para que los conteos coincidan. Las pruebas de integración (`*.integration.test.ts`) se citan, pero solo corren con `TEST_DATABASE_URL` y no se ejecutaron en esta auditoría.

Rutas de prueba usadas:
- `dashboard.routes.test.ts` = `apps/api/src/modules/dashboard/presentation/dashboard.routes.test.ts`
- `prisma-dashboard.integration.test.ts` = `apps/api/src/modules/dashboard/infrastructure/prisma-dashboard.integration.test.ts`
- `ai.routes.test.ts` = `apps/api/src/modules/ai/presentation/ai.routes.test.ts`
- `dashboard.test.ts` = `packages/shared/src/rules/dashboard.test.ts`
- `conversion-rate.test.ts` = `packages/shared/src/calc/conversion-rate.test.ts`
- `dashboard-page.test.tsx` = `apps/web/src/features/dashboard/components/dashboard-page.test.tsx`

## S8.1.1 Conteo por estado
- [x] S8.1.1.1 `current.active` y `current.pendingFollowUp` en la respuesta de `GET /api/dashboard/summary` — dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate
- [x] S8.1.1.1 Activas = `SENT` y pendientes con la regla de Y días de M6 (incluye contacto general sin cotización), sin filtro de período — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts active and pending follow-up by current state with the M6 rule
- [x] S8.1.1.1 Una cotización reactivada (`EXPIRED` → `SENT`) cuenta como activa y no como vencida — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts a reactivated quote (EXPIRED → SENT) as active, not as expired
- [x] S8.1.1.2 Aprobadas, rechazadas y vencidas de la cohorte por `firstSentAt` — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] S8.1.1.3 Los borradores no cuentan y las anuladas no entran en la cohorte — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] S8.1.1.4 Tarjetas con etiquetas de `lang/` y gráfico de cierres cargado de forma diferida — dashboard-page.test.tsx › DashboardPage › greets the user and shows the indicators with their universe
- [ ] S8.1.1.4 El gráfico de barras muestra los conteos correctos (recharts) — manual, pendiente

## S8.1.2 Montos cotizados frente a montos aprobados
- [x] S8.1.2.1 `quotedAmount` suma la cohorte sin anuladas — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] S8.1.2.2 `approvedAmount` suma la cohorte en `APPROVED` — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] S8.1.2.3 Sumas en SQL sobre `Decimal(15,0)` que viajan como `string` — dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate; prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [ ] S8.1.2.4 Montos en COP sin decimales en tarjetas y gráfico comparativo — manual, pendiente

## S8.1.3 Tasa de conversión sin anuladas
- [x] S8.1.3.1 Aprobadas / (aprobadas + rechazadas + vencidas) como `string` con 2 decimales — conversion-rate.test.ts › conversionRate › rounds half-up to 2 decimals and returns null without closed quotes; dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate
- [x] S8.1.3.2 Denominador 0 → `null` y el front muestra "Sin datos" — conversion-rate.test.ts › conversionRate › rounds half-up to 2 decimals and returns null without closed quotes; dashboard-page.test.tsx › DashboardPage › shows "Sin datos" when no quote closed in the period
- [x] S8.1.3.3 Excluye anuladas, borradores y enviadas abiertas — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts

## S8.1.4 Filtro por período
- [x] S8.1.4.1 Mes en curso por defecto y días de Bogotá convertidos a límites UTC — dashboard.test.ts › dashboard period › defaults to the current month and rejects invalid ranges; dashboard.test.ts › dashboard period › maps Bogota days to UTC bounds [from 05:00Z, to+1 05:00Z); dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate
- [x] S8.1.4.1 Bordes del período en hora de Bogotá en SQL — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] S8.1.4.2 `from > to` o más de 366 días responde 400 `DASHBOARD_INVALID_PERIOD` — dashboard.routes.test.ts › GET /api/dashboard/summary › lets managers filter by seller and rejects invalid periods
- [x] S8.1.4.2 El front traduce `DASHBOARD_INVALID_PERIOD` — dashboard-page.test.tsx › DashboardPage › translates an invalid period answered by the API
- [x] S8.1.4.3 El período no afecta activas ni pendientes y el front lo indica junto a esas tarjetas — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts active and pending follow-up by current state with the M6 rule; dashboard-page.test.tsx › DashboardPage › greets the user and shows the indicators with their universe
- [x] S8.1.4.4 Presets "Este mes", "Mes anterior", "Últimos 90 días" y "Personalizado" con validación — dashboard.test.ts › dashboard period › builds the presets, including the previous month in January; dashboard-page.test.tsx › DashboardPage › switches presets and validates the custom period before asking the API
- [x] S8.1.4.4 Recuerda la última elección al volver al tablero — dashboard-page.test.tsx › DashboardPage › remembers the preset after leaving and coming back

## S8.2.1 Alcance según rol
- [x] S8.2.1.1 Un `SELLER` solo ve sus cotizaciones aunque envíe otro `ownerId` — dashboard.routes.test.ts › GET /api/dashboard/summary › limits a seller to their own quotes even if they send another owner
- [x] S8.2.1.2 `MANAGER` y `ADMIN` ven todas (`scope.ownerId = null`) — dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate
- [ ] S8.2.1.3 El dashboard es la página de inicio (`/`) de los tres roles — manual, pendiente

## S8.2.2 Filtro por vendedor
- [x] S8.2.2.1 `ownerId` solo para `MANAGER` y `ADMIN`; un `SELLER` lo ignora — dashboard.routes.test.ts › GET /api/dashboard/summary › lets managers filter by seller and rejects invalid periods; dashboard.routes.test.ts › GET /api/dashboard/summary › limits a seller to their own quotes even if they send another owner
- [x] S8.2.2.2 El selector usa `GET /users/options` y tiene la opción "Todos" para volver a todos los vendedores — dashboard-page.test.tsx › DashboardPage › filters by a seller and returns to all sellers with the "Todos" option
- [x] S8.2.2.3 El filtro aplica también a los indicadores del estado actual y a la cohorte — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts active and pending follow-up by current state with the M6 rule; prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › filters the period stats by owner
- [x] S8.2.2.3 El bloque de mayor probabilidad respeta el vendedor elegido — ai.routes.test.ts › probabilities and calibration › ranks the top 5 sent quotes by probability with the dashboard scope

## Auditoría (decisiones del usuario y correcciones)
- [x] Una tarjeta de cohorte abre la lista con el mismo estado, período y vendedor — dashboard-page.test.tsx › DashboardPage › opens a cohort card with the same status, period and seller as the dashboard
- [x] "Activas" abre la lista solo por estado `SENT`, sin período — dashboard-page.test.tsx › DashboardPage › opens the active quotes by current state, without the period
- [x] Los filtros se reinician al cambiar el usuario de la sesión (logout o expiración) — dashboard-page.test.tsx › DashboardPage › resets the filters when the session user changes
- [x] Estado vacío global con acción "Nueva cotización" cuando nunca se envió nada — dashboard-page.test.tsx › DashboardPage › shows the global empty state when nothing was ever sent
- [ ] La página del tablero llega en un chunk aparte (`React.lazy`) y muestra el esqueleto mientras carga — manual, pendiente

## Tarjetas que abren el listado con los filtros de su número
- [x] "Monto aprobado", "Monto cotizado" y "Pendientes de seguimiento" abren la lista con estado, período, vendedor y pendientes — `web/dashboard-page` › opens "%s" in the list with the filters behind its number
- [x] El listado filtra las pendientes con la misma regla del tablero (M6, días de Bogotá) — `api/quote-use-cases` › lists only the sent quotes pending follow-up after Y days, like the dashboard (M6); `api/prisma-quote.integration` › lists sent quotes pending follow-up with the M6 rule in Bogota days; `api/quotes.routes` › accepts followUp=pending and rejects other values
- [x] Chip "Pendientes de seguimiento" removible en la lista — `web/quotes` › sends followUp=pending with a removable chip
- [x] Los diálogos (p. ej., convertir en pedido) quedan sobre todo el contenido — `apps/web/src/shared/ui/dialog.test.tsx` › portals Dialog to document.body even inside an isolated header; › portals ConfirmDialog to document.body

## Reglas críticas de CLAUDE.md
- [x] Activa = Enviada; los borradores no cuentan — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts active and pending follow-up by current state with the M6 rule
- [x] Pendientes de seguimiento = Enviadas que cumplen la regla de Y días — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts active and pending follow-up by current state with the M6 rule
- [x] "Activas" y "pendientes" reflejan el estado actual, sin período — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts a reactivated quote (EXPIRED → SENT) as active, not as expired
- [x] Conteos, montos y conversión filtrados por `firstSentAt` — prisma-dashboard.integration.test.ts › PrismaDashboardReadRepository (integration) › counts the cohort by firstSentAt, excluding drafts and voided amounts
- [x] Conversión = aprobadas / (aprobadas + rechazadas + vencidas) — conversion-rate.test.ts › conversionRate › rounds half-up to 2 decimals and returns null without closed quotes
- [x] Montos como `string` en la API — dashboard.routes.test.ts › GET /api/dashboard/summary › returns the current month by default with amounts as strings and the conversion rate
- [x] Textos del tablero desde `lang/`, con paridad `es`/`en` — apps/web/src/lang/lang-parity.test.ts › web lang/ › es and en have the same keys
