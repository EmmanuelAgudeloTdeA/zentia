# M6 Seguimiento – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-05, RF-07, RN-33 a RN-35), `docs/design/design-system.md`. Formato de moneda, fechas, estados de carga, vacío y error, idiomas y tono: ver las **Reglas** del sistema de diseño; aquí solo se indica lo propio del módulo.

## Depende de
| Módulo | Qué necesita la interfaz |
|---|---|
| M0 · H0.3 | `PrivateLayout` (donde vive la campana), i18n, `http-client` |
| M1 · H1.2 | Rol y alcance del usuario para mostrar interacciones y notificaciones |
| M3 · H3.1 | `CustomerDetailPage`, con la sección reservada para el historial de interacciones |
| M4 | `QuoteDetailPage` (diálogo con la cotización preseleccionada), `StatusBadge` y estados de cotización |
| Sistema de diseño | `Dialog`, `Select`, `TextArea`, `DateField`, `Timeline`, `NotificationBell`, `DataTable`, `FilterChip`, `EmptyState`, `Toast` |

El job de vencimiento y el de alertas (H6.2) no tienen pantalla: sus efectos se ven en el badge Vencida (M4) y en las notificaciones.

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega | Hito |
|---|---|---|---|
| Diálogo "Registrar observación" | Todos los roles | Botón en el detalle del cliente o en el detalle de la cotización | H6.1 · S6.1.1 |
| Historial de interacciones (sección) | Todos los roles | Al abrir el detalle del cliente o de la cotización | H6.1 · S6.1.2 |
| Campana y panel de notificaciones | Todos los roles (dueños de cotizaciones) | Siempre visible en el encabezado | H6.3 · S6.3.1, S6.3.3 |
| Notificaciones | Todos los roles | "Ver todas" del panel o entrada "Notificaciones" del menú | H6.3 · S6.3.2, S6.3.3 |

---

## 1. Diálogo "Registrar observación" (S6.1.1)
`Dialog` tamaño `md`. Título: "Registrar observación". Contexto bajo el título: nombre del cliente (y número de cotización si se abrió desde una cotización).

**Campos**
| Campo | Control | Obligatorio | Validación visible |
|---|---|---|---|
| Tipo | `Select` con Llamada, Correo, WhatsApp, Reunión, Otro | Sí | "Selecciona el tipo de interacción." |
| Fecha y hora | `DateField` con hora; por defecto ahora | No (si se deja, ahora) | No puede ser futura: "La fecha no puede ser posterior a hoy." (`INTERACTION_FUTURE_DATE`) |
| Nota | `TextArea` con contador 0/2000 | Sí | Entre 1 y 2000 caracteres |
| Cotización | `Select` con las cotizaciones del cliente a las que el usuario tiene acceso (número + estado); opción "Sin cotización" | No | Si no coincide con el cliente: `INTERACTION_QUOTE_MISMATCH` en línea |

Texto de ayuda fijo bajo la nota: "Las observaciones no se pueden editar ni eliminar después de guardarlas."

**Acciones**
| Acción | Rol |
|---|---|
| Guardar observación (primaria) | Todos |
| Cancelar | Todos |

**Estados**
- Cargando: el `Select` de cotización muestra esqueleto mientras carga las del cliente; el botón Guardar en estado de carga al enviar.
- Vacío: el cliente sin cotizaciones accesibles muestra solo "Sin cotización".
- Error: error del servidor como `Alert` `danger` dentro del modal; el modal no se cierra.
- Sin permiso: si la cotización ya no es accesible, error `QUOTE_NOT_FOUND` en línea en el campo Cotización.
- Éxito: el modal se cierra, toast "Observación registrada." y la nueva entrada aparece arriba en el historial.

---

## 2. Historial de interacciones (S6.1.2)
Sección `SectionCard` titulada "Seguimiento" dentro de `CustomerDetailPage` (M3) y `QuoteDetailPage` (M4). Usa el estilo de `Timeline` con nodos de evento.

**Datos por entrada:** icono y etiqueta del tipo, fecha y hora (`DD/MM/AAAA HH:mm`), autor, nota (recortada a 3 líneas con "Ver más") y, en el detalle del cliente, la cotización vinculada como enlace (`COT-0012`) o "Sin cotización". Orden: más reciente primero, paginada ("Ver más antiguas").

**Acciones**
| Acción | Rol |
|---|---|
| Registrar observación (abre el diálogo) | Todos, en cualquier cliente activo; en una cotización, si el usuario tiene acceso a ella |
| Abrir la cotización vinculada | Quien tenga acceso a ella |

**Estados**
- Cargando: tres nodos esqueleto.
- Vacío: "Aún no hay observaciones con este cliente." + "Registrar observación".
- Error: `Alert` `danger` con "Reintentar".
- Sin permiso: un `SELLER` no ve las interacciones vinculadas a cotizaciones ajenas; no se muestran ni se cuentan (no hay indicador de ocultas).
- Éxito: ver diálogo.

---

## 3. Campana y panel de notificaciones (S6.3.1, S6.3.3)
Componente `NotificationBell` del sistema de diseño, en el encabezado.

