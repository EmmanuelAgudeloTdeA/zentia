# M1 Acceso y usuarios – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/architecture.md` §5, §6, §8 y §10; base de M0 (`docs/modules/mod-0-fundacion/tech-plan.md`).

## 1. Entidades Prisma
```prisma
enum Role { SELLER MANAGER ADMIN }

model User {
  id                 String    @id @default(uuid()) @db.Uuid
  email              String    @unique            // normalizado: trim + minúsculas
  name               String    @db.VarChar(120)
  passwordHash       String
  role               Role
  isActive           Boolean   @default(true)
  mustChangePassword Boolean   @default(true)
  passwordChangedAt  DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  refreshTokens      RefreshToken[]

  @@index([role, isActive])
}

model RefreshToken {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @db.Uuid
  user         User      @relation(fields: [userId], references: [id])
  tokenHash    String    @unique                 // SHA-256 del token opaco
  familyId     String    @db.Uuid
  expiresAt    DateTime
  revokedAt    DateTime?
  replacedById String?   @db.Uuid
  rotatedAt    DateTime?                         // para la ventana de gracia de 10 s
  createdAt    DateTime  @default(now())

  @@index([userId])
  @@index([familyId])
}
```
- La primera migración real del proyecto es la de este módulo.
- `Role` se exporta también desde `shared/enums` para el front.

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | Público (rate limit de login) | `{ email, password }` | 200 `{ accessToken, user }` + cookie | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 `RATE_LIMITED` |
| POST | `/api/auth/refresh` | Público, con cookie (rate limit general) | — | 200 `{ accessToken, user }` + cookie nueva | 401 `INVALID_REFRESH_TOKEN`, 401 `REFRESH_TOKEN_REUSED`, 409 `REFRESH_IN_PROGRESS`, 429 |
| POST | `/api/auth/logout` | Cookie de refresh | — | 204 + cookie borrada | — (siempre 204) |
| POST | `/api/auth/change-password` | Autenticado (cualquier rol; permitido con `mustChangePassword`) | `{ currentPassword, newPassword }` | 200 `{ accessToken, user }` + cookie nueva | 400 `VALIDATION_ERROR`, 400 `INVALID_CURRENT_PASSWORD`, 400 `PASSWORD_REUSED` |
| GET | `/api/users` | `ADMIN` | query `{ q?, role?, isActive?, page=1, pageSize=20 }` | 200 `{ items: UserDto[], total, page, pageSize }` | 400, 401, 403 |
| GET | `/api/users/options` | `MANAGER`, `ADMIN` | — | 200 `{ id, name, role }[]` (solo activos) | 401, 403 |
| GET | `/api/users/:id` | `ADMIN` | — | 200 `UserDto` | 404 `USER_NOT_FOUND` |
| POST | `/api/users` | `ADMIN` | `{ email, name, role }` | 201 `{ user: UserDto, temporaryPassword }` | 400, 409 `EMAIL_TAKEN` |
| PATCH | `/api/users/:id` | `ADMIN` | `{ email?, name?, role?, isActive? }` | 200 `UserDto` | 400, 404 `USER_NOT_FOUND`, 409 `EMAIL_TAKEN`, 409 `CANNOT_MODIFY_SELF`, 409 `LAST_ADMIN` |
| POST | `/api/users/:id/reset-password` | `ADMIN` | — | 200 `{ temporaryPassword }` | 404 `USER_NOT_FOUND` |

`UserDto = { id, email, name, role, isActive, mustChangePassword, createdAt }`. La respuesta de `login`, `refresh` y `change-password` incluye `user: UserDto`.

**Errores comunes del guard** (cualquier ruta protegida de cualquier módulo): 401 `UNAUTHENTICATED`, 401 `TOKEN_EXPIRED`, 401 `TOKEN_INVALID`, 401 `USER_INACTIVE`, 403 `FORBIDDEN`, 403 `PASSWORD_CHANGE_REQUIRED`.

