# Zentia – Reglas del proyecto

## Qué es
Sistema web para que las pymes gestionen cotizaciones comerciales: crear, enviar, dar seguimiento y analizar, con apoyo de IA. Instalación independiente por empresa (no es SaaS multiempresa).

## Jerarquía de fuentes
1. `docs/fuente/desglose.md`: módulos, hitos, stories, dependencias y decisiones.
2. `CLAUDE.md` (este archivo).
3. `docs/prd.md`: reglas de negocio (RN) y requisitos verificables.
4. `docs/fuente/ppi-zentia.md`: requisitos académicos originales (RF-01 a RF-14, RNF-01 a RNF-07).

Ante una contradicción prevalece la fuente de mayor jerarquía, pero se avisa al usuario antes de implementar; nunca se resuelve en silencio. No inventar requisitos.

## Stack
- TypeScript estricto (`strict: true`) en todo el monorepo. pnpm workspaces. Node 24 LTS.
- Back: Node.js + Express + Prisma + PostgreSQL.
- Front: React + Vite + Zustand + Tailwind v4.
- Validación: Zod (schemas compartidos en `packages/shared`).
- Calidad: ESLint + Prettier, cero warnings. CI con GitHub Actions (lint, typecheck, test).

### Librerías aprobadas (cualquier otra requiere propuesta previa)
| Área | Librerías |
|---|---|
| Auth y seguridad | `jose` (JWT access + refresh), `bcryptjs` detrás de la interfaz `PasswordHasher`, `helmet`, `cors`, `express-rate-limit` |
| API | `swagger-ui-express`, `@asteasolutions/zod-to-openapi`, `tsx`, `dotenv` |
| Cálculo | `decimal.js` (totales en `packages/shared`, usado por front y back) |
| Logs | `pino`, `pino-http` |
| PDF | `pdfmake` |
| Jobs | `node-cron` (deuda conocida: con varias instancias los jobs se duplican; resolver con cola más adelante). Jobs diarios en `America/Bogota`: vencimiento 00:05 y alertas 07:00, idempotentes, con pasada de recuperación al arrancar |
| IA | `@google/genai` detrás del puerto `LLMProvider` |
| i18n | `i18next`, `react-i18next` |
| Front | `react-router`, `react-hook-form`, `@hookform/resolvers`, `recharts` (carga diferida) |
| Tests | `vitest`, `supertest`, `@testing-library/react`, `jsdom` |

## Estructura
```
zentia/
├── apps/
│   ├── api/        # Express + Prisma
│   └── web/        # React + Zustand
├── packages/
│   └── shared/     # tipos, schemas Zod, enums y constantes comunes
├── docs/
│   ├── fuente/     # PPI y desglose (solo lectura)
│   ├── brief.md
│   ├── prd.md
│   ├── architecture.md
│   ├── design/design-system.md
│   └── modules/mod-<N>-<nombre>/{epics.md, tech-plan.md, ui-brief.md}
├── CLAUDE.md
└── README.md
```

## Arquitectura back
Clean Architecture por módulo:
```
modules/<modulo>/
├── domain/          # entidades, reglas, contratos (sin dependencias externas)
├── application/     # casos de uso y puertos
├── infrastructure/  # repositorios Prisma, adaptadores externos
├── presentation/    # controllers, routes, schemas OpenAPI
└── index.ts
```
- Las dependencias apuntan hacia adentro. `domain` no importa nada externo.
- Los casos de uso no conocen Express ni Prisma; usan puertos.
- Toda ruta se documenta en Swagger (`/api/docs`) con Zod → OpenAPI. `/api/docs` está habilitado en desarrollo y deshabilitado por defecto en producción (variable de entorno).
- Web y API en el mismo dominio; la API vive bajo `/api` (las rutas de este documento son relativas a ese prefijo).
- Rutas públicas, todas con rate limit: `POST /auth/login`, `POST /auth/refresh`, `GET /company/branding`, `GET /company/logo`, `GET /health` (devuelve solo `{ status: "ok" }`). `POST /auth/logout` se autentica con la cookie de refresh y responde siempre 204. Todo lo demás exige access token.
- Tokens: access de 15 min solo en memoria del front, con solo el id del usuario (`sub`); refresh opaco (no JWT) de 7 días rotativo, guardado como hash SHA-256 en `RefreshToken` (expiración, rotación, revocación), en cookie `httpOnly`, `Secure`, `SameSite=Strict`, path `/api/auth`, con detección de reutilización y ventana de gracia de 10 s (`REFRESH_IN_PROGRESS`). `POST /auth/refresh` devuelve `{ accessToken, user }`. bcrypt con cost 12 configurable por variable de entorno.
- El guard de autenticación consulta el usuario por PK en cada petición y usa `role`, `isActive` y `mustChangePassword` de la BD (no del token). Residuo aceptado: tras restablecer una contraseña, un access token robado vive hasta 15 min, pero no permite cambiar la contraseña porque se exige la actual.
- Repositorios de solo lectura en `dashboard`, `ai` y `follow-up`: viven en su `infrastructure`, solo leen y devuelven DTOs. Toda escritura pasa por el módulo dueño.
- Los campos decimales (montos, cantidades, porcentajes) viajan como `string` en la API, con un schema Zod compartido.
- Zona horaria del proceso: `America/Bogota`.

