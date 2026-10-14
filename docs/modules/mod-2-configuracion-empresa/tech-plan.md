# M2 Configuración de empresa – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §5–§8; base de M0 y M1.

## 1. Entidades Prisma
```prisma
enum VatRate { GENERAL_19 REDUCED_5 EXEMPT }
enum DocumentLocale { es en }

model CompanySettings {
  id                   Int            @id @default(1)
  name                 String?        @db.VarChar(150)
  taxId                String?        @db.VarChar(30)
  address              String?        @db.VarChar(250)
  phone                String?        @db.VarChar(30)
  email                String?        @db.VarChar(150)
  commercialTerms      String?        @db.Text
  documentLocale       DocumentLocale @default(es)
  logoDataUrl          String?        @db.Text
  logoVersion          Int            @default(0)
  defaultVatRate       VatRate        @default(GENERAL_19)
  validityDays         Int            @default(15)
  discountLimitSeller  Decimal        @default(10) @db.Decimal(5, 2)
  discountLimitManager Decimal        @default(30) @db.Decimal(5, 2)
  discountLimitAdmin   Decimal        @default(30) @db.Decimal(5, 2)
  shippingTaxable      Boolean        @default(false)
  expiringAlertDays    Int            @default(3)
  followUpDays         Int            @default(5)
  coldStartThreshold   Int            @default(30)
  updatedAt            DateTime       @updatedAt
}
```
**`CHECK` en SQL de la migración** (Prisma no los declara en el schema):
- `id = 1`
- `validityDays BETWEEN 1 AND 365`
- `expiringAlertDays >= 1 AND expiringAlertDays < validityDays`
- `followUpDays BETWEEN 1 AND 90`
- `coldStartThreshold BETWEEN 30 AND 50`
- cada `discountLimit* BETWEEN 0 AND 100`