## 3. Application: casos de uso y puertos
**Módulo `auth`**
| Caso de uso | Puertos | Notas |
|---|---|---|
| `LoginUseCase` | `UserReader`, `PasswordHasher`, `TokenService` | Ante un usuario inexistente verifica contra un hash ficticio, para igualar tiempos |
| `RefreshSessionUseCase` | `TokenService`, `UserReader` | Rotación, ventana de gracia y detección de reutilización |
| `LogoutUseCase` | `TokenService` | Revoca la familia; nunca falla hacia afuera |
| `ChangeOwnPasswordUseCase` | `UserRepository`, `PasswordHasher`, `TokenService`, `UnitOfWork` | Revoca todos los tokens y emite una familia nueva en la misma transacción |
| `AuthenticateRequest` (guard) | `AccessTokenVerifier`, `UserReader` | Carga el usuario por PK; produce `Actor { id, role, mustChangePassword }` |

**Módulo `users`**
| Caso de uso | Puertos | Notas |
|---|---|---|
| `CreateUserUseCase` | `UserRepository`, `PasswordHasher`, `TemporaryPasswordGenerator` | Correo normalizado, `EMAIL_TAKEN` |
| `UpdateUserUseCase` | `UserRepository`, `TokenService`, `UnitOfWork` | Reglas de `CANNOT_MODIFY_SELF` y `LAST_ADMIN`; si desactiva, `revokeAllForUser` |
| `ListUsersUseCase` | `UserRepository` | Paginado y con filtros |
| `ListUserOptionsUseCase` | `UserRepository` | Solo activos, `{ id, name, role }` |
| `ResetPasswordUseCase` | `UserRepository`, `PasswordHasher`, `TemporaryPasswordGenerator`, `TokenService`, `UnitOfWork` | `mustChangePassword = true` y `revokeAllForUser` |
| `SeedFirstAdmin` (script) | `UserRepository`, `PasswordHasher` | Se ejecuta desde `prisma/seed.ts`; no es una ruta |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `PasswordHasher` | `hash(plain)`, `verify(plain, hash)` | `BcryptPasswordHasher` (`BCRYPT_COST`, por defecto 12) |
| `TokenService` | `signAccess(userId)`, `issueRefresh(userId, familyId?)`, `rotateRefresh(raw)`, `revokeFamily(raw)`, `revokeAllForUser(userId)` | `JoseTokenService` + `PrismaRefreshTokenRepository` |
| `AccessTokenVerifier` | `verify(token): { sub }` | `jose` (HS256, `iss: zentia-api`, `aud: zentia-web`) |
| `TemporaryPasswordGenerator` | `generate(): string` | `crypto.randomInt`, 12 caracteres que cumplen la política |
| `UserReader` / `UserRepository` | lectura por PK y por correo, CRUD | `PrismaUserRepository` |

**Política de alcance** (exportada por el barril de `auth`)
- `resolveScope(role): 'OWN' | 'ALL'`
- `assertCanAccess(actor, ownerId, notFoundCode)`
- `scopeFilter(actor): { ownerId?: string }`

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `LoginPage` (`/login`, layout público) | Formulario; el nombre de la empresa usa `app.name` hasta que M2 entregue `GET /company/branding` |
| Pantalla | `ChangePasswordPage` (`/change-password`) | Modo obligatorio (sin navegación) y modo voluntario (desde el menú de usuario) |
| Pantalla | `UsersPage` (`/users`, solo `ADMIN`) | Tabla con filtros, paginación y acciones |
| Componente | `UserFormDialog` | Crear y editar, con validación de los schemas de `shared` |
| Componente | `TemporaryPasswordDialog` | Muestra la contraseña temporal una sola vez, con botón de copiar |
| Componente | `UserMenu` | Nombre, rol, cambiar contraseña, cerrar sesión |
| Store | `core/auth/session.store.ts` | `user`, `accessToken`, `status`; acciones `login`, `logout`, `refresh`, `bootstrap`, `setSession` |
| Store | `features/users/store/users-filters.store.ts` | Filtros y página de la tabla |
| Service | `features/auth/services/auth.service.ts` | `login`, `refresh`, `logout`, `changePassword` |
| Service | `features/users/services/users.service.ts` | `list`, `options`, `get`, `create`, `update`, `resetPassword` |
| Core | `http-client` | Agrega `Authorization`. Ante 401 `TOKEN_EXPIRED` hace un único refresh (con `navigator.locks` entre pestañas) y reintenta. Ante 409 `REFRESH_IN_PROGRESS` espera y reintenta una vez. Si el refresh falla, limpia la sesión y va a `/login`. Ante 403 `PASSWORD_CHANGE_REQUIRED` va a `/change-password` |

