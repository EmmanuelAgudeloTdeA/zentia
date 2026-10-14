# M1 Acceso y usuarios – Épicas

> Fuentes: `docs/fuente/desglose.md` (M1; decisiones 27, 30, 53, 55, 56, 62, 67, 68, 70, 73, 81, 90–100), `CLAUDE.md`, `docs/prd.md` (RF-10, RNF-03, RN-01, RN-16), `docs/architecture.md` §6.

## Objetivo
Autenticar a los usuarios y autorizar cada petición por rol y por propiedad, y permitir que el administrador gestione usuarios y contraseñas.

**Cubre:** RF-10 (usuarios y roles) y RNF-03 (seguridad y control de acceso).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 · H0.1 | Monorepo, `shared` con barril, reglas de lint por capa, CI |
| M0 · H0.2 | App Express bajo `/api` con su cadena de middlewares, `AppError` y catálogo de errores, `validate`, registro OpenAPI por módulo, `generalLimiter`, schema de env extensible, Prisma client y `seed.ts` |
| M0 · H0.3 | `http-client` (punto de extensión para `Authorization` y refresh), store de sesión con su forma, `ProtectedRoute`, layouts público y privado, navegación registrable, `lang/` |

## Lo desbloquea
| Módulo | Qué necesita de M1 |
|---|---|
| M2 Configuración | Guard con rol `ADMIN` para editar configuración y logo |
| M3 Clientes y catálogo | Guard autenticado (clientes) y con rol `ADMIN` (productos); `actor.id` para `createdById` |
| M4 Cotizaciones | `actor` (id, rol), política de alcance `OWN`/`ALL` (S1.2.2), lista de usuarios activos para reasignar (S1.3.2) |
| M6 Seguimiento | `User.isActive` para omitir dueños inactivos |
| M8 Dashboard | Política de alcance y lista de usuarios activos para el filtro por vendedor |
| M10 | Rutas públicas con rate limit para la verificación de RNF-03 |

---

## H1.1 Autenticación
**Objetivo:** iniciar y cerrar sesión con access token en memoria y refresh token rotativo en cookie, y cambiar la propia contraseña.
**Depende de:** M0 (H0.2, H0.3).

### S1.1.1 Login
Como usuario de cualquier rol, quiero iniciar sesión con mi correo y contraseña, para acceder a las funciones de mi rol.
- **RF de origen:** RF-10.1, RNF-03
- **Criterios de aceptación:**
  1. `POST /api/auth/login` con credenciales válidas responde 200 `{ accessToken, user }` y crea una cookie de refresh `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth` de 7 días; el access token dura 15 min y solo lleva `sub`.
  2. Un correo inexistente, una contraseña incorrecta o un usuario inactivo responden 401 `INVALID_CREDENTIALS`, con el mismo tiempo de respuesta aproximado (sin enumerar usuarios).
  3. Más de 5 intentos fallidos por IP + correo en 15 min responden 429 `RATE_LIMITED`.
  4. El seed crea el primer `ADMIN` con `ADMIN_EMAIL` y `ADMIN_PASSWORD` y `mustChangePassword = true`, solo si no existe ningún administrador.
  5. En el front, la pantalla de login usa el layout público, muestra los errores traducidos y, tras el login, redirige a `/change-password` si `mustChangePassword` es `true`; si no, al inicio.
- **Depende de:** M0 (H0.2, H0.3)
- **Tamaño:** M

### S1.1.2 Refresh token
Como usuario autenticado, quiero que mi sesión se renueve sin volver a escribir la contraseña, para trabajar sin interrupciones durante 7 días.
- **RF de origen:** RF-10.1, RNF-03
- **Criterios de aceptación:**
  1. `POST /api/auth/refresh` con una cookie válida responde 200 `{ accessToken, user }`, revoca el token usado y emite otro de la misma familia en una cookie nueva.
  2. Si llega un token ya rotado fuera de la ventana de gracia (10 s), se revoca toda la familia y se responde 401 `REFRESH_TOKEN_REUSED`; dentro de la ventana se responde 409 `REFRESH_IN_PROGRESS` sin revocar.
  3. Una cookie ausente, desconocida o expirada, o un usuario inactivo, responde 401 `INVALID_REFRESH_TOKEN`.
  4. Al recargar la página, el front recupera la sesión con un refresh; si falla, muestra el login.
  5. El `http-client` renueva el access token una sola vez ante 401 `TOKEN_EXPIRED` y reintenta la petición; las pestañas no refrescan en paralelo (un solo refresh a la vez).
