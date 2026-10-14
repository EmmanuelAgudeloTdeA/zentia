# M9 IA – Épicas

> Fuentes: `docs/fuente/desglose.md` (M9; decisiones 7, 23–25, 29, 41, 52, 60, 67, 75, 77, 79, 139, 161–170), `CLAUDE.md`, `docs/prd.md` (RF-08, RF-09, RNF-05, RN-37 a RN-41, RN-43), `docs/architecture.md` §8.

## Objetivo
Apoyar el seguimiento con un asistente que redacta mensajes sin enviar datos personales ni texto libre al LLM, estimar la probabilidad de cierre con una heurística por reglas, e integrar ambas cosas en las alertas y el dashboard.

**Cubre:** RF-08 (asistente de seguimiento), RF-09 (probabilidad de cierre) y RNF-05 (respuesta de IA en < 5 s p95; la medición formal es de M10).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M1 · H1.2 | Guard y política de alcance |
| M2 · S2.2.3 | `SettingsReader`: `documentLocale`, `followUpDays` (Y), `coldStartThreshold` |
| M3 | Teléfono y correo del cliente (vía `QuoteReader`), para armar los enlaces con el mensaje editado |
| M4 | `QuoteReader`, `QuoteVersion` (versiones posteriores al envío), `QuoteItem.category`, `sentAt` y `expiresAt`; `AllowedActionsContributor` |
| M5 | `DocumentTranslator` (la `lang/` del back) para el prompt y la plantilla de respaldo |
| M6 | Regla "sin seguimiento" (fecha de referencia), interacciones para las señales, lista de notificaciones (ordenamiento) |
| M8 | Punto de extensión `DashboardSection` |

## Lo desbloquea
| Módulo | Qué necesita de M9 |
|---|---|
| M10 | Ruta del asistente para medir el p95 de RNF-05; M10 cierra cuando M9 termina |

---

## H9.1 Asistente
**Objetivo:** sugerir un mensaje de seguimiento editable, generado por el LLM con datos estructurados, con respaldo por plantilla.
**Depende de:** M4, M5 (`DocumentTranslator`), M6 (regla de Y).

### S9.1.1 Interfaz y adaptador Gemini
Como desarrollador del equipo, quiero un puerto `LLMProvider` con un adaptador de Gemini configurable por entorno, para poder cambiar de proveedor sin tocar los casos de uso.
- **RF de origen:** RF-08.2, decisión 7
- **Criterios de aceptación:**
  1. `LLMProvider.generateFollowUp(input, { timeoutMs })` solo acepta el tipo `FollowUpPromptInput` (señales estructuradas); no tiene ningún campo de texto libre.
  2. `GeminiProvider` usa `@google/genai` con `LLM_MODEL` y `LLM_API_KEY`; `LLM_PROVIDER` admite `gemini` y `none`.
  3. Con `LLM_PROVIDER=none` o sin `LLM_API_KEY`, el sistema siempre usa la plantilla de respaldo (desarrollo y pruebas sin red).
  4. El log registra solo metadatos (proveedor, modelo, latencia, resultado, tipo de error), nunca el prompt ni la respuesta.
- **Depende de:** —
- **Tamaño:** M

### S9.1.2 Mensaje sugerido y editable
Como vendedor, quiero que el sistema me sugiera un mensaje de seguimiento que pueda editar antes de usarlo, para contactar al cliente rápido y con mi estilo.
- **RF de origen:** RF-08.1, decisión 23
- **Criterios de aceptación:**
  1. `POST /api/quotes/:id/follow-up-message` (alcance; solo `SENT`) devuelve `{ message, source: 'AI' | 'TEMPLATE', highlighted, contact: { phone, email } }`; en otro estado responde 409 `QUOTE_INVALID_TRANSITION`.
  2. `highlighted` es `true` si la cotización cumple la regla de Y días de M6; el front destaca el asistente en ese caso.
  3. El mensaje está en el idioma de `documentLocale` y llega con `{{CLIENTE}}` y `{{VENDEDOR}}` ya reemplazados por el back.
  4. El front muestra el mensaje en un campo editable con "Copiar", "Abrir en WhatsApp" y "Abrir en correo" (con el texto editado); usarlos no cambia el estado de la cotización.
  5. Después de abrir un enlace, el front ofrece registrar una interacción (M6) prellenada con el mensaje.
- **Depende de:** S9.1.1, S9.1.3, S9.1.4
- **Tamaño:** M

### S9.1.3 Anonimización
Como administrador, quiero que al LLM nunca le lleguen datos personales ni texto libre, para proteger la información de los clientes con el nivel gratuito.
- **RF de origen:** RF-08.3, RN-37, decisiones 52 y 60
- **Criterios de aceptación:**
  1. El input al LLM contiene solo: días sin respuesta, monto aproximado por rangos, hasta 5 categorías del catálogo de la cotización e idioma.
  2. Nunca incluye nombres, documento, teléfono, correo, número de cotización, notas, interacciones, motivos de versión ni `note` de eventos.
  3. Un test construye el input con datos de prueba conocidos y verifica que ninguno de esos valores aparece en el payload enviado al proveedor.
  4. Si la respuesta del LLM trae marcadores distintos de `{{CLIENTE}}` y `{{VENDEDOR}}`, se eliminan; la respuesta se recorta a 600 caracteres.
- **Depende de:** S9.1.1
- **Tamaño:** S

