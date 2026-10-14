# M3 Clientes y catálogo – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §5–§8; base de M0, M1 y M2.

## 1. Entidades Prisma
```prisma
model Customer {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(150)
  nameKey     String   @db.VarChar(150)   // minúsculas, sin tildes, para búsqueda
  documentId  String   @unique @db.VarChar(20)  // normalizado
  phone       String?  @db.VarChar(15)    // solo dígitos, con indicativo (ej. 573001234567)
  email       String?  @db.VarChar(150)   // minúsculas
  isActive    Boolean  @default(true)
  createdById String   @db.Uuid
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, nameKey])
  @@index([phone])
  @@index([email])
}

model Product {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(150)
  nameKey     String   @db.VarChar(150)
  category    String   @db.VarChar(80)    // forma escrita normalizada
  categoryKey String   @db.VarChar(80)    // minúsculas, sin tildes, espacios colapsados
  price       Decimal  @db.Decimal(15, 0) // COP sin IVA
  vatRate     VatRate
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, categoryKey])
  @@index([categoryKey])
  @@index([nameKey])
}
```
**`CHECK` en SQL de la migración:** `Customer`: `phone IS NOT NULL OR email IS NOT NULL`. `Product`: `price > 0`.

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/customers` | Autenticado | query `{ q?, isActive=true, page=1, pageSize=20 }` | 200 `{ items: CustomerDto[], total, page, pageSize }` | 400 |
| GET | `/api/customers/:id` | Autenticado | — | 200 `CustomerDto` | 404 `CUSTOMER_NOT_FOUND` |
| POST | `/api/customers` | Autenticado | `{ name, documentId, phone?, email? }` | 201 `CustomerDto` | 400 `VALIDATION_ERROR`, 400 `CUSTOMER_CONTACT_REQUIRED`, 400 `INVALID_PHONE`, 409 `CUSTOMER_DOCUMENT_TAKEN` |
| PATCH | `/api/customers/:id` | Autenticado | `{ name?, documentId?, phone?, email?, isActive? }` | 200 `CustomerDto` | ídem + 404 `CUSTOMER_NOT_FOUND` |
| GET | `/api/products` | Autenticado | query `{ q?, category?, isActive?, page=1, pageSize=20 }` | 200 `{ items: ProductDto[], total, page, pageSize }` | 400 |
| GET | `/api/products/categories` | Autenticado | query `{ q? }` | 200 `string[]` (máx. 10) | — |
| GET | `/api/products/:id` | Autenticado | — | 200 `ProductDto` (también si está inactivo) | 404 `PRODUCT_NOT_FOUND` |
| POST | `/api/products` | `ADMIN` | `{ name, category, price, vatRate }` | 201 `ProductDto` | 400 `VALIDATION_ERROR` |
| PATCH | `/api/products/:id` | `ADMIN` | `{ name?, category?, price?, vatRate?, isActive? }` | 200 `ProductDto` | 400, 404 `PRODUCT_NOT_FOUND` |

- `CustomerDto = { id, name, documentId, phone, email, isActive, createdBy: { id, name }, createdAt, updatedAt }`.
- `ProductDto = { id, name, category, price: string, vatRate, isActive, updatedAt }`.
- En `GET /products`, para `SELLER` y `MANAGER` se ignora `isActive` y se fuerza `true`.

## 3. Application: casos de uso y puertos
**Módulo `customers`**
| Caso de uso | Puertos | Notas |
|---|---|---|
| `CreateCustomerUseCase` | `CustomerRepository` | Normaliza; `CUSTOMER_DOCUMENT_TAKEN` (también ante la violación del `unique`, por concurrencia) |
| `UpdateCustomerUseCase` | `CustomerRepository` | Mismas reglas; el contacto se valida sobre el resultado combinado |
| `GetCustomerUseCase` | `CustomerRepository` | — |
| `SearchCustomersUseCase` | `CustomerRepository` | `q` normalizado contra `nameKey`, `email`, `documentId` y `phone` |

**Módulo `catalog`**
| Caso de uso | Puertos | Notas |
|---|---|---|
| `CreateProductUseCase` | `ProductRepository` | Resuelve `category` con `CategoryResolver` |
| `UpdateProductUseCase` | `ProductRepository` | Incluye `isActive` |
| `GetProductUseCase` | `ProductRepository` | Incluye inactivos |
| `ListProductsUseCase` | `ProductRepository` | Fuerza `isActive` según el rol del `Actor` |
| `SuggestCategoriesUseCase` | `ProductRepository` | `DISTINCT category` por `categoryKey LIKE q%`; máximo 10 |

**Puertos públicos (barriles)**
| Puerto | Contrato | Lo usa |
|---|---|---|
| `CustomerReader` | `getActiveById(id): CustomerSnapshotDto` (lanza `CUSTOMER_NOT_FOUND` o `CUSTOMER_INACTIVE`); `getById(id)` | M4, M5 |
| `CatalogReader` | `getActiveByIds(ids): ProductSnapshotDto[]` (lanza `PRODUCT_INACTIVE` o `PRODUCT_NOT_FOUND` con el id); `getByIds(ids)` (incluye inactivos, para reactivar o duplicar) | M4 |

`ProductSnapshotDto = { id, name, category, price: Decimal, vatRate, isActive }`. `CustomerSnapshotDto = { id, name, documentId, phone, email, isActive }`.

**Normalizadores en `shared/src/normalize/`** (los usan el front y el back):
`normalizeDocumentId`, `normalizePhone`, `normalizeEmail`, `toSearchKey`, `normalizeCategoryLabel`.

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `CustomersPage` (`/customers`) | Búsqueda, filtro de estado, paginación, crear |
| Pantalla | `CustomerDetailPage` (`/customers/:id`) | Datos y acciones; secciones reservadas para cotizaciones (M4) e interacciones (M6) |
| Componente | `CustomerFormDialog` | Normalización en vivo y aviso de documento existente con enlace al cliente |
| Pantalla | `ProductsPage` (`/products`) | Lista para todos los roles; crear, editar y desactivar solo `ADMIN` |
| Componente | `ProductFormDialog` | Precio sin IVA en COP, tarifa preseleccionada con `defaultVatRate`, aviso de "no afecta cotizaciones existentes" |
| Componente | `CategoryAutocomplete` | Sugerencias de `/products/categories` con debounce |
| Componente | `MoneyInput` (en `core/ui`) | Edición de montos COP como `string` sin decimales; formato de miles en pantalla |
| Store | `features/customers/store/customers-filters.store.ts`, `features/catalog/store/products-filters.store.ts` | Filtros y página |
| Service | `customers.service.ts`, `products.service.ts` | Llamadas a la API |

## 5. Claves de `lang/` (front)
- `nav.customers`, `nav.products`
- `customers.title`, `customers.new`, `customers.edit`, `customers.search`, `customers.fields.name`, `customers.fields.documentId`, `customers.fields.phone`, `customers.fields.email`, `customers.fields.status`, `customers.fields.createdBy`
- `customers.contactHint`, `customers.phonePreview`, `customers.duplicateFound`, `customers.openExisting`, `customers.confirm.deactivate`, `customers.detail.quotesPlaceholder`, `customers.detail.interactionsPlaceholder`
- `products.title`, `products.new`, `products.edit`, `products.search`, `products.fields.name`, `products.fields.category`, `products.fields.price`, `products.fields.vatRate`, `products.fields.status`
- `products.priceWithoutVatHint`, `products.snapshotNotice`, `products.confirm.deactivate`, `products.category.createNew`
- `common.status.active`, `common.status.inactive`, `common.actions.activate`, `common.actions.deactivate`
- `errors.CUSTOMER_NOT_FOUND`, `errors.CUSTOMER_DOCUMENT_TAKEN`, `errors.CUSTOMER_CONTACT_REQUIRED`, `errors.INVALID_PHONE`, `errors.CUSTOMER_INACTIVE`, `errors.PRODUCT_NOT_FOUND`, `errors.PRODUCT_INACTIVE`

## 6. Reglas de negocio
**Normalización**
| Campo | Regla | Ejemplo |
|---|---|---|
| `documentId` | Mayúsculas; se eliminan espacios, puntos, guiones y cualquier carácter que no sea `[0-9A-Z]`; longitud 5–20 | `900.123.456-7` → `9001234567` |
| `phone` | Solo dígitos; si quedan 10 se antepone `57`; resultado válido entre 11 y 15 dígitos; se guarda sin `+` (formato de wa.me) | `300 123 4567` → `573001234567` |
| `email` | `trim` + minúsculas; formato validado con Zod | `Ana@Mail.COM ` → `ana@mail.com` |
| `nameKey`, `categoryKey` | `toSearchKey`: minúsculas, sin tildes (NFD), espacios colapsados | `Tecnología  Móvil` → `tecnologia movil` |
| `category` (forma escrita) | `trim` + espacios colapsados; si ya existe un producto con el mismo `categoryKey`, se reutiliza la forma escrita existente | `tecnologia` → `Tecnología` (si ya existe) |

**Reglas**
| Regla | Fuente |
|---|---|
| `documentId` obligatorio y único | Decisión 63 |
| Al menos uno entre `phone` y `email` | RN-31 |
| Todos los vendedores ven y editan todos los clientes | RN-03 |
| Producto: precio sin IVA, > 0, `Decimal(15,0)` | RN-04, RN-07 |
| Tarifa: `GENERAL_19` (19 %), `REDUCED_5` (5 %), `EXEMPT` (0 %) | RN-07 |
| Producto inactivo: no entra en cotizaciones nuevas; las existentes conservan su snapshot | RN-09 |
| Cliente inactivo: no entra en cotizaciones nuevas (lo aplica M4 vía `CustomerReader.getActiveById`) | Propuesta de este plan |
| Sin `DELETE` de clientes ni de productos | RN-16 |

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `normalize.spec` | Unitaria (`shared`) | Tabla de normalización con casos límite: NIT con dígito de verificación, teléfonos de 7, 10, 12 y 16 dígitos, tildes, espacios dobles |
| `customer.schema.spec`, `product.schema.spec` | Unitaria (`shared`) | Contacto obligatorio, `moneyString` > 0, enum de tarifa |
| `create-customer.use-case.spec` | Unitaria (fakes) | Duplicado por documento normalizado; contacto combinado al editar |
| `category-resolver.spec` | Unitaria | Reutiliza la forma escrita existente con la misma clave |
| `customers.repository.spec`, `products.repository.spec` | Integración (Postgres) | `unique` de `documentId` ante inserciones concurrentes; `CHECK`; búsqueda sin tildes; mapper de `Decimal` |
| `customers.routes.spec` | Supertest | Cualquier rol crea y edita; `CUSTOMER_DOCUMENT_TAKEN`; paginación |
| `products.routes.spec` | Supertest | Solo `ADMIN` escribe; `SELLER` nunca ve inactivos aunque envíe `isActive=false`; `categories` máximo 10 |
| `catalog-reader.spec` | Unitaria | `getActiveByIds` rechaza inactivos e inexistentes con el id; `getByIds` los incluye |
| `customer-form.spec`, `product-form.spec` | Testing Library | Normalización en vivo, aviso de duplicado, preselección de `defaultVatRate`, `MoneyInput` sin decimales |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 110–118) |
|---|---|
| Normalización de `documentId` (decisión 79) | Se guarda solo `[0-9A-Z]` y no se valida el dígito de verificación del NIT. Riesgo: `900123456` y `9001234567` (con DV) quedan como clientes distintos; el aviso de duplicados del front busca por prefijo para mitigarlo. |
| Normalización de `category` (decisión 79) | Se usan `category` (forma escrita) y `categoryKey` (clave), en vez de solo minúsculas, para mostrar la forma bien escrita. |
| Cliente inactivo en cotizaciones nuevas | Las fuentes solo lo dicen para productos (RN-09); se propone la misma regla para clientes. |
| Precio > 0 | Las fuentes no lo dicen; se propone para evitar líneas en cero por error. |
| Columnas de búsqueda `nameKey` | Se calculan en la aplicación al guardar; no se usa `unaccent` ni extensiones de Postgres. |
| Unidad de medida del producto | Las fuentes no la piden (las cantidades admiten 2 decimales); queda fuera. |
| Dependencia blanda con M2 | Solo `defaultVatRate`; si M2 no está disponible, el formulario usa `GENERAL_19`. |
