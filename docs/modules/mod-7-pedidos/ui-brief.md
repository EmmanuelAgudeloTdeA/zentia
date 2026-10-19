# M7 Pedidos – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-06, RN-29, RN-30), `docs/design/design-system.md`. Formato de moneda, fechas, estados de carga, vacío y error, idiomas y tono: ver las **Reglas** del sistema de diseño; aquí solo se indica lo propio del módulo.

## Depende de
| Módulo | Qué necesita la interfaz |
|---|---|
| M0 · H0.3 | Layout privado con navegación extensible, i18n |
| M1 · H1.2 | Rol y alcance (por el dueño de la cotización de origen) |
| M4 | `QuoteDetailPage`, donde vive "Convertir en pedido"; acciones permitidas de la cotización |
| Sistema de diseño | `DataTable`, `StatusBadge` (estados de pedido), `FilterChip`, `Dialog`, `TotalsSummary`, `Alert`, `Toast`, `EmptyState` |

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega | Hito |
|---|---|---|---|
| Convertir en pedido (acción en el detalle de la cotización) | Dueño de la cotización, `MANAGER`, `ADMIN` | Detalle de una cotización Aprobada | H7.1 · S7.1.1 |
| Pedidos (lista) | Todos los roles, con su alcance | Entrada "Pedidos" de la navegación | H7.2 · S7.2.1 |
| Detalle del pedido | Todos los roles, con su alcance | Desde la lista, desde la cotización de origen o tras convertir | H7.1 · S7.1.2, H7.2 · S7.2.1, S7.2.2 |
| Diálogo "Cancelar pedido" | Dueño de la cotización, `MANAGER`, `ADMIN` | Botón "Cancelar pedido" del detalle | H7.2 · S7.2.2 |

---

## 1. Convertir en pedido (S7.1.1)
Botón secundario en la zona de acciones de `QuoteDetailPage`.

**Datos:** si la cotización ya tiene pedido, en lugar del botón se muestra "Ver pedido PED-0012" con el `StatusBadge` del pedido.

**Acciones**
| Acción | Rol | Condición |
|---|---|---|
| Convertir en pedido | Dueño, `MANAGER`, `ADMIN` | Cotización Aprobada sin pedido |
| Ver pedido | Quien ve la cotización | La cotización tiene pedido (aunque esté cancelado) |

Confirmación en `Dialog` `sm`: "Se creará el pedido PED-0012 con las líneas y valores aprobados. Una cotización solo puede tener un pedido." Botones "Cancelar" y "Convertir en pedido".

**Estados**
- Cargando: botón en estado de carga; impide el doble clic.
- Error: `QUOTE_NOT_APPROVED` u `ORDER_ALREADY_EXISTS` en el modal; al cerrar se recarga la cotización (aparece "Ver pedido" si ya existía).
- Sin permiso: el botón no se muestra.
- Éxito: navega al detalle del pedido con toast "Pedido PED-0012 creado."

---

## 2. Pedidos (S7.2.1)
`PageHeader` "Pedidos". Debajo, `Alert` `info` fijo: "Los pedidos no mueven inventario ni generan facturas."

**Datos (`DataTable`):** número (`PED-0012`, `mono`), cotización de origen (`COT-0012`, enlace), cliente, dueño (solo `MANAGER` y `ADMIN`), total, fecha de creación, estado (`StatusBadge` de pedido). Orden por defecto: más reciente primero. En móvil, tarjetas con número, estado, cliente y total.

**Filtros:** `FilterChip` por estado (Todos, Pendiente, En proceso, Entregado, Cancelado) con contador; búsqueda por número o cliente.

**Acciones**
| Acción | Rol |
|---|---|
| Abrir detalle (fila) | Todos, dentro de su alcance |
| Filtrar y buscar | Todos |

No hay botón "Nuevo pedido": los pedidos solo nacen de una cotización.

**Estados**
- Cargando: filas esqueleto.
- Vacío: "Aún no hay pedidos. Se crean desde una cotización aprobada." (sin botón). Con filtros: "Ningún pedido coincide con los filtros." + "Limpiar filtros".
- Error: `Alert` `danger` con "Reintentar".
- Sin permiso: un `SELLER` solo ve los pedidos de sus cotizaciones; no hay indicación de los demás.
- Éxito: no aplica (solo lectura).

---

## 3. Detalle del pedido (S7.1.2, S7.2.1, S7.2.2)
`PageHeader` con "Volver", número `PED-0012` y `StatusBadge`; acciones a la derecha.

