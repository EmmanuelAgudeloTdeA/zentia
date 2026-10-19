# M0 Fundación – UI brief

> Fuentes: `epics.md` (H0.3 Front base: S0.3.1, S0.3.2, S0.3.3) y `tech-plan.md` §4–§5 de este módulo; `docs/design/design-system.md` (Layout, Reglas). Sin código ni endpoints.

**Depende de:** `docs/design/design-system.md` (tokens, layout y componentes base). M0 no tiene pantallas de negocio: define el marco donde viven las pantallas de M1 a M9.

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega |
|---|---|---|
| Layout privado | Todos los roles con sesión | En cualquier ruta privada (S0.3.3) |
| Layout público | Usuario sin sesión | En `/login` (lo completa M1) |
| Página no encontrada (404) | Cualquiera | Ruta del front inexistente (S0.3.3) |
| Página sin permiso | Usuario con sesión | Entra por URL a una pantalla no permitida para su rol (el filtrado real lo hace M1, S1.2.1) |
| Carga inicial de la app | Cualquiera | Al abrir o recargar la app, mientras se resuelve la sesión |

---

## Layout privado (S0.3.3)
**Muestra:** encabezado con degradado (ver design-system § Layout): `BrandMark` (logo y nombre de la empresa cuando exista M2; antes, `app.name`), entradas de navegación registradas por cada feature y filtradas por rol, `LanguageSwitch`, espacio para la campana (M6), `UserMenu` (M1) y botón `on-dark` "Nueva cotización" (M4). Debajo, el área de contenido con ancho máximo de 1280 px.

**Acciones:**
| Acción | Rol |
|---|---|
| Navegar entre secciones | Según las entradas permitidas a su rol |
| Cambiar idioma `es` / `en` (se recuerda entre sesiones, S0.3.2) | Todos |
| Abrir/cerrar el panel lateral (< 1024 px) | Todos |

**Estados:**
- Cargando: el encabezado se pinta de inmediato; el área de contenido muestra el `Skeleton` de la pantalla destino.
- Error: lo maneja cada pantalla (`Alert` con "Reintentar").
- Vacío / éxito / sin permiso: no aplica al marco.

## Layout público (S0.3.3)
**Muestra:** fondo con el degradado del encabezado y una tarjeta centrada (400 px máx.; ancho completo menos 16 px en móvil). M1 pone el formulario de login y M2 el branding.
**Acciones:** ninguna propia.

## Página no encontrada (S0.3.3)
**Muestra:** `EmptyState` con título "Página no encontrada", texto breve y botón `primary` "Ir al inicio". Usa el layout privado si hay sesión; si no, el público.
**Estados:** solo el de contenido.

## Página sin permiso
**Muestra:** `EmptyState` con "No tienes permiso para ver esta página." y enlace "Ir al inicio" (design-system § Estados de la interfaz). Dentro del layout privado; la navegación no muestra la entrada de esa pantalla.

## Carga inicial de la app
**Muestra:** `PageLoader` centrado sobre fondo `neutral-100` (única excepción a la regla de esqueletos). Si tarda más de 10 s: "Esto está tardando más de lo normal."
**Error:** `NETWORK_ERROR` traducido + "Reintentar".

---

## Flujos
- Ruta privada sin sesión → login (`ProtectedRoute`) → vuelve a la ruta pedida tras iniciar sesión (M1).
- Ruta inexistente → 404 → "Ir al inicio".
- Ruta no permitida para el rol → página sin permiso → "Ir al inicio".
- Cambio de idioma → toda la interfaz se traduce al instante, sin recargar.

## Reglas que cambian lo que se ve
- Las entradas de navegación dependen del rol (S0.3.3, criterio 2); una entrada no permitida no se muestra.
- Por debajo de 1024 px la navegación pasa al panel lateral; por debajo de 640 px "Nueva cotización" se reduce a icono "+".
- Desde 360 px de ancho, sin scroll horizontal (S0.3.3, criterio 5).

## Vacíos detectados
| Vacío | Propuesta de resolución | ¿Bloquea? |
|---|---|---|
| S0.3.3 y el tech plan hablan de "navegación lateral"; la referencia visual usa navegación horizontal en el encabezado. | Decisión D1 del design system: horizontal en ≥ 1024 px, panel lateral en pantallas menores. Actualizar S0.3.3 al validar. | No |
| No existe una página "sin permiso" ni sus claves en `lang/` (solo 404). | Agregar `forbidden.title`, `forbidden.description` y reutilizar `notFound.goHome` en el tech plan de H0.3 (o de H1.2, que implementa el filtrado). | No |
| No está definido si el layout público tiene selector de idioma. | Mostrar `LanguageSwitch` discreto en la esquina superior derecha del layout público, para que el login también se pueda usar en inglés. Anotar en el tech plan de H0.3. | No |
