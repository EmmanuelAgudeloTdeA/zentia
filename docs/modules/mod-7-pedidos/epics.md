# M7 Pedidos – Épicas

> Fuentes: `docs/fuente/desglose.md` (M7; decisiones 22, 61, 63, 120, 125, 136, 147–153), `CLAUDE.md`, `docs/prd.md` (RF-06, RN-29, RN-30), `docs/architecture.md` §5.

## Objetivo
Convertir una cotización aprobada en un pedido sin volver a digitar la información, y seguir su estado hasta la entrega o la cancelación. El pedido no mueve inventario ni factura.

**Cubre:** RF-06 (conversión de cotización a pedido).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | Registro de módulos, errores, OpenAPI, `UnitOfWork` |
| M1 · H1.2 | Guard y política de alcance (`scopeFilter` sobre el dueño de la cotización de origen) |
| M4 | `QuoteReader.getApprovedSnapshot(id, actor)` (líneas y totales de una `APPROVED`), `AllowedActionsContributor` para la acción `convertToOrder`, `Quote.ownerId` para el alcance |

## Lo desbloquea
| Módulo | Qué necesita de M7 |
|---|---|
| — | Ningún módulo depende de M7 (decisión: M7 sale de la cadena hacia M8). |

---

## H7.1 Conversión
**Objetivo:** crear el pedido a partir de una cotización aprobada, con una copia fija de sus líneas y valores.
**Depende de:** M4.

### S7.1.1 Convertir cotización aprobada
Como vendedor, quiero convertir una cotización aprobada en un pedido con un clic, para no repetir la información del cliente.
- **RF de origen:** RF-06.1, RN-29, decisión 63
- **Criterios de aceptación:**
  1. `POST /api/quotes/:id/order` (dueño de la cotización, `MANAGER` o `ADMIN`) crea un pedido en `PENDING` solo desde una cotización `APPROVED`; otro estado responde 409 `QUOTE_NOT_APPROVED`.
  2. Si la cotización ya tiene pedido (aunque esté cancelado) responde 409 `ORDER_ALREADY_EXISTS`: no hay reconversión.
  3. Una cotización ajena para un `SELLER` responde 404 `QUOTE_NOT_FOUND`.
  4. El detalle de la cotización muestra "Convertir en pedido" cuando la acción está permitida (`convertToOrder` en `allowedActions`) y, si ya tiene pedido, un enlace al pedido.
- **Depende de:** M4 (`QuoteReader`, `AllowedActionsContributor`)
- **Tamaño:** S

### S7.1.2 Snapshot de líneas y valores
Como gerente comercial, quiero que el pedido conserve exactamente las líneas y los valores aprobados, para que no cambie si después cambia el catálogo.
- **RF de origen:** RF-06.1, RN-29
- **Criterios de aceptación:**
  1. El pedido copia de la cotización: líneas (producto, nombre, categoría, precio, tarifa, cantidad, valor), `discountPct`, `discountAmount`, `subtotal`, `linesVat`, `shippingAmount`, `shippingVat` y `total`.
  2. La copia se hace en la misma transacción que crea el pedido.
  3. Cambios posteriores del catálogo o de la configuración no modifican el pedido.
  4. El número visible del pedido es `PED-` + el número de la cotización (por ejemplo, `PED-0001` para `COT-0001`).
- **Depende de:** S7.1.1
- **Tamaño:** S

---

## H7.2 Estados
**Objetivo:** seguir el pedido por sus estados con transiciones válidas.
**Depende de:** H7.1.

### S7.2.1 Cambiar estado del pedido
Como vendedor, quiero actualizar el estado del pedido, para saber si está pendiente, en proceso o entregado.
- **RF de origen:** RF-06.2, RN-30, decisión 22
- **Criterios de aceptación:**
  1. `POST /api/orders/:id/status` con `to` y `updatedAt` aplica `PENDING` → `IN_PROGRESS` → `DELIVERED`; cualquier otra transición responde 409 `ORDER_INVALID_TRANSITION`.
  2. Lo pueden hacer el dueño de la cotización de origen, `MANAGER` y `ADMIN`; un pedido ajeno para un `SELLER` responde 404 `ORDER_NOT_FOUND`.
  3. Se guarda la fecha de cada cambio (`inProgressAt`, `deliveredAt`); un `updatedAt` distinto responde 409 `ORDER_CONFLICT`.
  4. `GET /api/orders` (con alcance, filtro por estado y paginación) y `GET /api/orders/:id` muestran el pedido con sus líneas, totales, estado y cotización de origen.
- **Depende de:** S7.1.2
- **Tamaño:** M

### S7.2.2 Cancelar pedido
Como vendedor, quiero cancelar un pedido que no se va a entregar, para que su estado sea real sin anular la cotización aprobada.
- **RF de origen:** RF-06.2, RN-30
- **Criterios de aceptación:**
  1. `POST /api/orders/:id/status` con `to: CANCELLED` se permite desde `PENDING` o `IN_PROGRESS`, con `reason` opcional (hasta 500 caracteres); desde `DELIVERED` responde 409 `ORDER_INVALID_TRANSITION`.
  2. Guarda `cancelledAt` y `cancelReason`.
  3. La cotización de origen sigue `APPROVED` y no se puede volver a convertir (S7.1.1).
  4. El front pide confirmación antes de cancelar.
- **Depende de:** S7.2.1
- **Tamaño:** S
