# M2 Configuración de empresa – UI brief

> Fuentes: `epics.md` (H2.1 Datos y logo, H2.2 Parámetros comerciales) y `tech-plan.md` §4–§6 de este módulo; `docs/design/design-system.md`. Sin código ni endpoints.

**Depende de:** M0 · H0.3 (layout, navegación, `lang/`); M1 · H1.2 (solo `ADMIN` edita) y S1.1.1 (login, que muestra el branding); `docs/design/design-system.md`.

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega |
|---|---|---|
| Ajustes de la empresa (una sola página) | `ADMIN` | Navegación "Ajustes" (S2.1.1, S2.1.2, S2.1.3, S2.2.1) |
| Branding en login y encabezado | Todos (con y sin sesión) | Siempre que se ve el login o el layout privado (S2.1.4) |

---

## Ajustes de la empresa (S2.1.1, S2.1.2, S2.1.3, S2.2.1)
**Muestra:** `PageHeader` "Ajustes de la empresa" con la descripción "Estos valores se usan en las cotizaciones nuevas; las que ya existen no se recalculan." (aviso de S2.2.1). A la derecha del encabezado: indicador de estado ("Todo guardado", "Cambios sin guardar", "Guardando…"), "Descartar" (solo con cambios) y "Guardar ajustes" (`on-dark`, deshabilitado sin cambios). Debajo, `SectionCard` en dos columnas (una en celular) con campos rellenos (`variant="filled"`):

| Columna | Tarjeta | Contenido |
|---|---|---|
| Izquierda | Empresa | Nombre, NIT, teléfono, dirección, ciudad, correo y sitio web |
| | Límites de descuento | Vendedor, gerente comercial y administrador (%), cada uno con una barra que muestra el valor |
| | Impuestos y envío | IVA por defecto de productos nuevos e interruptor "El envío grava IVA (19 %)" |
| | Documentos | Condiciones comerciales (con contador y barra de uso) e idioma de los documentos |
| Derecha | Logo y marca | Franja con el fondo de marca: logo en círculo (clic o arrastrar para elegir otro), nombre, NIT, ciudad, teléfono y sitio web; el logo aparece una sola vez |
| | Vigencia y seguimiento | Días de vigencia, aviso previo, días sin seguimiento, línea de tiempo de ejemplo y umbral para calibrar la probabilidad |
| | Cuentas bancarias | Texto, una cuenta por línea, y vista previa de cómo aparecerán en las cotizaciones |

**Logo:** sin logo de la empresa se muestra la Z de Zentia. Al elegir un archivo se valida tipo y tamaño en el navegador (la ayuda "PNG o JPG, máximo 512 KB." queda para lectores de pantalla; el error se muestra en línea) y la vista previa queda marcada "Sin guardar" hasta pulsar "Guardar ajustes"; "Descartar logo nuevo" la quita. "Quitar logo" (`danger-outline`, solo si hay logo) pide confirmación: "El login, el encabezado y los PDF quedarán sin logo." → `danger` "Quitar".

**Campos de datos:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Nombre de la empresa | No (si está vacío se usa el nombre de la app) | Máx. 150 caracteres |
| NIT | No | Máx. 30 caracteres |
| Dirección | No | Máx. 250 caracteres |
| Ciudad | No | Máx. 100 caracteres |
| Teléfono | No | Máx. 30 caracteres |
| Correo | No | Formato de correo, máx. 150 |
| Sitio web | No | Máx. 150 caracteres |
| Cuentas bancarias | No | `TextArea`, máx. 1000; una cuenta por línea con el número después de una barra (`\|`); una línea sin número se marca en la vista previa |
| Condiciones comerciales | No | `TextArea`, máx. 2000; ayuda: "Aparecen en el PDF de cada cotización." |
| Idioma de los documentos | Sí | `Select` Español / Inglés; ayuda: "Idioma del PDF y del mensaje sugerido por la IA. No cambia el idioma de la interfaz." |

