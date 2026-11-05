# Checklist de QA: M3 Clientes y catálogo

> Fuente de criterios: `docs/modules/mod-3-clientes-catalogo/epics.md`, sus notas en `tech-plan.md` §9 y las reglas de `CLAUDE.md` que tocan este módulo. Cada criterio cita la prueba automática que lo cubre (`archivo › nombre de la prueba`). Las pruebas `*.integration.test.ts` solo corren con `TEST_DATABASE_URL` (en CI, con Postgres).

## Depende de
- M1 (H1.2): guard de autenticación y roles.
- M2 (S2.2.3): `defaultVatRate` para preseleccionar la tarifa (dependencia blanda).
- M4: listado de cotizaciones por cliente para la sección "Cotizaciones" del detalle.

## Estado
Todos los criterios tienen prueba automática. Las pruebas de integración nuevas (creación concurrente, coincidencias de documento y orden estable en Postgres) están escritas y quedan pendientes de su primera corrida en CI.

Rutas abreviadas: `customers/…` = `apps/api/src/modules/customers/…`; `catalog/…` = `apps/api/src/modules/catalog/…`; `web/…` = `apps/web/src/features/…`; `shared/…` = `packages/shared/src/…`.

## H3.1 Clientes

### S3.1.1 Crear, editar y consultar cliente
- [x] S3.1.1.1 `POST` y `PATCH /customers` para cualquier rol; documento obligatorio y normalizado; repetido → 409 `CUSTOMER_DOCUMENT_TAKEN` (también al editar con el documento de otro cliente) — `customers/presentation/customers.routes.test.ts` › lets any role create, read and edit customers; › answers the domain error codes; › has no delete route, rejects a taken document on edit and long searches; `customers/application/customer-use-cases.test.ts` › rejects a document owned by another customer and unknown ids
- [x] S3.1.1.1 Dos altas simultáneas con el mismo documento: solo una prospera y la otra recibe `CUSTOMER_DOCUMENT_TAKEN` — `customers/infrastructure/prisma-customer.integration.test.ts` › lets only one of two concurrent creates with the same document succeed
- [x] S3.1.1.2 Sin teléfono ni correo → 400 `CUSTOMER_CONTACT_REQUIRED` — `customers/presentation/customers.routes.test.ts` › answers the domain error codes; `customers/application/customer-use-cases.test.ts` › validates the contact on the combined result; `customers/infrastructure/prisma-customer.integration.test.ts` › enforces the contact CHECK
- [x] S3.1.1.3 Teléfono internacional (se antepone 57 con 10 dígitos); fuera de 11–15 dígitos → 400 `INVALID_PHONE` — `customers/domain/customer-domain.test.ts` › normalizes the phone and keeps the email; › rejects an invalid phone and a missing contact; `customers/presentation/customers.routes.test.ts` › answers the domain error codes
- [x] S3.1.1.4 `GET /customers/:id` con `createdBy` e `isActive`; inexistente → 404; cualquier vendedor lee y edita cualquier cliente — `customers/presentation/customers.routes.test.ts` › lets any role create, read and edit customers; › answers the domain error codes; `customers/infrastructure/prisma-customer.integration.test.ts` › includes the creator and maps a duplicated document to CUSTOMER_DOCUMENT_TAKEN
- [x] S3.1.1.5 `isActive` desactiva sin borrar; no hay `DELETE`; el cliente inactivo sigue legible para sus cotizaciones — `customers/presentation/customers.routes.test.ts` › has no delete route, rejects a taken document on edit and long searches; › paginates and filters by status; `customers/application/customer-use-cases.test.ts` › rejects inactive customers only for new quotes
- [x] S3.1.1.5 En el front, desactivar desde el detalle pide confirmación y envía `{ isActive: false }` — `web/customers/components/customers.test.tsx` › asks for confirmation before deactivating
- [x] S3.1.1.6 El formulario normaliza y valida con los schemas de `shared` (correo con espacios aceptado) y muestra el teléfono de WhatsApp; el 409 del servidor se muestra en el campo documento — `web/customers/components/customers.test.tsx` › previews the normalized document and the WhatsApp phone; › accepts an email with surrounding spaces; › requires a phone or an email before calling the API; › shows the server duplicate error on the document field; `shared/schemas/customers.schema.test.ts` › normalizes the document and email and turns empty contacts into null

