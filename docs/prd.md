# Zentia – PRD

> Jerarquía de fuentes: `desglose.md` > `CLAUDE.md` > `prd.md` > `ppi-zentia.md` (v1.7). Las reglas de negocio (RN) se definen una sola vez en la sección 3; los requisitos solo las referencian.

**Glosario:** `fechaVencimiento` (documentos) = `expiresAt` (código).

## 1. Objetivo
Gestionar de forma centralizada la creación, la modificación, el envío y el seguimiento de las cotizaciones comerciales de una pyme, con indicadores y apoyo de IA. Cada empresa tiene su propia instalación.

## 2. Módulos
| Módulo | Objetivo | Alcance | Cubre | Depende de |
|---|---|---|---|---|
| M0 Fundación | Base técnica común | H0.1 Monorepo, lint, TS y CI · H0.2 API base · H0.3 Front base | RNF-04, RNF-07 | — |
| M1 Acceso y usuarios | Autenticar y autorizar por rol | H1.1 Autenticación · H1.2 Roles y permisos · H1.3 Gestión de usuarios | RF-10, RNF-03 | M0 |
| M2 Configuración de empresa | Centralizar los parámetros de la empresa | H2.1 Datos y logo · H2.2 Parámetros comerciales | Parámetros de RF-02, RF-03, RF-04, RF-07, RF-09 | M1 |
| M3 Clientes y catálogo | Datos maestros | H3.1 Clientes · H3.2 Catálogo | RF-01 | M1; M2 (blanda) |
| M4 Cotizaciones | Ciclo de vida de la cotización | H4.1 Creación y cálculo · H4.2 Máquina de estados · H4.3 Edición y versiones | RF-02, RF-04, RF-11, RF-12 | M1, M2, M3 |
| M5 Documento y envío | PDF y envío asistido | H5.1 PDF · H5.2 Envío asistido | RF-03, RF-14, RNF-05 | M2, M4 |
| M6 Seguimiento | Interacciones, vencimiento y alertas | H6.1 Observaciones · H6.2 Scheduler · H6.3 Notificaciones in-app | RF-05, RF-07 | M4 (H6.1 solo de M3) |
| M7 Pedidos | Pasar de cotización aprobada a pedido | H7.1 Conversión · H7.2 Estados | RF-06 | M4 |
| M8 Dashboard | Indicadores comerciales por rol | H8.1 Indicadores · H8.2 Alcance por rol | RF-13 | M4, M6 (H6.2); bloque de probabilidad: M9 |
| M9 IA | Asistente de seguimiento y probabilidad de cierre | H9.1 Asistente · H9.2 Probabilidad de cierre · H9.3 Integración | RF-08, RF-09, RNF-05 | M4, M6, M8 |
| M10 Calidad y despliegue | Desplegar y verificar los RNF | H10.1 Despliegue en la nube · H10.2 Verificación | RNF-01, RNF-02, RNF-05, RNF-06 | M5 para empezar; M9 para cerrar |

MVP: M0–M5. M5, M6 y M7 pueden avanzar en paralelo después de M4. M7 no bloquea a ningún módulo.

## 3. Reglas de negocio

### Roles y alcance
| ID | Regla |
|---|---|
| RN-01 | Roles en código: `SELLER`, `MANAGER`, `ADMIN`. Vendedor: ve y edita solo sus cotizaciones. Gerente comercial: ve y gestiona todas; no administra usuarios. Administrador: usuarios, productos, parámetros y todas las cotizaciones. Los tres pueden crear cotizaciones propias y quedan como dueños. |
| RN-02 | El dashboard y la probabilidad de cierre se muestran a todos los roles, filtrados por el alcance de RN-01. |
| RN-03 | Todos los vendedores ven y editan todos los clientes. Las cotizaciones siguen siendo propias. |