- **Depende de:** S1.1.1
- **Tamaño:** L

### S1.1.3 Logout
Como usuario autenticado, quiero cerrar sesión, para que nadie más use mi sesión en este dispositivo.
- **RF de origen:** RF-10.1, decisión 56
- **Criterios de aceptación:**
  1. `POST /api/auth/logout` se autentica con la cookie de refresh, revoca la familia del token y borra la cookie.
  2. Responde siempre 204, aunque la cookie falte, sea inválida o esté expirada.
  3. Después del logout, un refresh con la cookie anterior responde 401.
  4. El front limpia el store de sesión y redirige a `/login`.
- **Depende de:** S1.1.2
- **Tamaño:** S

### S1.1.4 Cambiar mi contraseña
Como usuario autenticado, quiero cambiar mi contraseña indicando la actual, para mantener mi cuenta segura y completar el cambio obligatorio tras un restablecimiento.
- **RF de origen:** RF-10.4, decisiones 27 y 81
- **Criterios de aceptación:**
  1. `POST /api/auth/change-password` exige `currentPassword` y `newPassword`; una contraseña actual incorrecta responde 400 `INVALID_CURRENT_PASSWORD`.
  2. La nueva contraseña cumple la política (10–72 bytes, al menos una letra y un número, distinta del correo y de la actual); si no, responde 400 `VALIDATION_ERROR` o `PASSWORD_REUSED`.
  3. Si el cambio es exitoso, `mustChangePassword` pasa a `false`, se revocan todos los refresh tokens del usuario y la sesión actual recibe una familia nueva: 200 `{ accessToken, user }` y una cookie nueva.
  4. Con `mustChangePassword = true`, el front solo permite la pantalla de cambio de contraseña y el logout.
  5. Cambiar la contraseña no exige rol: está disponible para los tres.
- **Depende de:** S1.1.2, S1.2.1
- **Tamaño:** M

---

## H1.2 Roles y permisos
**Objetivo:** que cada petición se autorice con datos de la BD, por rol en la ruta y por propiedad en el caso de uso.
**Depende de:** H1.1 (S1.1.1).

### S1.2.1 Guard por rol
Como administrador, quiero que cada ruta solo la usen los roles permitidos, para proteger la información según la función de cada persona.
- **RF de origen:** RF-10.5, RNF-03, decisión 70
- **Criterios de aceptación:**
  1. Toda ruta salvo las públicas (decisión 53) y el logout exige `Authorization: Bearer`; sin token responde 401 `UNAUTHENTICATED`, con token expirado 401 `TOKEN_EXPIRED` y con firma inválida 401 `TOKEN_INVALID`.
  2. El guard carga el usuario por PK en cada petición; si no existe o está inactivo responde 401 `USER_INACTIVE`.
  3. Un rol no permitido en la ruta responde 403 `FORBIDDEN`; un cambio de rol en la BD aplica desde la siguiente petición.
  4. Con `mustChangePassword = true` solo pasan `POST /auth/change-password`; el resto responde 403 `PASSWORD_CHANGE_REQUIRED`.
  5. En el front, `ProtectedRoute` acepta `roles` y la navegación oculta las entradas no permitidas.
- **Depende de:** S1.1.1
- **Tamaño:** M