### S9.1.4 Respaldo por plantilla y timeout
Como vendedor, quiero recibir siempre un mensaje aunque la IA falle, para no quedarme sin sugerencia.
- **RF de origen:** RF-08.3, RN-38, RNF-05, decisión 67
- **Criterios de aceptación:**
  1. Cada llamada tiene un timeout de 4 s (`LLM_TIMEOUT_MS`) y no se reintenta.
  2. Ante timeout, error, 429 o respuesta vacía, se devuelve la plantilla `ai.fallback.followUp` de la `lang/` del back con `source: 'TEMPLATE'`, y la respuesta HTTP sigue siendo 200.
  3. La ruta tiene un rate limit de 10 solicitudes por usuario por minuto (429 `RATE_LIMITED`).
  4. Con un proveedor falso que tarda 10 s, la respuesta llega en menos de 5 s.
- **Depende de:** S9.1.1
- **Tamaño:** S

---

## H9.2 Probabilidad de cierre
**Objetivo:** mostrar una estimación por reglas en cada cotización enviada, transparente sobre los factores que la explican.
**Depende de:** M4 (versiones), M6 (interacciones y regla de Y).

### S9.2.1 Heurística por reglas
Como vendedor, quiero ver la probabilidad estimada de cierre de mis cotizaciones enviadas, para priorizar las que tienen más posibilidad.
- **RF de origen:** RF-09.1, RF-09.2, RN-39, RN-40, decisiones 29 y 77
- **Criterios de aceptación:**
  1. La heurística v0 parte de 40 y aplica los ajustes de RN-40 con señales estructuradas; el resultado se acota a 5–95 y se rotula "estimación por reglas".
  2. Solo se calcula para cotizaciones `SENT`; se calcula al vuelo y no se guarda.
  3. `GET /api/ai/probabilities?quoteIds=` (máximo 50; con alcance) devuelve `{ quoteId, probability, factors[] }`; las cotizaciones ajenas o no `SENT` se omiten.
  4. El detalle de la cotización muestra el porcentaje, el rótulo y los factores aplicados; la lista de cotizaciones muestra una columna de probabilidad para las enviadas.
- **Depende de:** M4, M6
- **Tamaño:** M

### S9.2.2 Parámetro de umbral para calibración
Como gerente comercial, quiero saber cuántas cotizaciones cerradas hay frente al umbral, para saber cuándo se podrá calibrar la estimación.
- **RF de origen:** RF-09.2, RN-39, decisiones 77 y 82
- **Criterios de aceptación:**
  1. `GET /api/ai/calibration-status` (`MANAGER`, `ADMIN`) devuelve `{ closedCount, threshold, readyForCalibration }`; cerradas = `APPROVED` + `REJECTED` + `EXPIRED`, excluidas las sintéticas.
  2. `threshold` es `coldStartThreshold` de M2; editarlo es de M2.
  3. Alcanzar el umbral no cambia el cálculo en el MVP: solo lo informa.
- **Depende de:** S9.2.1, M2
- **Tamaño:** S

### S9.2.3 Seed sintético marcado
Como desarrollador del equipo, quiero un seed de datos de demostración claramente marcado, para probar y mostrar el prototipo sin mezclarlo con datos reales.
- **RF de origen:** RN-41, decisión 25
- **Criterios de aceptación:**
  1. `pnpm --filter api seed:demo` crea clientes, productos, cotizaciones en varios estados, versiones e interacciones con fechas distribuidas en los últimos 6 meses.
  2. Todo lo sintético queda marcado: clientes con documento `DEMO…` y nombre con el prefijo `[DEMO]`; productos con el prefijo `[DEMO]` en el nombre.
  3. Se niega a ejecutarse si `NODE_ENV=production`, salvo `ALLOW_DEMO_SEED=true`.
  4. Los datos sintéticos se excluyen del conteo de `calibration-status`.
- **Depende de:** M3, M4, M6
- **Tamaño:** M

---

## H9.3 Integración
**Objetivo:** usar la probabilidad para ordenar las alertas y mostrar las mejores oportunidades en el dashboard.
**Depende de:** H9.2, M6 (H6.3), M8.

### S9.3.1 Ordenar alertas por probabilidad
Como vendedor, quiero ver primero las alertas de las cotizaciones con más probabilidad de cierre, para dedicarles mi tiempo.
- **RF de origen:** RF-07.3
- **Criterios de aceptación:**
  1. `GET /api/notifications` acepta `sort=probability|date`; con M9 activo, el valor por defecto es `probability` (desc) y, a igual probabilidad, por fecha.
  2. Las notificaciones de cotizaciones que ya no están en `SENT` van al final.
  3. El front permite cambiar el orden y muestra la probabilidad en cada alerta.
- **Depende de:** S9.2.1, M6 (H6.3)
- **Tamaño:** S

### S9.3.2 Bloque "mayor probabilidad" en dashboard
Como gerente comercial, quiero ver en el dashboard las oportunidades con mayor probabilidad de cierre, para orientar al equipo.
- **RF de origen:** RF-13.4
- **Criterios de aceptación:**
  1. M9 registra una `DashboardSection` que devuelve las 5 cotizaciones `SENT` con mayor probabilidad dentro del alcance y el filtro por vendedor del dashboard.
  2. Cada fila muestra número, cliente, dueño, total, vencimiento y probabilidad con el rótulo "estimación por reglas".
  3. El bloque usa el estado actual, sin el filtro de período (como "activas").
- **Depende de:** S9.2.1, M8
- **Tamaño:** S