### Dinero e impuestos
| ID | Regla |
|---|---|
| RN-04 | Moneda COP sin centavos. Los montos se almacenan como `Decimal(15,0)` y nunca se calculan con decimales flotantes. Montos, cantidades y porcentajes viajan como `string` en la API, validados con un schema Zod compartido. |
| RN-05 | `línea = redondear(precio × cantidad)` · `subtotal = Σ línea` · `descuento = redondear(subtotal × d)` · `ivaLíneas = redondear((1 − d) × Σ(línea × tarifaIva))`, sin redondeo del IVA por línea · `ivaEnvío = redondear(envío × 19 %)` si el parámetro lo activa, si no 0 · `total = subtotal − descuento + ivaLíneas + ivaEnvío + envío`. `redondear` es half-up a peso entero, independiente por concepto. |
| RN-06 | Cantidad y porcentaje de descuento con hasta 2 decimales. |
| RN-07 | El precio del catálogo es sin IVA. Las tarifas son por producto: 19 %, 5 % o exento. Sin retenciones. El "IVA por defecto" de la configuración solo preselecciona la tarifa al crear un producto. |
| RN-08 | El envío es opcional. Si el parámetro de empresa lo activa, el envío grava IVA siempre a la tarifa general (19 %), calculado según RN-05. La cotización guarda el booleano aplicado (snapshot) y el valor calculado. |
| RN-09 | Cada línea guarda un snapshot del precio y la tarifa de IVA al crearse. Los cambios posteriores del catálogo no la afectan. Un producto inactivo no se agrega a cotizaciones nuevas. |
| RN-10 | El cálculo vive en `packages/shared`. El back siempre recalcula e ignora los totales que envíe el cliente. |

### Descuentos
| ID | Regla |
|---|---|
| RN-11 | El descuento es global y en porcentaje. Se guardan el porcentaje y el valor calculado. |
| RN-12 | Límite máximo por rol, configurable (por defecto: vendedor 10 %, gerente y administrador 30 %). El límite aplicable es el del rol de quien aplica el descuento, no el del dueño de la cotización. |
| RN-13 | Un descuento superior al límite del vendedor lo aplica directamente un gerente o un administrador. En una Enviada queda en la versión (usuario, motivo, descuento anterior y nuevo) y no se crea evento; en un Borrador se registra como evento `DISCOUNT_OVERRIDE`. |
| RN-14 | Un vendedor puede editar las líneas de una cotización con descuento superior a su límite, pero no puede modificar el descuento. |

### Consecutivo y conservación de registros
| ID | Regla |
|---|---|
| RN-15 | `Quote.number` es `Int` único, generado en el backend con un contador en tabla (`QuoteSequence`) y bloqueo dentro de la misma transacción de creación, sin huecos. `COT-0001` es solo formato de presentación. |
| RN-16 | Las cotizaciones no se eliminan: se anulan. Clientes, productos y usuarios no se borran: se desactivan. |
| RN-17 | Al desactivar un usuario, sus cotizaciones se conservan. Un gerente o un administrador puede reasignar cualquier cotización a otro usuario; se registra como evento `REASSIGNED` y las notificaciones no leídas de la cotización pasan al nuevo dueño. |

### Estados, transiciones y vigencia
| ID | Regla |
|---|---|
| RN-18 | Estados: Borrador, Enviada, Aprobada, Rechazada, Vencida, Anulada (en código: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `VOIDED`). Toda cotización nace en Borrador. |
| RN-19 | Transiciones: Borrador → Enviada \| Anulada · Enviada → Aprobada \| Rechazada \| Vencida \| Anulada · Vencida → Enviada (reactivación). Aprobada, Rechazada y Anulada son finales. Cualquier otra transición se rechaza. |
| RN-20 | Aprobada y Rechazada las marca manualmente el usuario. `Quote` guarda `sentAt` (último envío), `firstSentAt` y `approvedAt`. Toda transición de estado se registra como evento `STATE_CHANGED`, también cuando la misma operación crea una versión (primer envío, reactivación con cambios); si la hace el job, `actorId` es `null` (sistema). |
| RN-21 | Para anular se exige un motivo, que se guarda en la `note` del evento `STATE_CHANGED` a `VOIDED`; el DTO expone `voidReason` derivado. Una cotización Anulada conserva su número. |
| RN-22 | Un Borrador no vence. Al pasar a Enviada: `fechaVencimiento` (tipo `DATE`) = fecha de envío + N días (N configurable, por defecto 15). La cotización vale hasta el fin de ese día en `America/Bogota`. Se recalcula al reactivar. |
| RN-23 | Solo el dueño, el gerente o el administrador pueden modificar la `fechaVencimiento`, únicamente en una Enviada y con una fecha futura. Se registra como evento `EXPIRY_CHANGED`, sin exigir lo solicitado por el cliente. |
| RN-24 | Una cotización Enviada pasa automáticamente a Vencida por el job diario de las 00:05 (`America/Bogota`) cuando su `fechaVencimiento` ya pasó. El job es idempotente y hace una pasada de recuperación al arrancar. |