### S3.1.2 Buscar y filtrar clientes
- [x] S3.1.2.1 `GET /customers` con `q`, estado, `page` y `pageSize`, ordenado por nombre con desempate estable por `id` — `customers/presentation/customers.routes.test.ts` › paginates and filters by status; › keeps a stable order between pages when names repeat; `customers/infrastructure/prisma-customer.integration.test.ts` › finds document matches in both directions and orders repeated names by id
- [x] S3.1.2.2 `q` sin mayúsculas ni tildes en nombre y correo, y en documento y teléfono normalizados; `q` de más de 100 caracteres → 400 — `customers/application/customer-use-cases.test.ts` › finds without accents, by normalized document and by phone digits; `customers/infrastructure/prisma-customer.integration.test.ts` › searches by name key, document and phone; `customers/presentation/customers.routes.test.ts` › has no delete route, rejects a taken document on edit and long searches
- [x] S3.1.2.3 Antes de crear, aviso de documento existente en ambos sentidos (`GET /customers/document-matches`) con opción de abrir el cliente — `customers/presentation/customers.routes.test.ts` › finds possible duplicates in both directions for any role; `customers/domain/customer-domain.test.ts` › lists the prefixes from the minimum length and ignores short documents; `web/customers/components/customers.test.tsx` › warns about an existing document and opens it; › warns when the existing document is a prefix of the typed one
- [x] S3.1.2.4 El detalle muestra las secciones "Cotizaciones" (filas, vacío, "Ver más", error con reintento) y "Seguimiento" — `web/customers/components/customers.test.tsx` › lists the customer quotes and loads more; › shows an empty state when the customer has no quotes; › retries after an error loading the quotes

## H3.2 Catálogo

### S3.2.1 Crear y editar producto
- [x] S3.2.1.1 `POST` y `PATCH /products` solo `ADMIN`, con precio `moneyString` > 0 y `vatRate` válido — `catalog/presentation/products.routes.test.ts` › only lets ADMIN write; › validates the price and suggests categories; `shared/schemas/products.schema.test.ts` › rejects an unknown VAT rate; `catalog/infrastructure/prisma-product.integration.test.ts` › maps Decimal prices to canonical strings and enforces price > 0
- [x] S3.2.1.2 El formulario preselecciona `defaultVatRate` de M2 — `web/catalog/components/products-page.test.tsx` › preselects the company VAT rate and sends the price as whole pesos
- [x] S3.2.1.3 El formulario advierte que los cambios no afectan cotizaciones existentes — `web/catalog/components/products-page.test.tsx` › warns that edits do not change existing quotes
- [x] S3.2.1.4 Producto inexistente → 404 `PRODUCT_NOT_FOUND` — `catalog/presentation/products.routes.test.ts` › validates the price and suggests categories; `catalog/application/catalog-use-cases.test.ts` › answers PRODUCT_NOT_FOUND on update

### S3.2.2 Activar o desactivar producto
- [x] S3.2.2.1 `PATCH` con `isActive` solo `ADMIN`; no existe `DELETE` — `catalog/presentation/products.routes.test.ts` › only lets ADMIN write; › has no delete route and suggests at most 10 categories
- [x] S3.2.2.2 `CatalogReader` rechaza inactivos para cotizaciones nuevas (400, como decidió M4) — `catalog/application/catalog-use-cases.test.ts` › returns snapshots with Decimal prices and rejects inactive or unknown ids
- [x] S3.2.2.3 Un producto inactivo sigue legible por id — `catalog/presentation/products.routes.test.ts` › never shows inactive products to a SELLER but keeps them readable by id
- [x] S3.2.2.4 Desactivar pide confirmación; la tabla muestra "Inactivo" o se refresca si el producto ya no cumple el filtro — `web/catalog/components/products-page.test.tsx` › asks before deactivating and keeps the row with the "all" filter; › refreshes the list when a deactivated product leaves the "active" filter