## Arquitectura front
```
features/<modulo>/
├── components/
├── hooks/
├── services/   # llamadas a la API
├── store/      # Zustand
├── types/
└── index.ts
```
- Estado global solo en Zustand; estado local con hooks.
- Los componentes no llaman a la API directamente; usan `services`.
- Componentes base en `shared/ui/` según `docs/design/design-system.md`; solo tokens del tema, sin colores arbitrarios.

## Reglas de dominio (críticas)
**Glosario:** `fechaVencimiento` (documentos) = `expiresAt` (código).

**Roles** (`SELLER`, `MANAGER`, `ADMIN`): Vendedor (solo sus cotizaciones), Gerente comercial (todas las cotizaciones, no administra usuarios), Administrador (usuarios, productos, parámetros y todas las cotizaciones). Los tres pueden crear cotizaciones propias (quedan como dueños).

**Dinero:** moneda COP, sin centavos. Prisma `Decimal(15,0)` para montos. Nunca `Float`/`number` con decimales. Redondeo half-up por concepto.

**Cálculo de cotización:**
- Vive en `packages/shared` con `decimal.js` (el dominio no depende de Prisma). El front lo usa para la vista previa; el back siempre recalcula e ignora los totales que envíe el cliente.
- `línea = redondear(precio × cantidad)`
- `subtotal = Σ línea`
- `descuento = redondear(subtotal × d)` (global, en %)
- `ivaLíneas = redondear((1 − d) × Σ(línea × tarifaIva))` (sin redondeo del IVA por línea)
- `ivaEnvío = redondear(envío × 19 %)` solo si el parámetro lo activa; si no, 0
- `total = subtotal − descuento + ivaLíneas + ivaEnvío + envío`
- `redondear` = half-up a peso entero, aplicado de forma independiente a cada concepto.
- Cantidad y porcentaje de descuento: hasta 2 decimales.
- El precio del catálogo es sin IVA; el IVA se suma encima.
- Tarifas IVA: 19 %, 5 %, exento. El "IVA por defecto" de `CompanySettings` solo preselecciona la tarifa al crear un producto. Se guardan siempre porcentaje y valor calculado.
- Cada línea guarda snapshot de precio y tarifa IVA; cambios posteriores del catálogo no afectan cotizaciones existentes. Un producto inactivo no se agrega a cotizaciones nuevas.

**Descuento:** límite máximo por rol configurable (defecto: vendedor 10 %, gerente y administrador 30 %); el límite aplicable es el del rol de quien aplica el descuento, no el del dueño. Si supera el límite del vendedor, lo aplica directamente un gerente o administrador: en una Enviada queda en la versión; en un Borrador se registra como evento `DISCOUNT_OVERRIDE`. Un vendedor puede editar líneas de una cotización con descuento superior a su límite, pero no modificar el descuento.

**Consecutivo:** `Quote.number` es `Int` único, generado en el backend con contador en tabla (`QuoteSequence`) y bloqueo dentro de una transacción; `COT-0001` es solo formato de presentación. Las cotizaciones nunca se eliminan, se anulan.

**Estados de cotización y transiciones:**
```
Borrador → Enviada | Anulada
Enviada  → Aprobada | Rechazada | Vencida | Anulada
Vencida  → Enviada (reactivación)
Aprobada, Rechazada, Anulada: finales
```
- Estados en código: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `VOIDED`.
- Anular exige motivo, guardado en la `note` del `STATE_CHANGED` a `VOIDED`; el DTO expone `voidReason` derivado. Anulada conserva número y no cuenta en la tasa de conversión.
- Borrador no vence. `fechaVencimiento` es `DATE` = fecha de envío + N días (N configurable, defecto 15); la cotización vale hasta el fin de ese día en `America/Bogota`. Se recalcula al reactivar.
- `Quote` guarda `sentAt` (último envío), `firstSentAt` y `approvedAt`.
- La fecha de vencimiento la modifica el dueño, el gerente o el administrador, solo en una Enviada y con fecha futura.
- Vencida se asigna automáticamente por job.
- Reactivar una Vencida exige registrar lo solicitado por el cliente: en la versión si hay cambio de contenido; si no, en la `note` del evento `STATE_CHANGED`. Al reactivar, las líneas de productos activos pueden actualizarse al precio vigente; las de inactivos conservan su snapshot con aviso; el usuario confirma antes de aplicar.
- Aprobada, Rechazada y Anulada no se editan; Aprobada y Rechazada se pueden duplicar con precios vigentes del catálogo (los productos inactivos se omiten con aviso).
- Gerente o administrador pueden reasignar una cotización a otro vendedor (p. ej., si el dueño se desactiva).