### Edición y versiones
| ID | Regla |
|---|---|
| RN-25 | Solo se pueden editar las cotizaciones en Borrador o Enviada ("pendientes"). Editar una Enviada no la devuelve a Borrador. |
| RN-26 | `QuoteVersion` = snapshot inicial al primer envío (versión 1, no es un cambio) + una versión por cada cambio de contenido posterior (líneas, cantidades, descuento, envío), con qué cambió, cuándo, el usuario y lo que solicitó el cliente (obligatorio). Un Borrador se edita sin generar versión. Toda reactivación exige registrar lo solicitado por el cliente: en la versión si hay cambio de contenido; si no, en la `note` del evento `STATE_CHANGED`. |
| RN-27 | Al reactivar una Vencida, el sistema propone actualizar las líneas de productos activos al precio vigente. Las líneas de productos inactivos conservan su snapshot y se muestra un aviso. El usuario confirma antes de aplicar. Reactivar sin cambios de contenido no crea versión. |
| RN-28 | Aprobada, Rechazada y Anulada no se editan. Aprobada y Rechazada se pueden duplicar como Borrador nuevo con precios vigentes; los productos inactivos se omiten con aviso. |
| RN-42 | Los cambios que no son de contenido se registran en `QuoteEvent` (tipos `DISCOUNT_OVERRIDE`, `EXPIRY_CHANGED`, `REASSIGNED`, `STATE_CHANGED`) con fecha, `actorId` opcional (`null` = sistema, mostrado con una clave de `lang/`), `note` opcional y `versionId` opcional. La versión y el evento de una misma operación se crean en una sola transacción y el historial unificado del detalle los agrupa. |

### Pedidos
| ID | Regla |
|---|---|
| RN-29 | Solo se crea un pedido desde una cotización Aprobada, con snapshot de sus líneas y valores. Un pedido por cotización (`Order.quoteId` único), sin reconversión. |
| RN-30 | Estados del pedido: `PENDING` → `IN_PROGRESS` → `DELIVERED` \| `CANCELLED`. Los cambia quien puede editar la cotización de origen. Una Aprobada no se anula; si tiene pedido, se cancela el pedido. No mueve inventario ni factura. |

### Clientes y configuración
| ID | Regla |
|---|---|
| RN-31 | `Customer.documentId` es único, obligatorio y normalizado. El cliente tiene teléfono y correo separados; al menos uno es obligatorio. El teléfono se guarda en formato internacional (se antepone 57 si tiene 10 dígitos). |
| RN-32 | Logo en base64: PNG o JPG, máximo 512 KB decodificados, guardado como data URL en `CompanySettings`. `PUT /company/logo` y `DELETE /company/logo` solo para el administrador, con cuerpo `{ mimeType, data }` y límite de body de 1 MB solo en esa ruta (su parser va antes del `express.json()` global). `GET /company/logo` y `GET /company/branding` (`{ name, hasLogo }`) son públicos, con `Cache-Control` y rate limit. El resto de la configuración exige autenticación y devuelve `hasLogo`, no el logo. |
| RN-43 | `CompanySettings.documentLocale` (por defecto `es`) define el idioma del PDF y del mensaje de IA (incluido el respaldo), en lugar de `Accept-Language`. |

