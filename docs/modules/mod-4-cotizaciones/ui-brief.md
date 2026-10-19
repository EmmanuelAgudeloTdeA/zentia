# M4 Cotizaciones – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-02, RF-04, RF-11, RF-12; RN-04 a RN-28, RN-42), `CLAUDE.md` y `docs/design/design-system.md`. Este documento describe qué se ve y qué se puede hacer; el aspecto, los formatos (moneda, fechas, número `COT-0001`) y los estados genéricos de carga, vacío y error siguen las **Reglas** del sistema de diseño y no se repiten aquí.

## Depende de
| Módulo / documento | Qué necesita exactamente |
|---|---|
| `docs/design/design-system.md` | Componentes `DataTable`, `FilterChip`, `StatusBadge`, `Combobox`, `MoneyField`, `NumberField`, `DateField`, `TextArea`, `TotalsSummary`, `SectionCard`, `Dialog`, `Alert`, `Toast`, `Timeline`, `EmptyState`; reglas de formato y de estados |
| M0 · H0.3 | Layout privado, navegación por rol, i18n |
| M1 · H1.2, S1.3.2 | Rol del usuario en sesión; lista de usuarios activos para reasignar y filtrar por dueño |
| M2 · S2.2.3 | Límite de descuento por rol, días de vigencia, IVA del envío (lectura para la vista previa) |
| M3 · H3.1, H3.2 | Búsqueda de clientes activos y de productos activos con precio, categoría y tarifa IVA |
| M5 (posterior) | Aporta "Descargar PDF", "Abrir en WhatsApp" y "Abrir en correo" al detalle; este brief solo les reserva el lugar |

## Pantallas
| # | Pantalla | Quién la usa | Cuándo se llega | Historias |
|---|---|---|---|---|
| P1 | Listado de cotizaciones | Vendedor (solo las suyas), Gerente y Administrador (todas) | Entrada "Cotizaciones" de la navegación; botón "Volver" del detalle | S4.2.6 |
| P2 | Editor de cotización (nueva / editar) | Los tres roles, sobre cotizaciones que pueden editar | Botón "Nueva cotización" del encabezado o del listado; acción "Editar" del detalle; tras duplicar | S4.1.1–S4.1.5, S4.3.1, S4.3.2, S4.3.7 |
| P3 | Detalle de cotización | Los tres roles, según su alcance | Clic en una fila del listado; tras guardar en el editor; notificaciones (M6) | S4.2.1–S4.2.6, S4.3.5 |
| P4 | Diálogos de acción del detalle | Según la acción | Botones de acción de P3 | S4.2.1, S4.2.2, S4.2.4, S4.2.5, S4.3.6, S4.3.7 |

**El listado es una pantalla propia de M4** (`Cotizaciones`), separada del tablero. En la referencia la tabla aparece bajo los indicadores, pero M8 define el tablero como la página de inicio con indicadores y gráficos (S8.2.x); el listado no se duplica allí.

---

## P1 · Listado de cotizaciones (H4.2 Máquina de estados · S4.2.6 Ver estado y listado)

**Datos que muestra** (`DataTable`, 20 por página, ordenado por última modificación, más reciente primero):
| Columna | Contenido |
|---|---|
| Número | `COT-0001` en monoespaciada, enlace al detalle |
| Cliente | Nombre del cliente |
| Dueño | Nombre del dueño. **Solo Gerente y Administrador** (el vendedor solo ve las suyas) |
| Total | Monto COP a la derecha |
| Vence | Fecha de vencimiento; "—" en Borrador. En Enviada a 3 días o menos se acompaña de "Vence hoy" / "Vence en N días" |
| Estado | `StatusBadge` (solo lectura) |

**Filtros** (barra superior de la tabla, se recuerdan al volver del detalle):
- Chips de estado: Todas, Borrador, Enviada, Aprobada, Rechazada, Vencida, Anulada (selección múltiple).
- Buscar: texto libre por número o nombre de cliente.
- Cliente: `Combobox` de clientes.
- Dueño: `Combobox` de usuarios. **Solo Gerente y Administrador.**
- "Limpiar filtros" cuando hay alguno activo.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Nueva cotización | Todos | Abre P2 vacío |
| Abrir (clic en fila) | Todos | Abre P3 |

No hay acciones de estado en la fila (D6 del sistema de diseño).

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de 8 filas; los filtros siguen usables |
| Vacío sin filtros | "Aún no hay cotizaciones. Crea la primera para empezar." + "Nueva cotización" |
| Vacío con filtros | "Ninguna cotización coincide con los filtros." + "Limpiar filtros" |
| Error | `Alert` danger en lugar de la tabla con el error traducido + "Reintentar" |
| Sin permiso | No aplica: los tres roles acceden; el alcance se resuelve en los datos |
| Éxito | No aplica (pantalla de consulta) |

