# M5 Documento y envío – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-03, RF-14, RNF-05, RN-31, RN-43), `docs/modules/mod-4-cotizaciones/` (detalle de cotización y "Marcar como enviada"), `docs/design/design-system.md`. Formatos, estados genéricos y componentes se rigen por el sistema de diseño.

M5 no tiene pantallas propias: agrega un botón y un diálogo al **detalle de cotización** de M4 (`QuoteDetailPage`). El PDF es un documento para el cliente final y no forma parte de la interfaz; su contenido está definido en S5.1.1.

## Depende de
| Módulo / documento | Qué necesita |
|---|---|
| `docs/design/design-system.md` | `Button`, `Dialog`, `Alert`, `Toast`, `StatusBadge` y reglas globales |
| M4 · S4.2.1, S4.2.6 | Detalle de cotización con acciones según `allowedActions`; botón "Marcar como enviada" como alternativa |
| M3 · S3.1.1 | Teléfono y correo del cliente (para habilitar cada canal) |
| M2 · S2.1 / S2.2.3 | Datos, logo e idioma del documento (`documentLocale`) |

## Pantallas y elementos
| Elemento | Hito / story | Quién lo usa | Cómo se llega |
|---|---|---|---|
| E1 Botón "Descargar PDF" en el detalle | H5.1 · S5.1.2 | Dueño, gerente y administrador (alcance de RN-01) | Detalle de cualquier cotización visible para el usuario, en cualquier estado |
| E2 Diálogo "Enviar cotización" | H5.2 · S5.2.1, S5.2.2, S5.2.3 | Dueño, gerente y administrador (alcance) | Botón "Enviar" del detalle, solo en Borrador o Enviada |

---

## E1 Botón "Descargar PDF" — H5.1
**Ubicación:** grupo de acciones del encabezado del detalle, variante `secondary` con icono de descarga. En móvil, dentro de "Más acciones" si el grupo no cabe.

**Datos:** ninguno en pantalla. Descarga el archivo `COT-0001.pdf` generado con el estado actual de la cotización.

**Lo que el usuario debe saber del archivo (sin mostrarlo en la UI):** en Borrador lleva la marca de agua "Borrador" y la fecha de vencimiento prevista; en Anulada, la marca "Anulada"; el idioma es el del documento de la empresa, no el de la interfaz.

**Acciones**
| Acción | Rol | Estados de la cotización |
|---|---|---|
| Descargar PDF | Todos con alcance sobre la cotización | Todos |

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | El botón muestra el indicador y queda deshabilitado mientras se genera (puede tardar hasta 5 s) |
| Error | Toast de error: `PDF_GENERATION_FAILED` → "No se pudo generar el PDF. Inténtalo de nuevo." con acción "Reintentar"; `QUOTE_NOT_FOUND` → el detalle muestra "La cotización no existe." |
| Sin permiso | Un vendedor no llega al detalle de una cotización ajena (404 del detalle de M4) |
| Éxito | El navegador descarga el archivo; sin toast (la descarga es la confirmación) |
| Vacío | No aplica |

---

## E2 Diálogo "Enviar cotización" — H5.2
**Apertura:** botón primario "Enviar" del detalle, visible solo si `allowedActions` incluye `share` (Borrador o Enviada). `Dialog` tamaño `md`. Título: "Enviar COT-0012".

**Datos que muestra**
- Resumen: cliente, total (`$5.375.000`) y fecha de vencimiento ("Vence el 23/10/2026"; en Borrador: "Vencerá el 23/10/2026 si la envías hoy").
- `Alert` info con el idioma del mensaje: "El PDF y el mensaje se generan en {{language}}." (idioma de `documentLocale`).

**Paso 1 — Descargar el PDF**
- Texto: "WhatsApp y el correo no permiten adjuntar archivos automáticamente. Descarga el PDF para adjuntarlo."
- Botón `secondary` "Descargar PDF" (mismo comportamiento que E1). Al terminar, el paso muestra un check y "PDF descargado".
- El paso 1 es una guía: no bloquea el paso 2.

**Paso 2 — Elegir el canal**
| Botón | Habilitado si | Si no |
|---|---|---|
| "Abrir en WhatsApp" | El cliente tiene teléfono | Deshabilitado con texto visible debajo: "El cliente no tiene teléfono registrado." + enlace "Editar cliente" |
| "Abrir en correo" | El cliente tiene correo | Deshabilitado con texto: "El cliente no tiene correo registrado." + enlace "Editar cliente" |

Al hacer clic, se abre WhatsApp o el cliente de correo en una pestaña nueva, con el destinatario y el mensaje prellenados (cliente, número, total, vencimiento, vendedor), y al mismo tiempo la cotización queda en Enviada.

**Acciones**
| Acción | Rol | Resultado |
|---|---|---|
| Descargar PDF | Alcance | Descarga el archivo |
| Abrir en WhatsApp / Abrir en correo | Alcance | Abre el canal; si estaba en Borrador, pasa a Enviada |
| Cerrar | Alcance | Cierra sin cambios |

