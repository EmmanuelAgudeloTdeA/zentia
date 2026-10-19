# M3 Clientes y catálogo – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-01, RN-03, RN-07, RN-09, RN-16, RN-31), `docs/design/design-system.md`. Los formatos (moneda, fechas), los estados genéricos de carga, error y vacío, y los componentes se rigen por el sistema de diseño; aquí solo se indica lo propio del módulo.

## Depende de
| Módulo / documento | Qué necesita |
|---|---|
| `docs/design/design-system.md` | Componentes (`DataTable`, `Dialog`, `TextField`, `MoneyField`, `Combobox`, `Select`, `FilterChip`, `EmptyState`, `Alert`, `Toast`) y reglas globales |
| M0 · H0.3 | Layout privado y navegación con entradas por feature |
| M1 · H1.2 | Rol del usuario para mostrar u ocultar las acciones de catálogo |
| M2 · S2.2.3 | IVA por defecto para preseleccionar la tarifa (dependencia blanda: si no existe, 19 %) |

## Pantallas
| Pantalla | Hito / story | Quién la usa | Cómo se llega |
|---|---|---|---|
| P1 Clientes (listado) | H3.1 · S3.1.2 | Todos los roles | Entrada "Clientes" de la navegación |
| P2 Detalle de cliente | H3.1 · S3.1.1, S3.1.2 | Todos los roles | Clic en una fila de P1; aviso de duplicado en D1 |
| D1 Diálogo Crear / editar cliente | H3.1 · S3.1.1 | Todos los roles | "Nuevo cliente" en P1; "Editar" en P2 |
| P3 Catálogo de productos (listado) | H3.2 · S3.2.3 | Todos los roles (escritura solo administrador) | Entrada "Productos" de la navegación |
| D2 Diálogo Crear / editar producto | H3.2 · S3.2.1, S3.2.4 | Administrador | "Nuevo producto" o "Editar" en P3 |

---

## P1 Clientes (listado) — H3.1
**Datos (tabla `DataTable`, ordenada por nombre, 20 por página):** nombre · documento · teléfono · correo · estado (`Activo` / `Inactivo`). En móvil, tarjeta con nombre, documento y el contacto disponible.

**Barra de herramientas:**
- Búsqueda: "Buscar por nombre, documento, teléfono o correo". Sin distinguir mayúsculas ni tildes; documento y teléfono se buscan normalizados (con o sin puntos, guiones o espacios).
- Chips de estado: `Activos` (defecto) · `Inactivos` · `Todos`.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Nuevo cliente (botón primario de la página) | Todos | Abre D1 vacío |
| Abrir fila | Todos | P2 |

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de 8 filas |
| Vacío (sin clientes) | "Aún no hay clientes. Crea el primero para poder cotizar." + "Nuevo cliente" |
| Vacío (con búsqueda o filtro) | "Ningún cliente coincide con la búsqueda." + "Limpiar filtros" |
| Error | `Alert` danger con `errors.<CODE>` + "Reintentar" en lugar de la tabla |
| Sin permiso | No aplica: todos los roles acceden (RN-03) |
| Éxito | Tras crear en D1: toast "Cliente creado." y la lista se actualiza |

---

## P2 Detalle de cliente — H3.1
**Datos:** encabezado con nombre (`h1`), badge `Inactivo` si aplica y botones de acción. Tarjeta "Datos": documento, teléfono en formato internacional (como se usará en WhatsApp), correo, creado por (nombre) y fecha de creación (`DD/MM/AAAA`).

**Secciones reservadas (S3.1.2.4):** tarjeta "Cotizaciones" (la llena M4) y tarjeta "Interacciones" (la llena M6). Mientras el módulo dueño no exista, no se muestran.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Editar | Todos | Abre D1 con los datos |
| Desactivar (`danger-outline`) | Todos | Modal: "El cliente {{name}} no se podrá usar en cotizaciones nuevas. Sus cotizaciones existentes no cambian." → "Desactivar" |
| Activar | Todos | Sin confirmación; toast "Cliente activado." |
| Volver | Todos | P1 conservando búsqueda, filtros y página |

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto del encabezado y de la tarjeta de datos |
| Error | `CUSTOMER_NOT_FOUND`: "El cliente no existe." + enlace a P1; otros errores: `Alert` + "Reintentar" |
| Sin permiso | No aplica |
| Éxito | Toasts "Cliente actualizado.", "Cliente desactivado.", "Cliente activado."; los datos se refrescan en la página |