### S3.2.3 Listar productos con categoría
- [x] S3.2.3.1 `SELLER` y `MANAGER` solo ven activos aunque pidan otro estado; `ADMIN` ve inactivos — `catalog/presentation/products.routes.test.ts` › never shows inactive products to a SELLER but keeps them readable by id; › ignores the status filter for a MANAGER and shows only active products; `catalog/application/catalog-use-cases.test.ts` › forces active products for non admins
- [x] S3.2.3.2 Cada producto trae `category`, `price` como `string` y `vatRate` — `catalog/presentation/products.routes.test.ts` › only lets ADMIN write; `catalog/infrastructure/prisma-product.integration.test.ts` › maps Decimal prices to canonical strings and enforces price > 0
- [x] S3.2.3.3 `q` sin mayúsculas ni tildes en nombre y categoría — `catalog/application/catalog-use-cases.test.ts` › searches by name or category key and filters by category
- [x] S3.2.3.4 La tabla muestra categoría, precio en COP y tarifa desde `lang/`; acciones y chips de estado solo para `ADMIN` — `web/catalog/components/products-page.test.tsx` › is read-only for a SELLER and formats price and VAT; › hides every status chip from a SELLER

### S3.2.4 Autocompletar categoría
- [x] S3.2.4.1 `GET /products/categories` para cualquier rol, hasta 10 categorías sin tildes — `catalog/presentation/products.routes.test.ts` › has no delete route and suggests at most 10 categories; `catalog/application/catalog-use-cases.test.ts` › suggests up to 10 distinct categories without accents; `catalog/infrastructure/prisma-product.integration.test.ts` › suggests distinct categories and finds the written form by key
- [x] S3.2.4.2 La categoría se normaliza y reutiliza la forma escrita existente — `catalog/application/catalog-use-cases.test.ts` › reuses the written form of an equivalent category; › lets the only product of a category fix its written form; `catalog/domain/catalog-domain.test.ts` › reuses the existing written form for the same key; › normalizes a new category
- [x] S3.2.4.3 La categoría es un selector con búsqueda que lista sin escribir y permite crear una nueva en un modal que la deja seleccionada (reutiliza una equivalente) — `web/catalog/components/products-page.test.tsx` › lists categories without typing and picks one from the selector; › creates a category in a modal and selects it, reusing an equivalent one; › filters by category with an explicit "all categories" option; `apps/web/src/shared/ui/search-select.test.tsx` › runs the footer action with what was typed; `apps/web/src/shared/ui/dialog.test.tsx` › closes only the top dialog with Escape

### Tabla de clientes
- [x] Toda la fila abre el detalle del cliente y hay acción "Ver detalle" — `web/customers` › opens the detail from anywhere on the row and offers an explicit "Ver detalle"

## Reglas críticas de `CLAUDE.md`
- [x] Clientes y productos no se borran, se desactivan — `customers/presentation/customers.routes.test.ts` › has no delete route, rejects a taken document on edit and long searches; `catalog/presentation/products.routes.test.ts` › has no delete route and suggests at most 10 categories
- [x] Todos los vendedores ven y editan todos los clientes — `customers/presentation/customers.routes.test.ts` › lets any role create, read and edit customers
- [x] `Customer.documentId` único, obligatorio y normalizado — `customers/presentation/customers.routes.test.ts` › answers the domain error codes; `customers/infrastructure/prisma-customer.integration.test.ts` › lets only one of two concurrent creates with the same document succeed; `shared/schemas/customers.schema.test.ts` › defaults missing contacts to null and rejects short documents
- [x] Teléfono y correo separados, al menos uno; se antepone 57 con 10 dígitos — `customers/domain/customer-domain.test.ts` › normalizes the phone and keeps the email; › rejects an invalid phone and a missing contact
- [x] Un producto inactivo no se agrega a cotizaciones nuevas — `catalog/application/catalog-use-cases.test.ts` › returns snapshots with Decimal prices and rejects inactive or unknown ids
- [x] El vendedor solo ve sus cotizaciones en el detalle del cliente (alcance del back) — `web/customers/components/customers.test.tsx` › shows an empty state when the customer has no quotes (muestra el aviso de alcance); el filtro lo aplica `GET /quotes` de M4
- [x] Rutas documentadas en OpenAPI — `customers/presentation/customers.routes.test.ts` › documents the customer and product routes in OpenAPI
- [x] Sin texto fijo en la UI: claves iguales en `es` y `en` — `apps/web/src/lang/lang-parity.test.ts` › es and en have the same keys; › es and en use the same markers per key
- [ ] Revisión visual de la sección "Cotizaciones" del detalle de cliente en móvil y escritorio — manual, pendiente
