# M2 Configuración de empresa – Épicas

> Fuentes: `docs/fuente/desglose.md` (M2; decisiones 17, 25, 32, 42, 48, 49, 53, 58, 64, 75, 77, 100, 101–109), `CLAUDE.md`, `docs/prd.md` (RN-07, RN-08, RN-12, RN-22, RN-32, RN-33, RN-39, RN-43), `docs/architecture.md` §5–§7.

## Objetivo
Centralizar en una sola fila (`CompanySettings`) los datos, el logo y los parámetros comerciales de la empresa, para que los demás módulos los lean sin duplicarlos.

**Cubre:** los parámetros de RF-02 (límites de descuento, IVA del envío, IVA por defecto), RF-03 (datos, logo, condiciones comerciales, idioma del documento), RF-04 (días de vigencia), RF-07 (X e Y de alertas) y RF-09 (umbral de calibración). Las reglas que usan estos parámetros las implementa cada módulo dueño.

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 · H0.2 | App Express, catálogo de errores, `validate`, registro OpenAPI, un lugar en la cadena de middlewares para un parser propio antes del `express.json()` global, `generalLimiter`, schema de decimales (`percentString`), `seed.ts` |
| M0 · H0.3 | Layout, navegación registrable, `http-client`, `lang/` |
| M1 · H1.2 | Guard con rol `ADMIN` (editar) y autenticado (leer); `Actor` |
| M1 · S1.1.1 | `LoginPage`, que pasa a mostrar el branding (decisión 100) |

## Lo desbloquea
| Módulo | Qué necesita de M2 |
|---|---|
| M3 Clientes y catálogo | `defaultVatRate` para preseleccionar la tarifa al crear un producto; enum `VatRate` en `shared` |
| M4 Cotizaciones | `discountLimit*`, `validityDays`, `shippingTaxable` mediante `SettingsReader` |
| M5 Documento y envío | Datos de la empresa, logo como data URL, `commercialTerms`, `documentLocale` |
| M6 Seguimiento | `expiringAlertDays` (X) y `followUpDays` (Y) |
| M9 IA | `coldStartThreshold`, `documentLocale` |
| M1 | `GET /company/branding` para el login |

---

## H2.1 Datos y logo
**Objetivo:** que el administrador mantenga los datos y el logo de la empresa, y que el login y el layout muestren el branding.
**Depende de:** M1 (H1.2).

### S2.1.1 Editar datos de empresa
Como administrador, quiero editar los datos de la empresa, las condiciones comerciales y el idioma de los documentos, para que las cotizaciones y los PDF los muestren correctos.
- **RF de origen:** RF-03 (parámetros)
- **Criterios de aceptación:**
  1. `PATCH /api/company/profile` (solo `ADMIN`) actualiza `name`, `taxId`, `address`, `city`, `phone`, `email`, `website`, `bankAccounts`, `commercialTerms` y `documentLocale` (`es` | `en`); los campos no enviados no cambian.
  2. Las validaciones de formato (correo, longitudes) responden 400 `VALIDATION_ERROR`.
  3. `GET /api/company/settings` (cualquier usuario autenticado) devuelve todos los datos y parámetros con `hasLogo`, nunca el logo.
  4. En el front, la pantalla "Ajustes" (solo `ADMIN`) tiene la sección de datos de la empresa con el formulario validado con los schemas de `shared`.
- **Depende de:** S2.2.2 (fila creada por el seed)
- **Tamaño:** S

### S2.1.2 Subir logo
Como administrador, quiero subir el logo de la empresa, para que aparezca en el login, en el layout y en los PDF.
- **RF de origen:** RF-03 (parámetros), decisiones 32, 42 y 49
- **Criterios de aceptación:**
  1. `PUT /api/company/logo` (solo `ADMIN`) recibe `{ mimeType, data }` en base64, con un parser propio de 1 MB registrado antes del `express.json()` global.
  2. Solo acepta `image/png` e `image/jpeg`, con firma de archivo coherente con `mimeType`; si no, responde 400 `LOGO_INVALID_TYPE`.
  3. Si la imagen decodificada supera 512 KB responde 400 `LOGO_TOO_LARGE`; un body mayor a 1 MB responde 413 `PAYLOAD_TOO_LARGE`.
  4. Guarda el logo como data URL en `CompanySettings.logoDataUrl` y responde 200 `{ hasLogo: true, logoVersion }`.
  5. En el front, el selector valida tipo y tamaño antes de enviar y muestra una vista previa.
- **Depende de:** S2.1.1
- **Tamaño:** M