### S1.2.2 Permiso "cotizaciones propias vs todas"
Como gerente comercial, quiero ver y gestionar las cotizaciones de todos, mientras cada vendedor solo ve las suyas, para supervisar sin exponer la información entre vendedores.
- **RF de origen:** RF-10.5, RN-01
- **Criterios de aceptación:**
  1. La política de alcance devuelve `OWN` para `SELLER` y `ALL` para `MANAGER` y `ADMIN`.
  2. `assertCanAccess(actor, ownerId)` permite el acceso con `ALL`, y con `OWN` solo si `ownerId === actor.id`; si no, lanza el código de "no encontrado" que indique el módulo (no revela la existencia del recurso).
  3. `scopeFilter(actor)` devuelve el filtro de listado (`{}` o `{ ownerId: actor.id }`) que usan M4, M5, M7, M8 y M9.
  4. Se exporta por el barril de `auth`; los módulos no reimplementan la regla.
  5. Tiene pruebas unitarias para los tres roles, con recursos propios y ajenos.
- **Depende de:** S1.2.1
- **Tamaño:** S

---

## H1.3 Gestión de usuarios
**Objetivo:** que el administrador cree, edite, desactive y liste usuarios y restablezca contraseñas, sin borrar nunca un usuario.
**Depende de:** H1.2.

### S1.3.1 Crear, editar y desactivar usuario
Como administrador, quiero crear, editar y desactivar usuarios, para controlar quién usa el sistema y con qué rol.
- **RF de origen:** RF-10.2, RN-16, decisión 30
- **Criterios de aceptación:**
  1. `POST /api/users` (solo `ADMIN`) crea un usuario con correo normalizado (minúsculas, sin espacios), nombre y rol; genera una contraseña temporal que se devuelve una sola vez, con `mustChangePassword = true`. Un correo repetido responde 409 `EMAIL_TAKEN`.
  2. `PATCH /api/users/:id` permite cambiar nombre, correo, rol e `isActive`; un usuario inexistente responde 404 `USER_NOT_FOUND`.
  3. Desactivar un usuario revoca todos sus refresh tokens; sus datos y cotizaciones se conservan (RN-17). No existe `DELETE`.
  4. Un administrador no puede desactivarse ni quitarse el rol `ADMIN` a sí mismo (409 `CANNOT_MODIFY_SELF`), y siempre debe quedar al menos un `ADMIN` activo (409 `LAST_ADMIN`).
  5. En el front, el formulario de crear o editar usa los schemas de `shared` y la contraseña temporal se muestra en un diálogo con opción de copiar.
- **Depende de:** S1.2.1
- **Tamaño:** M

### S1.3.2 Listar usuarios
Como administrador, quiero listar y filtrar los usuarios, para encontrarlos rápido y revisar su estado.
- **RF de origen:** RF-10.2
- **Criterios de aceptación:**
  1. `GET /api/users` (solo `ADMIN`) devuelve una lista paginada filtrable por texto (nombre o correo), rol y estado.
  2. Nunca devuelve `passwordHash` ni datos de tokens.
  3. `GET /api/users/options` (`MANAGER` y `ADMIN`) devuelve los usuarios activos como `{ id, name, role }`, para reasignar cotizaciones (M4) y filtrar el dashboard por vendedor (M8).
  4. En el front, la tabla muestra nombre, correo, rol (etiqueta desde `lang/`) y estado, con acciones de editar, activar o desactivar y restablecer contraseña.
- **Depende de:** S1.3.1
- **Tamaño:** S

### S1.3.3 Restablecer contraseña
Como administrador, quiero restablecer la contraseña de un usuario con una temporal, para que recupere el acceso sin correo.
- **RF de origen:** RF-10.3, decisión 27
- **Criterios de aceptación:**
  1. `POST /api/users/:id/reset-password` (solo `ADMIN`) genera una contraseña temporal, la devuelve una sola vez y deja `mustChangePassword = true`.
  2. Revoca todos los refresh tokens del usuario.
  3. El usuario restablecido solo puede cambiar la contraseña indicando la temporal (S1.1.4) o cerrar sesión.
  4. Un administrador puede restablecer su propia contraseña; el resultado es el mismo.
- **Depende de:** S1.3.1, S1.1.4
- **Tamaño:** S