`VatRate` y `DocumentLocale` también se exportan desde `shared/enums`. `VatRate` nace aquí porque M2 es el primer módulo que lo usa; M3 lo reutiliza.

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/company/branding` | Público (rate limit general) | — | 200 `{ name, hasLogo, logoVersion }` | 429 |
| GET | `/api/company/logo` | Público (rate limit general) | — | 200 binario (`image/png` \| `image/jpeg`), `Cache-Control: public, max-age=300`, `ETag: "logo-<logoVersion>"`; 304 si coincide `If-None-Match` | 404 `LOGO_NOT_FOUND`, 429 |
| GET | `/api/company/settings` | Autenticado | — | 200 `CompanySettingsDto` | guard |
| PATCH | `/api/company/profile` | `ADMIN` | `{ name?, taxId?, address?, phone?, email?, commercialTerms?, documentLocale? }` | 200 `CompanySettingsDto` | 400 `VALIDATION_ERROR` |
| PATCH | `/api/company/parameters` | `ADMIN` | `{ defaultVatRate?, validityDays?, discountLimitSeller?, discountLimitManager?, discountLimitAdmin?, shippingTaxable?, expiringAlertDays?, followUpDays?, coldStartThreshold? }` | 200 `CompanySettingsDto` | 400 `VALIDATION_ERROR` |
| PUT | `/api/company/logo` | `ADMIN` | `{ mimeType: 'image/png' \| 'image/jpeg', data: base64 }` (parser propio, 1 MB) | 200 `{ hasLogo: true, logoVersion }` | 400 `LOGO_INVALID_TYPE`, 400 `LOGO_TOO_LARGE`, 413 `PAYLOAD_TOO_LARGE` |
| DELETE | `/api/company/logo` | `ADMIN` | — | 204 | — |

`CompanySettingsDto` = todos los campos de la entidad salvo `logoDataUrl`, más `hasLogo`. Los límites de descuento viajan como `percentString` (decisión 65).

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `GetBrandingUseCase` | `CompanySettingsRepository` | `{ name, hasLogo, logoVersion }` |
| `GetLogoUseCase` | `CompanySettingsRepository` | Decodifica el data URL a `{ mimeType, bytes, version }` |
| `GetSettingsUseCase` | `CompanySettingsRepository` | DTO sin logo |
| `UpdateProfileUseCase` | `CompanySettingsRepository` | Actualización parcial |
| `UpdateParametersUseCase` | `CompanySettingsRepository` | Valida las reglas cruzadas sobre el resultado combinado (dominio `CommercialParameters`) |
| `UploadLogoUseCase` | `CompanySettingsRepository`, `ImageInspector` | Tipo, firma, tamaño decodificado; `logoVersion + 1` |
| `DeleteLogoUseCase` | `CompanySettingsRepository` | Idempotente; `logoVersion + 1` si había logo |
| `SeedCompanySettings` (script) | `CompanySettingsRepository` | Crea `id = 1` si no existe |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `CompanySettingsRepository` | `get()`, `update(patch)` | `PrismaCompanySettingsRepository` (mapper `Prisma.Decimal` ↔ `decimal.js`) |
| `ImageInspector` | `detect(bytes): 'image/png' \| 'image/jpeg' \| null` | Lectura de los bytes iniciales (PNG `89 50 4E 47`, JPEG `FF D8 FF`) |
| `SettingsReader` (público, barril) | `getCommercialParameters(): CommercialParametersDto`, `getDocumentProfile(): DocumentProfileDto` | Implementado sobre `CompanySettingsRepository` |

`CommercialParametersDto = { defaultVatRate, validityDays, discountLimits: { SELLER, MANAGER, ADMIN }, shippingTaxable, expiringAlertDays, followUpDays, coldStartThreshold }`. Los límites usan `Decimal`.
`DocumentProfileDto = { name, taxId, address, phone, email, commercialTerms, documentLocale, logoDataUrl }`.

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `CompanySettingsPage` (`/settings`, solo `ADMIN`) | Pestañas "Datos de la empresa" y "Parámetros comerciales" |
| Componente | `CompanyProfileForm` | Datos, condiciones comerciales e idioma del documento |
| Componente | `LogoUploader` | Selección de archivo, validación de tipo y tamaño (512 KB) en el cliente, conversión a base64, vista previa, eliminar con confirmación |
| Componente | `CommercialParametersForm` | Parámetros con validación cruzada (mismo schema Zod de `shared`) y aviso de que aplican a operaciones futuras |
| Componente | `BrandMark` | Logo (`/api/company/logo?v=logoVersion`) + nombre o `app.name`; lo usan `LoginPage` y `PrivateLayout` |
| Store | `core/branding/branding.store.ts` (Zustand) | `{ name, hasLogo, logoVersion }`; se carga al iniciar y se actualiza tras subir o eliminar el logo o editar el nombre |
| Service | `features/company-settings/services/company.service.ts` | `getBranding`, `getSettings`, `updateProfile`, `updateParameters`, `uploadLogo`, `deleteLogo` |

## 5. Claves de `lang/` (front)
- `nav.settings`
- `settings.title`, `settings.tabs.profile`, `settings.tabs.parameters`, `settings.saved`
- `settings.profile.name`, `settings.profile.taxId`, `settings.profile.address`, `settings.profile.phone`, `settings.profile.email`, `settings.profile.commercialTerms`, `settings.profile.documentLocale`
- `settings.logo.title`, `settings.logo.upload`, `settings.logo.remove`, `settings.logo.confirmRemove`, `settings.logo.hint`, `settings.logo.preview`
- `settings.parameters.defaultVatRate`, `settings.parameters.validityDays`, `settings.parameters.discountLimitSeller`, `settings.parameters.discountLimitManager`, `settings.parameters.discountLimitAdmin`, `settings.parameters.shippingTaxable`, `settings.parameters.expiringAlertDays`, `settings.parameters.followUpDays`, `settings.parameters.coldStartThreshold`, `settings.parameters.futureOnlyNotice`
- `enums.VatRate.GENERAL_19`, `enums.VatRate.REDUCED_5`, `enums.VatRate.EXEMPT`
- `enums.DocumentLocale.es`, `enums.DocumentLocale.en`
- `errors.LOGO_INVALID_TYPE`, `errors.LOGO_TOO_LARGE`, `errors.LOGO_NOT_FOUND`
- `validation.parameters.expiringAlertDaysLtValidity`

## 6. Reglas de negocio
**Parámetros: valores por defecto y rangos**
| Campo | Defecto | Regla |
|---|---|---|
| `validityDays` (N) | 15 | Entero, 1–365 |
| `expiringAlertDays` (X) | 3 | Entero, ≥ 1 y < `validityDays` |
| `followUpDays` (Y) | 5 | Entero, 1–90 |
| `discountLimitSeller` | 10 | 0–100, hasta 2 decimales |
| `discountLimitManager` | 30 | 0–100, hasta 2 decimales |
| `discountLimitAdmin` | 30 | 0–100, hasta 2 decimales |
| `shippingTaxable` | `false` | Booleano; si es `true`, el envío grava IVA al 19 % (RN-08) |
| `defaultVatRate` | `GENERAL_19` | Solo preselecciona la tarifa al crear un producto (RN-07) |
| `coldStartThreshold` | 30 | Entero, 30–50; solo marca cuándo calibrar (RN-39) |
| `documentLocale` | `es` | `es` \| `en`; idioma del PDF y de la IA (RN-43) |

**Validación cruzada:** se aplica sobre `actual ⊕ cambios`, no solo sobre lo enviado: `X < N` siempre.

**Efecto de los cambios** (los cálculos los hace cada módulo dueño):
| Parámetro | Aplica a |
|---|---|
| `validityDays` | Próximos envíos y reactivaciones (M4) |
| Límites de descuento | Próximas ediciones de descuento (M4) |
| `shippingTaxable` | Próximos cálculos; las cotizaciones guardan su snapshot (decisión 64) |
| X, Y | Próxima ejecución del job (M6) |
| `documentLocale` | Próximos PDF y mensajes de IA |

**Logo**
| Regla | Valor |
|---|---|
| Tipos | `image/png`, `image/jpeg`, con firma de bytes coherente |
| Tamaño | ≤ 512 KB decodificado; body ≤ 1 MB (parser propio de la ruta) |
| Almacenamiento | `data:<mime>;base64,<data>` en `logoDataUrl` |
| Versión | `logoVersion` aumenta en cada subida y en cada eliminación efectiva; se usa para el `ETag` y para el `?v=` del front |

**Orden de middlewares:** `PUT /api/company/logo` se monta con `express.json({ limit: '1mb' })` en el lugar reservado por M0, antes del `express.json({ limit: '100kb' })` global.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `commercial-parameters.spec` | Unitaria (dominio) | Rangos y `X < N` sobre el resultado combinado |
| `parameters.schema.spec` | Unitaria (`shared`) | `percentString`, enteros, mensajes con `path` |
| `image-inspector.spec` | Unitaria | PNG y JPEG válidos; firma incoherente con `mimeType`; otros formatos |
| `upload-logo.use-case.spec` | Unitaria | Tamaño decodificado > 512 KB rechazado; `logoVersion` incrementa |
| `company-settings.repository.spec` | Integración (Postgres) | `CHECK (id = 1)` impide una segunda fila; `CHECK` de rangos; mapper de decimales |
| `seed-company-settings.spec` | Integración | Crea con defaults; no sobrescribe si existe |
| `company.routes.spec` | Supertest | Roles por ruta; `branding` y `logo` públicos; `settings` sin `logoDataUrl`; 413 con body > 1 MB; 304 con `ETag`; `DELETE` idempotente |
| `settings-reader.spec` | Unitaria | DTOs de solo lectura; un cambio se refleja en la siguiente lectura |
| `logo-uploader.spec`, `parameters-form.spec` | Testing Library | Validación en el cliente, confirmación al eliminar, aviso de "aplica a futuro" |
| `brand-mark.spec` | Testing Library | Fallback a `app.name`; actualización tras cambiar el logo |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 101–109) |
|---|---|
| `logoVersion` | Campo nuevo, no listado en `architecture.md` §5; sirve para el `ETag` y para invalidar la caché del navegador. |
| `name` nulo hasta que el admin lo edite | El seed no inventa un nombre; el front usa `app.name` como fallback. |
| Rangos no definidos en las fuentes | `validityDays` 1–365 y `followUpDays` 1–90 son propuestas de este plan; X ≥ 1, X < N y el umbral 30–50 vienen de las decisiones 25 y 58. |
| Orden entre límites de descuento | No se exige `seller ≤ manager`; las fuentes no lo piden. |
| Edición concurrente por dos administradores | Gana la última escritura; el impacto es bajo (una fila, pocos administradores). |
| Lectura sin caché | `SettingsReader` lee la fila en cada llamada; es una consulta por PK. Si se mide un problema en H10.2, se agrega caché con invalidación al actualizar. |
| Lectura de `GET /company/settings` por todos los roles | Necesaria para que el front de M4 conozca límites y vigencia en la vista previa; no expone datos sensibles. |