**Móvil:** cada fila es una tarjeta con número, estado, cliente, total y vencimiento.

---

## P2 · Editor de cotización (H4.1 Creación y cálculo · H4.3 Edición y versiones)

**Título:** "Nueva cotización" o "Editar COT-0012" + `StatusBadge`. Escritorio: formulario a la izquierda y `TotalsSummary` fijo a la derecha; móvil: total en barra fija inferior.

**Datos y campos**
| Sección (`SectionCard`) | Campo | Obligatorio | Validación visible |
|---|---|---|---|
| Cliente | Cliente (`Combobox`: nombre y documento; solo activos) | Sí | "Selecciona un cliente." Bloqueado (solo lectura) en una Enviada con la ayuda "El cliente no se puede cambiar en una cotización enviada." |
| Productos | Agregar producto (`Combobox`: nombre, categoría y precio sin IVA; solo activos; excluye los ya agregados) | Al menos 1 línea, máximo 100 | "Agrega al menos un producto." Al llegar a 100 se deshabilita con "Máximo 100 productos por cotización." |
| Productos | Tabla de líneas: producto, categoría, precio unitario sin IVA (solo lectura), tarifa IVA (solo lectura), cantidad (`NumberField`), valor de la línea (calculado), quitar | Cantidad: sí | Mayor que 0, hasta 2 decimales: "La cantidad debe ser mayor que 0." / "Máximo 2 decimales." |
| Condiciones | Descuento global % (`NumberField`) | No (defecto 0) | 0 a límite del rol, hasta 2 decimales. Ayuda siempre visible: "Tu límite: 10 %". Al superarlo: "Supera tu límite de descuento (10 %)." |
| Condiciones | Envío (`MoneyField`) | No | ≥ 0, sin decimales. Ayuda: "El envío incluye IVA del 19 %" o "El envío no incluye IVA", según el snapshot de la cotización |
| Totales (`TotalsSummary`) | Subtotal, descuento, IVA de líneas, envío, IVA del envío, total | — | Calculados en vivo; solo lectura |

Las líneas existentes conservan su precio original aunque el catálogo haya cambiado; las nuevas toman el precio vigente.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Guardar borrador / Guardar cambios | Dueño, Gerente, Administrador (si pueden editar) | Borrador: guarda y va a P3. Enviada: abre el diálogo "Lo que solicitó el cliente" |
| Cancelar | Todos | Vuelve a P3 o P1; pregunta "¿Descartar cambios?" si hay cambios |

**Diálogo "Lo que solicitó el cliente"** (S4.3.2, solo al guardar una Enviada): `TextArea` obligatorio, 1–1000 caracteres con contador; texto de contexto "Se creará la versión N con estos cambios." Acciones: "Cancelar" / "Guardar versión". Si no hubo cambios de contenido, no se crea versión y el toast dice "No hubo cambios que guardar."

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de las secciones (solo al editar) |
| Vacío | Tabla de líneas con "Aún no hay productos. Búscalos arriba para agregarlos."; totales en $0 |
| Error | En línea por campo; errores del servidor en `Alert` sobre el botón (producto o cliente inactivo con su nombre, producto repetido, límite de descuento); conflicto: `Alert` warning "Esta cotización cambió mientras la editabas." + "Recargar" |
| Sin permiso | Cotización no editable (Aprobada, Rechazada, Vencida, Anulada) o ajena para un vendedor: no se ofrece el enlace; por URL, el vendedor ve "Cotización no encontrada" y los demás vuelven a P3 con aviso |
| Éxito | Toast "Cotización COT-0012 guardada." o "Versión 3 guardada." y navegación a P3 |

---

## P3 · Detalle de cotización (S4.2.6 · S4.3.5 Historial unificado)

**Encabezado** (`PageHeader`): "Volver", `COT-0012`, `StatusBadge`, y a la derecha las acciones permitidas.

**Datos que muestra**
| Bloque | Contenido |
|---|---|
| Resumen | Cliente, dueño, creada el, primer envío, último envío, aprobada el (si aplica), vencimiento ("Vence el 23/10/2026", "Vence hoy" o "Venció el …"), versión actual |
| Motivo de anulación | Solo en Anulada: `Alert` neutro con el motivo |
| Líneas | Producto, categoría, cantidad, precio unitario sin IVA, tarifa IVA, valor de la línea (solo lectura) |
| Totales | `TotalsSummary` con los valores guardados |
| Historial | `Timeline` con versiones y eventos agrupados por operación (ver sistema de diseño) |