**Historial (versiones y eventos):**
- `QuoteVersion` = snapshot inicial al primer envío (versión 1) + una versión por cada cambio de contenido posterior (líneas, cantidades, descuento, envío), con lo solicitado por el cliente (obligatorio). Un Borrador se edita sin versión. Editar una Enviada no la devuelve a Borrador.
- `QuoteEvent`: cambios que no son de contenido, con fecha, `actorId` opcional (`null` = sistema, mostrado con una clave de `lang/`), `note` opcional y `versionId` opcional. Tipos: `DISCOUNT_OVERRIDE` (solo en Borrador: en una Enviada el cambio de descuento ya queda en la versión), `EXPIRY_CHANGED`, `REASSIGNED`, `STATE_CHANGED` (en toda transición, aunque la misma operación cree una versión). Versión y evento de una misma operación se crean en una sola transacción y el historial unificado los agrupa.
- El detalle de la cotización muestra un historial unificado (versiones + eventos).

**Indicadores (dashboard):**
- Activa = Enviada. Los borradores no cuentan.
- Pendientes de seguimiento = Enviadas que cumplen la regla de Y días.
- "Activas" y "pendientes de seguimiento" reflejan el estado actual y no dependen del período.
- Conteos de aprobadas, rechazadas y vencidas, montos cotizados, montos aprobados y conversión se filtran por `firstSentAt`.
- Conversión = aprobadas / (aprobadas + rechazadas + vencidas).

**Pedido:** se crea desde una cotización Aprobada con snapshot de líneas y valores. Un pedido por cotización (`Order.quoteId` único), sin reconversión. Estados: `PENDING` → `IN_PROGRESS` → `DELIVERED` | `CANCELLED`. Lo cambia quien puede editar la cotización de origen. No mueve inventario ni factura.

**Clientes, productos y usuarios:** no se borran, se desactivan (`isActive`). Todos los vendedores ven y editan todos los clientes. `Customer.documentId` único, obligatorio y normalizado. `Product.category` es texto normalizado con autocompletado. Cliente con teléfono y correo separados, al menos uno obligatorio; teléfono en formato internacional (se antepone 57 si tiene 10 dígitos).

**Usuarios:** el administrador restablece contraseñas con una temporal y `mustChangePassword`; cada usuario puede cambiar la suya, siempre indicando la contraseña actual (incluida la temporal); el cambio revoca las demás sesiones. Política: 10–72 bytes, al menos una letra y un número, distinta del correo y de la actual. Sin correo en el MVP.

**Configuración de empresa:** una sola fila (`CompanySettings`): datos y logo, IVA por defecto, días de vigencia, límites de descuento, IVA del envío como booleano (la cotización guarda su snapshot y el valor calculado), días X e Y de alertas (defecto X = 3, Y = 5; X ≥ 1, Y ≥ 1, X < días de vigencia), umbral de RF-09 (defecto 30, rango 30–50), `documentLocale` (defecto `es`: idioma del PDF y del mensaje de IA). El logo llega en base64 dentro del JSON (sin `multer`): PNG/JPG, máximo 512 KB decodificados, guardado como data URL. Rutas: `PUT /company/logo` y `DELETE /company/logo` (solo administrador, cuerpo `{ mimeType, data }`, límite de 1 MB solo en esa ruta, con su parser registrado antes del `express.json()` global); `GET /company/logo` y `GET /company/branding` (`{ name, hasLogo }`) son públicos, con `Cache-Control` y rate limit. El GET de configuración devuelve `hasLogo` y exige autenticación.

