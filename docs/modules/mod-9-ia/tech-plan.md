# M9 IA – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/prd.md` (RN-37 a RN-41, RN-43), `docs/architecture.md` §8; base de M2, M4, M5, M6 y M8.

## 1. Entidades Prisma
M9 no agrega modelos. La probabilidad se calcula al vuelo (decisión de `architecture.md` §5). Las señales se leen con un repositorio de solo lectura (decisión 72).

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/api/quotes/:id/follow-up-message` | Todos (alcance), rate limit 10/min por usuario | — | 200 `{ message, source: 'AI' \| 'TEMPLATE', highlighted, contact: { phone, email } }` | 404 `QUOTE_NOT_FOUND`; 409 `QUOTE_INVALID_TRANSITION` (no `SENT`); 429 `RATE_LIMITED` |
| GET | `/api/ai/probabilities` | Todos (alcance) | query `{ quoteIds: uuid[] (máx. 50) }` | 200 `{ quoteId, probability, label: 'RULES_ESTIMATE', factors: Factor[] }[]` | 400 `VALIDATION_ERROR` |
| GET | `/api/ai/calibration-status` | `MANAGER`, `ADMIN` | — | 200 `{ closedCount, threshold, readyForCalibration }` | guard |

Extensiones registradas en otros módulos:
- **M4 · `AllowedActionsContributor`:** acción `followUpAssistant` (solo `SENT`).
- **M6 · `NotificationSortProvider`:** `sort=probability`.
- **M8 · `DashboardSection`:** `topProbability`.

`Factor = { code: 'BASE' | 'RECENT_INTERACTION' | 'VERSION_AFTER_SEND' | 'NO_FOLLOW_UP' | 'VALIDITY_CONSUMED', points: number }`.

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `SuggestFollowUpMessageUseCase` | `QuoteReader` (M4), `ProbabilitySignalsReader`, `SettingsReader` (M2), `LLMProvider`, `DocumentTranslator` (M5), `Clock` | Arma `FollowUpPromptInput`; llama con timeout; si falla, usa la plantilla; reemplaza marcadores; recorta a 600 |
| `GetProbabilitiesUseCase` | `ProbabilitySignalsReader`, `SettingsReader`, `Clock` | `scopeFilter`; solo `SENT` |
| `GetCalibrationStatusUseCase` | `ProbabilitySignalsReader`, `SettingsReader` | Cuenta las cerradas no sintéticas |
| `TopProbabilitySection` | `ProbabilitySignalsReader`, `Clock` | Implementa `DashboardSection` de M8 |
| `ProbabilityNotificationSort` | `ProbabilitySignalsReader` | Implementa el ordenamiento de M6 |
| `SeedDemoData` (script) | Casos de uso públicos de M3, M4 y M6 | Datos marcados; bloqueado en producción |

**Dominio (`modules/ai/domain`)**
- `calculateProbability(signals, y): { probability, factors }`: función pura (tabla de la sección 6).
- `approxAmountBucket(total)`: rango del monto.
- `FollowUpPromptInput = { daysWithoutReply: number, amountBucket: AmountBucket, categories: string[] (≤ 5), locale: 'es' | 'en' }`.

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `LLMProvider` | `generateFollowUp(input: FollowUpPromptInput, { timeoutMs }): Promise<string>` | `GeminiProvider` (`@google/genai`), `NullProvider` (`LLM_PROVIDER=none`) |
| `ProbabilitySignalsReader` (solo lectura) | `getSignals(quoteIds, scope)`, `topSent(scope, ownerId?, limit)`, `countClosed({ excludeSynthetic })` → DTOs `{ quoteId, sentAt, expiresAt, referenceDate, lastInteractionAt, versionsAfterSend }` | SQL sobre `Quote`, `QuoteVersion`, `Interaction`; reutiliza la regla de M6 |
| `DocumentTranslator` | `t('ai.prompt.followUp', …)`, `t('ai.fallback.followUp', …)` | M5 |

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Componente | `FollowUpAssistantPanel` (en `QuoteDetailPage`, si está `followUpAssistant`) | Botón "Sugerir mensaje" (destacado si `highlighted`); textarea editable; Copiar, WhatsApp y correo con el texto editado; aviso si `source = TEMPLATE`; ofrecer registrar la interacción |
| Componente | `ProbabilityBadge` | Porcentaje + "estimación por reglas" + tooltip con los factores |
| Componente | `ProbabilityColumn` (en `QuotesListPage`) | Pide `probabilities` para las `SENT` de la página |
| Componente | `TopProbabilitySection` (dashboard) | Tabla de las 5 mejores |
| Componente | `CalibrationStatusCard` (en `CompanySettingsPage`, pestaña Parámetros, solo `MANAGER`/`ADMIN`) | Cerradas frente al umbral |
| Componente | Selector de orden en `NotificationsPage` | Probabilidad o fecha |
| Service | `features/ai/services/ai.service.ts` | `suggestMessage`, `getProbabilities`, `getCalibrationStatus` |

## 5. Claves de `lang/`
**Front**
- `ai.assistant.title`, `ai.assistant.suggest`, `ai.assistant.highlighted`, `ai.assistant.templateNotice`, `ai.assistant.copy`, `ai.assistant.copied`, `ai.assistant.openWhatsapp`, `ai.assistant.openEmail`, `ai.assistant.registerInteraction`
- `ai.probability.label`, `ai.probability.rulesEstimate`, `ai.probability.factors.BASE`, `.RECENT_INTERACTION`, `.VERSION_AFTER_SEND`, `.NO_FOLLOW_UP`, `.VALIDITY_CONSUMED`
- `ai.calibration.title`, `ai.calibration.progress` (marcadores `{{closed}}`, `{{threshold}}`), `ai.calibration.ready`, `ai.calibration.notReady`
- `dashboard.sections.topProbability.title`
- `notifications.sort.probability`, `notifications.sort.date`

**Back**
- `ai.prompt.followUp` (marcadores `{{days}}`, `{{amountRange}}`, `{{categories}}`; instruye usar `{{CLIENTE}}` y `{{VENDEDOR}}`, tono cordial, máximo 500 caracteres)
- `ai.fallback.followUp` (marcadores `{{CLIENTE}}`, `{{VENDEDOR}}`, `{{days}}`)
- `ai.amountBucket.LT_1M`, `.1M_5M`, `.5M_20M`, `.20M_100M`, `.GTE_100M`

## 6. Reglas de negocio
**Heurística v0 (RN-40)**, solo `SENT`
| Factor | Condición | Puntos |
|---|---|---|
| `BASE` | Siempre | +40 |
| `RECENT_INTERACTION` | Hay interacción con `occurredAt ≥ today − Y` | +15 |
| `VERSION_AFTER_SEND` | `versionsAfterSend ≥ 1` (versión ≥ 2) | +10 |
| `NO_FOLLOW_UP` | `today − referenceDate > Y` (regla de M6) | −20 |
| `VALIDITY_CONSUMED` | `(today − date(sentAt)) / (expiresAt − date(sentAt)) ≥ 0,75` y sin interacciones desde `sentAt` | −15 |
| Resultado | `clamp(Σ, 5, 95)`, entero, rótulo "estimación por reglas" | — |

**Monto aproximado** (sobre `Quote.total`, COP)
| Bucket | Rango |
|---|---|
| `LT_1M` | < 1.000.000 |
| `1M_5M` | 1.000.000 – 4.999.999 |
| `5M_20M` | 5.000.000 – 19.999.999 |
| `20M_100M` | 20.000.000 – 99.999.999 |
| `GTE_100M` | ≥ 100.000.000 |

**Input permitido al LLM:** `daysWithoutReply` = `today − referenceDate` (regla de M6); `amountBucket`; hasta 5 categorías distintas de `QuoteItem.category` (orden por monto de línea); `locale` = `documentLocale`.

**Salida:** se reemplazan `{{CLIENTE}}` (nombre del cliente) y `{{VENDEDOR}}` (nombre del dueño actual); se eliminan otros `{{…}}`; máximo 600 caracteres; si queda vacía, se usa la plantilla.

**Variables de entorno:** `LLM_PROVIDER=gemini|none`, `LLM_MODEL` (un modelo Flash de Gemini), `LLM_API_KEY`, `LLM_TIMEOUT_MS=4000`; para el seed: `ALLOW_DEMO_SEED`.

**Marcado sintético:** `Customer.documentId` empieza con `DEMO` y `name` con `[DEMO]`; `Product.name` empieza con `[DEMO]`. Una cotización es sintética si su cliente lo es.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `probability.spec` | Unitaria | Tabla de factores, combinaciones, acotado a 5 y 95, borde exacto de Y y del 75 % |
| `amount-bucket.spec` | Unitaria | Bordes de cada rango |
| `prompt-input.anonymization.spec` | Unitaria | Con nombre, NIT, teléfono, correo, notas y número conocidos, ninguno aparece en el payload serializado del proveedor |
| `suggest-message.use-case.spec` | Unitaria (proveedor falso) | Éxito con marcadores reemplazados; timeout, error, 429 y vacío → plantilla con 200; recorte a 600; marcadores ajenos eliminados |
| `gemini-provider.spec` | Unitaria (cliente simulado) | Uso de `LLM_MODEL`, propagación del timeout con `AbortSignal`, mapeo de errores |
| `probability-signals.repository.spec` | Integración (Postgres + `Clock` fijo) | Señales por cotización; `topSent` con alcance y `ownerId`; `countClosed` sin sintéticos |
| `ai.routes.spec` | Supertest | Alcance; máximo 50 ids; 409 si no es `SENT`; rate limit; `calibration-status` solo `MANAGER`/`ADMIN` |
| `seed-demo.spec` | Integración | Marcas en todo lo creado; se niega en producción sin `ALLOW_DEMO_SEED` |
| `notifications-sort.spec`, `top-probability-section.spec` | Integración | Orden por probabilidad con desempate por fecha; no `SENT` al final; top 5 con alcance |
| `follow-up-assistant.spec` | Testing Library | Edición, enlaces con el texto editado, aviso de plantilla, oferta de registrar la interacción |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 161–170) |
|---|---|
| Monto aproximado (decisión 79) | Cinco rangos fijos, no un monto redondeado, para que no identifique la cotización. |
| Pesos de la heurística (decisión 25) | Se mantienen los de RN-40 en el MVP; calibrarlos queda para cuando `readyForCalibration` sea `true` (fase 2). |
| "Sin interacción" en `VALIDITY_CONSUMED` | Se interpreta como ninguna interacción (de la cotización o del cliente sin cotización, regla de M6) desde el último `sentAt`. |
| Marcado de datos sintéticos | Por convención de prefijos (`DEMO`, `[DEMO]`), sin columnas nuevas en M3 ni M4. |
| Modelo por defecto | `LLM_MODEL` se fija en `.env.example` con el modelo Flash vigente de Gemini; los nombres de modelo cambian, por eso no va en el código. |
| Prompt en `lang/` | El prompt es texto interno, pero va en la `lang/` del back para que siga el idioma de `documentLocale`. |
| Usar el mensaje no cambia el estado | Abrir WhatsApp o correo desde el asistente no toca la cotización; se ofrece registrar la interacción. |
| Rate limit propio | 10 solicitudes por usuario por minuto, para cuidar el límite del nivel gratuito. |
| Contacto en la respuesta | `contact` devuelve el teléfono y el correo del cliente (ya visibles para el usuario) para armar los enlaces con el texto editado; nunca se envían al LLM. |

## Notas de implementación (H9.1, H9.2 y H9.3)
| Punto | Implementación |
|---|---|
| Vacíos del ui-brief | V1: la calibración se muestra en Ajustes (junto al umbral) y como sección del tablero para `MANAGER`/`ADMIN`. V2: WhatsApp o correo deshabilitados con explicación si falta el dato del cliente. V3: confirmación antes de reemplazar un mensaje editado. V4/V5: `ai.assistant.documentLocaleNotice`, `notifications.sort.fallbackNotice` y `ai.probability.rulesEstimateShort`. |
| `> Y` y `≥ Y` | El factor `NO_FOLLOW_UP` de la heurística usa "más de Y días" (RN-40); `highlighted` del asistente usa la regla de M6 (`≥ Y`, RN-33). Las dos fuentes coinciden, no es una contradicción. |
| Destacado al abrir el detalle | El front calcula la regla de M6 con `shared/rules` (última interacción de la cotización o del cliente sin cotización y `sentAt`); al sugerir el mensaje manda el valor del back. |
| Orden de alertas (M6) | Punto de extensión `NotificationProbabilityProvider` en `follow-up`. Con `sort=probability` se traen las notificaciones filtradas del usuario, se ordenan (probabilidad desc → fecha desc, las no `SENT` al final) y luego se paginan. Si la probabilidad falla, se ordena por fecha y el DTO responde `sort: 'date'`, lo que muestra el aviso. La campana pide `sort=date`. |
| Bloques del tablero (M8) | `DashboardSection` puede devolver `null` (se omite). M9 registra `topProbability` (top 5 `SENT` con el alcance y el filtro de vendedor) y `calibration`. |
| Proveedor | `LLM_PROVIDER=gemini|none` (defecto `gemini`, según CLAUDE.md "Defecto: Gemini Flash"; con `none` o sin `LLM_API_KEY` se usa `NullLlmProvider` → siempre plantilla), `LLM_MODEL` (defecto `gemini-3.5-flash-lite`, cambia por entorno), `LLM_API_KEY`, `LLM_TIMEOUT_MS=4000`. `GeminiProvider` usa `AbortSignal.timeout` y `retryOptions.attempts: 1`; solo registra proveedor, modelo, latencia, resultado y tipo de error. |
| Anonimización | El prompt solo lleva días sin respuesta, rango de monto (`ai.amountBucket.*`), hasta 5 categorías y el idioma. El texto devuelto se limpia: se reemplazan `{{CLIENTE}}`/`{{VENDEDOR}}`, se quitan otros marcadores y se recorta a 600 caracteres. |
| Seed de demo | `pnpm --filter @zentia/api seed:demo` (`src/seed-demo.ts`). Usa Prisma directo (los casos de uso fijan las fechas en "ahora") con `shared/calc` y el consecutivo real de `QuoteSequence`. Marca todo como sintético (`[DEMO]`, documento `DEMO…`, `synthetic: true` en el snapshot), es idempotente y se niega a correr en producción sin `ALLOW_DEMO_SEED=true`. `countClosed` excluye a los clientes `DEMO…`. |
| Gemini real | Sin clave en el entorno del proyecto; el adaptador se prueba con un cliente simulado (modelo, `AbortSignal` y mapeo de errores). |

## Nota (2026-11-05): modelo por defecto
- `gemini-2.5-flash` dejó de estar disponible para cuentas nuevas (404). Medición con una clave nueva, sin reintentos: `gemini-3.8-flash`, `gemini-3.7-flash` y `gemini-flash-latest` respondieron 503 por alta demanda; `gemini-3.5-flash` tardó 14–15 s (supera el timeout de 4 s); `gemini-3.5-flash-lite` respondió en 1,0–1,3 s.
- Defecto: `LLM_MODEL=gemini-3.5-flash-lite` (variante Flash, nombre fijo). Se cambia por variable de entorno sin tocar código.