**Estados**
| Estado | Qué se ve |
|---|---|
| Cargando | Al abrir, esqueleto de los botones del paso 2 mientras se obtienen los enlaces; durante el registro del envío, indicador junto al botón usado |
| Ningún canal disponible | Ambos botones deshabilitados con sus explicaciones y `Alert` warning: "Agrega un teléfono o un correo al cliente, o marca la cotización como enviada si la enviaste por otro medio." + "Marcar como enviada" (M4) |
| Error al registrar el envío | El canal ya se abrió, pero la cotización sigue en Borrador: `Alert` danger dentro del diálogo con `errors.<CODE>` (por ejemplo, "Esta cotización cambió mientras la editabas.") + "Marcar como enviada" + "Recargar" |
| Error al cargar enlaces | `Alert` danger + "Reintentar"; el paso 1 sigue disponible |
| Sin permiso | El botón "Enviar" no aparece en Aprobada, Rechazada, Vencida ni Anulada, ni para quien no tiene alcance |
| Éxito | Desde Borrador: el diálogo se cierra, toast "Cotización COT-0012 enviada.", el badge cambia a `Enviada`, aparece la fecha de vencimiento real y el historial muestra la versión 1. Desde Enviada: toast "Se abrió {{channel}}." sin cambios en la cotización |

---

## Flujos
1. Detalle (cualquier estado) → "Descargar PDF" → archivo descargado.
2. Detalle (Borrador) → "Enviar" → paso 1 descargar PDF → paso 2 "Abrir en WhatsApp" → WhatsApp en pestaña nueva + detalle en Enviada.
3. Detalle (Borrador) → "Enviar" → paso 2 "Abrir en correo" → cliente de correo + detalle en Enviada.
4. E2 sin teléfono ni correo → "Editar cliente" → diálogo de cliente de M3 → vuelve al detalle.
5. E2 sin canales o con error al registrar → "Marcar como enviada" (M4) → detalle en Enviada.
6. Detalle (Enviada) → "Enviar" → canal → se abre el canal sin cambiar estado ni fechas.

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Estado Borrador o Enviada (S5.2.1.4) | Solo entonces aparece el botón "Enviar". En los demás estados solo queda "Descargar PDF". |
| Borrador (S5.1.1.5, S5.2.1.2) | El diálogo muestra el vencimiento como previsto ("Vencerá el…"); el PDF lleva marca de agua "Borrador". |
| Enviada (tech plan §8) | Usar un canal no renueva el envío ni crea historial; el diálogo lo indica con el texto "Ya está enviada; se abrirá el canal sin cambiar la cotización." Para registrar el contacto se usa una interacción (M6). |
| Anulada (S5.1.1.5) | El PDF lleva marca de agua "Anulada". |
| Falta teléfono o correo (RN-31, RF-14.1) | El botón del canal se deshabilita con explicación visible y acceso a editar el cliente. |
| `documentLocale` (RN-43) | El PDF y el mensaje pueden estar en un idioma distinto al de la interfaz; el diálogo lo avisa. |

## Vacíos detectados
| # | Vacío | Resolución propuesta | Bloqueante |
|---|---|---|---|
| V1 | El paso 1 del diálogo descarga el PDF **antes** de pasar a Enviada, así que el archivo que recibe el cliente lleva la marca de agua "Borrador" y la leyenda de vencimiento "prevista" (S5.1.1.5 + S5.2.3.4). | El PDF descargado desde el diálogo "Enviar" se genera sin marca de agua ni leyenda "prevista" (la fecha prevista coincide con la real si se envía el mismo día). La marca solo aplica a la descarga desde el detalle. Requiere ajustar S5.1.1 y el tech plan de H5.1. | **Sí** |
| V2 | S5.1.1.3 formatea montos y fechas del PDF según el idioma (`es-CO` / `en-US`), mientras el sistema de diseño fija `$5.375.000` y `DD/MM/AAAA` en ambos idiomas de la interfaz (D2, D3). | Mantener la regla de M5 para el PDF (es un documento para el cliente, en su idioma) y la del sistema de diseño solo para la interfaz; dejarlo explícito en ambos documentos. | No (validar con D2 y D3) |
| V3 | No se define si el diálogo muestra el texto del mensaje antes de abrir el canal. | No mostrarlo en el MVP: el usuario lo revisa y edita en WhatsApp o en su correo antes de enviarlo. | No |
| V4 | No se define el texto del botón "Enviar" cuando la cotización ya está Enviada. | Mantener "Enviar" y explicar dentro del diálogo que no cambia la cotización. | No |
| V5 | La referencia visual muestra una vista previa A4 del PDF dentro del editor; M5 solo genera el PDF bajo demanda. | No se adopta en el MVP; la vista previa del editor es la de totales de M4. | No |
| V6 | No se dice si "Editar cliente" desde el diálogo debe reabrir E2 al guardar. | Al guardar el cliente se vuelve al detalle con E2 abierto y los enlaces recargados. | No (tech plan H5.2) |