### S2.1.3 Eliminar logo
Como administrador, quiero quitar el logo, para volver al encabezado sin imagen.
- **RF de origen:** RF-03 (parámetros), decisión 49
- **Criterios de aceptación:**
  1. `DELETE /api/company/logo` (solo `ADMIN`) deja `logoDataUrl` en `null` y responde 204; si no había logo, también responde 204.
  2. Después, `GET /company/logo` responde 404 `LOGO_NOT_FOUND` y `GET /company/branding` responde `hasLogo: false`.
  3. El front pide confirmación antes de eliminar.
- **Depende de:** S2.1.2
- **Tamaño:** S

### S2.1.4 Branding público para el login
Como usuario sin sesión, quiero ver el nombre y el logo de la empresa en el login, para reconocer el sistema de mi empresa.
- **RF de origen:** decisiones 48 y 100
- **Criterios de aceptación:**
  1. `GET /api/company/branding` es público, con rate limit general, y devuelve solo `{ name, hasLogo, logoVersion }`.
  2. `GET /api/company/logo` es público, con rate limit general; devuelve la imagen binaria con su `Content-Type`, `Cache-Control: public, max-age=300` y `ETag` basado en `logoVersion`; si no hay logo, 404 `LOGO_NOT_FOUND`.
  3. El login y el encabezado del layout muestran el logo (con `?v=logoVersion`) y el nombre; si `name` está vacío, usan `app.name`.
  4. Tras subir o eliminar el logo, el layout se actualiza sin recargar la página.
- **Depende de:** S2.1.2
- **Tamaño:** S

---

## H2.2 Parámetros comerciales
**Objetivo:** que los parámetros comerciales existan desde el primer arranque con valores por defecto, que el administrador los edite con validaciones cruzadas y que los demás módulos los lean por un puerto.
**Depende de:** M1 (H1.2).

### S2.2.1 Editar parámetros
Como administrador, quiero editar los parámetros comerciales, para adaptar los límites de descuento, la vigencia, el IVA y las alertas a mi empresa.
- **RF de origen:** RF-02, RF-04, RF-07, RF-09 (parámetros)
- **Criterios de aceptación:**
  1. `PATCH /api/company/parameters` (solo `ADMIN`) actualiza `defaultVatRate`, `validityDays`, `discountLimitSeller`, `discountLimitManager`, `discountLimitAdmin`, `shippingTaxable`, `expiringAlertDays`, `followUpDays` y `coldStartThreshold`.
  2. Las reglas de rango de la sección 6 del tech plan se validan sobre el resultado combinado (valores actuales + cambios); por ejemplo, bajar `validityDays` por debajo de X responde 400 `VALIDATION_ERROR`, con el issue en el campo afectado.
  3. Los límites de descuento llegan como `percentString` (hasta 2 decimales, 0–100).
  4. En el front, la pantalla "Ajustes" explica en `lang/` que los cambios aplican a operaciones futuras y no recalculan cotizaciones existentes.
- **Depende de:** S2.2.2
- **Tamaño:** M

### S2.2.2 Valores por defecto del seed
Como administrador, quiero que el sistema arranque con parámetros válidos, para poder cotizar sin configurar todo primero.
- **RF de origen:** decisiones 58 y 75
- **Criterios de aceptación:**
  1. El seed crea la fila `id = 1` si no existe, con: `validityDays = 15`, `discountLimitSeller = 10`, `discountLimitManager = 30`, `discountLimitAdmin = 30`, `shippingTaxable = false`, `expiringAlertDays = 3`, `followUpDays = 5`, `coldStartThreshold = 30`, `defaultVatRate = GENERAL_19`, `documentLocale = es`, `name = null`.
  2. Si la fila ya existe, el seed no la modifica.
  3. La migración incluye `CHECK (id = 1)` y los `CHECK` de rango de la sección 6 del tech plan.
  4. Una segunda fila no se puede insertar (la BD lo rechaza).
- **Depende de:** M1 (primera migración)
- **Tamaño:** S

### S2.2.3 Lectura de parámetros por otros módulos
Como desarrollador del equipo, quiero un puerto de lectura de la configuración, para que los demás módulos usen los parámetros sin acceder a la tabla.
- **RF de origen:** RNF-04, RNF-07
- **Criterios de aceptación:**
  1. El barril de `company-settings` exporta `SettingsReader` con `getCommercialParameters()` y `getDocumentProfile()`, que devuelven DTOs de solo lectura.
  2. Cada llamada lee el valor vigente (sin caché en el MVP), así que un cambio aplica en la siguiente operación.
  3. `getDocumentProfile()` incluye `logoDataUrl`, para M5; `GET /company/settings` nunca lo incluye.
  4. Ningún otro módulo importa el repositorio Prisma de `CompanySettings` (lo garantiza el lint de imports profundos).
- **Depende de:** S2.2.2
- **Tamaño:** S
