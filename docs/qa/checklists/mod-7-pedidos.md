# Checklist de QA – M7 Pedidos

## Depende de
- `docs/modules/mod-7-pedidos/epics.md` (criterios de aceptación de S7.1.1 a S7.2.2).
- `CLAUDE.md` (reglas críticas de pedidos, alcance por rol, dinero y API que aplican a M7).

## Estado
Criterios cubiertos por pruebas unitarias, de rutas (memoria) y de front. Las pruebas de integración con PostgreSQL (`prisma-order.integration.test.ts`) se citan, pero solo corren con `TEST_DATABASE_URL`. La atomicidad de la copia se apoya en un único `order.create` con `items.create` anidado; no tiene prueba propia.

Rutas de prueba usadas:
- `order.test.ts` = `apps/api/src/modules/orders/domain/order.test.ts`
- `orders.routes.test.ts` = `apps/api/src/modules/orders/presentation/orders.routes.test.ts`
- `prisma-order.integration.test.ts` = `apps/api/src/modules/orders/infrastructure/prisma-order.integration.test.ts`
- `app.test.ts` = `apps/api/src/app.test.ts`
- `orders.test.tsx` = `apps/web/src/features/orders/components/orders.test.tsx`

## S7.1.1 Convertir cotización aprobada
- [x] S7.1.1.1 `POST /quotes/:id/order` crea el pedido en `PENDING` desde una `APPROVED` — orders.routes.test.ts › orders routes › converts an approved quote once, copying its totals
- [x] S7.1.1.1 Otro estado responde 409 `QUOTE_NOT_APPROVED` — orders.routes.test.ts › orders routes › rejects quotes that are not approved
- [x] S7.1.1.1 Un `MANAGER` convierte la cotización de otro vendedor — orders.routes.test.ts › orders routes › lets a manager convert and move the order of another seller
- [x] S7.1.1.2 Con pedido existente (incluso cancelado) responde 409 `ORDER_ALREADY_EXISTS` — orders.routes.test.ts › orders routes › converts an approved quote once, copying its totals; orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes
- [x] S7.1.1.2 Un solo pedido por cotización bajo concurrencia (`Order.quoteId` único) — prisma-order.integration.test.ts › PrismaOrderRepository (integration) › allows a single order per quote under concurrency and maps decimals
- [x] S7.1.1.3 Cotización ajena para un `SELLER` responde 404 `QUOTE_NOT_FOUND` — orders.routes.test.ts › orders routes › hides foreign quotes and orders from another seller
- [x] S7.1.1.4 "Convertir en pedido" con confirmación y navegación al pedido creado — orders.test.tsx › QuoteOrderAction › converts an approved quote and opens the order
- [x] S7.1.1.4 Con pedido existente, enlace "Ver pedido" en lugar de convertir — orders.test.tsx › QuoteOrderAction › links to the existing order instead of converting again; orders.routes.test.ts › orders routes › converts an approved quote once, copying its totals
- [x] S7.1.1.4 Error de conversión visible (`errors.ORDER_ALREADY_EXISTS`) y recarga de la cotización al cerrar — orders.test.tsx › QuoteOrderAction › shows the conversion error and reloads the quote on close
- [x] S7.1.1.4 Si falla la consulta del pedido, se ofrece el enlace a la lista de pedidos — orders.test.tsx › QuoteOrderAction › falls back to the orders list when the order cannot be loaded

## S7.1.2 Snapshot de líneas y valores
- [x] S7.1.2.1 Copia líneas (precio, cantidad), `discountPct` y `total` — orders.routes.test.ts › orders routes › converts an approved quote once, copying its totals
- [x] S7.1.2.1 Copia categoría, tarifa de IVA y `linesVat` — orders.routes.test.ts › orders routes › keeps the snapshot of category, VAT and totals after the product changes
- [x] S7.1.2.1 Decimales mapeados como `string` en el repositorio Prisma — prisma-order.integration.test.ts › PrismaOrderRepository (integration) › allows a single order per quote under concurrency and maps decimals
- [ ] S7.1.2.2 La copia ocurre en la misma transacción que crea el pedido (un solo `create` anidado) — manual, pendiente
- [x] S7.1.2.3 Cambios posteriores del catálogo no modifican el pedido — orders.routes.test.ts › orders routes › keeps the snapshot of category, VAT and totals after the product changes
- [x] S7.1.2.4 Número visible `PED-0001` para `COT-0001` — orders.routes.test.ts › orders routes › converts an approved quote once, copying its totals

