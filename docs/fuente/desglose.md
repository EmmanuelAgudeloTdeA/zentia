# Zentia – Desglose aprobado

Fuente: `ppi-zentia.md` (v1.7). 11 módulos, 27 hitos, ~89 stories.

## Jerarquía de fuentes
`desglose.md` > `CLAUDE.md` > `prd.md` > `ppi-zentia.md`. Ante una contradicción, prevalece la fuente de mayor jerarquía y se avisa; no se resuelve en silencio.

## Decisiones confirmadas
1. RF-12 (versiones) se trata como esencial dentro de M4, porque RF-11 lo necesita.
2. El vencimiento automático lo implementa el scheduler de H6.2 (RF-04 define la regla).
3. Un vendedor puede editar líneas de una cotización con descuento superior a su límite, pero no modificar el descuento.
4. IVA del envío: tarifa general (19 %), activable por parámetro de empresa.
5. RF-07 y RF-12 se implementan como backend (reglas y datos), no como IA.
6. Clientes y productos se desactivan, no se borran.
7. La IA vive en Node detrás de `LLMProvider`; sin servicio Python aparte.
8. Dinero: `Decimal(15,0)` en Prisma, COP sin centavos.
9. Consecutivo `COT-0001` con contador en tabla y bloqueo transaccional.
10. Cotización activa = Enviada. Un Borrador no se cuenta en el dashboard.
11. Conversión = aprobadas / (aprobadas + rechazadas + vencidas). Excluye anuladas, borradores y Enviadas abiertas.
12. ~~Todos los indicadores filtran el período por fecha de envío (`sentAt`).~~ Reemplazada por la 40. Se guarda además `approvedAt`.
13. Un Borrador se edita sin versión. La versión 1 es la foto al enviar; cada edición posterior genera versión con motivo obligatorio. Los cambios que no son de contenido van a `QuoteEvent` (ver 35–37).
14. Duplicar usa precios vigentes del catálogo; los productos inactivos se omiten con aviso.
15. Cantidad y descuento con hasta 2 decimales. Cada línea se redondea half-up a peso entero antes de sumar.
16. El precio del catálogo es sin IVA; el IVA se suma encima.
17. "IVA por defecto" es solo la tarifa preseleccionada al crear un producto. El IVA del envío usa siempre la tarifa general (19 %).
18. Todos los vendedores ven y editan todos los clientes (evita duplicados). Las cotizaciones siguen siendo propias.
19. Cliente con teléfono y correo separados, al menos uno obligatorio. Los botones de envío se deshabilitan si falta el dato. Teléfono en formato internacional (se antepone 57 si tiene 10 dígitos).
20. Las alertas las recibe solo el vendedor dueño; gerente y administrador las ven en el dashboard ("pendientes de seguimiento" = Enviadas que cumplen la regla de Y días). El job omite dueños inactivos. Ajustada por la 69: las recibe el dueño, sea cual sea su rol.
21. ~~Tipos de interacción: `LLAMADA`, `CORREO`, `WHATSAPP`, `REUNION`, `OTRO`.~~ Corregida por la 61: `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `OTHER`.
22. El estado del pedido lo cambia quien puede editar la cotización de origen (dueño, gerente o administrador).
23. RF-08 usa el mismo Y de las alertas: el asistente está disponible en cualquier Enviada y se destaca cuando cumple Y.
24. Mensaje de IA con marcadores `{{CLIENTE}}` y `{{VENDEDOR}}` que el back reemplaza. A la IA solo se envían días sin respuesta, monto aproximado y categorías de productos.
25. Umbral de arranque en frío como parámetro de `CompanySettings` (defecto 30, rango 30–50). Heurística v0 (pesos a calibrar en el tech plan de M9): base 40; +15 si hubo interacción en los últimos Y días; +10 si hubo versión posterior al envío; −20 si lleva más de Y días sin interacción; −15 si consumió el 75 % de la vigencia sin interacción; acotada a 5–95 y rotulada "estimación por reglas". Ajustada por la 77: en el MVP la heurística se usa siempre; el umbral solo marca cuándo calibrar.
26. Al desactivar un usuario sus cotizaciones se conservan; gerente o administrador pueden reasignarlas (story en H4.2).
27. Recuperación de contraseña: el administrador la restablece con contraseña temporal y `mustChangePassword`. Sin correo en el MVP.
28. Un producto inactivo no se agrega a cotizaciones nuevas; las existentes conservan su snapshot.
29. La probabilidad de cierre solo se muestra en cotizaciones Enviadas.
30. Los usuarios se desactivan, no se borran.
31. La fecha de vencimiento la modifica el dueño, el gerente o el administrador, solo en una Enviada y con fecha futura. Se registra en el historial sin exigir "qué pidió el cliente".
32. Logo en base64 dentro del JSON (sin `multer`): PNG/JPG, máximo 512 KB, guardado como data URL en `CompanySettings`.
33. `decimal.js` y cálculo de totales en `packages/shared`, compartido por front y back. El back siempre recalcula e ignora los totales enviados por el cliente.
34. Jerarquía de fuentes: `desglose.md` > `CLAUDE.md` > `prd.md` > `ppi-zentia.md`. Las contradicciones se avisan; no se resuelven en silencio.
35. Entidad `QuoteEvent` para cambios que no son de contenido, con tipos `DISCOUNT_OVERRIDE`, `EXPIRY_CHANGED`, `REASSIGNED`, `STATE_CHANGED` (usuario, fecha y datos del cambio). `Quote` guarda `sentAt` (último envío), `firstSentAt` y `approvedAt`.
36. `QuoteVersion` solo guarda contenido (líneas, cantidades, descuento, envío), con lo solicitado por el cliente. Precisada por la 43.
37. ~~Descuento sobre el límite como `DISCOUNT_OVERRIDE` en cualquier estado editable.~~ Ajustada por la 45. El cambio de vencimiento (31) se registra como `EXPIRY_CHANGED` y la reasignación (26) como `REASSIGNED`.
38. Reactivar con productos inactivos: las líneas de productos activos se actualizan al precio vigente; las de inactivos conservan su snapshot y se muestra un aviso. El usuario confirma antes de aplicar.
39. "Sin seguimiento" cuenta Y días desde max(última interacción, último `sentAt`). ~~Deduplicación por ciclo de envío.~~ Reemplazada por la 47.
40. El período de todos los indicadores se filtra por `firstSentAt`. Precisada por la 76.
41. Redondeo half-up independiente para: importe de cada línea, descuento, IVA de líneas (sobre el total, sin redondeo por línea) e IVA del envío.
42. Logo: límite de body de 1 MB solo en la ruta de subida; se validan 512 KB decodificados. El GET de configuración devuelve `hasLogo` (no el logo) y el logo se sirve por `GET /company/logo`.
43. `QuoteVersion` = snapshot inicial al primer envío (versión 1, no es un cambio) + una versión por cada cambio de contenido posterior.
44. Reactivar sin cambios de contenido no crea versión: se registra `STATE_CHANGED` (Vencida → Enviada) con `note` obligatoria (lo que solicitó el cliente). Si se actualizan precios o se editan líneas, se crea una versión con ese motivo. ~~La IA también lee la `note`.~~ Corregida por la 52.
45. Una sola traza por cambio de descuento: en una Enviada el cambio de descuento queda en la versión (usuario, motivo, descuento anterior y nuevo) y no se crea `DISCOUNT_OVERRIDE`; en un Borrador no hay versión y sí se crea el evento. La regla "el evento solo existe donde no hay versión" aplica solo a `DISCOUNT_OVERRIDE` (acotada por la 50).
46. `QuoteEvent.actorId` es opcional: `null` = sistema (p. ej., el job de vencimiento). El front lo muestra con una clave de `lang/` ("Sistema"). Sin usuario ficticio.
47. Deduplicación de notificaciones por cotización + tipo + fecha de referencia. "Sin seguimiento": referencia = max(última interacción, último `sentAt`); cada interacción o reenvío abre un ciclo nuevo. "Próxima a vencer": referencia = `fechaVencimiento`.
48. `GET /company/logo` es público, con `Cache-Control` y bajo el rate limit. `GET /company/branding` es público y devuelve solo `{ name, hasLogo }` para el login. El resto de la configuración exige autenticación.
49. `PUT /company/logo` (solo administrador) con cuerpo `{ mimeType, data }` en base64 y límite de 1 MB; `DELETE /company/logo`. El parser de esa ruta se registra antes del `express.json()` global (o el global la excluye) para que no la bloquee el límite de 100 KB.
50. `STATE_CHANGED` se registra en toda transición de estado, incluso cuando la misma operación crea una versión (primer envío, reactivación con cambios). La regla "el evento solo existe donde no hay versión" aplica solo a `DISCOUNT_OVERRIDE`.
51. `QuoteEvent.versionId` es opcional. La versión y el evento de una misma operación se crean en una sola transacción, y el historial unificado los agrupa.
52. Ningún texto libre llega al LLM (`note`, observaciones, interacciones, motivos de versión). Solo días sin respuesta, monto aproximado y categorías de productos. La heurística de RF-09 usa solo señales estructuradas (conteos y fechas).
53. Rutas públicas (RNF-03), todas con rate limit: `POST /auth/login`, `POST /auth/refresh`, `GET /company/branding`, `GET /company/logo`, `GET /health`. `/health` devuelve solo `{ status: "ok" }`.
54. `/api/docs` habilitado en desarrollo y deshabilitado por defecto en producción, controlado por una variable de entorno.
55. Gerente y administrador pueden crear cotizaciones propias (quedan como dueños). El límite de descuento depende del rol de quien lo aplica.
56. `POST /auth/logout` se autentica con la cookie de refresh y responde siempre 204. Entidad `RefreshToken` (hash del token, expiración, rotación, revocación).
57. El motivo de anulación se guarda en `QuoteEvent.note` del `STATE_CHANGED` a `VOIDED`. El DTO de la cotización expone `voidReason` derivado de ese evento.
58. Valores por defecto de alertas: X = 3 días, Y = 5 días. Validación: X ≥ 1, Y ≥ 1, X < días de vigencia.
59. `fechaVencimiento` es `DATE`; la cotización vale hasta el fin de ese día en `America/Bogota`. La zona horaria del proceso es `America/Bogota`.
60. `Product.category` es texto normalizado con autocompletado (sin entidad aparte). Precisión de la 52: lo prohibido es el texto libre escrito por usuarios sobre clientes o cotizaciones; las categorías del catálogo sí pueden enviarse al LLM.
61. Enums en inglés en el código (roles, estados de cotización y pedido, tipos de interacción, eventos y notificaciones); las etiquetas en español e inglés viven solo en `lang/`. Corrige la 21.
62. Tokens: access de 15 min solo en memoria; refresh de 7 días rotativo en cookie `httpOnly`, `Secure`, `SameSite=Strict`, path `/auth`, con detección de reutilización. Web y API en el mismo dominio (API bajo `/api`). Path corregido por la 68 (`/api/auth`).
63. `Customer.documentId` único, obligatorio y normalizado. `Order.quoteId` único: un pedido por cotización, sin reconversión. `Quote.number` es `Int` único; `COT-0001` es solo formato de presentación.
64. `Quote` guarda el booleano de IVA del envío (snapshot del parámetro) y el valor calculado.
65. Los campos decimales (montos, cantidades, porcentajes) viajan como `string` en la API, con un schema Zod compartido.
66. Jobs diarios en `America/Bogota`: vencimiento a las 00:05 y alertas a las 07:00. Son idempotentes y hacen una pasada de recuperación al arrancar.
67. bcrypt con cost 12 configurable. Timeout de la IA de 4 s sin reintentos. Test de CI que compara claves y marcadores entre `es` y `en` (front y back).
68. La cookie de refresh usa path `/api/auth`. Corrige el path de la 62.
69. Las alertas las recibe el dueño de la cotización, sea cual sea su rol. Ajusta la 20.
70. El access token solo lleva el id del usuario (`sub`). El guard consulta el usuario por PK en cada petición y usa `role`, `isActive` y `mustChangePassword` de la BD; `mustChangePassword` deja de ser claim. Residuo aceptado: tras restablecer una contraseña, un access token robado sigue vivo hasta 15 min.
71. Alerta "próxima a vencer": se genera si hoy ≥ `expiresAt` − X y hoy ≤ `expiresAt`. Si se edita la fecha, cambia la `referenceDate` y puede generarse una alerta nueva (aceptado).
72. Aprobados: `no-restricted-imports` por capa y contra imports profundos entre módulos; repositorios de solo lectura en `dashboard`, `ai` y `follow-up` (solo lectura, devuelven DTOs, viven en su `infrastructure`); regla de lint en `shared/calc` que prohíbe `parseFloat`, `parseInt`, `Number()`, `+x` y `Math.round`, usando `Decimal.clone()` con `ROUND_HALF_UP`.
73. `POST /auth/refresh` devuelve `{ accessToken, user }`.
74. Al reasignar una cotización, sus notificaciones no leídas pasan al nuevo dueño.
75. `CompanySettings.documentLocale` (por defecto `es`) define el idioma del PDF y del mensaje de IA, en lugar de `Accept-Language`.
76. Dashboard: "activas" y "pendientes de seguimiento" reflejan el estado actual y no dependen del período; montos cotizados, montos aprobados y conversión se filtran por `firstSentAt`. Precisa la 40.
77. Probabilidad de cierre: en el MVP la heurística v0 se usa siempre, rotulada "estimación por reglas"; el umbral solo marca cuándo se podrá calibrar o pasar a un modelo (fase 2). "Datos insuficientes" solo si el tech plan de M9 lo justifica. Ajusta la 25.
78. Glosario: `fechaVencimiento` (documentos) = `expiresAt` (código).
79. Puntos a resolver en los tech plans (lista en `architecture.md` §10): seed del primer ADMIN, política de contraseñas, refresh de la sesión actual al cambiar la propia contraseña, trust proxy, concurrencia optimista en cotizaciones, fuentes de pdfmake y logo en el PDF, `referenceDate` como `DATE` en Bogotá, monto aproximado para la IA, normalización de `documentId` y `category`, agregaciones SQL del dashboard.
80. Dashboard: los conteos de aprobadas, rechazadas y vencidas se filtran por período (`firstSentAt`), igual que los montos y la conversión. Completa la 76.
81. Cambiar la propia contraseña exige la contraseña actual, incluida la temporal tras un restablecimiento. Así, un access token robado no permite tomar la cuenta; el residuo de la 70 queda limitado a leer y operar durante hasta 15 min.
82. La story "umbral de arranque en frío" de H9.2 pasa a llamarse "parámetro de umbral para calibración" (coherente con la 77).
83. PPI v1.7: RF-09 se alinea con la 77 (heurística siempre en el MVP; sin "datos insuficientes").
84. El schema Zod de decimales como `string` (decisión 65) vive en `packages/shared` y lo entrega M0 (S0.2.3), junto al catálogo de errores.
85. `GET /health` se mantiene en H10.1; M0 no lo incluye.
86. M0 incluye, dentro de sus stories: el `http-client` del front (S0.3.1), la inicialización de git con commit `:tada:` (S0.1.1) y el catálogo de errores en `shared` con los códigos base `VALIDATION_ERROR`, `MALFORMED_JSON`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `INTERNAL_ERROR` (y en el front `NETWORK_ERROR` y `UNKNOWN`) (S0.2.3).
87. `cors` se mantiene, restringido a `CORS_ORIGIN`, aunque web y API compartan dominio.
88. CI con GitHub Actions; Node 24 LTS fijado en `engines` y `.nvmrc`; el idioma elegido en el front se guarda en `localStorage`; variable `TRUST_PROXY` (por defecto `false`, M10 fija el valor de producción); en M0 Prisma no tiene modelos y la primera migración real la crea M1.
89. Carpetas de documentación de módulos: `docs/modules/mod-<N>-<nombre>/` en kebab-case resumido: `mod-0-fundacion`, `mod-1-acceso-usuarios`, `mod-2-configuracion-empresa`, `mod-3-clientes-catalogo`, `mod-4-cotizaciones`, `mod-5-documento-envio`, `mod-6-seguimiento`, `mod-7-pedidos`, `mod-8-dashboard`, `mod-9-ia`, `mod-10-calidad-despliegue`.
90. El refresh token es opaco (32 bytes aleatorios, base64url) y en la BD solo se guarda su SHA-256; `jose` solo firma el access token. Se elimina `JWT_REFRESH_SECRET`.
91. Ventana de gracia de 10 s en el refresh: un token rotado presentado dentro de ese plazo responde 409 `REFRESH_IN_PROGRESS` sin revocar la familia; después, se revoca la familia (401 `REFRESH_TOKEN_REUSED`). El front serializa el refresh entre pestañas con `navigator.locks`.
92. Política de contraseñas: 10–72 bytes en UTF-8, al menos una letra y un número, distinta del correo y de la actual. La contraseña temporal (12 caracteres) la genera el servidor y se muestra una sola vez, al crear el usuario y al restablecerla.
93. Cambiar la propia contraseña revoca todos los refresh tokens del usuario y emite una familia nueva para la sesión actual.
94. Rate limits: login, 5 intentos fallidos por IP + correo cada 15 min; refresh y logout, 60 por IP por minuto.
95. `GET /users/options` (`MANAGER`, `ADMIN`) devuelve los usuarios activos `{ id, name, role }`; lo usan M4 (reasignar) y M8 (filtro por vendedor).
96. Reactivar un usuario se hace con `PATCH /users/:id` `{ isActive: true }`.
97. Protecciones del administrador: no puede desactivarse ni quitarse el rol `ADMIN` a sí mismo (`CANNOT_MODIFY_SELF`) y siempre debe quedar al menos un `ADMIN` activo (`LAST_ADMIN`).
98. Con alcance `OWN`, acceder a un recurso ajeno responde el código de "no encontrado" del módulo (no 403), para no revelar que existe.
99. El login de un usuario inactivo responde `INVALID_CREDENTIALS`, igual que una contraseña incorrecta (sin enumeración de usuarios).
100. Hasta que exista M2, el login muestra `app.name`; con M2 usa `GET /company/branding`.
101. `CompanySettings.logoVersion` (entero) aumenta en cada subida o eliminación efectiva del logo; se usa en el `ETag` de `GET /company/logo` y en el `?v=` del front.
102. Enum `DocumentLocale` (`es`, `en`) para `CompanySettings.documentLocale`.
103. Rangos de parámetros: `validityDays` 1–365; `followUpDays` (Y) 1–90; además, X ≥ 1, X < `validityDays` y umbral 30–50 (decisiones 25 y 58).
104. La edición de configuración se divide en `PATCH /company/profile` (datos, `commercialTerms`, `documentLocale`) y `PATCH /company/parameters` (parámetros comerciales).
105. `CompanySettings.name` empieza en `null`; mientras esté vacío, el front muestra `app.name`.
106. `GET /company/settings` lo puede leer cualquier usuario autenticado (sin el logo, con `hasLogo`).
107. No se exige orden entre los límites de descuento por rol.
108. `SettingsReader` lee la fila en cada llamada (sin caché en el MVP); si H10.2 mide un problema, se agrega caché con invalidación.
109. Edición concurrente de la configuración: gana la última escritura.
110. M3 depende también de M2 (S2.2.3), de forma blanda: solo usa `defaultVatRate` para preseleccionar la tarifa. No cambia el orden de ejecución.
111. Normalización de `documentId`: mayúsculas y solo `[0-9A-Z]` (sin espacios, puntos ni guiones), longitud 5–20; no se valida el dígito de verificación del NIT. El front avisa de posibles duplicados por prefijo.
112. Teléfono del cliente: solo dígitos, con indicativo y sin `+` (formato de wa.me); si tiene 10 dígitos se antepone `57`; válido entre 11 y 15 dígitos.
113. Un cliente inactivo no se puede usar en cotizaciones nuevas (misma regla que los productos); las existentes no cambian.
114. El precio de un producto debe ser mayor que 0.
115. La categoría se guarda en dos columnas: `category` (forma escrita) y `categoryKey` (minúsculas, sin tildes, espacios colapsados). Una categoría equivalente reutiliza la forma escrita existente.
116. La pantalla de productos es visible para todos los roles: solo lectura para `SELLER` y `MANAGER`; `ADMIN` edita y ve inactivos.
117. Códigos de error nuevos de M3 para M4: `CUSTOMER_INACTIVE` y `PRODUCT_INACTIVE`.
118. El producto no tiene unidad de medida en el MVP.
119. M4 tiene un botón propio "Marcar como enviada" (`POST /quotes/:id/send`) para envíos por otros canales, además de los accesos de M5.
120. Concurrencia optimista: toda mutación de una cotización (salvo crear y duplicar) envía el `updatedAt` leído; si no coincide, 409 `QUOTE_CONFLICT` y el front ofrece recargar.
121. Aprobar o rechazar una `SENT` con `expiresAt < hoy` (antes de que corra el job) responde 409 `QUOTE_EXPIRED`.
122. Duplicar: el dueño de la copia es el actor; el descuento se copia solo si no supera el límite del rol del actor; si lo supera, queda en 0 y la respuesta lo indica (`discountReset`).
123. El cliente de una cotización solo se puede cambiar en `DRAFT` (`QUOTE_CUSTOMER_LOCKED` en `SENT`).
124. El snapshot de `shippingTaxable` se toma al crear la cotización y no cambia al editarla ni al reactivarla; duplicar toma el parámetro vigente.
125. Reasignar se permite en cualquier estado salvo `VOIDED`.
126. Un producto no puede repetirse en las líneas de una cotización (`DUPLICATE_PRODUCT_LINE`); máximo 100 líneas.
127. `Quote.createdById` registra quién creó la cotización, distinto de `ownerId` (dueño actual).
128. El puerto `Clock` vive en `core/` (nace con M4 y lo reutilizan M6, M8 y M9).
129. M4 expone el punto de extensión `QuoteReassignedListener`, que se ejecuta dentro de la transacción de reasignación; M6 lo usa para traspasar notificaciones.
130. Códigos de error nuevos de M4: `QUOTE_CONFLICT`, `QUOTE_EXPIRED`, `QUOTE_EMPTY`, `QUOTE_CUSTOMER_LOCKED`, `QUOTE_NOT_DUPLICABLE`, `DUPLICATE_PRODUCT_LINE`, `INVALID_EXPIRY_DATE`, `REASSIGN_TARGET_INVALID`, `REASSIGN_SAME_OWNER`.
131. Usar WhatsApp o correo en una cotización `SENT` no cambia nada (no renueva `sentAt` ni crea eventos); el contacto se registra como interacción (M6).
132. Se puede generar el PDF en cualquier estado: `DRAFT` con marca de agua "Borrador" y vencimiento previsto (hoy + `validityDays`), `VOIDED` con marca de agua "Anulada".
133. El PDF no se guarda: se genera al pedirlo con el estado actual de la cotización.
134. El mensaje de WhatsApp y de correo sale de la `lang/` del back en `documentLocale`, con marcadores (`customerName`, `quoteNumber`, `total`, `expiresAt`, `sellerName`, `companyName`).
135. El acceso se abre con `<a target="_blank">` dentro del clic y `POST /quotes/:id/share` se llama en paralelo; si falla, la cotización queda en `DRAFT` y el front ofrece "Marcar como enviada".
136. `allowedActions` de M4 incorpora `downloadPdf` (todos los estados) y `share` (`DRAFT`, `SENT`), registradas por M5 mediante el punto de extensión `AllowedActionsContributor` de M4.
137. Códigos de error nuevos de M5: `PDF_GENERATION_FAILED`, `SHARE_CHANNEL_UNAVAILABLE`.
138. PDF: fuentes Roboto del VFS de pdfmake (embebidas, con tildes y ñ); logo como data URL ajustado a 140 × 60 pt; sin logo, el nombre de la empresa en texto.
139. Para "sin seguimiento", la última interacción es la más reciente entre las vinculadas a la cotización y las del mismo cliente sin cotización vinculada.
140. Las interacciones son de solo agregar: no se editan ni se borran.
141. `occurredAt` de una interacción puede ser pasado (por defecto, ahora) pero no futuro (`INTERACTION_FUTURE_DATE`).
142. Un `SELLER` ve las interacciones del cliente sin cotización vinculada y las de sus cotizaciones; no ve las vinculadas a cotizaciones ajenas. `MANAGER` y `ADMIN` ven todas.
143. Las notificaciones de cotizaciones que ya no están en `SENT` no se borran ni se marcan solas; el front las muestra atenuadas como "resueltas".
144. La campana consulta el contador de no leídas cada 60 s mientras la pestaña está visible.
145. La pasada de recuperación al arrancar ejecuta primero `expire-quotes` y luego `follow-up-alerts`.
146. Códigos de error nuevos de M6: `INTERACTION_QUOTE_MISMATCH`, `INTERACTION_FUTURE_DATE`, `NOTIFICATION_NOT_FOUND`.
147. El número visible del pedido es `PED-` + el número de la cotización (`PED-0001`); no hay secuencia propia.
148. El pedido no guarda dueño: su alcance usa el dueño actual de la cotización de origen (la reasignación de M4 también lo mueve).
149. `Order` guarda `inProgressAt`, `deliveredAt`, `cancelledAt` y `cancelReason`.
150. El motivo de cancelación del pedido es opcional (hasta 500 caracteres).
151. La conversión a pedido es una acción explícita del usuario, no ocurre al aprobar.
152. Un pedido cancelado deja la cotización `APPROVED` sin reconversión; si el negocio se retoma, se duplica la cotización.
153. Códigos de error nuevos de M7: `QUOTE_NOT_APPROVED`, `ORDER_ALREADY_EXISTS`, `ORDER_NOT_FOUND`, `ORDER_INVALID_TRANSITION`, `ORDER_CONFLICT`.
154. Los montos del dashboard suman el `total` actual de cada cotización (su última versión), no el del primer envío.
155. Las cotizaciones anuladas no suman en el monto cotizado del dashboard.
156. Período del dashboard: por defecto el mes en curso; `from` y `to` inclusivos en Bogotá; máximo 366 días (`DASHBOARD_INVALID_PERIOD`).
157. Si un `SELLER` envía `ownerId` al dashboard, se ignora y se aplica su propio alcance (sin error).
158. El filtro por vendedor del dashboard solo lista usuarios activos; los datos de inactivos se incluyen en "Todos".
159. El dashboard es la página de inicio (`/`) de los tres roles.
160. `conversionRate` viaja como `string` con 2 decimales (porcentaje) o `null` si no hay cotizaciones cerradas. Índice nuevo `Quote(ownerId, firstSentAt)`.
161. Monto aproximado para la IA en 5 rangos fijos: < 1M, 1–5M, 5–20M, 20–100M, ≥ 100M COP.
162. En el factor `VALIDITY_CONSUMED` de la heurística, "sin interacción" significa ninguna interacción (regla de M6) desde el último `sentAt`.
163. Datos sintéticos marcados por convención: `Customer.documentId` con prefijo `DEMO`, nombres de clientes y productos con prefijo `[DEMO]`; `seed:demo` bloqueado en producción salvo `ALLOW_DEMO_SEED=true`; excluidos del conteo de calibración.
164. `LLM_PROVIDER=gemini|none`; con `none` o sin `LLM_API_KEY` siempre se usa la plantilla de respaldo. `LLM_MODEL` se fija en `.env.example`, no en el código.
165. El prompt del asistente vive en la `lang/` del back (`ai.prompt.followUp`), en el idioma de `documentLocale`.
166. El asistente devuelve el teléfono y el correo del cliente para armar los enlaces con el texto editado (nunca van al LLM); usar el mensaje no cambia el estado y el front ofrece registrar la interacción.
167. La respuesta del LLM se recorta a 600 caracteres y se eliminan los marcadores distintos de `{{CLIENTE}}` y `{{VENDEDOR}}`.
168. Rate limit del asistente: 10 solicitudes por usuario por minuto.
169. Con M9 activo, las alertas se ordenan por defecto por probabilidad (desc) y luego por fecha; las de cotizaciones que no están en `SENT` van al final.
170. M6 expone el punto de extensión `NotificationSortProvider` (parámetro `sort` en `GET /notifications`), que M9 implementa.
171. Proveedor cloud: Render (servicio web con Docker, HTTPS administrado y PostgreSQL administrado con backups diarios); Railway queda como alternativa equivalente.
172. Express sirve la web compilada (`apps/web/dist`) en `/` y la API en `/api`, en el mismo origen y sin proxy adicional.
173. `GET /api/health` verifica también la base (`SELECT 1` < 1 s): 200 `{ status: "ok" }` o 503 `{ status: "error" }`, sin detalles.
174. Dos entornos por empresa: `staging` (con `seed:demo`) y `production` (sin datos sintéticos); una sola instancia por empresa, con `SCHEDULER_ENABLED=true`.
175. Despliegue automático desde `main`, solo si el CI pasa; el contenedor ejecuta `prisma migrate deploy`, luego el seed idempotente y luego la app.
176. `TRUST_PROXY=1` en producción (un proxy HTTPS delante).
177. Criterio de RNF-01: se cumple si al menos el 80 % de los participantes completa las tres tareas sin ayuda. La evidencia de RNF-01, RNF-05 y RNF-06 queda en `docs/qa/`.
178. Para producción real se recomienda un plan sin suspensión por inactividad; cerrar RNF-06 requiere un equipo con Safari (macOS o iOS).
179. Navegación del layout privado: horizontal en el encabezado desde 1024 px y panel lateral (drawer) en pantallas menores (design system D1). Reemplaza "navegación lateral" de S0.3.3.
180. En la interfaz, la moneda se muestra como `$5.375.000` (sin decimales) y las fechas como `DD/MM/AAAA`, en ambos idiomas (design system D2 y D3).
181. Fuente Inter autoalojada en `apps/web/public/fonts/` (sin `@fontsource/inter`) e iconos SVG propios en `apps/web/src/shared/ui/icons/` (sin librería de iconos) (design system D4 y D5).
182. El estado de una cotización no se cambia desde la tabla del listado; las transiciones se hacen desde el detalle con su diálogo (design system D6).
183. El sistema de diseño vive en `docs/design/design-system.md` y cada módulo con interfaz tiene `ui-brief.md`; los componentes base del front viven en `apps/web/src/shared/ui/`.
184. Se aprueba `jsdom` (devDependency de `apps/web`) como entorno de Vitest para los tests con `@testing-library/react`.
185. M0 incluye una página "sin permiso" (`forbidden.*` en `lang/`) y un selector de idioma en el layout público.

## Entidades previstas
User, RefreshToken, CompanySettings, Customer, Product, Quote, QuoteItem, QuoteVersion, QuoteEvent, QuoteSequence, Interaction, Notification, Order, OrderItem.
Sin `organizationId`: una instalación por empresa.

## Módulos, hitos y stories

### M0 Fundación
Depende de: n/a. Cubre: RNF-04, RNF-07.
| Hito | Stories |
|---|---|
| H0.1 Monorepo, lint y TypeScript | Workspaces pnpm · tsconfig base · ESLint y Prettier · pipeline CI (lint, typecheck, test) |
| H0.2 API base | App Express con Prisma · Swagger en `/api/docs` · manejo de errores con códigos · validación de env |
| H0.3 Front base | App React con Vite · carga de `lang/` · layout y rutas protegidas (esqueleto) |

### M1 Acceso y usuarios
Depende de: M0. Cubre: RF-10, RNF-03.
| Hito | Stories |
|---|---|
| H1.1 Autenticación | Login · refresh token · logout · cambiar mi contraseña |
| H1.2 Roles y permisos | Guard por rol · permiso "cotizaciones propias vs todas" |
| H1.3 Gestión de usuarios | Crear, editar y desactivar usuario · listar usuarios · restablecer contraseña |

### M2 Configuración de empresa
Depende de: M1. Cubre: parámetros de RF-02, RF-03, RF-04, RF-07, RF-09.
| Hito | Stories |
|---|---|
| H2.1 Datos y logo | Editar datos de empresa · subir logo · eliminar logo · branding público para el login |
| H2.2 Parámetros comerciales | Editar parámetros · valores por defecto del seed · lectura de parámetros por otros módulos |

### M3 Clientes y catálogo
Depende de: M1; M2 (S2.2.3, blanda). Cubre: RF-01.
| Hito | Stories |
|---|---|
| H3.1 Clientes (vendedor) | Crear, editar y consultar cliente · buscar y filtrar |
| H3.2 Catálogo (administrador) | Crear y editar producto · activar/desactivar · listar con categoría · autocompletar categoría |

### M4 Cotizaciones
Depende de: M1, M2, M3. Cubre: RF-02, RF-04, RF-11, RF-12.
| Hito | Stories |
|---|---|
| H4.1 Creación y cálculo | Crear borrador con líneas · cálculo de totales · consecutivo en transacción · validar límite de descuento · descuento por gerente o administrador |
| H4.2 Máquina de estados | Cambiar estado con transiciones válidas · anular con motivo · fecha de vencimiento al enviar · modificar fecha de vencimiento · reasignar cotización · ver estado y listado |
| H4.3 Edición y versiones | Editar cotización pendiente · registrar qué pidió el cliente · historial de versiones · registrar eventos de cotización · historial unificado (versiones + eventos) · reactivar vencida con actualización de precios · duplicar |

### M5 Documento y envío
Depende de: M2, M4. Cubre: RF-03, RF-14, RNF-05.
| Hito | Stories |
|---|---|
| H5.1 PDF | Plantilla PDF con datos y logo de empresa · generar y descargar PDF |
| H5.2 Envío asistido | "Abrir en WhatsApp" (wa.me) · "Abrir en correo" (mailto) · pasar a Enviada al usar el acceso |

### M6 Seguimiento
Depende de: M4 (H6.1 solo de M3). Cubre: RF-05, RF-07.
| Hito | Stories |
|---|---|
| H6.1 Observaciones | Registrar observación (fecha, tipo, nota, cotización opcional) · ver historial del cliente |
| H6.2 Scheduler | Job que marca Vencidas · regla "próxima a vencer" (X días) · regla "sin seguimiento" (Y días) |
| H6.3 Notificaciones in-app | Campana con contador · sección de notificaciones · marcar como leída |

### M7 Pedidos
Depende de: M4. Cubre: RF-06.
| Hito | Stories |
|---|---|
| H7.1 Conversión | Convertir cotización aprobada · snapshot de líneas y valores |
| H7.2 Estados | Cambiar estado del pedido · cancelar pedido |

### M8 Dashboard
Depende de: M4, M6 (H6.2). La parte "mayor probabilidad de cierre" espera a M9. Cubre: RF-13.
| Hito | Stories |
|---|---|
| H8.1 Indicadores | Conteo por estado · montos cotizados vs aprobados · tasa de conversión sin anuladas · filtro por período |
| H8.2 Alcance por rol | Filtro por vendedor · alcance según rol |

### M9 IA
Depende de: M4 (versiones), M6, M8. Cubre: RF-08, RF-09, RNF-05.
| Hito | Stories |
|---|---|
| H9.1 Asistente | Interfaz y adaptador Gemini · mensaje sugerido y editable · anonimización · respaldo por plantilla y timeout |
| H9.2 Probabilidad de cierre | Heurística por reglas · parámetro de umbral para calibración · seed sintético marcado |
| H9.3 Integración | Ordenar alertas por probabilidad · bloque "mayor probabilidad" en dashboard |

### M10 Calidad y despliegue
Depende de: M5 para empezar; M9 para cerrar. Cubre: RNF-01, RNF-02, RNF-05, RNF-06.
| Hito | Stories |
|---|---|
| H10.1 Despliegue en la nube | Migraciones en despliegue · variables de entorno del entorno productivo · endpoint de health |
| H10.2 Verificación | Prueba de usabilidad con 3–5 usuarios (RNF-01) · matriz de navegadores con flujos críticos (RNF-06) · medición p95 de PDF e IA (RNF-05) |

## Orden de ejecución
```
M0 → M1 → M2 → M3 → M4 ─┬→ M5 ───────────────→ M10 (inicia)
                         ├→ M6 → M8 → M9 ─────→ M10 (cierra)
                         └→ M7
```
- MVP comercial: M0 a M5.
- M5, M6 y M7 pueden ir en paralelo (solo dependen de M4).
- M7 no bloquea a ningún módulo.
- M9 al final: necesita versiones e interacciones para tener sentido.
