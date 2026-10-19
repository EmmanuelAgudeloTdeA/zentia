# M1 Acceso y usuarios – UI brief

> Fuentes: `epics.md` (H1.1 Autenticación, H1.2 Roles y permisos, H1.3 Gestión de usuarios) y `tech-plan.md` §4–§6 de este módulo; `docs/design/design-system.md`; referencia visual del login. Sin código ni endpoints.

**Depende de:** M0 · H0.3 (layouts público y privado, `ProtectedRoute`, navegación registrable, `lang/`); `docs/design/design-system.md`. El branding del login (logo y nombre) llega con M2 · S2.1.4; mientras tanto se usa `app.name`.

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega |
|---|---|---|
| Iniciar sesión | Usuario sin sesión | Al abrir la app sin sesión, al cerrar sesión o al expirar la sesión (S1.1.1, S1.1.2) |
| Cambiar contraseña | Los tres roles | Obligatoria tras el login si `mustChangePassword`; voluntaria desde el menú de usuario (S1.1.4) |
| Usuarios | `ADMIN` | Navegación "Usuarios" (S1.3.2) |
| Diálogo Crear / Editar usuario | `ADMIN` | Desde "Usuarios" (S1.3.1) |
| Diálogo Contraseña temporal | `ADMIN` | Tras crear un usuario o restablecer una contraseña (S1.3.1, S1.3.3) |
| Menú de usuario | Los tres roles | Encabezado del layout privado (S1.1.3, S1.1.4) |

---

## Iniciar sesión (S1.1.1)
**Muestra** (layout público, estilo de la referencia): tarjeta con borde superior `primary-600`, `BrandMark` en círculo blanco, título "Cotizaciones" (`h1`), subtítulo "Ingresa con tu correo y contraseña.", formulario y una nota al pie: "¿Olvidaste tu contraseña? Pídele al administrador que te asigne una nueva."

**Campos:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Correo | Sí | Formato de correo, al salir del campo |
| Contraseña | Sí | No vacía; botón de icono para mostrar u ocultar |

**Acciones:** `Button` `primary` `lg` ancho completo "Entrar" — cualquiera.

**Estados:**
- Cargando: el botón pasa a cargando y bloquea el doble envío.
- Error: `Alert` `danger` encima del botón con `errors.INVALID_CREDENTIALS` ("Correo o contraseña incorrectos.") o `errors.RATE_LIMITED` (demasiados intentos, espera unos minutos). No se indica cuál de los dos datos falló ni si el usuario está inactivo.
- Sesión expirada: aviso `info` "Tu sesión terminó. Inicia sesión de nuevo."
- Éxito: redirige a "Cambiar contraseña" si `mustChangePassword`; si no, a la ruta pedida o al inicio.
- Vacío / sin permiso: no aplica.

## Cambiar contraseña (S1.1.4)
**Muestra:** `SectionCard` con título "Cambiar contraseña" y la política visible bajo el campo nuevo: "De 10 a 72 caracteres, con al menos una letra y un número. Distinta de tu correo y de la actual."
- **Modo obligatorio:** sin navegación ni "Nueva cotización"; solo el menú de usuario con "Cerrar sesión". `Alert` `warning`: "Debes cambiar tu contraseña temporal para continuar."
- **Modo voluntario:** dentro del layout privado, con botón "Volver".

**Campos:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Contraseña actual (o temporal) | Sí | No vacía; error `INVALID_CURRENT_PASSWORD` en el campo |
| Nueva contraseña | Sí | Política; error `PASSWORD_REUSED` si es igual a la actual; error si es igual al correo |
| Confirmar nueva contraseña | Sí | Igual a la nueva |

**Acciones:** "Cambiar contraseña" (`primary`) — los tres roles. "Cancelar" solo en modo voluntario.

**Estados:** cargando en el botón · error en línea por campo · éxito: `Toast` "Contraseña actualizada. Se cerraron tus otras sesiones." y navegación al inicio.

## Usuarios (S1.3.2)
**Muestra:** `PageHeader` "Usuarios" con botón `primary` "Nuevo usuario". `DataTable` con columnas Nombre, Correo, Rol (etiqueta de `lang/`), Estado (Activo / Inactivo con icono y texto) y acciones. Barra de filtros: búsqueda por nombre o correo, `Select` de rol y `Select` de estado. Paginación de 20.

**Acciones por fila (solo `ADMIN`):**
| Acción | Condición |
|---|---|
| Editar | Siempre |
| Desactivar | Usuario activo y que no sea el propio administrador |
| Activar | Usuario inactivo |
| Restablecer contraseña | Siempre (incluido el propio) |