### Seguimiento e indicadores
| ID | Regla |
|---|---|
| RN-33 | Alerta "próxima a vencer": se genera si hoy ≥ `expiresAt` − X y hoy ≤ `expiresAt`; si se edita la fecha, cambia la `referenceDate` y puede generarse una alerta nueva. Alerta "sin seguimiento": Y días desde max(última interacción, último `sentAt`). X e Y son configurables (por defecto X = 3, Y = 5; X ≥ 1, Y ≥ 1, X < días de vigencia). |
| RN-34 | Las alertas las recibe el dueño de la cotización, sea cual sea su rol, únicamente en la app. Las genera el job diario de las 07:00 (`America/Bogota`), idempotente y con pasada de recuperación al arrancar. Se guardan como tipo + parámetros y se deduplican por cotización + tipo + fecha de referencia: para "sin seguimiento", max(última interacción, último `sentAt`) (cada interacción o reenvío abre un ciclo nuevo); para "próxima a vencer", `expiresAt`. El job omite a los dueños inactivos. |
| RN-35 | Tipos de interacción en código: `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `OTHER`; las etiquetas en español e inglés viven solo en `lang/`. |
| RN-36 | Activa = Enviada. Pendiente de seguimiento = Enviada que cumple la regla de Y días. "Activas" y "pendientes de seguimiento" reflejan el estado actual y no dependen del período. Los conteos de aprobadas, rechazadas y vencidas, los montos cotizados, los montos aprobados y la conversión se filtran por `firstSentAt`. Conversión = aprobadas / (aprobadas + rechazadas + vencidas). |

### IA
| ID | Regla |
|---|---|
| RN-37 | Al LLM solo se envían los días sin respuesta, un monto aproximado y las categorías de productos (las categorías del catálogo están permitidas). Está prohibido enviar texto libre escrito por usuarios sobre clientes o cotizaciones (`note`, observaciones, interacciones, motivos de versión) y datos personales (nombres, NIT, teléfonos). El mensaje usa los marcadores `{{CLIENTE}}` y `{{VENDEDOR}}`, que el back reemplaza. |
| RN-38 | Las llamadas al LLM tienen un timeout de 4 s, sin reintentos. Si el LLM falla, supera el timeout o alcanza el límite de peticiones, se usa un mensaje de respaldo por plantilla. |
| RN-39 | La probabilidad de cierre solo se muestra en cotizaciones Enviadas. En el MVP se usa siempre la heurística v0, rotulada "estimación por reglas". El umbral (parámetro, por defecto 30, rango 30–50) solo marca cuándo se podrá calibrar o pasar a un modelo (fase 2). "Datos insuficientes" solo si el tech plan de M9 lo justifica. |
| RN-40 | Heurística v0, solo con señales estructuradas (conteos y fechas): base 40; +15 si hubo interacción en los últimos Y días; +10 si hubo versión posterior al envío; −20 si lleva más de Y días sin interacción; −15 si consumió el 75 % de la vigencia sin interacción; acotada a 5–95. Los pesos se calibran en el tech plan de M9. |
| RN-41 | Los datos sintéticos solo se usan en pruebas y demo, marcados como tales. |

## 4. Requisitos funcionales

**RF-01 Gestión de clientes y catálogo** (M3 · Esencial · Alta)
1. Cualquier vendedor puede crear, editar, consultar, buscar y filtrar clientes, sin importar quién los creó (RN-03, RN-31). El documento del cliente es único y obligatorio.
2. El administrador crea y edita productos o servicios (nombre, precio sin IVA, categoría, tarifa de IVA) según RN-07. La categoría es texto normalizado con autocompletado.
3. Clientes y productos se desactivan, no se borran (RN-16). Los productos inactivos no se pueden agregar a cotizaciones nuevas (RN-09).
4. El catálogo se lista con su categoría.

**RF-02 Creación de cotizaciones** (M4 · Esencial · Alta)
1. Cualquier rol crea una cotización en Borrador y queda como dueño (RN-01), con un cliente y una o más líneas de productos activos (RN-18, RN-09).
2. Recibe un número consecutivo sin huecos (RN-15).
3. Los totales se calculan según RN-04 a RN-10, y cada línea guarda su snapshot.
4. El descuento se valida contra el límite del rol del usuario (RN-11 a RN-14). Si lo supera, la operación se rechaza con un código de error.

**RF-03 Generación de PDF** (M5 · Esencial · Alta)
1. Genera y descarga el PDF de la cotización con el logo y los datos de la empresa (RN-32).
2. Incluye cliente, líneas, descuento, IVA, envío, total, fecha de vencimiento y condiciones comerciales.
3. No contiene texto fijo en el código: todo sale de `lang/` del back, en el idioma de `documentLocale` (RN-43).
4. Se genera en < 5 s en p95 (RNF-05).

**RF-04 Control de estado** (M4; vencimiento automático en M6 · Esencial · Alta)
1. Permite cambiar de estado solo por las transiciones de RN-19. Una transición inválida devuelve un código de error.
2. La anulación exige motivo; el detalle lo muestra como `voidReason` (RN-21).
3. Al enviar se fija `fechaVencimiento` (RN-22), que se puede modificar según RN-23. El job marca las vencidas (RN-24).
4. Gerente y administrador pueden reasignar una cotización (RN-17). Cada cambio de estado se registra como evento (RN-20).
5. Muestra el estado en el detalle y permite filtrar por estado en el listado.

**RF-05 Observaciones por cliente** (M6 · Deseable · Media)
1. Registra una interacción con fecha, tipo (RN-35), nota y, opcionalmente, una cotización.
2. Muestra el historial cronológico de interacciones del cliente.
3. La fecha de la última interacción alimenta la regla "sin seguimiento" (RN-33).

**RF-06 Conversión a pedido** (M7 · Esencial · Alta)
1. Convierte una Aprobada en pedido con snapshot (RN-29). Si la cotización no está Aprobada o ya tiene pedido, responde con un código de error.
2. Permite cambiar el estado del pedido y cancelarlo según RN-30.

**RF-07 Alertas** (M6; orden por probabilidad en M9 · Esencial · Alta · Responsable: Backend)
1. Un job genera las alertas "próxima a vencer" y "sin seguimiento" (RN-33) para el dueño de la cotización (RN-34).
2. La campana muestra el contador de no leídas; hay una sección de notificaciones y se pueden marcar como leídas.
3. Cuando M9 esté disponible, las alertas se ordenan por probabilidad de cierre.

**RF-08 Asistente de seguimiento con IA** (M9 · Esencial · Alta)
1. El asistente está disponible en cualquier Enviada y se destaca cuando cumple la regla de Y días (RN-33). Sugiere un mensaje que el usuario puede editar antes de usarlo.
2. El proveedor se usa a través de `LLMProvider`; el proveedor, el modelo y la API key se definen por variables de entorno (por defecto, Gemini Flash).
3. Cumple RN-37 y RN-38, genera el mensaje en el idioma de `documentLocale` (RN-43) y responde en < 5 s en p95 (RNF-05).

**RF-09 Probabilidad de cierre** (M9 · Deseable · Media)
1. Muestra la probabilidad de aprobación solo en cotizaciones Enviadas (RN-39).
2. En el MVP se usa siempre la heurística v0 rotulada "estimación por reglas" (RN-39, RN-40).
3. Usa solo señales estructuradas (conteos y fechas) de cotizaciones, versiones e interacciones; nunca texto libre (RN-37, RN-40).

**RF-10 Usuarios y roles** (M1 · Esencial · Alta)
1. Login, renovación con refresh token rotativo (`POST /auth/refresh` devuelve `{ accessToken, user }`) y logout. El logout se autentica con la cookie de refresh y responde siempre 204.
2. El administrador crea, edita, desactiva y lista usuarios con uno de los tres roles (RN-16).
3. El administrador restablece la contraseña de un usuario con una contraseña temporal, y ese usuario queda obligado a cambiarla (`mustChangePassword`) en su siguiente acceso.
4. Cada usuario puede cambiar su propia contraseña indicando la actual (incluida la temporal tras un restablecimiento).
5. Cada endpoint aplica autorización por rol y por propiedad (RN-01). Un acceso sin permiso responde con un código de error.

**RF-11 Edición de cotizaciones pendientes** (M4 · Esencial · Alta)
1. Permite agregar, quitar o modificar líneas, cantidades y descuento en Borrador o Enviada (RN-25, RN-14).
2. Al editar una Enviada es obligatorio indicar qué solicitó el cliente, y se genera una versión (RN-26).
3. Permite reactivar una Vencida registrando lo solicitado por el cliente, con actualización de precios confirmada por el usuario (RN-26, RN-27), y duplicar una Aprobada o una Rechazada (RN-28).

**RF-12 Historial de versiones** (M4 · Esencial · Alta)
1. La versión 1 es el snapshot inicial al primer envío. Cada versión posterior registra el cambio de contenido, cuándo, el usuario y lo que solicitó el cliente (RN-26).
2. Los descuentos sobre el límite en Borrador, los cambios de vencimiento, las reasignaciones y toda transición de estado se registran como eventos; versión y evento de una misma operación quedan agrupados (RN-13, RN-17, RN-20, RN-23, RN-42).
3. El detalle de la cotización muestra el historial unificado de versiones y eventos.

**RF-13 Dashboard comercial** (M8; bloque de probabilidad en M9 · Esencial · Alta)
1. Muestra el número actual de cotizaciones activas y pendientes de seguimiento (estado actual, sin filtro de período) y el número de aprobadas, rechazadas y vencidas del período (RN-36).
2. Muestra montos cotizados frente a montos aprobados y la tasa de conversión (RN-36).
3. Es una sola pantalla filtrada por rol (RN-02). Gerente y administrador pueden filtrar por vendedor; todos los roles filtran por período según `firstSentAt` los montos, la conversión y los conteos de cierre (RN-36).
4. Muestra las oportunidades con mayor probabilidad de cierre cuando M9 esté disponible.

**RF-14 Envío asistido** (M5 · Esencial · Alta)
1. Ofrece "Abrir en WhatsApp" (wa.me con mensaje prellenado) y "Abrir en correo" (mailto). Cada botón se deshabilita si falta el dato del cliente (RN-31).
2. Al usar cualquiera de los dos accesos, la cotización pasa a Enviada (RN-19, RN-22) y se crea la versión 1 (RN-26).

## 5. Requisitos no funcionales
| Código | Requisito verificable | Módulo |
|---|---|---|
| RNF-01 | Prueba con 3 a 5 usuarios sin formación técnica: tras 30 min, ≥ 80 % crea una cotización, genera el PDF y cambia su estado sin ayuda. | M10 (H10.2) |
| RNF-02 | Desplegado en la nube y accesible vía web desde navegador, sin instalación local; con migraciones automáticas y endpoint de health. | M10 (H10.1) |
| RNF-03 | Solo son públicas, todas con rate limit: `POST /auth/login`, `POST /auth/refresh`, `GET /company/branding`, `GET /company/logo` y `GET /health` (devuelve solo `{ status: "ok" }`). Todo otro endpoint exige access token; `POST /auth/logout` se autentica con la cookie de refresh. El access token (15 min, en memoria) solo lleva el id; el guard consulta en la BD `role`, `isActive` y `mustChangePassword` en cada petición. Refresh de 7 días rotativo, guardado como hash en `RefreshToken`, en cookie `httpOnly`/`Secure`/`SameSite=Strict` con path `/api/auth` y detección de reutilización. Contraseñas con bcrypt (cost 12, configurable). `/api/docs` deshabilitado por defecto en producción. | M1, M10 |
| RNF-04 | Agregar un módulo (p. ej., bodegas) no exige modificar el `domain` de otros módulos. | M0 |
| RNF-05 | PDF y respuesta de IA en < 5 s en p95, medido en H10.2; la IA tiene timeout y respaldo. | M5, M9, M10 |
| RNF-06 | Los flujos críticos (crear cotización, generar PDF, cambiar estado) funcionan en las dos últimas versiones de Chrome, Edge, Firefox y Safari. | M10 (H10.2) |
| RNF-07 | Clean Architecture por módulo; `no-restricted-imports` por capa y contra imports profundos entre módulos; en `shared/calc` están prohibidos `parseFloat`, `parseInt`, `Number()`, `+x` y `Math.round`; lint con cero warnings; el CI ejecuta lint, typecheck, test y la comparación de claves y marcadores entre `es` y `en` (front y back). | M0 |

## 6. Trazabilidad
| Necesidad | RF / RNF | Módulo |
|---|---|---|
| N-01 Información consolidada para decisiones | RF-04, RF-13 | M4, M8 |
| N-02 Solución acorde al proceso real | RF-01 a RF-14, RNF-01 | M0–M10 |
| N-03 Centralizar clientes, productos y cotizaciones | RF-01, RF-02, RF-03, RF-05, RF-06, RF-14 | M3, M4, M5, M6, M7 |
| N-04 Conocer el estado de cada cotización | RF-04, RF-07, RF-13 | M4, M6, M8 |
| N-05 Priorizar y hacer seguimiento | RF-07, RF-08, RF-09 | M6, M9 |
| N-06 Trazabilidad sin reiniciar la cotización | RF-11, RF-12 | M4 |
| N-07 Probabilidad de cierre | RF-09, RF-13 | M8, M9 |
| N-08 Información organizada del proyecto | Sin RF: cubierta por la documentación | — |
| N-09 Mantenible y escalable | RF-10, RNF-02, RNF-03, RNF-04, RNF-07 | M0, M1, M10 |

## 7. Decisiones confirmadas
La lista completa (1–178) está en `docs/fuente/desglose.md`. Resumen por tema:
| Tema | Decisiones |
|---|---|
| Alcance y arquitectura | 1 (RF-12 esencial), 5 (RF-07/RF-12 backend), 7 (IA en Node), 33 (`decimal.js` en `shared`), 34 (jerarquía de fuentes), 53 (rutas públicas), 54 (`/api/docs` por entorno), 61 (enums en inglés), 62 y 68 (tokens, cookie y mismo dominio), 65 (decimales como string), 67 (bcrypt, timeout IA, test i18n), 70 (guard con BD), 72 (lint y repositorios de solo lectura), 73 (respuesta del refresh), 78 (glosario), 79 (puntos para tech plans), 83 (PPI v1.7), 84–88 (alcance y supuestos de M0), 89 (carpetas de módulos) |
| Dinero y cálculo | 4, 8, 15, 16, 17, 64 |
| Cotizaciones | 3, 9, 13, 14, 28, 31, 35, 36, 37, 38, 41, 43, 44, 45, 46, 50, 51, 55, 57, 59, 63 |
| Indicadores | 10, 11, 12 (reemplazada por 40), 20, 40, 76, 80 |
| Clientes, usuarios y configuración | 6, 18, 19, 26, 27, 30, 32, 42, 48, 49, 56, 60, 75, 81, 90–100 (detalle de M1), 101–109 (detalle de M2), 110–118 (detalle de M3), 119–130 (detalle de M4), 131–138 (detalle de M5), 139–146 (detalle de M6), 147–153 (detalle de M7), 154–160 (detalle de M8), 161–170 (detalle de M9), 171–178 (detalle de M10) |
| Seguimiento e IA | 2, 21 (corregida por 61), 23, 24, 25, 29, 39, 47, 52, 58, 66, 69, 71, 74, 77, 82 |
| Pedidos | 22 |

## 8. Fuera de alcance
Portal del cliente, envío automático por SMTP o por la API de WhatsApp, flujo de solicitud y aprobación de descuentos, descuento por línea, retenciones, inventario, facturación, notificaciones push, multiempresa y correo de recuperación de contraseña.