**Datos**
- Encabezado: cotización de origen (enlace), cliente, dueño actual, fecha de creación.
- Fechas por estado: creado, en proceso, entregado o cancelado (`DD/MM/AAAA HH:mm`); solo las que ya ocurrieron. Si está cancelado, el motivo (o "Sin motivo").
- Líneas (`DataTable` sin acciones): producto, categoría, precio sin IVA, tarifa IVA, cantidad, valor.
- `TotalsSummary` de solo lectura: subtotal, descuento (% y valor), IVA de líneas, envío, IVA del envío, total.
- `Alert` `info`: "Los pedidos no mueven inventario ni generan facturas."

**Acciones**
| Acción | Rol | Estado del pedido |
|---|---|---|
| Iniciar proceso (primaria) | Dueño de la cotización, `MANAGER`, `ADMIN` | Pendiente |
| Marcar como entregado (primaria) | Dueño de la cotización, `MANAGER`, `ADMIN` | En proceso |
| Cancelar pedido (`danger-outline`) | Dueño de la cotización, `MANAGER`, `ADMIN` | Pendiente o En proceso |
| Ver cotización de origen | Todos con acceso | Cualquiera |

**Estados**
- Cargando: esqueleto del encabezado, de las líneas y de los totales.
- Error: `ORDER_NOT_FOUND` → página "No encontramos este pedido." con enlace a la lista. Error de acción: toast de error. `ORDER_CONFLICT`: `Alert` `warning` "Este pedido cambió mientras lo veías." + "Recargar".
- Sin permiso: las acciones no se muestran; un `SELLER` que entra por URL a un pedido ajeno ve la página de no encontrado.
- Éxito: el badge cambia de inmediato y toast "Pedido PED-0012 en proceso." / "Pedido PED-0012 entregado."

---

## 4. Diálogo "Cancelar pedido" (S7.2.2)
`Dialog` `sm`. Texto: "El pedido PED-0012 quedará cancelado. La cotización COT-0012 seguirá Aprobada y no se podrá convertir otra vez."

**Campos**
| Campo | Control | Obligatorio | Validación visible |
|---|---|---|---|
| Motivo | `TextArea` con contador 0/500 | No | Máximo 500 caracteres |

**Acciones:** "Volver" (secundaria, foco inicial) y "Cancelar pedido" (`danger`). Rol: dueño de la cotización, `MANAGER`, `ADMIN`.

**Estados:** cargando en el botón; error dentro del modal; éxito: cierra, badge Cancelado y toast "Pedido PED-0012 cancelado."

---

## Flujos
1. Detalle de cotización Aprobada → "Convertir en pedido" → confirmar → detalle del pedido.
2. Pedidos → fila → detalle del pedido → "Iniciar proceso" → "Marcar como entregado".
3. Detalle del pedido → "Cancelar pedido" → diálogo → pedido Cancelado.
4. Detalle del pedido → "Ver cotización de origen" → detalle de la cotización (con "Ver pedido").

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Solo desde Aprobada (RN-29) | "Convertir en pedido" solo aparece en cotizaciones Aprobadas sin pedido. |
| Un pedido por cotización, sin reconversión (decisión 63) | Con pedido, aunque esté cancelado, se muestra "Ver pedido" y nunca "Convertir". |
| Transiciones (RN-30) | Pendiente: Iniciar proceso y Cancelar. En proceso: Marcar como entregado y Cancelar. Entregado y Cancelado: sin acciones. |
| Snapshot (S7.1.2) | Las líneas y totales del pedido son de solo lectura y no cambian con el catálogo; no se muestran avisos de producto inactivo. |
| Dueño = dueño actual de la cotización (decisiones 147–153) | Tras una reasignación, el pedido aparece en la lista del nuevo dueño y desaparece de la del anterior. |
| Una Aprobada no se anula (RN-30) | En la cotización con pedido no hay "Anular"; la salida es cancelar el pedido. |
| Número `PED-` + número de la cotización | `PED-0012` siempre corresponde a `COT-0012`. |

## Vacíos detectados
| # | Vacío | Propuesta | ¿Bloquea? |
|---|---|---|---|
| G1 | "Marcar como entregado" lleva a un estado final y no pide confirmación (solo cancelar la exige, S7.2.2). | Confirmación ligera en `Dialog` `sm`: "El pedido quedará entregado y no se podrá cambiar." | No; tech plan de H7.2 |
| G2 | La lista no define filtro por vendedor para `MANAGER` y `ADMIN` (el endpoint solo filtra por estado y texto). | Mantener solo estado y búsqueda en el MVP; la columna Dueño basta para identificar. | No |
| G3 | No se define el orden de "Convertir en pedido" frente a "Duplicar" en una Aprobada. | "Convertir en pedido" como acción primaria de una Aprobada sin pedido; "Duplicar" como secundaria. | No; UI brief de M4 |
