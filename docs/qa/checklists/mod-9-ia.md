# Checklist de QA – M9 IA

## Depende de
- `docs/modules/mod-9-ia/epics.md` (criterios de aceptación de S9.1.1 a S9.3.2).
- `CLAUDE.md` (reglas de IA: datos permitidos al LLM, timeout, marcadores, respaldo, heurística de probabilidad y datos sintéticos).
- M6 (regla de Y días e interacciones) y M8 (`DashboardSection`).

## Estado
Auditoría de M9 aplicada en la rama `mod-9-ia-auditoria`: los nombres se insertan literales en el mensaje (sin patrones `$`), la demo registra el motivo de las anuladas sin enviar, vence por el día de Bogotá y no crea interacciones antes del envío, y el destacado del asistente lee la última interacción de la cotización y la última del cliente sin cotización (`withoutQuote=true`). Las pruebas de integración (`*.integration.test.ts`) se citan, pero solo corren con `TEST_DATABASE_URL` y no se ejecutaron en esta auditoría. Ninguna prueba llama a Gemini real.

Rutas de prueba usadas:
- `ai-domain.test.ts` = `apps/api/src/modules/ai/domain/ai-domain.test.ts`
- `suggest-follow-up-message.test.ts` = `apps/api/src/modules/ai/application/suggest-follow-up-message.test.ts`
- `llm-providers.test.ts` = `apps/api/src/modules/ai/infrastructure/llm-providers.test.ts`
- `ai-infrastructure.test.ts` = `apps/api/src/modules/ai/ai-infrastructure.test.ts`
- `ai.routes.test.ts` = `apps/api/src/modules/ai/presentation/ai.routes.test.ts`
- `prisma-signals.integration.test.ts` = `apps/api/src/modules/ai/infrastructure/prisma-signals.integration.test.ts`
- `demo-seed.integration.test.ts` = `apps/api/src/demo/demo-seed.integration.test.ts`
- `load-env.test.ts` = `apps/api/src/core/env/load-env.test.ts`
- `ai.test.tsx` = `apps/web/src/features/ai/components/ai.test.tsx`
- `quotes.test.tsx` = `apps/web/src/features/quotes/components/quotes.test.tsx`
- `notifications.test.tsx` = `apps/web/src/features/notifications/components/notifications.test.tsx`

## S9.1.1 Interfaz y adaptador Gemini
- [x] S9.1.1.1 `LLMProvider` recibe solo `FollowUpPromptInput` (señales estructuradas) — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer
- [x] S9.1.1.2 `GeminiProvider` usa el modelo configurado, un prompt localizado y una señal de cancelación — llm-providers.test.ts › GeminiProvider › uses the configured model, a localized prompt and an abort signal
- [x] S9.1.1.2 `LLM_PROVIDER` por defecto `gemini` con Gemini Flash — load-env.test.ts › loadEnv › defaults LLM_PROVIDER to gemini (Gemini Flash)
- [x] S9.1.1.3 Sin `LLM_API_KEY` o con `LLM_PROVIDER=none` se usa la plantilla — ai-infrastructure.test.ts › createPrismaAiInfrastructure › falls back to the template provider when gemini has no API key; ai-infrastructure.test.ts › createPrismaAiInfrastructure › uses the template provider with LLM_PROVIDER=none even with a key
- [x] S9.1.1.3 Con proveedor y clave se usa Gemini — ai-infrastructure.test.ts › createPrismaAiInfrastructure › uses Gemini when the provider is gemini and a key is set
- [x] S9.1.1.4 El log solo lleva metadatos, nunca el prompt ni la respuesta — llm-providers.test.ts › GeminiProvider › never logs the prompt or the response text