## 5. Claves de `lang/` (front)
- `auth.login.title`, `auth.login.email`, `auth.login.password`, `auth.login.submit`
- `auth.logout`
- `auth.changePassword.title`, `auth.changePassword.forcedNotice`, `auth.changePassword.current`, `auth.changePassword.new`, `auth.changePassword.confirm`, `auth.changePassword.submit`, `auth.changePassword.success`
- `auth.passwordPolicy.hint`
- `users.title`, `users.new`, `users.edit`, `users.filters.search`, `users.filters.role`, `users.filters.status`, `users.columns.name`, `users.columns.email`, `users.columns.role`, `users.columns.status`, `users.columns.actions`
- `users.actions.edit`, `users.actions.activate`, `users.actions.deactivate`, `users.actions.resetPassword`, `users.confirm.deactivate`, `users.confirm.resetPassword`
- `users.temporaryPassword.title`, `users.temporaryPassword.notice`, `users.temporaryPassword.copy`, `users.temporaryPassword.copied`
- `users.status.active`, `users.status.inactive`
- `enums.Role.SELLER`, `enums.Role.MANAGER`, `enums.Role.ADMIN`
- `nav.users`, `userMenu.changePassword`
- `errors.INVALID_CREDENTIALS`, `errors.UNAUTHENTICATED`, `errors.TOKEN_EXPIRED`, `errors.TOKEN_INVALID`, `errors.USER_INACTIVE`, `errors.FORBIDDEN`, `errors.PASSWORD_CHANGE_REQUIRED`, `errors.INVALID_REFRESH_TOKEN`, `errors.REFRESH_TOKEN_REUSED`, `errors.REFRESH_IN_PROGRESS`, `errors.INVALID_CURRENT_PASSWORD`, `errors.PASSWORD_REUSED`, `errors.EMAIL_TAKEN`, `errors.USER_NOT_FOUND`, `errors.CANNOT_MODIFY_SELF`, `errors.LAST_ADMIN`
- `validation.password.policy`

## 6. Reglas de negocio
**Tokens**
| Elemento | Valor |
|---|---|
| Access token | JWT HS256 (`jose`); claims `sub`, `iat`, `exp`, `iss=zentia-api`, `aud=zentia-web`; 15 min (`ACCESS_TOKEN_TTL`) |
| Refresh token | Opaco: 32 bytes aleatorios en base64url; en BD solo su SHA-256; 7 días (`REFRESH_TOKEN_TTL`) |
| Cookie | `zentia_rt`; `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`, `Max-Age` = 7 días |
| Rotación | Cada refresh: `revokedAt = now`, `rotatedAt = now`, `replacedById` = token nuevo de la misma `familyId` |
| Ventana de gracia | Token rotado presentado ≤ 10 s después: 409 `REFRESH_IN_PROGRESS`, sin revocar. Más tarde: revocar la familia y 401 `REFRESH_TOKEN_REUSED` |
| Limpieza | En cada login se borran los tokens del usuario expirados o revocados hace más de 7 días |

**Política de contraseñas**
| Regla | Valor |
|---|---|
| Longitud | 10 a 72 bytes en UTF-8 (72 es el límite de bcrypt) |
| Composición | Al menos una letra y un número |
| Prohibido | Igual al correo; igual a la actual (`PASSWORD_REUSED`) |
| Temporal | 12 caracteres generados con `crypto`; cumple la política |

**Cambio de la propia contraseña:** se exige la actual. Luego se ejecuta `revokeAllForUser`, se emite una familia nueva para la sesión actual y `mustChangePassword = false`, todo en una transacción.