**Datos:** contador de no leídas (`99+` máximo); panel con las 10 más recientes: icono por tipo, texto traducido con sus parámetros, fecha de creación y marca de no leída.
- "Próxima a vencer": "COT-0012 de Estudio Creativo S.A.S. vence el 23/10/2026."
- "Sin seguimiento": "COT-0012 de Estudio Creativo S.A.S. lleva 6 días sin seguimiento."

**Acciones**
| Acción | Rol |
|---|---|
| Abrir notificación (la marca como leída y abre la cotización) | Destinatario |
| Marcar todas como leídas | Destinatario |
| Ver todas | Destinatario |

**Estados**
- Cargando: el contador no se muestra hasta tener el valor; el panel muestra tres filas esqueleto.
- Vacío: "No tienes notificaciones."
- Error: "No se pudieron cargar las notificaciones." + "Reintentar"; si falla el contador, la campana queda sin contador (no muestra 0 ni error en el encabezado).
- Sin permiso: no aplica; cada usuario solo ve las suyas.
- Éxito: al marcar, el contador baja de inmediato.

---

## 4. Notificaciones (S6.3.2, S6.3.3)
Ruta propia en el layout privado. `PageHeader` "Notificaciones" con la acción secundaria "Marcar todas como leídas".

**Datos por fila (lista, no tabla):** icono del tipo, texto traducido, fecha de creación, `StatusBadge` con el estado **actual** de la cotización y marca de no leída (fondo `primary-50` y punto). Paginación de 20.

**Filtros:** `FilterChip` "Todas" / "Solo no leídas".

**Acciones**
| Acción | Rol |
|---|---|
| Abrir notificación (la marca como leída y abre la cotización) | Destinatario |
| Marcar todas como leídas | Destinatario |
| Filtrar por no leídas | Destinatario |

**Estados**
- Cargando: filas esqueleto.
- Vacío: "No tienes notificaciones." Con el filtro activo: "No tienes notificaciones sin leer." + "Ver todas".
- Error: `Alert` `danger` con "Reintentar".
- Sin permiso: no aplica (solo propias). Si la cotización ya no es accesible al abrirla, toast `errors.QUOTE_NOT_FOUND` y la notificación queda marcada como leída.
- Éxito: toast "Notificaciones marcadas como leídas." al marcar todas.

---

## Flujos
1. Detalle del cliente → "Registrar observación" → diálogo → guardar → historial actualizado.
2. Detalle de la cotización → "Registrar observación" (cotización preseleccionada) → guardar → historial de la cotización actualizado.
3. Campana → panel → clic en notificación → detalle de la cotización (marcada como leída).
4. Campana → "Ver todas" → Notificaciones → clic → detalle de la cotización.
5. Notificaciones → "Marcar todas como leídas" → contador de la campana en 0.

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Interacciones inmutables (decisiones 139–146) | No hay acciones de editar ni eliminar en el historial. |
| `occurredAt` ≤ ahora | El selector de fecha no permite días futuros. |
| Alcance del `SELLER` | En el detalle del cliente no ve las interacciones vinculadas a cotizaciones ajenas; en el diálogo solo puede vincular sus cotizaciones. `MANAGER` y `ADMIN` ven y vinculan todas. |
| Notificación de una cotización que ya no está Enviada | Fila atenuada con la etiqueta "Resuelta" y el `StatusBadge` del estado actual; sigue siendo clicable. |
| Reasignación (S6.3.3) | Las no leídas desaparecen de la campana del dueño anterior y aparecen en la del nuevo en la siguiente consulta (máx. 60 s). |
| Polling (S6.3.1) | El contador se actualiza al iniciar sesión, al navegar y cada 60 s con la pestaña visible; no hay avisos emergentes. |
| Con M9 (H9.3) | La página de notificaciones ofrece ordenar por probabilidad de cierre (lo detalla el UI brief de M9). |

## Vacíos detectados
| # | Vacío | Propuesta | ¿Bloquea? |
|---|---|---|---|
| G1 | No se define si el historial del detalle de la cotización incluye las interacciones del cliente sin cotización, que sí cuentan para "sin seguimiento" (S6.2.3). | Mostrar solo las vinculadas a la cotización y un enlace "Ver historial del cliente". | No; tech plan de H6.1 |
| G2 | Las notificaciones ya leídas no se traspasan al reasignar; al abrirlas, el dueño anterior (`SELLER`) recibe `QUOTE_NOT_FOUND`. | Mostrar el toast de error y atenuar la fila; sin cambio en back. | No; tech plan de H6.3 |
| G3 | No se define si el diálogo permite vincular cotizaciones en estado final (Aprobada, Rechazada, Anulada). | Listar todas las accesibles del cliente, con las Enviadas primero. | No; tech plan de H6.1 |
| G4 | No se define si "Notificaciones" tiene entrada en la navegación o solo se llega desde la campana (existe la clave `nav.notifications`). | Entrada en el menú de usuario y en el panel lateral móvil, no en la barra principal. | No |