**Acciones** (se muestran solo las que el usuario puede ejecutar; la principal según el estado en botón primario, el resto secundarias o en "Más acciones"; "Anular" separada como `danger-outline`)
| Acción | Estado | Rol | Abre |
|---|---|---|---|
| Editar | Borrador, Enviada | Dueño, Gerente, Administrador | P2 |
| Marcar como enviada (principal en Borrador) | Borrador | Dueño, Gerente, Administrador | P4-a |
| Marcar como aprobada (principal en Enviada) / Marcar como rechazada | Enviada | Dueño, Gerente, Administrador | P4-b |
| Cambiar vencimiento | Enviada | Dueño, Gerente, Administrador | P4-c |
| Reasignar | Todos salvo Anulada | Gerente, Administrador | P4-d |
| Reactivar (principal en Vencida) | Vencida | Dueño, Gerente, Administrador | P4-e |
| Duplicar (principal en Aprobada y Rechazada) | Aprobada, Rechazada | Quien puede ver la cotización | P4-f |
| Anular | Borrador, Enviada | Dueño, Gerente, Administrador | P4-g |
| Descargar PDF, Abrir en WhatsApp, Abrir en correo | Definidas por M5 | — | — |

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto del resumen, líneas y tres nodos del historial |
| Vacío | Historial de un Borrador: "Aún no hay historial. Se registra desde el primer envío." |
| Error | `Alert` danger + "Reintentar"; el historial falla de forma independiente sin ocultar el resto |
| Sin permiso | Cotización ajena para un vendedor o inexistente: "Cotización no encontrada." + enlace a P1 |
| Éxito | Tras cada acción, toast con verbo en pasado ("COT-0012 marcada como aprobada."), badge y acciones actualizados y la nueva entrada visible en el historial |

---

## P4 · Diálogos de acción del detalle

Todos son `Dialog`; un conflicto de edición muestra dentro del diálogo "Esta cotización cambió. Recarga para ver la versión actual." + "Recargar".

| Diálogo | Historia | Campos (obligatorio · validación visible) | Texto de contexto | Botón |
|---|---|---|---|---|
| a. Marcar como enviada | S4.2.1, S4.2.3 | — | "Se usará cuando la enviaste por otro canal. Vencerá el DD/MM/AAAA y se guardará la versión 1." | "Marcar como enviada" |
| b. Aprobar / Rechazar | S4.2.1 | — | "COT-0012 quedará Aprobada (Rechazada) y ya no se podrá editar." | "Marcar como aprobada" / "Marcar como rechazada" (`danger` en rechazar) |
| c. Cambiar vencimiento | S4.2.4 | Nueva fecha (`DateField`) · sí · "Elige una fecha posterior a hoy." | Fecha actual de vencimiento | "Cambiar fecha" |
| d. Reasignar | S4.2.5 | Nuevo dueño (`Combobox` de usuarios activos, excluye al dueño actual) · sí · "Selecciona otro usuario." | Dueño actual; "Las notificaciones pendientes pasarán al nuevo dueño." (cuando exista M6) | "Reasignar" |
| e. Reactivar | S4.3.6 | Lo que solicitó el cliente (`TextArea`) · sí · 1–1000 caracteres; casilla "Actualizar precios al precio vigente" | Tabla de vista previa: producto, precio actual, precio vigente, diferencia; filas de productos inactivos con `Alert` warning "Producto inactivo: conserva su precio." Nueva fecha de vencimiento | "Reactivar" (ancho `lg`) |
| f. Duplicar | S4.3.7 | — | "Se creará un borrador nuevo con los precios vigentes del catálogo, a tu nombre." | "Duplicar" |
| g. Anular | S4.2.2 | Motivo (`TextArea`) · sí · 1–500 caracteres | "COT-0012 quedará anulada, conservará su número y no se podrá editar." | "Anular" (`danger`) |

**Tras duplicar:** se abre P2 con el borrador nuevo y, arriba, `Alert` warning con los productos omitidos por inactivos y, si aplica, "El descuento se dejó en 0 % porque superaba tu límite." Si el cliente está inactivo o todos los productos están inactivos, el diálogo muestra el error y no se crea nada.

**Aprobar con la vigencia vencida** (antes de que el sistema la marque): el diálogo muestra "Esta cotización ya venció. Reactívala para continuar." y no se aprueba.

---

