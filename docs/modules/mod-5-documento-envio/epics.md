# M5 Documento y envío – Épicas

> Fuentes: `docs/fuente/desglose.md` (M5; decisiones 19, 42, 63, 75, 79, 112, 119, 131–138), `CLAUDE.md`, `docs/prd.md` (RF-03, RF-14, RNF-05, RN-31, RN-32, RN-43), `docs/architecture.md` §7–§8.

## Objetivo
Generar el PDF de la cotización con la imagen de la empresa y ofrecer el envío asistido por WhatsApp (wa.me) y correo (mailto), de modo que usar uno de esos accesos pase la cotización a Enviada.

**Cubre:** RF-03 (PDF), RF-14 (envío asistido) y RNF-05 (PDF en < 5 s p95; la medición formal es de M10).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | Registro de módulos, errores con códigos, OpenAPI, test de paridad i18n (que ahora incluye la `lang/` del back) |
| M1 · H1.2 | Guard y política de alcance |
| M2 · S2.2.3 | `SettingsReader.getDocumentProfile()`: nombre, NIT, dirección, teléfono, correo, `commercialTerms`, `documentLocale`, `logoDataUrl`; `validityDays` para calcular la fecha de vencimiento prevista de un Borrador |
| M3 | Datos del cliente (teléfono normalizado sin `+`, correo) incluidos en `QuoteReader` |
| M4 | `QuoteReader.getForDocument(id, actor)`, `SendQuoteUseCase`, `allowedActions`, `Clock` |

## Lo desbloquea
| Módulo | Qué necesita de M5 |
|---|---|
| M10 | Flujos críticos completos para RNF-01 y RNF-06 (crear → PDF → cambiar estado) y la ruta de PDF para medir el p95 de RNF-05 |
| MVP | Con M5 se cierra el MVP comercial (M0–M5) |

---

## H5.1 PDF
**Objetivo:** un PDF fiel a la cotización, en el idioma del documento y con la imagen de la empresa, generado en menos de 5 s.
**Depende de:** M2 (S2.2.3), M4 (`QuoteReader`).

### S5.1.1 Plantilla PDF con datos y logo de empresa
Como vendedor, quiero que el PDF tenga el logo, los datos de la empresa y las condiciones comerciales, para entregar al cliente una propuesta profesional.
- **RF de origen:** RF-03.1, RF-03.2, RF-03.3, RN-32, RN-43
- **Criterios de aceptación:**
  1. El PDF incluye: encabezado (logo o nombre si no hay logo; NIT, dirección, teléfono, correo), número `COT-0001`, fecha de emisión, fecha de vencimiento, datos del cliente, tabla de líneas (producto, cantidad, precio unitario, tarifa de IVA, valor), totales (subtotal, descuento con su %, IVA, envío, IVA del envío, total), condiciones comerciales y paginación.
  2. Todos los textos fijos salen de la `lang/` del back en el idioma de `documentLocale`; no hay texto escrito en el código.
  3. Montos en COP sin decimales y fechas con formato según el idioma (`es-CO` o `en-US`).
  4. Las fuentes van embebidas y muestran tildes y ñ correctamente.
  5. Un `DRAFT` lleva la marca de agua "Borrador" y la fecha de vencimiento prevista; un `VOIDED`, la marca de agua "Anulada".
- **Depende de:** M2 (S2.2.3), M4
- **Tamaño:** M

### S5.1.2 Generar y descargar PDF
Como vendedor, quiero descargar el PDF de una cotización, para enviarlo o guardarlo.
- **RF de origen:** RF-03.1, RF-03.4, RNF-05
- **Criterios de aceptación:**
  1. `GET /api/quotes/:id/pdf` (con alcance; una ajena para un `SELLER` responde 404 `QUOTE_NOT_FOUND`) devuelve `application/pdf` con `Content-Disposition: attachment; filename="COT-0001.pdf"`.
  2. El PDF se genera al pedirlo, a partir del estado actual de la cotización, y no se guarda.
  3. Con 100 líneas, la generación tarda menos de 5 s en el entorno de prueba (medición indicativa; la formal es de H10.2).
  4. El botón "Descargar PDF" del detalle descarga el archivo y muestra un estado de carga.
- **Depende de:** S5.1.1
- **Tamaño:** S

---

## H5.2 Envío asistido
**Objetivo:** abrir WhatsApp o el correo con un mensaje prellenado y, al usarlos, dejar la cotización en Enviada.
**Depende de:** H5.1 (el vendedor adjunta el PDF descargado), M4 (`SendQuoteUseCase`).

### S5.2.1 "Abrir en WhatsApp" (wa.me)
Como vendedor, quiero abrir WhatsApp con el número del cliente y un mensaje listo, para enviar la cotización en segundos.
- **RF de origen:** RF-14.1, RN-31, decisión 112
- **Criterios de aceptación:**
  1. `GET /api/quotes/:id/share-links` devuelve `whatsappUrl` = `https://wa.me/<phone>?text=<mensaje codificado>`, con el teléfono normalizado del cliente.
  2. El mensaje sale de la `lang/` del back en `documentLocale` e incluye el nombre del cliente, el número, el total y la fecha de vencimiento (la prevista si es `DRAFT`), y el nombre del vendedor.
  3. Si el cliente no tiene teléfono, `whatsappUrl` es `null` y el botón aparece deshabilitado con una explicación.
  4. Solo está disponible para cotizaciones `DRAFT` o `SENT`; en otro estado ambos enlaces son `null`.
- **Depende de:** S5.1.2
- **Tamaño:** S

### S5.2.2 "Abrir en correo" (mailto)
Como vendedor, quiero abrir mi cliente de correo con el destinatario, el asunto y el cuerpo listos, para enviar la cotización por correo.
- **RF de origen:** RF-14.1, RN-31
- **Criterios de aceptación:**
  1. `share-links` devuelve `emailUrl` = `mailto:<email>?subject=<asunto>&body=<cuerpo>`, con los componentes codificados (RFC 6068).
  2. El asunto incluye el número de la cotización y el nombre de la empresa; el cuerpo usa la misma plantilla de mensaje en `documentLocale`.
  3. Si el cliente no tiene correo, `emailUrl` es `null` y el botón aparece deshabilitado.
  4. El cuerpo recuerda adjuntar el PDF descargado.
- **Depende de:** S5.1.2
- **Tamaño:** S

### S5.2.3 Pasar a Enviada al usar el acceso
Como vendedor, quiero que la cotización quede como Enviada cuando uso WhatsApp o el correo, para no tener que marcarla a mano.
- **RF de origen:** RF-14.2, RN-19, RN-22, RN-26
- **Criterios de aceptación:**
  1. Al hacer clic en un acceso, el front abre el enlace en una pestaña nueva (dentro del gesto del usuario) y llama a `POST /api/quotes/:id/share` con `{ channel, updatedAt }`.
  2. Si la cotización está en `DRAFT`, `share` ejecuta `SendQuoteUseCase` (versión 1, `STATE_CHANGED`, `sentAt`, `firstSentAt`, `expiresAt`); si ya está en `SENT`, no cambia nada y responde 200.
  3. Si `share` falla (por ejemplo, `QUOTE_CONFLICT`), el front muestra el error y ofrece "Marcar como enviada" (M4).
  4. El diálogo "Enviar" guía en dos pasos: 1) descargar el PDF, 2) elegir el canal.
- **Depende de:** S5.2.1, S5.2.2, M4 (`SendQuoteUseCase`)
- **Tamaño:** S