---

## D1 Diálogo Crear / editar cliente — S3.1.1, S3.1.2
`Dialog` tamaño `md`. Título "Nuevo cliente" o "Editar cliente".

**Campos**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Nombre o razón social | Sí | Requerido; máximo 150 caracteres |
| Documento (NIT o cédula) | Sí | Requerido; al salir del campo se muestra la forma normalizada bajo el campo ("Se guardará como 9001234567"); 5–20 caracteres alfanuméricos tras normalizar. Al salir, si existe un cliente con ese documento (o uno que empieza igual), `Alert` warning: "Ya existe un cliente con este documento: {{name}}." + "Abrir cliente existente" |
| Teléfono | Condicional | Ayuda: "Se antepone 57 si tiene 10 dígitos." Vista previa en vivo del número final ("+57 300 123 4567"). Error si tras normalizar no queda entre 11 y 15 dígitos (`INVALID_PHONE`) |
| Correo | Condicional | Formato de correo; se muestra en minúsculas |

Encima de teléfono y correo, texto de ayuda: "Ingresa al menos un teléfono o un correo." Si ambos están vacíos al enviar, el error (`CUSTOMER_CONTACT_REQUIRED`) se muestra bajo ese texto y ambos campos quedan marcados.

**Acciones:** "Cancelar" · "Crear cliente" / "Guardar cambios" (todos los roles).

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Botón principal en estado de carga; campos bloqueados |
| Error | `CUSTOMER_DOCUMENT_TAKEN` bajo el campo Documento con enlace al cliente existente; `INVALID_PHONE` y `CUSTOMER_CONTACT_REQUIRED` en línea; otros errores en `Alert` dentro del modal |
| Éxito | Crear: cierra y navega a P2 del nuevo cliente con toast "Cliente creado."; editar: cierra y refresca P2 |
| Cambios sin guardar | Cerrar pregunta "¿Descartar cambios?" |

---

## P3 Catálogo de productos — H3.2
**Datos (tabla, 20 por página):** nombre · categoría · precio sin IVA (`$1.550.000`, a la derecha) · tarifa de IVA (`19 %`, `5 %`, `Exento`) · estado (solo visible para el administrador). Bajo el título, texto fijo: "Precios sin IVA." En móvil, tarjeta con nombre, categoría, precio y tarifa.

**Barra de herramientas:**
- Búsqueda: "Buscar por nombre o categoría".
- Filtro de categoría: `Combobox` con las categorías existentes (S3.2.4).
- Chips de estado `Activos` / `Inactivos` / `Todos`: **solo administrador**. Vendedor y gerente ven siempre solo activos, sin chips.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Nuevo producto (botón primario) | Administrador | D2 vacío |
| Editar (fila) | Administrador | D2 con los datos |
| Desactivar (menú de fila) | Administrador | Modal: "{{name}} no se podrá agregar a cotizaciones nuevas. Las cotizaciones existentes conservan su precio." → "Desactivar" |
| Activar (menú de fila) | Administrador | Sin confirmación; toast |

Para vendedor y gerente la tabla no tiene columna de acciones ni botón "Nuevo producto".

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de 8 filas |
| Vacío (catálogo vacío) | Administrador: "Aún no hay productos. Crea el primero para poder cotizar." + "Nuevo producto". Otros roles: "Aún no hay productos. El administrador debe crearlos." sin acción |
| Vacío (con filtros) | "Ningún producto coincide con la búsqueda." + "Limpiar filtros" |
| Error | `Alert` + "Reintentar" |
| Sin permiso | Las acciones de escritura no se muestran a vendedor ni gerente |
| Éxito | Toasts "Producto creado.", "Producto actualizado.", "Producto desactivado.", "Producto activado." |

---

## D2 Diálogo Crear / editar producto — S3.2.1, S3.2.4
`Dialog` tamaño `md`. Solo administrador.

