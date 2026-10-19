# M2 Configuración de empresa – UI brief

> Fuentes: `epics.md` (H2.1 Datos y logo, H2.2 Parámetros comerciales) y `tech-plan.md` §4–§6 de este módulo; `docs/design/design-system.md`. Sin código ni endpoints.

**Depende de:** M0 · H0.3 (layout, navegación, `lang/`); M1 · H1.2 (solo `ADMIN` edita) y S1.1.1 (login, que muestra el branding); `docs/design/design-system.md`.

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega |
|---|---|---|
| Configuración – pestaña "Datos de la empresa" | `ADMIN` | Navegación "Ajustes" (S2.1.1, S2.1.2, S2.1.3) |
| Configuración – pestaña "Parámetros comerciales" | `ADMIN` | Pestaña dentro de "Ajustes" (S2.2.1) |
| Branding en login y encabezado | Todos (con y sin sesión) | Siempre que se ve el login o el layout privado (S2.1.4) |

---

## Configuración – Datos de la empresa (S2.1.1, S2.1.2, S2.1.3)
**Muestra:** `PageHeader` "Configuración" con pestañas "Datos de la empresa" y "Parámetros comerciales". Dos `SectionCard`: "Logo" y "Datos de la empresa".

**Logo (`LogoUploader`):** vista previa del logo actual en círculo blanco (como en el encabezado) o un marcador vacío "Sin logo". Ayuda: "PNG o JPG, máximo 512 KB."
| Acción | Rol |
|---|---|
| "Subir logo" / "Cambiar logo" (`secondary`) | `ADMIN` |
| "Quitar logo" (`danger-outline`, solo si hay logo) con confirmación: "El login, el encabezado y los PDF quedarán sin logo." → `danger` "Quitar" | `ADMIN` |

Al elegir un archivo se valida tipo y tamaño en el navegador y se muestra la vista previa antes de enviar, con "Guardar logo" y "Cancelar".

**Campos de datos:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Nombre de la empresa | No (si está vacío se usa el nombre de la app) | Máx. 150 caracteres |
| NIT | No | Máx. 30 caracteres |
| Dirección | No | Máx. 250 caracteres |
| Teléfono | No | Máx. 30 caracteres |
| Correo | No | Formato de correo, máx. 150 |
| Condiciones comerciales | No | `TextArea`; ayuda: "Aparecen en el PDF de cada cotización." |
| Idioma de los documentos | Sí | `Select` Español / Inglés; ayuda: "Idioma del PDF y del mensaje sugerido por la IA. No cambia el idioma de la interfaz." |

**Acciones:** "Guardar cambios" (`primary`) — `ADMIN`.

**Estados:**
- Cargando: `Skeleton` de los campos y del logo.
- Error de carga: `Alert` + "Reintentar". Error del logo: en línea bajo el selector (`LOGO_INVALID_TYPE`, `LOGO_TOO_LARGE`, `PAYLOAD_TOO_LARGE`). Error al guardar datos: en línea por campo.
- Sin permiso: la entrada "Ajustes" solo aparece para `ADMIN`; por URL, página sin permiso.
- Éxito: `Toast` "Configuración guardada." / "Logo actualizado." / "Logo eliminado."; el encabezado cambia logo y nombre sin recargar (S2.1.4, criterio 4).
- Vacío: no aplica (la fila siempre existe, S2.2.2); los campos vacíos se muestran vacíos.

## Configuración – Parámetros comerciales (S2.2.1)
**Muestra:** `Alert` `info` fijo arriba: "Los cambios aplican a las operaciones futuras. No recalculan las cotizaciones existentes." Tres `SectionCard`:

| Sección | Campo | Obligatorio | Validación visible |
|---|---|---|---|
| Cotizaciones | Días de vigencia (N) | Sí | Entero de 1 a 365 |
| | IVA por defecto de productos nuevos | Sí | `Select` 19 % / 5 % / Exento; ayuda: "Solo preselecciona la tarifa al crear un producto." |
| | El envío grava IVA (19 %) | Sí | Interruptor |
| Límites de descuento | Vendedor (%) | Sí | 0–100, hasta 2 decimales |
| | Gerente comercial (%) | Sí | 0–100, hasta 2 decimales |
| | Administrador (%) | Sí | 0–100, hasta 2 decimales |
| Seguimiento e IA | Avisar antes del vencimiento (X días) | Sí | Entero ≥ 1 y menor que los días de vigencia; error en el campo: "Debe ser menor que los días de vigencia (15)." |
| | Días sin seguimiento (Y) | Sí | Entero de 1 a 90 |
| | Umbral para calibrar la probabilidad | Sí | Entero de 30 a 50; ayuda: "Número de cotizaciones cerradas a partir del cual se podrá calibrar la estimación." |

**Acciones:** "Guardar parámetros" (`primary`) — `ADMIN`.

**Estados:** cargando con `Skeleton` · error de validación cruzada en el campo afectado (si el servidor lo devuelve, se ubica por el `path` del issue) · éxito con `Toast` "Parámetros guardados." · sin permiso igual que la otra pestaña · vacío no aplica (valores por defecto del seed).

## Branding en login y encabezado (S2.1.4)
**Muestra:** `BrandMark`: logo en círculo blanco y nombre de la empresa; sin logo, solo el nombre; sin nombre, el nombre de la app. Sin acciones.
**Estados:** mientras carga, el círculo muestra un `Skeleton`; si el logo falla al cargar, se oculta y queda el nombre (nunca un icono de imagen rota).

---

## Flujos
- Ajustes → Datos de la empresa → editar → Guardar cambios → `Toast` y encabezado actualizado.
- Ajustes → Subir logo → vista previa → Guardar logo → encabezado y login con el logo nuevo.
- Ajustes → Quitar logo → confirmación → encabezado solo con el nombre.
- Ajustes → Parámetros comerciales → editar → Guardar parámetros → `Toast`.
- Salir de una pestaña con cambios sin guardar → "¿Descartar cambios?".

## Reglas que cambian lo que se ve
- Solo `ADMIN` ve "Ajustes"; los demás roles leen los parámetros de forma indirecta (límites y vigencia en el editor de cotizaciones de M4).
- "Quitar logo" solo aparece si hay logo.
- El máximo permitido de "X" se actualiza en vivo con el valor de "Días de vigencia" del mismo formulario.
- El idioma de los documentos no cambia el idioma de la interfaz (`LanguageSwitch`), y viceversa.

## Vacíos detectados
| Vacío | Propuesta de resolución | ¿Bloquea? |
|---|---|---|
| `commercialTerms` no tiene longitud máxima. | Fijar 2000 caracteres en el schema de `shared` para que quepa en el PDF (tech plan de H2.1, a confirmar con M5). | No |
| No se define formato para el teléfono de la empresa (el de clientes sí, RN-31). | Texto libre hasta 30 caracteres, como está en el modelo; no aplicar la normalización de clientes. | No |
| No hay clave de `lang/` para las ayudas de cada parámetro (qué significa X, Y y el umbral). | Agregar `settings.parameters.<campo>Hint` en el tech plan de H2.2. | No |
| No está definido si el cambio de logo se guarda al elegir el archivo o con un botón aparte. | Vista previa + "Guardar logo" explícito (consistente con la regla de guardado explícito del design system). | No |
