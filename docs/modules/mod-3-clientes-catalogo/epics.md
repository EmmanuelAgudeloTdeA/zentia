# M3 Clientes y catálogo – Épicas

> Fuentes: `docs/fuente/desglose.md` (M3; decisiones 6, 16, 17, 18, 19, 28, 30, 60, 63, 65, 110–118), `CLAUDE.md`, `docs/prd.md` (RF-01, RN-03, RN-07, RN-09, RN-16, RN-31), `docs/architecture.md` §5.

## Objetivo
Mantener los datos maestros que usan las cotizaciones: clientes compartidos por todos los vendedores y un catálogo de productos y servicios con precio sin IVA y tarifa de IVA. Ningún registro se borra: se desactiva.

**Cubre:** RF-01 (gestión de clientes y catálogo de productos).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 · H0.2 | Errores con códigos, `validate`, OpenAPI, schema `moneyString` (S0.2.3) |
| M0 · H0.3 | Layout, navegación, `http-client`, `lang/` |
| M1 · H1.2 | Guard autenticado (clientes), guard con rol `ADMIN` (gestión de productos), `Actor.id` para `createdById` |
| M2 · S2.2.3 | `SettingsReader.getCommercialParameters().defaultVatRate`, para preseleccionar la tarifa al crear un producto; enum `VatRate` en `shared` (M2) |

> La dependencia con M2 es blanda (solo `defaultVatRate`) y no cambia el orden de ejecución (decisión 110).

## Lo desbloquea
| Módulo | Qué necesita de M3 |
|---|---|
| M4 Cotizaciones | `CustomerReader` (cliente activo por id) y `CatalogReader` (productos activos con nombre, categoría, precio y tarifa de IVA, para el snapshot) |
| M5 Documento y envío | Datos del cliente (nombre, documento, teléfono, correo) para el PDF y los enlaces wa.me y mailto |
| M6 Seguimiento | `Customer` como destino de las interacciones (H6.1) |
| M9 IA | Categorías de productos (por el snapshot en las líneas) |

---

## H3.1 Clientes (vendedor)
**Objetivo:** que cualquier usuario cree, edite, consulte, busque y desactive clientes, sin duplicados por documento.
**Depende de:** M1 (H1.2).

### S3.1.1 Crear, editar y consultar cliente
Como vendedor, quiero registrar y actualizar los datos de mis clientes, para cotizarles sin volver a escribirlos.
- **RF de origen:** RF-01.1, RN-03, RN-31
- **Criterios de aceptación:**
  1. `POST /api/customers` y `PATCH /api/customers/:id` (cualquier rol autenticado) aceptan `name`, `documentId`, `phone` y `email`; `documentId` es obligatorio y se guarda normalizado; un documento repetido responde 409 `CUSTOMER_DOCUMENT_TAKEN`.
  2. Debe venir al menos uno entre `phone` y `email`; si no, 400 `CUSTOMER_CONTACT_REQUIRED`.
  3. El teléfono se normaliza a formato internacional (solo dígitos; se antepone `57` si tiene 10); si no queda entre 11 y 15 dígitos, 400 `INVALID_PHONE`.
  4. `GET /api/customers/:id` devuelve el cliente con `createdBy` (nombre) y `isActive`; si no existe, 404 `CUSTOMER_NOT_FOUND`. Cualquier vendedor puede leer y editar cualquier cliente.
  5. `PATCH` acepta `isActive`: desactivar no borra nada y el cliente sigue visible en sus cotizaciones existentes.
  6. En el front, el formulario normaliza y valida con los schemas de `shared` y muestra el teléfono tal como se usará en WhatsApp.
- **Depende de:** M1 (H1.2)
- **Tamaño:** M

### S3.1.2 Buscar y filtrar clientes
Como vendedor, quiero buscar clientes por nombre, documento, teléfono o correo, para encontrarlos rápido y no crear duplicados.
- **RF de origen:** RF-01.1
- **Criterios de aceptación:**
  1. `GET /api/customers` acepta `q`, `isActive` (por defecto `true`), `page` y `pageSize`, y ordena por nombre.
  2. `q` busca, sin distinguir mayúsculas ni tildes, en nombre y correo, y también en el documento y el teléfono normalizados.
  3. Antes de crear, el front busca el documento normalizado y, si existe, ofrece abrir el cliente existente.
  4. La pantalla de detalle deja espacio para las secciones de cotizaciones (M4) e interacciones (M6), que este módulo no implementa.