**Seguimiento:** tipos de interacción `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `OTHER`. "Sin seguimiento" = Y días desde max(última interacción, último `sentAt`). "Próxima a vencer" = hoy ≥ `expiresAt` − X y hoy ≤ `expiresAt`. Las alertas las recibe el dueño de la cotización, sea cual sea su rol; al reasignar, sus notificaciones no leídas pasan al nuevo dueño. Se deduplican por cotización + tipo + fecha de referencia ("sin seguimiento": max(última interacción, último `sentAt`), así cada interacción o reenvío abre un ciclo nuevo; "próxima a vencer": `fechaVencimiento`). El job omite dueños inactivos.

**IA:**
- Puerto `LLMProvider`; proveedor, modelo y API key por variables de entorno. Defecto: Gemini Flash.
- Al LLM solo se envían días sin respuesta, monto aproximado y categorías de productos (las categorías del catálogo están permitidas). Prohibido el texto libre escrito por usuarios sobre clientes o cotizaciones (`note`, observaciones, interacciones, motivos de versión) y los datos personales (nombres, NIT, teléfonos).
- Timeout de 4 s sin reintentos. El mensaje usa marcadores `{{CLIENTE}}` y `{{VENDEDOR}}` que el back reemplaza.
- El asistente está disponible en cualquier Enviada y se destaca cuando cumple la regla de Y días.
- Si falla, hay timeout o se alcanza el límite: mensaje de respaldo por plantilla.
- Probabilidad de cierre: solo en Enviadas. En el MVP se usa siempre la heurística v0 con señales estructuradas (conteos y fechas), rotulada "estimación por reglas"; el umbral solo marca cuándo se podrá calibrar o pasar a un modelo (fase 2). Datos sintéticos solo en pruebas y demo, marcados como tales.

## Fuera de alcance (no implementar)
Portal del cliente, envío automático por SMTP o WhatsApp API, flujo de solicitud/aprobación de descuentos, descuento por línea, retenciones, inventario, facturación, notificaciones push, multiempresa.

## Convenciones
- Archivos barril: cada carpeta expone su API pública con `index.ts`. Se importa desde el barril, nunca desde archivos internos de otro módulo.
- Nombres: archivos en kebab-case, componentes en PascalCase, variables y funciones en camelCase. Código en inglés, incluidos los valores de enums; textos al usuario (y etiquetas de enums en español e inglés) solo en `lang/`.
- Sin `any`. Si es inevitable, justificarlo en una línea.
- ESLint `no-restricted-imports` hace cumplir las capas (domain no importa nada externo) y prohíbe imports profundos entre módulos.
- En `packages/shared/src/calc` están prohibidos `parseFloat`, `parseInt`, `Number()`, `+x` y `Math.round`; se usa `Decimal.clone()` configurado con `ROUND_HALF_UP`.
- Variables de entorno validadas al arrancar; mantener `.env.example`.
- Commits con gitmoji (`:tada:` para el inicial), también cuando los haga la IA.
- La IA nunca se agrega como autor, coautor ni ayudante: sin `Co-Authored-By`, sin "Generated with" ni ninguna otra atribución en commits, PRs, código o documentos.
- Repositorio: https://github.com/EmmanuelAgudeloTdeA/zentia (rama principal `main`).
- Una rama por módulo con el nombre de su carpeta (`mod-<N>-<nombre>`), creada desde la rama del módulo del que depende mientras esa no esté en `main`.

## i18n
- Idiomas: `es` (defecto) y `en`. Carpeta `lang/` con un JSON por idioma.
- Prohibido texto hardcodeado en UI, validaciones y PDF.
- La API devuelve códigos de error (`QUOTE_NOT_FOUND`) y el front los traduce. Las notificaciones se guardan como tipo + parámetros y el front las traduce.
- El back tiene su propia `lang/` solo para lo que genera él: PDF y mensaje de IA (incluido el respaldo). Su idioma lo define `CompanySettings.documentLocale`, no `Accept-Language`.
- Un test de CI compara claves y marcadores entre `es` y `en`, en front y back.

## Comentarios
- Solo cuando algo crítico deba conocerse.
- Una línea, clara y concisa. Sin bloques largos ni comentarios obvios.

## Metodología (BMAD)
- Jerarquía: Módulo → Hito (epic) → Story.
- Cada módulo tiene `epics.md` y `tech-plan.md` en `docs/modules/mod-<N>-<nombre>/` (nombre resumido en kebab-case): `mod-0-fundacion`, `mod-1-acceso-usuarios`, `mod-2-configuracion-empresa`, `mod-3-clientes-catalogo`, `mod-4-cotizaciones`, `mod-5-documento-envio`, `mod-6-seguimiento`, `mod-7-pedidos`, `mod-8-dashboard`, `mod-9-ia`, `mod-10-calidad-despliegue`.
- Todo documento de módulo, hito o story incluye la sección **Depende de**.
- Una story = un entregable verificable con criterios de aceptación y referencia a su RF.
- No avanzar a la siguiente fase sin validación del usuario.

## Reglas para la IA
- Antes de crear algo, leer `docs/` y respetar las dependencias entre módulos.
- No agregar librerías fuera de la tabla sin proponerlo primero.
- No generar código fuera del alcance de la story o fase actual.
- Si falta información o hay contradicción, preguntar; no asumir en silencio.