## S9.1.2 Mensaje sugerido y editable
- [x] S9.1.2.1 `POST /quotes/:id/follow-up-message` responde 200 con `message`, `source`, `highlighted` y `contact` — ai.routes.test.ts › follow-up message › falls back to the template with real names when the LLM is not available
- [x] S9.1.2.1 Fuera de `SENT` responde 409 `QUOTE_INVALID_TRANSITION`; una ajena, 404 — ai.routes.test.ts › follow-up message › rejects quotes that are not sent, foreign quotes and too many requests
- [x] S9.1.2.2 `highlighted` según la regla de Y días y el front destaca el asistente — ai.routes.test.ts › follow-up message › falls back to the template with real names when the LLM is not available; ai.test.tsx › FollowUpAssistantPanel › highlights the assistant when the Y-day rule applies
- [x] S9.1.2.2 El destacado del detalle ignora interacciones de otras cotizaciones y usa días de Bogotá — ai.test.tsx › useFollowUpHighlight › ignores interactions of other quotes and counts days in Bogotá; ai.test.tsx › useFollowUpHighlight › uses the latest of the own quote interaction and the general customer contact
- [x] S9.1.2.3 Mensaje en el idioma de `documentLocale` — suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › asks the LLM and falls back in the document locale
- [x] S9.1.2.3 `{{CLIENTE}}` y `{{VENDEDOR}}` reemplazados en el back, de forma literal — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer; suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › inserts names literally, without replacement patterns
- [x] S9.1.2.4 Campo editable con "Abrir en WhatsApp" con el texto editado — ai.test.tsx › FollowUpAssistantPanel › opens WhatsApp with the edited text and pre-fills the interaction
- [x] S9.1.2.4 "Abrir en correo" genera un `mailto:` con el texto editado — ai.test.tsx › FollowUpAssistantPanel › opens the email client with a mailto link carrying the edited text
- [x] S9.1.2.4 Sin datos de contacto el canal se deshabilita; con el mensaje vacío, todas las acciones — ai.test.tsx › FollowUpAssistantPanel › shows the template notice, disables channels without contact data and confirms before replacing; ai.test.tsx › FollowUpAssistantPanel › disables every action when the message is emptied
- [ ] S9.1.2.4 Copiar o abrir un canal no cambia el estado de la cotización — manual, pendiente
- [x] S9.1.2.5 Tras abrir un enlace se ofrece registrar la interacción prellenada — ai.test.tsx › FollowUpAssistantPanel › opens WhatsApp with the edited text and pre-fills the interaction

## S9.1.3 Anonimización
- [x] S9.1.3.1 El input solo lleva días, rango de monto, hasta 5 categorías e idioma — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer; ai-domain.test.ts › prompt helpers › amount %s → %s; ai-domain.test.ts › prompt helpers › keeps up to 5 distinct categories by line amount
- [x] S9.1.3.2 Sin nombres, documento, teléfono, correo, número de cotización ni notas — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer
- [x] S9.1.3.3 Prueba con datos conocidos que no aparecen en el payload — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer
- [x] S9.1.3.4 Otros marcadores se eliminan y el texto se recorta a 600 caracteres — ai-domain.test.ts › prompt helpers › replaces the allowed markers, drops any other and trims to 600 characters

## S9.1.4 Respaldo por plantilla y timeout
- [x] S9.1.4.1 Timeout por llamada con señal de cancelación — llm-providers.test.ts › GeminiProvider › uses the configured model, a localized prompt and an abort signal
- [x] S9.1.4.1 Sin reintentos (`retryOptions.attempts = 1`) — llm-providers.test.ts › GeminiProvider › builds the real client without retries
- [x] S9.1.4.2 Respuesta vacía o solo con marcadores → plantilla con `source: 'TEMPLATE'` — suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › uses the template when the LLM answers %j
- [x] S9.1.4.2 Error 429 del proveedor → plantilla — suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › uses the template when the provider fails with 429; llm-providers.test.ts › GeminiProvider › propagates provider errors so the use case falls back to the template
- [x] S9.1.4.2 Sin proveedor disponible → plantilla con nombres reales y HTTP 200 — ai.routes.test.ts › follow-up message › falls back to the template with real names when the LLM is not available
- [x] S9.1.4.3 Rate limit de 10 por minuto (429 `RATE_LIMITED`) — ai.routes.test.ts › follow-up message › rejects quotes that are not sent, foreign quotes and too many requests
- [x] S9.1.4.3 El front muestra `ai.assistant.rateLimited` ante un 429 — ai.test.tsx › FollowUpAssistantPanel › shows the rate limit message when the suggestion answers 429
- [x] S9.1.4.4 Con un proveedor que tarda 10 s la respuesta llega en menos de 5 s — ai.routes.test.ts › follow-up message › answers within the timeout with the template when the LLM hangs