Desactivar y restablecer piden confirmación en `Dialog`:
- Desactivar: "María no podrá iniciar sesión. Sus cotizaciones se conservan y se pueden reasignar." → botón `danger` "Desactivar".
- Restablecer: "Se cerrarán sus sesiones y deberá cambiar la contraseña al entrar." → botón `danger` "Restablecer".

**Estados:**
- Cargando: filas `Skeleton`.
- Vacío con filtros: "Ningún usuario coincide con los filtros." + "Limpiar filtros".
- Error: `Alert` + "Reintentar". En acciones, `errors.LAST_ADMIN` o `errors.CANNOT_MODIFY_SELF` dentro del diálogo.
- Sin permiso: entrada de navegación oculta para `SELLER` y `MANAGER`; por URL, página sin permiso.
- Éxito: `Toast` ("Usuario desactivado.", "Usuario activado."); la fila se actualiza.

## Diálogo Crear / Editar usuario (S1.3.1)
`Dialog` `md`.

**Campos:**
| Campo | Obligatorio | Validación visible |
|---|---|---|
| Nombre | Sí | No vacío |
| Correo | Sí | Formato; `EMAIL_TAKEN` en el campo ("El correo ya está registrado. Usa otro correo.") |
| Rol | Sí | `Select`: Vendedor, Gerente comercial, Administrador |
| Activo | Solo en editar | Interruptor |

**Acciones:** "Crear usuario" / "Guardar cambios" (`primary`), "Cancelar" — `ADMIN`.

**Estados:** cargando en el botón · error del servidor dentro del diálogo · éxito al crear: abre el diálogo de contraseña temporal; al editar: `Toast` "Usuario actualizado."

## Diálogo Contraseña temporal (S1.3.1, S1.3.3)
`Dialog` `sm`. Muestra la contraseña en `mono` grande, botón "Copiar" (cambia a "Copiada") y `Alert` `warning`: "Esta contraseña se muestra una sola vez. Entrégala al usuario; deberá cambiarla al iniciar sesión." Único botón: "Listo". No se cierra con clic en el fondo.

## Menú de usuario (S1.1.3, S1.1.4)
`Avatar` con inicial, nombre y rol; opciones "Cambiar contraseña" y "Cerrar sesión" — los tres roles. Cerrar sesión no pide confirmación y lleva al login.

---

## Flujos
- Login → (si `mustChangePassword`) Cambiar contraseña obligatoria → inicio.
- Login → inicio o ruta pedida antes de la redirección.
- Menú de usuario → Cambiar contraseña (voluntaria) → inicio.
- Menú de usuario → Cerrar sesión → login.
- Sesión expirada (refresh fallido) → login con aviso → ruta anterior.
- Usuarios → Nuevo usuario → Contraseña temporal → Usuarios.
- Usuarios → Restablecer contraseña → confirmación → Contraseña temporal → Usuarios.
- Usuarios → Desactivar / Activar → confirmación (solo desactivar) → Usuarios.

## Reglas que cambian lo que se ve
- Con `mustChangePassword = true` solo se ve "Cambiar contraseña" y "Cerrar sesión" (S1.1.4, S1.2.1).
- La entrada "Usuarios" solo aparece para `ADMIN` (S1.2.1, criterio 5).
- En la fila del propio administrador no aparece "Desactivar", y en su diálogo de edición el rol y el interruptor "Activo" se muestran como solo lectura (S1.3.1, criterio 4).
- Un cambio de rol o una desactivación aplican desde la siguiente petición: si el usuario afectado está en una pantalla que ya no le corresponde, ve la página sin permiso o vuelve al login.
- Al recargar la página, se intenta recuperar la sesión antes de mostrar el login (carga inicial de M0).

## Vacíos detectados
| Vacío | Propuesta de resolución | ¿Bloquea? |
|---|---|---|
| La nota "¿Olvidaste tu contraseña? Pídele al administrador…" de la referencia no tiene clave en `lang/`. | Agregar `auth.login.forgotHint` en el tech plan de H1.1; coincide con "sin correo de recuperación". | No |
| No hay longitud máxima definida para el nombre del usuario. | Fijar 1–100 caracteres en el schema de `shared` (tech plan de H1.3). | No |
| No está definido si al editar al propio administrador se ocultan o se deshabilitan rol y estado. | Mostrarlos como solo lectura con ayuda "No puedes cambiar tu propio rol ni desactivarte." (evita el error 409 `CANNOT_MODIFY_SELF`). Anotar en el tech plan de H1.3. | No |
| Las claves de confirmación (`users.confirm.*`) no incluyen el texto de consecuencia de desactivar (las cotizaciones se conservan). | Redactar la consecuencia dentro de esas mismas claves. | No |
