# M9 IA – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-08, RF-09, RN-37 a RN-41, RN-43) y `docs/design/design-system.md`. Formatos de moneda, fechas, estados de carga y textos largos: ver las **Reglas** de `design-system.md`; aquí no se repiten.

## Depende de
| Módulo / hito | Qué necesita la interfaz |
|---|---|
| M4 | Detalle de la cotización (donde vive el asistente y la probabilidad), listado de cotizaciones (columna de probabilidad), acciones permitidas (`followUpAssistant`) |
| M5 · H5.2 | Mismo comportamiento de "Abrir en WhatsApp" y "Abrir en correo" |
| M6 · H6.1 | Formulario para registrar una interacción (se ofrece después de usar el mensaje) |
| M6 · H6.3 | Página de notificaciones (orden por probabilidad) |
| M8 | Tablero con el punto de extensión de bloques |
| M2 · H2.2 | Umbral de calibración (`coldStartThreshold`) e idioma de documentos (`documentLocale`) |

M9 no crea pantallas nuevas: agrega zonas a pantallas de M2, M4, M6 y M8.

## Pantallas (zonas)
| Zona | Pantalla anfitriona | Quién la usa | Cuándo se llega |
|---|---|---|---|
| Asistente de seguimiento (`FollowUpAssistantPanel`) | Detalle de cotización (M4) | Dueño, gerente comercial, administrador (quien ve la cotización) | Al abrir una cotización **Enviada** |
| Probabilidad de cierre (`ProbabilityBadge`) | Detalle de cotización (M4) y listado (M4, columna) | Todos los roles, con su alcance | Al ver una Enviada en el detalle o en el listado |
| Orden de alertas | Notificaciones (M6) | Todos los roles (sus propias alertas) | Desde la campana → "Ver todas" |
| Mayor probabilidad de cierre (`TopProbabilitySection`) | Tablero (M8) | Todos los roles, con su alcance y filtro de vendedor | Al entrar al tablero |
| Estado de calibración (`CalibrationStatusCard`) | Configuración, pestaña "Parámetros comerciales" (M2) | Ver vacío V1 | Al abrir la configuración |

---

## Asistente de seguimiento
**Historias:** H9.1 Asistente (S9.1.2 Mensaje sugerido y editable, S9.1.4 Respaldo por plantilla y timeout).

**Ubicación:** tarjeta `SectionCard` "Asistente de seguimiento" en la columna lateral del detalle, debajo de los datos de contacto. Cuando la cotización cumple la regla de Y días (`highlighted`), la tarjeta sube al primer lugar de la columna y muestra un `Alert` `info` "Lleva {{días}} días sin seguimiento." con el botón en variante `primary`; si no, el botón es `secondary`.

### Datos que muestra
- Antes de pedir: texto de ayuda "Genera un mensaje de seguimiento que puedes editar antes de usarlo."
- Después de pedir: el mensaje en un `TextArea` editable, ya con el nombre del cliente y del vendedor reemplazados (nunca se ven `{{CLIENTE}}` ni `{{VENDEDOR}}`).
- Rótulo del origen: "Sugerido con IA" o, si `source = TEMPLATE`, `Alert` `info` "La IA no respondió; este mensaje sale de una plantilla. Puedes editarlo igual."
- Nota en `caption`: "El mensaje se genera en {{idioma de documentos}}." cuando ese idioma difiere del de la interfaz (RN-43).

### Campos
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Mensaje (`TextArea`) | Sí, para usar Copiar, WhatsApp o correo | Si queda vacío, los tres botones se deshabilitan con la ayuda "Escribe un mensaje para usarlo." |