**Protecciones de administración**
| Situación | Resultado |
|---|---|
| El admin se desactiva o se quita el rol `ADMIN` a sí mismo | 409 `CANNOT_MODIFY_SELF` |
| La operación dejaría 0 `ADMIN` activos | 409 `LAST_ADMIN` |
| Se desactiva un usuario | `revokeAllForUser`; el guard lo bloquea desde la siguiente petición |

**Rate limits**
| Ruta | Límite |
|---|---|
| `POST /auth/login` | 5 intentos fallidos por IP + correo cada 15 min |
| `POST /auth/refresh`, `POST /auth/logout` | 60 por IP por minuto |

**Seed del primer administrador:** si no existe ningún `ADMIN`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` son obligatorias (la contraseña debe cumplir la política) y se crea el usuario con `mustChangePassword = true`. Si ya existe un `ADMIN`, el seed no hace nada.

**Variables de entorno nuevas:** `JWT_ACCESS_SECRET` (≥ 32 caracteres), `ACCESS_TOKEN_TTL=15m`, `REFRESH_TOKEN_TTL=7d`, `BCRYPT_COST=12`; solo para el seed: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `password-policy.spec` | Unitaria (`shared`) | Longitud en bytes, composición, igual al correo |
| `access-scope.spec` | Unitaria | `resolveScope`, `assertCanAccess` y `scopeFilter` para los tres roles, con recursos propios y ajenos |
| `login.use-case.spec` | Unitaria (fakes) | Credenciales válidas, inválidas, usuario inactivo (mismo código), verificación con hash ficticio |
| `refresh.use-case.spec` | Unitaria (fakes + `Clock`) | Rotación, ventana de gracia de 10 s, reutilización que revoca la familia, token expirado |
| `change-password.use-case.spec` | Unitaria | Contraseña actual incorrecta, `PASSWORD_REUSED`, revocación total y familia nueva |
| `update-user.use-case.spec` | Unitaria | `CANNOT_MODIFY_SELF`, `LAST_ADMIN`, revocación al desactivar |
| `refresh-token.repository.spec` | Integración (Postgres) | Unicidad de `tokenHash`; revocación por familia y por usuario |
| `auth.routes.spec` | Supertest | Atributos de la cookie, logout siempre 204, rate limit de login, `PASSWORD_CHANGE_REQUIRED` en otras rutas |
| `guard.spec` | Supertest | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `USER_INACTIVE`, `FORBIDDEN`; cambio de rol efectivo en la siguiente petición |
| `users.routes.spec` | Supertest | Solo `ADMIN`; `/users/options` para `MANAGER`; nunca expone `passwordHash` |
| `seed.spec` | Integración | Crea el admin solo si no existe; rechaza una contraseña que no cumple la política |
| `http-client.refresh.spec` | Unitaria (front) | Un solo refresh concurrente, reintento, redirecciones ante fallo y ante `PASSWORD_CHANGE_REQUIRED` |
| `login-page.spec`, `users-page.spec` | Testing Library | Errores traducidos, diálogo de contraseña temporal, acciones por estado |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 90–100) |
|---|---|
| Refresh opaco en vez de JWT | Se usa un token opaco con hash en BD (`RefreshToken` ya da revocación); `jose` solo firma el access token. `JWT_REFRESH_SECRET` sale de las variables de entorno de `architecture.md`. |
| Varias pestañas refrescando a la vez | Ventana de gracia de 10 s en el servidor y `navigator.locks` en el front, para evitar falsos positivos de reutilización. |
| Reactivar usuarios | `PATCH isActive: true` lo permite. El desglose solo nombra "desactivar"; reactivar es el inverso natural y no borra nada. |
| Lista de usuarios para otros módulos | `GET /users/options` para `MANAGER` y `ADMIN`; lo necesitan M4 (reasignar) y M8 (filtro por vendedor). |
| Respuesta de "no encontrado" en el alcance `OWN` | Un vendedor que pide una cotización ajena recibe el código de "no encontrado" del módulo, no 403, para no revelar que existe. |
| Una consulta extra por petición (guard) | Búsqueda por PK; se mide en H10.2. |
| Residuo de 15 min tras un restablecimiento | Aceptado (decisiones 70 y 81). |
