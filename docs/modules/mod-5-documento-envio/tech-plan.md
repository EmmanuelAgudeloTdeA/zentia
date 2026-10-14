# M5 Documento y envío – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §7–§8; base de M0, M2, M3 y M4.

## 1. Entidades Prisma
M5 no agrega modelos. Lee la cotización, sus líneas y su cliente con `QuoteReader` (M4), y los datos de la empresa con `SettingsReader` (M2). El PDF se genera al pedirlo y no se guarda.

## 2. Endpoints
Todas exigen autenticación y aplican el alcance de M1 (una cotización ajena para un `SELLER` responde 404 `QUOTE_NOT_FOUND`).

| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/quotes/:id/pdf` | Todos (alcance) | — | 200 `application/pdf`, `Content-Disposition: attachment; filename="COT-0001.pdf"` | 404 `QUOTE_NOT_FOUND`, 500 `PDF_GENERATION_FAILED` |
| GET | `/api/quotes/:id/share-links` | Todos (alcance) | — | 200 `{ whatsappUrl: string \| null, emailUrl: string \| null, missing: ('PHONE' \| 'EMAIL')[] }` | 404 |
| POST | `/api/quotes/:id/share` | Todos (alcance) | `{ channel: 'WHATSAPP' \| 'EMAIL', updatedAt }` | 200 `QuoteDto` (de M4) | 404; 409 `QUOTE_INVALID_TRANSITION` (si no es `DRAFT` ni `SENT`), `QUOTE_CONFLICT`; 400 `SHARE_CHANNEL_UNAVAILABLE` (el cliente no tiene el dato del canal) |

- Las rutas viven en el módulo `documents`, pero se montan bajo `/api/quotes/:id/...` para mantener el recurso.
- `allowedActions` de M4 incorpora `downloadPdf` (todos los estados) y `share` (`DRAFT` y `SENT`): M5 registra estas acciones con el punto de extensión `AllowedActionsContributor` de M4 (decisión 136).

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `GenerateQuotePdfUseCase` | `QuoteReader` (M4), `SettingsReader` (M2), `PdfRenderer`, `DocumentTranslator`, `Clock` | Construye `QuotePdfModel` y llama a `render` |
| `GetShareLinksUseCase` | `QuoteReader`, `SettingsReader`, `DocumentTranslator`, `Clock` | Arma wa.me y mailto; la fecha prevista para `DRAFT` es `today() + validityDays` |
| `ShareQuoteUseCase` | `QuoteReader`, `SendQuoteUseCase` (M4) | `DRAFT` → ejecuta el envío; `SENT` → no hace nada; otro estado → `QUOTE_INVALID_TRANSITION` |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `PdfRenderer` | `render(model: QuotePdfModel, locale): Promise<Buffer>` | `PdfmakeRenderer` (fuentes Roboto del VFS de pdfmake, embebidas) |
| `DocumentTranslator` | `t(key, params, locale)`, `formatMoney(value, locale)`, `formatDate(date, locale)` | `JsonDocumentTranslator` sobre `apps/api/src/lang/{es,en}.json` e `Intl` |

`QuotePdfModel = { company: DocumentProfileDto, quote: { displayNumber, status, issueDate, expiresAt, isProjectedExpiry }, customer: { name, documentId, phone, email }, items: [{ productName, quantity, unitPrice, vatRate, lineAmount }], totals: { subtotal, discountPct, discountAmount, linesVat, shippingAmount, shippingVat, total }, watermark: 'DRAFT' | 'VOIDED' | null }`

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Componente | `DownloadPdfButton` (en `QuoteDetailPage`) | Descarga con `blob` y nombre `COT-0001.pdf`; estado de carga y error |
| Componente | `SendQuoteDialog` | Paso 1: descargar PDF. Paso 2: botones WhatsApp y Correo, deshabilitados con explicación si falta el dato |
| Componente | `ShareLinkButton` | `<a href target="_blank" rel="noopener">` con el enlace precargado; en `onClick` llama a `share` sin bloquear la navegación |
| Hook | `useShareLinks(quoteId)` | Carga `share-links` al abrir el diálogo |
| Service | `features/quotes/services/documents.service.ts` | `downloadPdf`, `getShareLinks`, `share` |

La feature visual vive en `features/quotes` (decisión de `architecture.md` §4: M5 no tiene feature propia en el front).

## 5. Claves de `lang/`
**Front (`apps/web/src/lang`)**
- `quotes.actions.downloadPdf`, `quotes.actions.sendDialog`
- `quotes.send.title`, `quotes.send.step1`, `quotes.send.step2`, `quotes.send.whatsapp`, `quotes.send.email`, `quotes.send.missingPhone`, `quotes.send.missingEmail`, `quotes.send.markedSent`, `quotes.send.fallbackMarkSent`
- `errors.PDF_GENERATION_FAILED`, `errors.SHARE_CHANNEL_UNAVAILABLE`

**Back (`apps/api/src/lang`)**, nace con este módulo:
- `pdf.title`, `pdf.number`, `pdf.issueDate`, `pdf.expiresAt`, `pdf.projectedExpiry`, `pdf.company.taxId`, `pdf.customer.title`, `pdf.customer.documentId`, `pdf.customer.phone`, `pdf.customer.email`
- `pdf.table.product`, `pdf.table.quantity`, `pdf.table.unitPrice`, `pdf.table.vatRate`, `pdf.table.amount`
- `pdf.totals.subtotal`, `pdf.totals.discount`, `pdf.totals.linesVat`, `pdf.totals.shipping`, `pdf.totals.shippingVat`, `pdf.totals.total`
- `pdf.commercialTerms`, `pdf.page`, `pdf.watermark.DRAFT`, `pdf.watermark.VOIDED`
- `pdf.vatRate.GENERAL_19`, `pdf.vatRate.REDUCED_5`, `pdf.vatRate.EXEMPT`
- `share.message`, `share.email.subject`, `share.email.body`

## 6. Reglas de negocio
**Mensaje compartido** (`share.message`, `documentLocale`)
- Marcadores: `{{customerName}}`, `{{quoteNumber}}`, `{{total}}`, `{{expiresAt}}`, `{{sellerName}}`, `{{companyName}}`.
- El nombre del vendedor es el del dueño actual de la cotización.

**Enlaces**
| Canal | Formato | Condición |
|---|---|---|
| WhatsApp | `https://wa.me/<phone>?text=<encodeURIComponent(mensaje)>` | `customer.phone` no nulo (ya normalizado sin `+`, decisión 112) |
| Correo | `mailto:<email>?subject=<enc(asunto)>&body=<enc(cuerpo)>` (saltos de línea como `%0D%0A`) | `customer.email` no nulo |
| Ambos | — | Estado `DRAFT` o `SENT` |