### Acciones
| Acción | Rol | Resultado |
|---|---|---|
| Sugerir mensaje | Quien ve la cotización (dueño, gerente, administrador) | Llena el campo. Si ya hay texto editado, confirma antes: "¿Reemplazar el mensaje actual?" |
| Copiar | Ídem | Copia el texto editado; toast "Mensaje copiado." |
| Abrir en WhatsApp | Ídem | Abre wa.me con el texto editado. Deshabilitado con explicación si el cliente no tiene teléfono. |
| Abrir en correo | Ídem | Abre el cliente de correo con el texto editado. Deshabilitado con explicación si el cliente no tiene correo. |
| Registrar interacción | Ídem | Tras abrir WhatsApp o correo, aparece un `Alert` con "Registrar interacción", que abre el formulario de M6 prellenado (tipo según el canal, nota = mensaje). |

Usar el mensaje **no** cambia el estado de la cotización (a diferencia del envío de M5); la interfaz no muestra ningún cambio de badge.

### Estados
| Estado | Qué se ve |
|---|---|
| Cargando | Botón "Sugerir mensaje" en carga; el campo muestra un esqueleto de 4 líneas. Máximo ~5 s (timeout de 4 s + respaldo). |
| Vacío | Antes de pedir: solo la ayuda y el botón. |
| Error | `RATE_LIMITED`: aviso en línea "Hiciste muchas solicitudes. Espera un minuto." `QUOTE_INVALID_TRANSITION` (la cotización cambió de estado): toast de error y recarga del detalle; el panel desaparece. Error de red: aviso en línea + "Reintentar". El fallo del LLM **no** es error: llega el mensaje de plantilla. |
| Sin permiso | El panel no se muestra si la acción `followUpAssistant` no está permitida (cotización no Enviada o fuera del alcance). |
| Éxito | Mensaje en el campo; toast al copiar. |

---

## Probabilidad de cierre
**Historias:** H9.2 Probabilidad de cierre (S9.2.1 Heurística por reglas).

### Datos que muestra
- **Detalle:** junto al estado, `ProbabilityBadge` con el porcentaje entero ("62 %") y el rótulo fijo "Estimación por reglas". Al abrirlo (clic o foco, no solo hover) muestra la lista de factores aplicados con sus puntos: "Base +40", "Interacción reciente +15", "Versión después del envío +10", "Sin seguimiento −20", "Vigencia consumida sin interacción −15".
- **Listado:** columna "Probabilidad" con el porcentaje solo en las filas Enviadas; en el resto, "—". En móvil, el porcentaje va en la tarjeta de la fila.
- El badge usa tonos neutros (`info`), no los colores de estado, para no confundirse con "Aprobada"/"Rechazada".

### Acciones
Ninguna: es solo lectura para todos los roles.

### Estados
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto del badge o de la celda; el resto del detalle o de la tabla no espera a la probabilidad. |
| Vacío | Cotización no Enviada: no se muestra nada en el detalle; "—" en el listado. |
| Error | Se muestra "—" con `title` "No se pudo calcular la probabilidad."; no bloquea la página. |
| Sin permiso | Las cotizaciones fuera del alcance no aparecen (las filtra M4). |
| Éxito | Porcentaje visible. |

---

## Orden de alertas
**Historias:** H9.3 Integración (S9.3.1 Ordenar alertas por probabilidad).

- En la página de notificaciones (M6) se agrega un `Select` "Ordenar por": "Probabilidad de cierre" (defecto) o "Fecha".
- Cada alerta muestra el `ProbabilityBadge` compacto (porcentaje + rótulo abreviado "Est. por reglas"); las de cotizaciones que ya no están Enviadas van al final con "—".
- La campana del encabezado no cambia (sigue mostrando las más recientes).
- Estados: los de la página de notificaciones de M6; si falla la probabilidad, la lista se muestra ordenada por fecha con un `Alert` `info` "No se pudo ordenar por probabilidad; se muestran por fecha."

## Mayor probabilidad de cierre (tablero)
**Historias:** H9.3 Integración (S9.3.2 Bloque "mayor probabilidad" en dashboard).