## S7.2.1 Cambiar estado del pedido
- [x] S7.2.1.1 Transiciones `PENDING` → `IN_PROGRESS` → `DELIVERED` y cancelación; el resto se rechaza — order.test.ts › order status › %s → %s
- [x] S7.2.1.1 Transición inválida responde 409 `ORDER_INVALID_TRANSITION` — orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes
- [x] S7.2.1.2 Pedido ajeno para un `SELLER` responde 404 `ORDER_NOT_FOUND` (lectura y cambio de estado) — orders.routes.test.ts › orders routes › hides foreign quotes and orders from another seller; orders.routes.test.ts › orders routes › scopes orders by the current owner of the quote
- [x] S7.2.1.2 `MANAGER` cambia el estado del pedido de otro vendedor — orders.routes.test.ts › orders routes › lets a manager convert and move the order of another seller
- [x] S7.2.1.2 Al reasignar la cotización, el pedido pasa al alcance del nuevo dueño — orders.routes.test.ts › orders routes › scopes orders by the current owner of the quote
- [x] S7.2.1.3 Guarda `inProgressAt` y `deliveredAt` — orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes; orders.routes.test.ts › orders routes › lets a manager convert and move the order of another seller
- [x] S7.2.1.3 `updatedAt` distinto responde 409 `ORDER_CONFLICT` — orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes; prisma-order.integration.test.ts › PrismaOrderRepository (integration) › updates the status only with the expected updatedAt and enforces the reason CHECK
- [x] S7.2.1.3 El front muestra el conflicto una sola vez, en línea, con "Recargar" — orders.test.tsx › OrderDetailPage › shows a conflict once, inline, with a reload action
- [x] S7.2.1.3 Un error de "Iniciar proceso" se muestra una sola vez (sin toast duplicado) — orders.test.tsx › OrderDetailPage › shows an action error only once
- [x] S7.2.1.4 `GET /orders` filtra por estados en CSV, busca por cliente y pagina (`total`, `pageSize`) — orders.routes.test.ts › orders routes › filters by status CSV, searches by customer name and paginates
- [x] S7.2.1.4 `GET /orders` busca por número `PED-0001` con alcance — orders.routes.test.ts › orders routes › scopes orders by the current owner of the quote
- [x] S7.2.1.4 La lista envía los chips de estado como CSV, la búsqueda y la página — orders.test.tsx › OrdersListPage › sends the status chips as CSV, the search and the page to the API
- [x] S7.2.1.4 El detalle muestra acciones permitidas e inicia el proceso — orders.test.tsx › OrderDetailPage › shows the actions allowed and starts processing
- [x] S7.2.1 "Marcar como entregado" pide confirmación — orders.test.tsx › OrderDetailPage › asks for confirmation before marking as delivered
- [ ] S7.2.1.4 Revisión visual del detalle (líneas, totales, fechas y cotización de origen) en escritorio y móvil — manual, pendiente

## S7.2.2 Cancelar pedido
- [x] S7.2.2.1 Cancelar desde `IN_PROGRESS` con motivo; desde un estado final responde 409 `ORDER_INVALID_TRANSITION` — orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes
- [x] S7.2.2.1 Motivo de 501 caracteres responde 400 `VALIDATION_ERROR`; sin motivo se permite — orders.routes.test.ts › orders routes › sets cancelledAt and limits the reason to 500 characters
- [x] S7.2.2.2 Guarda `cancelledAt` y `cancelReason` — orders.routes.test.ts › orders routes › sets cancelledAt and limits the reason to 500 characters; orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes
- [x] S7.2.2.2 La BD exige coherencia entre `cancelReason` y el estado (CHECK) — prisma-order.integration.test.ts › PrismaOrderRepository (integration) › updates the status only with the expected updatedAt and enforces the reason CHECK
- [x] S7.2.2.3 La cotización sigue `APPROVED` y no se reconvierte — orders.routes.test.ts › orders routes › moves through the states, records reasons and rejects stale or invalid changes
- [x] S7.2.2.4 El front pide confirmación y envía el motivo opcional — orders.test.tsx › OrderDetailPage › cancels with an optional reason after confirmation
- [x] S7.2.2.4 Cerrar el diálogo de cancelación limpia el error — orders.test.tsx › OrderDetailPage › clears the action error when the cancel dialog is closed

## Reglas críticas de CLAUDE.md
- [x] Acciones derivadas del estado (`allowedActions` del pedido) — order.test.ts › order status › derives the available actions
- [x] El pedido no mueve inventario ni factura: aviso visible en el detalle — orders.test.tsx › OrderDetailPage › shows the actions allowed and starts processing
- [x] Rutas documentadas en OpenAPI (`/quotes/{id}/order`, `/orders`, `/orders/{id}`, `/orders/{id}/status`) — app.test.ts › API base › serves the OpenAPI document when docs are enabled
- [ ] Prueba de punta a punta del flujo cotización aprobada → pedido → entregado en staging — manual, pendiente