## S9.2.1 Heurística por reglas
- [x] S9.2.1.1 Base 40, ajustes de RN-40 y resultado acotado a 5–95 — ai-domain.test.ts › calculateProbability › starts at 40 for a fresh quote; ai-domain.test.ts › calculateProbability › adds recent interactions and versions after sending; ai-domain.test.ts › calculateProbability › penalizes more than Y days without follow-up (strictly greater, RN-40); ai-domain.test.ts › calculateProbability › penalizes 75 % of the validity consumed without interaction since sending; ai-domain.test.ts › calculateProbability › clamps the result between 5 and 95
- [x] S9.2.1.1 Rótulo `RULES_ESTIMATE` y factores aplicados — ai.routes.test.ts › probabilities and calibration › returns rule-based probabilities only for own sent quotes; ai.test.tsx › ProbabilityBadge › shows the factors on click
- [x] S9.2.1.2 Solo para `SENT` — ai.routes.test.ts › probabilities and calibration › ranks the top 5 sent quotes by probability with the dashboard scope; quotes.test.tsx › closing probability (M9) › asks the probability only for the sent quotes of the list and shows "—" for the rest
- [ ] S9.2.1.2 Se calcula al vuelo y no se guarda — manual, pendiente
- [x] S9.2.1.3 Máximo 50 ids, con alcance; las ajenas se omiten — ai.routes.test.ts › probabilities and calibration › returns rule-based probabilities only for own sent quotes
- [x] S9.2.1.3 Señales con fechas de Bogotá, interacciones desde el envío y versiones posteriores — prisma-signals.integration.test.ts › PrismaProbabilitySignalsReader (integration) › reads Bogotá dates, interactions since sending and versions after sending
- [x] S9.2.1.4 La lista muestra la columna para las enviadas y "—" para el resto — quotes.test.tsx › closing probability (M9) › asks the probability only for the sent quotes of the list and shows "—" for the rest
- [x] S9.2.1.4 El detalle muestra la insignia solo en `SENT` y el asistente solo con la acción `followUpAssistant` — quotes.test.tsx › closing probability (M9) › shows the badge only on a sent quote and the assistant only with its action

## S9.2.2 Parámetro de umbral para calibración
- [x] S9.2.2.1 `GET /ai/calibration-status` solo para `MANAGER` y `ADMIN` — ai.routes.test.ts › probabilities and calibration › shows the calibration status only to managers and admins
- [x] S9.2.2.1 Cerradas = aprobadas + rechazadas + vencidas, sin sintéticas — prisma-signals.integration.test.ts › PrismaProbabilitySignalsReader (integration) › counts closed quotes excluding synthetic customers
- [x] S9.2.2.2 `threshold` = `coldStartThreshold` de M2 — ai.routes.test.ts › probabilities and calibration › shows the calibration status only to managers and admins
- [x] S9.2.2.2 La tarjeta de calibración en el tablero (gerente y administrador) — ai.test.tsx › DashboardSections › renders the top probability block and the calibration card by key; ai.routes.test.ts › probabilities and calibration › ranks the top 5 sent quotes by probability with the dashboard scope
- [ ] S9.2.2.3 Alcanzar el umbral no cambia el cálculo en el MVP — manual, pendiente

