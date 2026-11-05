# Checklist de QA – M5 Documento y envío

## Depende de
- `docs/modules/mod-5-documento-envio/epics.md` (criterios de aceptación de S5.1.1 a S5.2.3).
- `CLAUDE.md` (reglas críticas de i18n, dinero, alcance y API que aplican a M5).

## Estado
Criterios automatizados cubiertos por pruebas unitarias y de rutas (memoria). Quedan pendientes las verificaciones visuales del PDF y la apertura real de WhatsApp y del cliente de correo, que son manuales.

Rutas de prueba usadas:
- `documents.test.ts` = `apps/api/src/modules/documents/infrastructure/documents.test.ts`
- `pdfmake-renderer.test.ts` = `apps/api/src/modules/documents/infrastructure/pdfmake-renderer.test.ts`
- `documents.routes.test.ts` = `apps/api/src/modules/documents/presentation/documents.routes.test.ts`
- `quote-use-cases.test.ts` = `apps/api/src/modules/quotes/application/quote-use-cases.test.ts`
- `app.test.ts` = `apps/api/src/app.test.ts`
- `api lang-parity.test.ts` = `apps/api/src/lang/lang-parity.test.ts`
- `web lang-parity.test.ts` = `apps/web/src/lang/lang-parity.test.ts`
- `quotes.test.tsx` = `apps/web/src/features/quotes/components/quotes.test.tsx`

## S5.1.1 Plantilla PDF con datos y logo de empresa
- [x] S5.1.1.1 Encabezado con logo o, sin logo, el nombre de la empresa — pdfmake-renderer.test.ts › PdfmakeRenderer › uses the company name as brand when there is no logo
- [x] S5.1.1.1 Número `COT-0001`, fechas de emisión y vencimiento, y totales iguales a los de la cotización en el modelo del PDF — documents.test.ts › buildQuotePdfModel › marks a draft as projected with a watermark when viewed internally; documents.test.ts › GenerateQuotePdfUseCase › renders in the documentLocale with the quote totals
- [ ] S5.1.1.1 Revisión visual del PDF completo (datos del cliente, tabla de líneas, totales con %, condiciones comerciales y paginación) — manual, pendiente
- [x] S5.1.1.2 Textos fijos desde la `lang/` del back en `documentLocale` — documents.test.ts › GenerateQuotePdfUseCase › renders in the documentLocale with the quote totals; documents.test.ts › JsonDocumentTranslator › formats money and dates per locale and fills markers; api lang-parity.test.ts › api lang/ › es and en have the same keys
- [x] S5.1.1.3 Montos COP sin decimales y fechas según el idioma — documents.test.ts › JsonDocumentTranslator › formats money and dates per locale and fills markers
- [x] S5.1.1.4 Fuentes embebidas con tildes y ñ — pdfmake-renderer.test.ts › PdfmakeRenderer › renders a valid PDF with a logo, accents and watermark
- [ ] S5.1.1.4 Revisión visual de tildes y ñ en el PDF abierto — manual, pendiente
- [x] S5.1.1.5 Marca de agua "Borrador" con vencimiento previsto en `DRAFT` — documents.test.ts › buildQuotePdfModel › marks a draft as projected with a watermark when viewed internally
- [x] S5.1.1.5 Marca de agua "Anulada" en `VOIDED` y ninguna en Aprobada — documents.test.ts › buildQuotePdfModel › uses the real dates once sent and watermarks voided quotes
- [x] S5.1.1.5 `?purpose=send` sin marca de agua ni leyenda "prevista" (V1) — documents.test.ts › buildQuotePdfModel › generates a clean draft PDF for sending (V1)