**Campos**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Nombre | Sí | Requerido; máximo 150 caracteres |
| Categoría | Sí | `Combobox` con sugerencias desde 2 caracteres (hasta 10). Si no coincide con ninguna, última opción "Crear categoría «{{value}}»". Si coincide con una existente salvo mayúsculas o tildes, se usa la forma existente. Máximo 80 caracteres |
| Precio sin IVA | Sí | `MoneyField`; solo enteros; mayor que 0. Ayuda: "Precio antes de IVA." |
| Tarifa de IVA | Sí | `Select`: 19 %, 5 %, Exento. Al crear viene preseleccionado el IVA por defecto de la empresa |

En edición, `Alert` info sobre el pie: "Los cambios de precio o tarifa no afectan las cotizaciones existentes."

**Acciones:** "Cancelar" · "Crear producto" / "Guardar cambios".

**Estados:** carga en el botón; errores de validación en línea; otros en `Alert` dentro del modal; éxito cierra y refresca P3 con toast; cambios sin guardar piden confirmación al cerrar.

---

## Flujos
1. P1 → "Nuevo cliente" → D1 → guardar → P2 del cliente creado.
2. D1 (documento existente) → "Abrir cliente existente" → P2 de ese cliente (D1 se cierra sin guardar, previa confirmación si hay cambios).
3. P1 → fila → P2 → "Editar" → D1 → guardar → P2 actualizado.
4. P2 → "Desactivar" → confirmación → P2 con badge `Inactivo`.
5. P3 → "Nuevo producto" o "Editar" → D2 → guardar → P3 actualizado.
6. P3 → menú de fila → "Desactivar" → confirmación → fila con estado `Inactivo` (visible solo con el chip `Inactivos` o `Todos`).

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Rol administrador (H3.2) | Ve botón "Nuevo producto", acciones por fila, columna y chips de estado en P3. Vendedor y gerente ven el catálogo en solo lectura y solo activos. |
| Clientes compartidos (RN-03) | Todas las acciones de P1, P2 y D1 están disponibles para los tres roles, sin importar quién creó el cliente. |
| Cliente o producto inactivo (RN-09, RN-16) | Badge `Inactivo`; acción "Activar" en lugar de "Desactivar". No aparecen en los selectores de M4 para cotizaciones nuevas. No hay acción "Eliminar". |
| Al menos un contacto (RN-31) | Texto de ayuda permanente sobre teléfono y correo; error compartido si faltan ambos. |
| Teléfono de 10 dígitos (RN-31) | La vista previa muestra el indicativo 57 antepuesto. |
| Precio sin IVA (RN-07) | Rótulo "sin IVA" en la columna de P3 y en el campo de D2. |
| Edición de precio o tarifa (RN-09) | Aviso de que no afecta cotizaciones existentes. |

## Vacíos detectados
| # | Vacío | Resolución propuesta | Bloqueante |
|---|---|---|---|
| V1 | La referencia visual muestra en el cliente "Ciudad", "Contacto" y "Cargo"; el modelo de M3 solo tiene nombre, documento, teléfono y correo. | No se agregan (no inventar requisitos). Si se quieren, se proponen como decisión nueva en el desglose. | No |
| V2 | Ningún documento dice si activar de nuevo un cliente o producto pide confirmación. | Sin confirmación (es reversible y no tiene efectos); con toast. | No (tech plan H3.1/H3.2) |
| V3 | No se define el formato visible del teléfono ("como se usará en WhatsApp"). | Mostrar `+57 300 123 4567` (con `+` y espacios solo en pantalla); se guarda sin `+`. | No (tech plan H3.1) |
| V4 | No se definen las columnas de P1 ni si el listado de clientes permite ordenar por otra columna. | Columnas de este brief; orden fijo por nombre como dice S3.1.2. | No |
| V5 | El filtro por categoría de P3 no dice si es lista cerrada o búsqueda. | `Combobox` sobre las sugerencias de S3.2.4. | No |
| V6 | Los chips de estado de clientes no están restringidos por rol, a diferencia de los de productos. | Se muestran a todos los roles (coherente con RN-03 y con el filtro `isActive` abierto en S3.1.2). | No |