## S9.2.3 Seed sintético marcado
- [x] S9.2.3.1 Crea clientes, productos y cotizaciones en varios estados con totales coherentes, una sola vez — demo-seed.integration.test.ts › seedDemoData (integration) › creates marked data once, with several states and consistent totals
- [x] S9.2.3.1 Las anuladas tienen su `STATE_CHANGED` a `VOIDED` con motivo, las interacciones son posteriores al envío y el vencimiento sale del día de Bogotá — demo-seed.integration.test.ts › seedDemoData (integration) › records the void reason, keeps interactions after the send and expires on the Bogotá day
- [x] S9.2.3.2 Clientes `DEMO…` / `[DEMO]` y productos `[DEMO]` — demo-seed.integration.test.ts › seedDemoData (integration) › creates marked data once, with several states and consistent totals
- [x] S9.2.3.3 Se niega en producción salvo `ALLOW_DEMO_SEED=true` — demo-seed.integration.test.ts › assertDemoSeedAllowed › refuses production unless ALLOW_DEMO_SEED is true
- [x] S9.2.3.4 Los sintéticos no cuentan en `calibration-status` — prisma-signals.integration.test.ts › PrismaProbabilitySignalsReader (integration) › counts closed quotes excluding synthetic customers

## S9.3.1 Ordenar alertas por probabilidad
- [x] S9.3.1.1 `sort=probability` por defecto y `sort=date` disponible — ai.routes.test.ts › probabilities and calibration › sorts notifications by probability and leaves resolved quotes at the end
- [x] S9.3.1.2 Las de cotizaciones que ya no están en `SENT` van al final — ai.routes.test.ts › probabilities and calibration › sorts notifications by probability and leaves resolved quotes at the end
- [x] S9.3.1.3 El front cambia el orden y muestra la probabilidad en cada alerta — notifications.test.tsx › NotificationsPage › sorts by probability by default, shows compact badges and the date fallback notice

## S9.3.2 Bloque "mayor probabilidad" en dashboard
- [x] S9.3.2.1 Las 5 `SENT` con mayor probabilidad, en orden descendente, con el alcance y el vendedor del tablero — ai.routes.test.ts › probabilities and calibration › ranks the top 5 sent quotes by probability with the dashboard scope
- [x] S9.3.2.2 Cada fila muestra número, cliente, dueño, total, vencimiento y probabilidad — ai.test.tsx › DashboardSections › renders the top probability block and the calibration card by key
- [x] S9.3.2.3 Sin filtro de período: entran Enviadas cuyo primer envío está fuera del mes elegido — ai.routes.test.ts › probabilities and calibration › ranks the top 5 sent quotes by probability with the dashboard scope

## Reglas críticas de CLAUDE.md
- [x] Al LLM solo van días sin respuesta, monto aproximado y categorías — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer
- [x] Prohibido el texto libre (notas de interacciones) y los datos personales — ai.routes.test.ts › follow-up message › sends only anonymized signals to the LLM and cleans its answer
- [x] Timeout de 4 s sin reintentos — ai.routes.test.ts › follow-up message › answers within the timeout with the template when the LLM hangs; llm-providers.test.ts › GeminiProvider › builds the real client without retries
- [x] Marcadores `{{CLIENTE}}` y `{{VENDEDOR}}` reemplazados por el back — suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › inserts names literally, without replacement patterns
- [x] Falla, timeout o límite → mensaje de respaldo por plantilla — suggest-follow-up-message.test.ts › SuggestFollowUpMessageUseCase › uses the template when the provider fails with 429; ai.routes.test.ts › follow-up message › answers within the timeout with the template when the LLM hangs
- [x] El asistente está en cualquier Enviada y se destaca con la regla de Y días — ai.routes.test.ts › follow-up message › falls back to the template with real names when the LLM is not available; quotes.test.tsx › closing probability (M9) › shows the badge only on a sent quote and the assistant only with its action
- [x] Probabilidad solo en Enviadas, heurística v0 rotulada "estimación por reglas" — ai.routes.test.ts › probabilities and calibration › returns rule-based probabilities only for own sent quotes
- [x] Datos sintéticos solo en demo y marcados — demo-seed.integration.test.ts › seedDemoData (integration) › creates marked data once, with several states and consistent totals
- [x] Plantilla y prompt del back en `lang/` con paridad de claves y marcadores — apps/api/src/lang/lang-parity.test.ts › api lang/ › es and en have the same keys; apps/api/src/lang/lang-parity.test.ts › api lang/ markers › es and en use the same {{markers}} in each key
- [ ] Prueba con Gemini real (clave en staging) para revisar tono y longitud — manual, pendiente