**Efecto de `share`**
| Estado | Resultado |
|---|---|
| `DRAFT` | `SendQuoteUseCase` (versión 1, `STATE_CHANGED`, `sentAt`, `firstSentAt`, `expiresAt`) |
| `SENT` | Sin cambios (no renueva `sentAt`) |
| Otro | 409 `QUOTE_INVALID_TRANSITION` |

**PDF**
| Elemento | Regla |
|---|---|
| Fecha de emisión | `firstSentAt`; en `DRAFT`, `today()` |
| Vencimiento | `expiresAt`; en `DRAFT`, `today() + validityDays` con la leyenda "prevista" |
| Marca de agua | `DRAFT` → "Borrador"; `VOIDED` → "Anulada"; otros, ninguna |
| Logo | `logoDataUrl` con `fit: [140, 60]`; sin logo, el nombre de la empresa en texto |
| Montos | `Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` con `es-CO` o `en-US` |
| Tarifa de IVA | Etiqueta de `pdf.vatRate.*` (19 %, 5 %, Exento) |

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `pdf-model.spec` | Unitaria | Construcción del modelo por estado (marca de agua, fechas reales o previstas, logo o texto) |
| `pdfmake-renderer.spec` | Integración | Genera un PDF válido (cabecera `%PDF`), con tildes y ñ; 100 líneas en < 5 s |
| `share-links.spec` | Unitaria | URL de wa.me y mailto codificadas; `null` y `missing` sin teléfono o correo; `null` en estados no permitidos |
| `share.use-case.spec` | Unitaria | `DRAFT` → envío; `SENT` → sin cambios; otro estado → error |
| `document-translator.spec` | Unitaria | Formato de montos y fechas en `es` y `en`; marcadores |
| `documents.routes.spec` | Supertest | Encabezados de la descarga, alcance (404), `SHARE_CHANNEL_UNAVAILABLE` |
| `i18n-parity.spec` (M0) | Unitaria | Ahora incluye la `lang/` del back |
| `send-quote-dialog.spec` | Testing Library | Botones deshabilitados sin dato, apertura del enlace y llamada a `share`, fallback ante error |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 131–138) |
|---|---|
| Fuentes de pdfmake (decisión 79) | Roboto del VFS de pdfmake (incluido en la librería), con tildes y ñ. |
| Logo en el PDF (decisión 79) | Data URL directo en pdfmake, ajustado a 140 × 60 pt; sin logo, el nombre en texto. |
| Usar el acceso en una `SENT` | No renueva `sentAt` ni crea eventos; para registrar el contacto se usa una interacción (M6). |
| El PDF no se adjunta solo | wa.me y mailto no permiten adjuntos; el diálogo guía a descargar primero y el mensaje lo recuerda. |
| Ventanas emergentes | El enlace se abre con un `<a target="_blank">` dentro del clic del usuario; `share` se llama en paralelo, así el navegador no bloquea la pestaña. |
| `share` falla después de abrir WhatsApp | La cotización queda en `DRAFT`; el front muestra el error y ofrece "Marcar como enviada". |
| PDF de `DRAFT` y `VOIDED` | Se permite con marca de agua, para revisión interna. |
| PDF no guardado | Se genera desde el estado actual; las versiones anteriores se consultan en el historial (M4), no como PDF. |
| `lang/` del back | Nace en este módulo con un traductor mínimo (JSON + marcadores + `Intl`), sin librerías nuevas. |