- Tarjeta con título "Mayor probabilidad de cierre", rótulo "Estado actual" y `DataTable` de hasta 5 filas: número (`mono`), cliente, dueño (oculto para el vendedor, que solo ve las suyas), total, vencimiento ("Vence el DD/MM/AAAA") y probabilidad con "Estimación por reglas".
- Clic en una fila → detalle de la cotización.
- Respeta el filtro por vendedor del tablero; no le afecta el período.
- Vacío: "No hay cotizaciones enviadas." Cargando: 5 filas esqueleto. Error: `Alert` `danger` + "Reintentar" solo en este bloque.

## Estado de calibración
**Historias:** H9.2 (S9.2.2 Parámetro de umbral para calibración).

- `KpiCard` informativa junto al campo "Umbral de calibración" de los parámetros: "{{cerradas}} de {{umbral}} cotizaciones cerradas" y una barra de progreso; si `readyForCalibration`, `Alert` `success` "Ya hay datos suficientes para calibrar la estimación (fase 2)."; si no, `caption` "La estimación sigue siendo por reglas."
- Solo lectura; no cambia el cálculo en el MVP. El umbral se edita en M2.

---

## Flujos
- Detalle de Enviada → "Sugerir mensaje" → editar → "Abrir en WhatsApp" o "Abrir en correo" → "Registrar interacción" (M6).
- Detalle de Enviada → "Sugerir mensaje" → editar → "Copiar" → el usuario pega el mensaje en su canal.
- Campana → "Ver todas" → notificaciones ordenadas por probabilidad → detalle de la cotización → asistente destacado.
- Tablero → "Mayor probabilidad de cierre" → detalle de la cotización.

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Solo Enviadas (RF-08.1, RN-39) | Asistente y probabilidad aparecen solo en `SENT`; en cualquier otro estado no se muestran. Al reactivar una Vencida vuelven a aparecer. |
| Regla de Y días (`highlighted`) | El asistente se destaca: sube en la columna, aviso de días sin seguimiento y botón primario. |
| `source = TEMPLATE` (RN-38) | Aviso de que el mensaje viene de una plantilla; el resto del flujo es igual. |
| `documentLocale` ≠ idioma de la interfaz (RN-43) | Nota de que el mensaje está en el idioma de documentos. |
| Cliente sin teléfono o sin correo | El botón correspondiente se deshabilita con explicación visible (igual que M5). |
| Rol `SELLER` | Solo ve probabilidades y bloque del tablero de sus cotizaciones; sin columna "Dueño" en el bloque del tablero. |
| Heurística en el MVP (RN-39) | El rótulo "Estimación por reglas" acompaña siempre al porcentaje; no se presenta como predicción de IA. |

## Vacíos detectados
| # | Vacío | Resolución propuesta | Bloquea |
|---|---|---|---|
| V1 | `CalibrationStatusCard` es para `MANAGER` y `ADMIN`, pero vive en `CompanySettingsPage`, que es solo `ADMIN` (tech plan de M2): el gerente nunca la ve. | Mostrar la tarjeta también en el tablero, como bloque de `DashboardSection` visible solo para `MANAGER`/`ADMIN`; en la configuración queda junto al umbral para el administrador. | No (tech plan M9) |
| V2 | S9.1.2 no dice qué pasa con los botones de WhatsApp y correo si falta el dato del cliente. | Aplicar la misma regla de M5 (S5.2.1.3): deshabilitados con explicación. | No (tech plan M9) |
| V3 | No se define si "Sugerir mensaje" de nuevo sobrescribe un mensaje ya editado. | Confirmar antes de reemplazar ("¿Reemplazar el mensaje actual?"). | No (tech plan M9) |
| V4 | No hay clave de `lang/` para avisar que el mensaje está en el idioma de documentos. | Agregar `ai.assistant.documentLocaleNotice` con `{{language}}`. | No (tech plan M9) |
| V5 | No hay claves para el error de orden por probabilidad ni para el rótulo abreviado en alertas. | Agregar `notifications.sort.fallbackNotice` y `ai.probability.rulesEstimateShort`. | No (tech plan M9) |