**Parámetros comerciales:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Días de vigencia (N) | Sí | Entero de 1 a 365 |
| Aviso previo (X días) | Sí | Entero ≥ 1 y menor que los días de vigencia; error en el campo: "Debe ser menor que los días de vigencia (15)." |
| Días sin seguimiento (Y) | Sí | Entero de 1 a 90 |
| Umbral para calibrar la probabilidad | Sí | Entero de 30 a 50 |
| IVA por defecto de productos nuevos | Sí | `Select` 19 % / 5 % / Exento; ayuda: "Solo preselecciona la tarifa al crear un producto." |
| El envío grava IVA (19 %) | Sí | Interruptor |
| Límites de descuento (3) | Sí | 0–100, hasta 2 decimales, coma o punto |

**Acciones:** "Guardar ajustes" — `ADMIN`. Guarda solo lo que cambió: el logo nuevo (`PUT /company/logo`), los datos (`PATCH /company/profile`) y los parámetros (`PATCH /company/parameters`).

**Estados:**
- Cargando: `Skeleton` de las tarjetas.
- Error de carga: `Alert` + "Reintentar". Error del logo: en línea bajo el logo (`LOGO_INVALID_TYPE`, `LOGO_TOO_LARGE`, `PAYLOAD_TOO_LARGE`). Errores de validación: en línea por campo (los del servidor se ubican por el `path` del issue); con más de 3, resumen arriba.
- Sin permiso: la entrada "Ajustes" solo aparece para `ADMIN`; por URL, página sin permiso.
- Éxito: `Toast` "Ajustes guardados." o "Logo eliminado."; el encabezado cambia logo y nombre sin recargar (S2.1.4, criterio 4).
- Con cambios sin guardar: el indicador lo dice; si el botón del encabezado sale de la pantalla aparece una barra flotante con "Descartar" y "Guardar ajustes"; salir de la página pide "¿Descartar cambios?".
- Vacío: no aplica (la fila siempre existe, S2.2.2).

## Branding en login y encabezado (S2.1.4)
**Muestra:** `BrandMark`: logo en círculo blanco y nombre de la empresa; sin logo, la Z de Zentia; sin nombre, el nombre de la app. El login usa el mismo fondo de marca que el encabezado. Sin acciones.
**Estados:** mientras carga, el círculo muestra un `Skeleton`; si el logo falla al cargar, se muestra la Z de Zentia (nunca un icono de imagen rota).

---

## Flujos
- Ajustes → editar datos o parámetros → Guardar ajustes → `Toast` y encabezado actualizado.
- Ajustes → clic o arrastrar en el logo → vista previa "Sin guardar" → Guardar ajustes → encabezado y login con el logo nuevo.
- Ajustes → Quitar logo → confirmación → encabezado con la Z de Zentia.
- Salir de Ajustes con cambios sin guardar → "¿Descartar cambios?".

## Reglas que cambian lo que se ve
- Solo `ADMIN` ve "Ajustes"; los demás roles leen los parámetros de forma indirecta (límites y vigencia en el editor de cotizaciones de M4).
- "Quitar logo" solo aparece si hay logo.
- El máximo permitido de "X" y la línea de tiempo se actualizan en vivo con los días de vigencia, el aviso previo y los días sin seguimiento.
- El idioma de los documentos no cambia el idioma de la interfaz (`LanguageSwitch`), y viceversa.

## Vacíos detectados
| Vacío | Propuesta de resolución | ¿Bloquea? |
|---|---|---|
| `commercialTerms` no tiene longitud máxima. | Fijar 2000 caracteres en el schema de `shared` para que quepa en el PDF (tech plan de H2.1, a confirmar con M5). | No |
| No se define formato para el teléfono de la empresa (el de clientes sí, RN-31). | Texto libre hasta 30 caracteres, como está en el modelo; no aplicar la normalización de clientes. | No |
| No hay clave de `lang/` para las ayudas de cada parámetro (qué significa X, Y y el umbral). | Agregar `settings.parameters.<campo>Hint` en el tech plan de H2.2. | No |
| No está definido si el cambio de logo se guarda al elegir el archivo o con un botón aparte. | Vista previa marcada "Sin guardar" y guardado explícito con "Guardar ajustes" (regla de guardado explícito del design system). | No |