## S5.1.2 Generar y descargar PDF
- [x] S5.1.2.1 `application/pdf` con `Content-Disposition: attachment; filename="COT-0001.pdf"` — documents.routes.test.ts › documents routes › downloads the PDF as an attachment and hides foreign quotes
- [x] S5.1.2.1 Cotización ajena para un `SELLER` responde 404 — documents.routes.test.ts › documents routes › downloads the PDF as an attachment and hides foreign quotes
- [x] S5.1.2.1 `purpose` inválido responde 400 `VALIDATION_ERROR` — documents.routes.test.ts › documents routes › rejects an invalid PDF purpose
- [x] S5.1.2.2 Se genera al pedirlo desde el estado actual de la cotización — documents.test.ts › GenerateQuotePdfUseCase › renders in the documentLocale with the quote totals
- [x] S5.1.2.2 Un fallo del generador responde 500 `PDF_GENERATION_FAILED` — documents.test.ts › GenerateQuotePdfUseCase › maps a renderer failure to PDF_GENERATION_FAILED
- [x] S5.1.2.3 100 líneas en menos de 5 s (indicativo) — pdfmake-renderer.test.ts › PdfmakeRenderer › renders 100 lines in less than 5 seconds
- [x] S5.1.2.4 "Descargar PDF" muestra estado de carga y, si falla, un toast con `errors.PDF_GENERATION_FAILED` — quotes.test.tsx › DownloadPdfButton › shows loading while downloading and a toast when the PDF fails

## S5.2.1 "Abrir en WhatsApp" (wa.me)
- [x] S5.2.1.1 `whatsappUrl` = `https://wa.me/<phone>?text=…` con el teléfono normalizado — documents.test.ts › GetShareLinksUseCase › builds an encoded wa.me link and reports the missing email; documents.routes.test.ts › documents routes › shares by WhatsApp, sending the draft, and rejects the missing email channel
- [x] S5.2.1.2 Mensaje con cliente, número, total, vencimiento previsto y vendedor — documents.test.ts › GetShareLinksUseCase › builds an encoded wa.me link and reports the missing email
- [x] S5.2.1.2 Mensaje en `documentLocale` — documents.test.ts › GetShareLinksUseCase › writes the message in the documentLocale
- [x] S5.2.1.3 Sin teléfono: `whatsappUrl` null y botón deshabilitado con explicación — documents.test.ts › GetShareLinksUseCase › builds a mailto link with CRLF line breaks; quotes.test.tsx › SendQuoteDialog › disables the channel without contact data and sends the draft through WhatsApp
- [x] S5.2.1.4 Fuera de `DRAFT` y `SENT` ambos enlaces son null — documents.test.ts › GetShareLinksUseCase › returns no links outside DRAFT and SENT
- [x] S5.2.1 `share-links` de una cotización ajena responde 404 `QUOTE_NOT_FOUND` — documents.routes.test.ts › documents routes › hides share-links and share of a foreign quote from another seller
- [ ] S5.2.1 Abrir el enlace en un teléfono real y comprobar el mensaje prellenado — manual, pendiente

## S5.2.2 "Abrir en correo" (mailto)
- [x] S5.2.2.1 `emailUrl` = `mailto:` con componentes codificados (RFC 6068, CRLF) — documents.test.ts › GetShareLinksUseCase › builds a mailto link with CRLF line breaks
- [x] S5.2.2.2 Asunto con número y nombre de la empresa; cuerpo con la misma plantilla — documents.test.ts › GetShareLinksUseCase › builds a mailto link with CRLF line breaks
- [x] S5.2.2.3 Sin correo: `emailUrl` null y botón deshabilitado — documents.test.ts › GetShareLinksUseCase › builds an encoded wa.me link and reports the missing email; quotes.test.tsx › SendQuoteDialog › disables the channel without contact data and sends the draft through WhatsApp
- [x] S5.2.2.4 El cuerpo recuerda adjuntar el PDF — documents.test.ts › GetShareLinksUseCase › builds a mailto link with CRLF line breaks
- [ ] S5.2.2 Abrir el enlace en un cliente de correo real (Gmail web, Outlook) — manual, pendiente