- **Depende de:** S3.1.1
- **Tamaño:** S

---

## H3.2 Catálogo (administrador)
**Objetivo:** que el administrador mantenga productos y servicios con precio sin IVA, tarifa de IVA y categoría normalizada, y que todos los roles los consulten.
**Depende de:** M1 (H1.2); M2 (S2.2.3) para `defaultVatRate`.

### S3.2.1 Crear y editar producto
Como administrador, quiero crear y editar productos o servicios con su precio, categoría y tarifa de IVA, para que los vendedores coticen con datos correctos.
- **RF de origen:** RF-01.2, RN-07
- **Criterios de aceptación:**
  1. `POST /api/products` y `PATCH /api/products/:id` (solo `ADMIN`) aceptan `name`, `category`, `price` (`moneyString`, sin IVA, > 0) y `vatRate` (`GENERAL_19` | `REDUCED_5` | `EXEMPT`).
  2. Al crear, el formulario preselecciona `vatRate` con `defaultVatRate` de M2; el back no lo impone.
  3. Cambiar el precio o la tarifa no modifica cotizaciones existentes (el snapshot es de M4); el formulario lo advierte.
  4. Un producto inexistente responde 404 `PRODUCT_NOT_FOUND`.
- **Depende de:** M2 (S2.2.3)
- **Tamaño:** M

### S3.2.2 Activar o desactivar producto
Como administrador, quiero desactivar productos que ya no vendo, sin borrarlos, para que no se usen en cotizaciones nuevas y se conserven en las existentes.
- **RF de origen:** RF-01.3, RN-09, RN-16
- **Criterios de aceptación:**
  1. `PATCH /api/products/:id` con `isActive` (solo `ADMIN`) activa o desactiva; no existe `DELETE`.
  2. `CatalogReader` no devuelve productos inactivos para cotizaciones nuevas (lo aplica M4).
  3. Un producto inactivo sigue legible por id para mostrar cotizaciones existentes.
  4. En el front, la acción de desactivar pide confirmación y la tabla distingue el estado.
- **Depende de:** S3.2.1
- **Tamaño:** S

### S3.2.3 Listar productos con categoría
Como usuario de cualquier rol, quiero ver el catálogo agrupado y filtrado por categoría, para conocer qué se puede cotizar y a qué precio.
- **RF de origen:** RF-01.4
- **Criterios de aceptación:**
  1. `GET /api/products` acepta `q`, `category`, `isActive`, `page` y `pageSize`; para `SELLER` y `MANAGER` siempre filtra `isActive = true`; `ADMIN` puede ver los inactivos.
  2. Cada producto incluye `category`, `price` (como `string`) y `vatRate`.
  3. `q` busca sin distinguir mayúsculas ni tildes en nombre y categoría.
  4. En el front, la tabla muestra la categoría, el precio formateado en COP y la tarifa (etiqueta desde `lang/`); las acciones de edición solo aparecen para `ADMIN`.
- **Depende de:** S3.2.1
- **Tamaño:** S

### S3.2.4 Autocompletar categoría
Como administrador, quiero que el campo de categoría me sugiera las existentes, para no crear variantes de la misma categoría.
- **RF de origen:** RF-01.2, decisión 60
- **Criterios de aceptación:**
  1. `GET /api/products/categories?q=` (cualquier rol autenticado) devuelve hasta 10 categorías distintas que coinciden sin distinguir mayúsculas ni tildes.
  2. Al guardar, la categoría se normaliza (sin espacios sobrantes) y, si ya existe una equivalente (misma clave), se reutiliza su forma escrita existente.
  3. El front sugiere mientras se escribe y permite crear una categoría nueva.
- **Depende de:** S3.2.1
- **Tamaño:** S
