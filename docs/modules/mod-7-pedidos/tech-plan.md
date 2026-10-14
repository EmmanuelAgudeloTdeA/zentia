# M7 Pedidos – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §5; base de M0, M1 y M4.

## 1. Entidades Prisma
```prisma
enum OrderStatus { PENDING IN_PROGRESS DELIVERED CANCELLED }

model Order {
  id             String      @id @default(uuid()) @db.Uuid
  quoteId        String      @unique @db.Uuid      // un pedido por cotización, sin reconversión
  quote          Quote       @relation(fields: [quoteId], references: [id])
  status         OrderStatus @default(PENDING)
  discountPct    Decimal     @db.Decimal(5, 2)
  discountAmount Decimal     @db.Decimal(15, 0)
  subtotal       Decimal     @db.Decimal(15, 0)
  linesVat       Decimal     @db.Decimal(15, 0)
  shippingAmount Decimal     @db.Decimal(15, 0)
  shippingVat    Decimal     @db.Decimal(15, 0)
  total          Decimal     @db.Decimal(15, 0)
  inProgressAt   DateTime?
  deliveredAt    DateTime?
  cancelledAt    DateTime?
  cancelReason   String?     @db.VarChar(500)
  createdById    String      @db.Uuid
  createdBy      User        @relation(fields: [createdById], references: [id])
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  items          OrderItem[]

  @@index([status])
}

model OrderItem {
  id          String  @id @default(uuid()) @db.Uuid
  orderId     String  @db.Uuid
  order       Order   @relation(fields: [orderId], references: [id])
  productId   String  @db.Uuid
  position    Int
  productName String  @db.VarChar(150)
  category    String  @db.VarChar(80)
  unitPrice   Decimal @db.Decimal(15, 0)
  vatRate     VatRate
  quantity    Decimal @db.Decimal(12, 2)
  lineAmount  Decimal @db.Decimal(15, 0)

  @@index([orderId])
}
```
- El pedido no guarda dueño propio: el alcance se toma de `Quote.ownerId`, así una reasignación de la cotización (M4) también mueve el pedido.
- El número visible se deriva: `PED-` + `Quote.number` con al menos 4 dígitos. No hay secuencia propia.

## 2. Endpoints
Todas exigen autenticación y aplican el alcance sobre el dueño de la cotización de origen. Las mutaciones de estado exigen `updatedAt`.

| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/api/quotes/:id/order` | Dueño, `MANAGER`, `ADMIN` | — | 201 `OrderDto` | 404 `QUOTE_NOT_FOUND`; 409 `QUOTE_NOT_APPROVED`, `ORDER_ALREADY_EXISTS` |
| GET | `/api/orders` | Todos (alcance) | query `{ status?[], q? (número o cliente), page=1, pageSize=20 }` | 200 `{ items: OrderSummaryDto[], total, page, pageSize }` | 400 |
| GET | `/api/orders/:id` | Todos (alcance) | — | 200 `OrderDto` | 404 `ORDER_NOT_FOUND` |
| POST | `/api/orders/:id/status` | Dueño, `MANAGER`, `ADMIN` | `{ to: 'IN_PROGRESS' \| 'DELIVERED' \| 'CANCELLED', reason?, updatedAt }` | 200 `OrderDto` | 400 `VALIDATION_ERROR`; 404 `ORDER_NOT_FOUND`; 409 `ORDER_INVALID_TRANSITION`, `ORDER_CONFLICT` |

- `OrderSummaryDto = { id, displayNumber, status, quote: { id, displayNumber }, customer: { id, name }, owner: { id, name }, total, createdAt }`
- `OrderDto = OrderSummaryDto + { items: OrderItemDto[], discountPct, discountAmount, subtotal, linesVat, shippingAmount, shippingVat, inProgressAt, deliveredAt, cancelledAt, cancelReason, allowedActions[], updatedAt }`
- `allowedActions ⊆ { startProgress, deliver, cancel }`

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `ConvertQuoteToOrderUseCase` | `QuoteReader` (M4), `OrderRepository`, `UnitOfWork` | Valida `APPROVED` y alcance; copia el snapshot; `ORDER_ALREADY_EXISTS` también ante la violación del `unique` (concurrencia) |
| `ChangeOrderStatusUseCase` | `OrderRepository`, `Clock` | Tabla de transiciones; fechas por estado; concurrencia optimista |
| `ListOrdersUseCase`, `GetOrderUseCase` | `OrderRepository` | Filtro de alcance por `quote.ownerId` |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `OrderRepository` | `create(snapshot)`, `findById`, `list(filter)`, `updateStatus` | `PrismaOrderRepository` (mapper de decimales) |
| `QuoteReader` | `getApprovedSnapshot(id, actor)` | M4 |
| `AllowedActionsContributor` | M7 aporta `convertToOrder` (si la cotización es `APPROVED`, el actor puede editarla y no tiene pedido) y `viewOrder` (si ya tiene) | Punto de extensión de M4 |

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `OrdersListPage` (`/orders`) | Filtro por estado, búsqueda, paginación |
| Pantalla | `OrderDetailPage` (`/orders/:id`) | Encabezado (número, estado, cotización de origen, cliente, dueño), líneas, totales, fechas por estado, acciones |
| Componente | `ConvertToOrderButton` (en `QuoteDetailPage`) | Visible con `convertToOrder`; con `viewOrder` muestra el enlace al pedido |
| Componente | `OrderStatusBadge`, `CancelOrderDialog` | Estado y cancelación con motivo opcional |
| Store | `features/orders/store/orders-filters.store.ts` | Filtros y página |
| Service | `features/orders/services/orders.service.ts` | `convert`, `list`, `get`, `changeStatus` |

## 5. Claves de `lang/` (front)
- `nav.orders`
- `orders.title`, `orders.number`, `orders.sourceQuote`, `orders.customer`, `orders.owner`, `orders.total`, `orders.filters.status`, `orders.filters.search`
- `orders.dates.inProgressAt`, `orders.dates.deliveredAt`, `orders.dates.cancelledAt`, `orders.cancelReason`
- `orders.actions.convert`, `orders.actions.view`, `orders.actions.startProgress`, `orders.actions.deliver`, `orders.actions.cancel`, `orders.cancel.title`, `orders.cancel.reason`, `orders.cancel.confirm`
- `orders.noInventoryNotice`
- `enums.OrderStatus.PENDING`, `.IN_PROGRESS`, `.DELIVERED`, `.CANCELLED`
- `errors.QUOTE_NOT_APPROVED`, `errors.ORDER_ALREADY_EXISTS`, `errors.ORDER_NOT_FOUND`, `errors.ORDER_INVALID_TRANSITION`, `errors.ORDER_CONFLICT`

## 6. Reglas de negocio
**Transiciones (RN-30)**
| Desde \ Hacia | IN_PROGRESS | DELIVERED | CANCELLED |
|---|---|---|---|
| PENDING | ✓ (`inProgressAt`) | — | ✓ (`cancelledAt`, `cancelReason?`) |
| IN_PROGRESS | — | ✓ (`deliveredAt`) | ✓ |
| DELIVERED, CANCELLED | — | — | — |

**Conversión**
| Regla | Fuente |
|---|---|
| Solo desde `APPROVED` | RN-29 |
| Un pedido por cotización, sin reconversión (`quoteId` único) | Decisión 63 |
| Snapshot completo de líneas y totales en la misma transacción | RN-29 |
| Quién convierte y cambia estados: quien puede editar la cotización de origen | Decisión 22 |
| No mueve inventario ni factura | RN-30 |

**Número visible:** `PED-` + `lpad(Quote.number, 4, '0')`.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `order-status.spec` | Unitaria (dominio) | Las 12 combinaciones de la tabla de transiciones |
| `convert-quote.use-case.spec` | Unitaria (fakes) | Solo `APPROVED`; `ORDER_ALREADY_EXISTS` aunque esté cancelado; alcance |
| `order.repository.spec` | Integración (Postgres) | `unique` de `quoteId` con dos conversiones concurrentes; snapshot igual a la cotización; mapper de decimales |
| `orders.routes.spec` | Supertest | Alcance por dueño de la cotización (incluida una reasignación), `ORDER_CONFLICT`, códigos de cada ruta |
| `order-detail.spec`, `convert-button.spec` | Testing Library | Acciones según `allowedActions`, confirmación al cancelar, enlace al pedido existente |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 147–153) |
|---|---|
| Número del pedido | Se deriva del número de la cotización (`PED-0001`), sin secuencia propia, porque la relación es 1:1. |
| Dueño del pedido | No se guarda; se usa el dueño actual de la cotización, así la reasignación de M4 también mueve el pedido. |
| Motivo de cancelación | Opcional; las fuentes no lo exigen. |
| Conversión manual | La conversión es una acción explícita del usuario ("Convertir en pedido"), no ocurre al aprobar; "automática" en el PPI se refiere a no volver a digitar los datos. |
| Pedido de una cotización cancelada | La cotización queda `APPROVED` sin posibilidad de reconversión; si el negocio se retoma, se duplica la cotización (M4). |