## S5.2.3 Pasar a Enviada al usar el acceso
- [x] S5.2.3.1 Clic abre el enlace en pestaña nueva y llama a `POST /share` con `{ channel, updatedAt }` — quotes.test.tsx › SendQuoteDialog › disables the channel without contact data and sends the draft through WhatsApp
- [x] S5.2.3.2 `DRAFT` pasa a `SENT` (versión 1); `SENT` no cambia y responde 200 — documents.test.ts › ShareQuoteUseCase › sends a draft and leaves a sent quote unchanged; documents.routes.test.ts › documents routes › shares by WhatsApp, sending the draft, and rejects the missing email channel
- [x] S5.2.3.2 El envío crea versión 1, `STATE_CHANGED`, `sentAt`, `firstSentAt` y `expiresAt` — quote-use-cases.test.ts › send and status changes › sends with version 1, expiry date and a STATE_CHANGED linked to the version
- [x] S5.2.3.2 Canal sin dato, estado no compartible o `updatedAt` desfasado se rechazan — documents.test.ts › ShareQuoteUseCase › rejects unavailable channels, other states and stale updates
- [x] S5.2.3.2 `share` de una cotización ajena responde 404 `QUOTE_NOT_FOUND` — documents.routes.test.ts › documents routes › hides share-links and share of a foreign quote from another seller
- [x] S5.2.3.3 Si `share` falla en un Borrador, muestra el error y ofrece "Marcar como enviada" — quotes.test.tsx › SendQuoteDialog › offers to mark as sent when registering the share fails
- [x] S5.2.3.3 En una Enviada no se ofrece "Marcar como enviada" (evita el 409 de `/send`) — quotes.test.tsx › SendQuoteDialog › does not offer to mark a sent quote as sent when registering the share fails
- [x] S5.2.3.4 El diálogo guía en dos pasos: descargar el PDF limpio y elegir canal — quotes.test.tsx › SendQuoteDialog › downloads the clean PDF from the dialog
- [x] `allowedActions` suma `downloadPdf` siempre y `share` solo en `DRAFT` y `SENT` — documents.test.ts › ShareQuoteUseCase › contributes downloadPdf always and share only in DRAFT and SENT; documents.routes.test.ts › documents routes › adds downloadPdf and share to allowedActions

### Apertura del correo
- [x] "Abrir en correo" abre `mailto:` en la misma pestaña (sin pestaña en blanco) y registra el envío — `web/quotes` › opens the email in the same tab (no blank tab) and registers the share
- [x] "Copiar correo" copia destinatario, asunto y cuerpo para el correo web cuando no hay aplicación de correo — `web/quotes` › copies the email (to, subject and body) for webmail when there is no mail app; `apps/web/src/shared/lib/mailto.test.ts` › reads recipient, subject and CRLF body as built by the API (RFC 6068)
- [ ] Apertura real del cliente de correo en macOS/Windows con y sin aplicación configurada — manual, pendiente

## Reglas críticas de CLAUDE.md
- [x] Cliente inactivo en un Borrador: sin enlaces y con `unavailableReason: CUSTOMER_INACTIVE` (el envío lo rechazaría) — documents.test.ts › GetShareLinksUseCase › returns no links for a draft whose customer is inactive; documents.routes.test.ts › documents routes › returns no links with the reason when the draft customer is inactive
- [x] El diálogo explica el cliente inactivo y no ofrece canales ni "Marcar como enviada" — quotes.test.tsx › SendQuoteDialog › explains that a draft with an inactive customer cannot be sent
- [x] Compartir un Borrador con cliente inactivo responde 400 `CUSTOMER_INACTIVE` — documents.routes.test.ts › documents routes › returns no links with the reason when the draft customer is inactive
- [x] Idioma del documento por `documentLocale`, no por `Accept-Language` — documents.test.ts › GenerateQuotePdfUseCase › renders in the documentLocale with the quote totals; documents.test.ts › GetShareLinksUseCase › writes the message in the documentLocale
- [x] Paridad de claves y marcadores `es`/`en` en back y front — api lang-parity.test.ts › api lang/ markers › es and en use the same {{markers}} in each key; web lang-parity.test.ts › web lang/ › es and en use the same markers per key
- [x] Rutas documentadas en OpenAPI (`/quotes/{id}/pdf`, `/share-links`, `/share`) — app.test.ts › API base › serves the OpenAPI document when docs are enabled