## Flujos
- Crear: P1 o encabezado → "Nueva cotización" → P2 → "Guardar borrador" → P3 (Borrador).
- Enviar manual: P3 (Borrador) → "Marcar como enviada" → P4-a → P3 (Enviada, versión 1 en el historial).
- Editar borrador: P3 → "Editar" → P2 → "Guardar cambios" → P3, sin versión.
- Editar enviada: P3 → "Editar" → P2 → "Guardar cambios" → diálogo "Lo que solicitó el cliente" → P3 con versión nueva.
- Cerrar: P3 (Enviada) → "Marcar como aprobada" o "rechazada" → P4-b → P3 en estado final.
- Anular: P3 (Borrador o Enviada) → "Anular" → P4-g con motivo → P3 (Anulada, motivo visible).
- Más plazo: P3 (Enviada) → "Cambiar vencimiento" → P4-c → P3 con evento en el historial.
- Reactivar: P3 (Vencida) → "Reactivar" → P4-e con vista previa → P3 (Enviada, nueva vigencia).
- Duplicar: P3 (Aprobada o Rechazada) → "Duplicar" → P4-f → P2 del nuevo borrador con avisos.
- Reasignar: P3 → "Reasignar" → P4-d → P3 con el nuevo dueño (si un gerente reasigna, sigue viéndola; un vendedor que la pierde ya no la ve en P1).

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Alcance por rol (RN-01) | El vendedor solo ve sus cotizaciones; columna y filtro "Dueño" solo para Gerente y Administrador; "Reasignar" solo para ellos. |
| Borrador frente a Enviada (RN-22, RN-25, S4.3.1) | Borrador: cliente editable, sin vencimiento, se guarda sin versión ni diálogo. Enviada: cliente bloqueado, vencimiento visible y editable, guardar pide "Lo que solicitó el cliente" y crea versión; editar no la devuelve a Borrador. |
| Estados finales (RN-28) | Aprobada, Rechazada y Anulada no muestran "Editar"; Aprobada y Rechazada muestran "Duplicar". Vencida solo ofrece "Reactivar" (y "Reasignar" para Gerente/Administrador). |
| Límite de descuento por rol (RN-12, S4.1.4) | La ayuda muestra el límite del rol de quien edita, no el del dueño. Superarlo marca el campo en error y bloquea el guardado. |
| Descuento sobre el límite del vendedor (RN-13, RN-14) | Vendedor que edita una cotización con descuento mayor a su límite: el campo de descuento queda en solo lectura con `Alert` info "Descuento aplicado por un gerente o administrador. Puedes editar los productos, pero no el descuento."; las líneas siguen editables. Gerente/Administrador que fija un descuento mayor al límite del vendedor: `Alert` warning "Supera el límite del vendedor (10 %). Quedará registrado a tu nombre." (en Borrador aparece en el historial como evento; en Enviada, dentro de la versión). |
| Snapshot de precios (RN-09) | En P2 el precio unitario y la tarifa IVA nunca son editables; las líneas existentes conservan su precio. Los productos inactivos no aparecen en el buscador. |
| IVA del envío (RN-08) | La fila "IVA del envío" del `TotalsSummary` solo aparece si la cotización tiene el envío gravado. |
| Reactivación (RN-27) | La casilla "Actualizar precios" solo afecta productos activos; los inactivos se listan con aviso. Sin cambio de precios, lo solicitado queda en el evento, no en una versión. |
| Vencimiento cercano | En P1 y P3 se agrega "Vence hoy" o "Vence en N días" a las Enviadas que vencen en 3 días o menos. |
| Acciones de M5 | Los botones de PDF y envío asistido aparecen en P3 cuando M5 esté integrado. |

## Vacíos detectados
| # | Vacío | Propuesta | ¿Bloquea? |
|---|---|---|---|
| V1 | Los chips de estado de la referencia muestran un contador ("Borrador 2"), pero `GET /quotes` no devuelve conteos por estado. | En M4, chips sin contador. Si se quieren, agregar conteos por estado a la respuesta del listado en el tech plan de M4. | No (tech plan M4) |
| V2 | No está definido si aprobar o rechazar piden confirmación. | Diálogo de confirmación simple (P4-b), porque son estados finales. | No (tech plan M4) |
| V3 | Si una Enviada ya pasó su fecha y el job no la ha marcado, la API responde `QUOTE_EXPIRED`, pero no se dice si `allowedActions` oculta aprobar/rechazar. | Que `allowedActions` excluya `approve` y `reject` cuando `expiresAt < hoy` y el detalle muestre "Venció el …"; se mantiene el error como respaldo. | No (tech plan M4) |
| V4 | El umbral "Vence en N días" de la lista no está definido en M4. | Usar el parámetro X de "próxima a vencer" (M2, defecto 3) para coherencia con las alertas de M6. | No (tech plan M4) |
| V5 | El filtro "Dueño" usa la lista de usuarios activos (S1.3.2); no se pueden filtrar las cotizaciones de un usuario desactivado, justo el caso que motiva reasignar. | Permitir en el filtro de M4 incluir usuarios inactivos (marcados "Inactivo"), sin cambiar el diálogo de reasignar. | No (tech plan M1/M4) |
| V6 | No se define qué ve el editor si el cliente de un Borrador fue desactivado después de crearlo. | Mostrar `Alert` warning "El cliente está inactivo." y exigir elegir otro antes de guardar o enviar. | No (tech plan M4) |
