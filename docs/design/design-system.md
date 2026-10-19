---
version: alpha
name: Zentia
description: Sistema de diseño de Zentia, herramienta de trabajo para que las pymes gestionen sus cotizaciones. Sobria, clara y densa en información.
colors:
  primary-50: "#EEF4FB"
  primary-100: "#D9E6F6"
  primary-200: "#B3CCEC"
  primary-300: "#84AADD"
  primary-400: "#5584C8"
  primary-500: "#2F64AE"
  primary-600: "#1F4F94"
  primary-700: "#1A4079"
  primary-800: "#163463"
  primary-900: "#0F2648"
  primary-950: "#0A1A33"
  neutral-0: "#FFFFFF"
  neutral-50: "#F7F9FC"
  neutral-100: "#EEF2F6"
  neutral-200: "#E2E8F0"
  neutral-300: "#CBD5E1"
  neutral-400: "#94A3B8"
  neutral-500: "#64748B"
  neutral-600: "#475569"
  neutral-700: "#334155"
  neutral-800: "#1E293B"
  neutral-900: "#0F172A"
  success-fg: "#166534"
  success-bg: "#EAF7EE"
  success-border: "#A7DDB8"
  warning-fg: "#92400E"
  warning-bg: "#FEF4E2"
  warning-border: "#F6CF8E"
  danger-fg: "#B42318"
  danger-bg: "#FDEEEC"
  danger-border: "#F5BDB6"
  danger-solid: "#C7291C"
  info-fg: "#1F4F94"
  info-bg: "#EAF1FB"
  info-border: "#B3CCEC"
  status-draft-fg: "#475569"
  status-draft-bg: "#F1F5F9"
  status-draft-border: "#CBD5E1"
  status-sent-fg: "#1F4F94"
  status-sent-bg: "#EAF1FB"
  status-sent-border: "#B3CCEC"
  status-approved-fg: "#166534"
  status-approved-bg: "#EAF7EE"
  status-approved-border: "#A7DDB8"
  status-rejected-fg: "#B42318"
  status-rejected-bg: "#FDEEEC"
  status-rejected-border: "#F5BDB6"
  status-expired-fg: "#92400E"
  status-expired-bg: "#FEF4E2"
  status-expired-border: "#F6CF8E"
  status-voided-fg: "#57534E"
  status-voided-bg: "#F5F5F4"
  status-voided-border: "#A8A29E"
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.01em
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 28px
  h3:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  overline:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.06em
  kpi:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: -0.02em
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.04em
  mono:
    fontFamily: ui-monospace
    fontSize: 13px
    fontWeight: 600
    lineHeight: 20px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  base: 4px
  gutter-mobile: 16px
  gutter-tablet: 24px
  gutter-desktop: 32px
  card-padding: 20px
  section-gap: 24px
  content-max: 1280px
components:
  button-primary:
    backgroundColor: "{colors.primary-600}"
    textColor: "{colors.neutral-0}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-700}"
  button-secondary:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-800}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 16px
  button-on-dark:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.primary-900}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
  button-danger:
    backgroundColor: "{colors.danger-solid}"
    textColor: "{colors.neutral-0}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
  input:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-900}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  input-readonly:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.neutral-700}"
  card:
    backgroundColor: "{colors.neutral-0}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  kpi-card:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-900}"
    typography: "{typography.kpi}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  badge-status:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    height: 24px
    padding: 0 10px
  chip-filter:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-700}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 0 12px
  chip-filter-active:
    backgroundColor: "{colors.primary-600}"
    textColor: "{colors.neutral-0}"
  table-header:
    backgroundColor: "{colors.neutral-50}"
    textColor: "{colors.neutral-500}"
    typography: "{typography.overline}"
  table-row:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-900}"
    typography: "{typography.body}"
    height: 56px
  modal:
    backgroundColor: "{colors.neutral-0}"
    rounded: "{rounded.xl}"
    padding: 24px
  toast:
    backgroundColor: "{colors.neutral-900}"
    textColor: "{colors.neutral-0}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
  header:
    backgroundColor: "{colors.primary-950}"
    textColor: "{colors.neutral-0}"
---

# Zentia – Sistema de diseño

> Fuentes: `CLAUDE.md`, `docs/brief.md`, `docs/prd.md` y las tres pantallas de referencia (login, tablero y editor de cotización) entregadas por el usuario. Este documento define **cómo se ve y se comporta** la interfaz; qué pantallas existen y qué hacen está en `docs/modules/mod-<N>-<nombre>/ui-brief.md`.

**Depende de:** M0 (H0.3 Front base: Tailwind v4, i18n, layout). Lo usan las pantallas de M1 a M9.

## Overview

Zentia es una herramienta de trabajo diario para vendedores, gerentes y administradores de una pyme. La interfaz debe:

- **Priorizar el dato.** Números, estados y fechas se leen de un vistazo; la decoración se limita al encabezado.
- **Ser sobria.** Un solo color de marca (azul marino), neutros fríos y colores semánticos solo para estados y retroalimentación. Sin ilustraciones, sin texto de marketing, sin mensajes motivacionales.
- **Ser predecible.** Mismo lugar para las mismas acciones: acción principal arriba a la derecha, acciones destructivas separadas y con confirmación.
- **Funcionar en dos idiomas.** Todo texto sale de `lang/{es,en}.json`; los componentes toleran textos hasta un 40 % más largos que el español de referencia.
- **Funcionar desde 360 px.** Escritorio es el uso principal; en móvil se consulta y se registra seguimiento.

### Lenguaje visual tomado de la referencia
| Elemento | Se adopta |
|---|---|
| Encabezado | Banda con degradado azul marino (`primary-950` → `primary-600`), logo de la empresa en círculo blanco, navegación en píldoras, usuario con avatar de inicial y botón blanco "Nueva cotización". |
| Fondo | Gris frío claro (`neutral-100`) con tarjetas blancas de radio `lg` y sombra suave. |
| Tarjetas de indicadores | Rótulo en `overline`, icono en cuadro `primary-50`, cifra grande en `kpi`, línea secundaria con el monto. En el tablero se superponen al borde inferior del encabezado. |
| Tablas | Encabezados en `overline` gris, número de cotización en monoespaciada azul, montos alineados a la derecha con cifras tabulares, fila de dos líneas (cliente + resumen). |
| Filtros | Chips redondeados con contador; el activo en `primary-600`. |
| Secciones de formulario | Tarjeta blanca con título en `overline` precedido por una barra vertical `primary-600` de 3 px. |
| Login | Tarjeta centrada sobre fondo con degradado, borde superior `primary-600` de 4 px, logo y nombre de la empresa desde `GET /company/branding`. |

### Lo que la referencia muestra y Zentia **no** adopta
| En la referencia | En Zentia | Motivo |
|---|---|---|
| Campo "Usuario" en el login | Campo "Correo" | S1.1.1: se inicia sesión con correo y contraseña. |
| Botón "Eliminar" en la cotización | "Anular" con motivo obligatorio | RN-16, RN-21: las cotizaciones no se eliminan. |
| "Tipo de cotización" (Web / Importado), etiqueta `WEB`, "Pegar lista del cliente" | No existen | No están en el desglose ni en el PRD (no inventar requisitos). |
| Estado editable con un desplegable dentro de la tabla | Badge de solo lectura; los cambios de estado se hacen desde el detalle con su diálogo | Las transiciones tienen reglas y datos obligatorios (motivo, lo solicitado por el cliente). |
| "Duplicar" en un Borrador | Solo en Aprobada y Rechazada | RN-28. |
| Indicador "Guardado" (autoguardado) | Guardado explícito con botón | El tech plan de M4 no define autoguardado. |
| Fechas "8 oct 2026" | `08/10/2026` | Regla de formato de este documento. |
| "Tasa de aprobación" | "Conversión" = aprobadas / (aprobadas + rechazadas + vencidas) | RN-36. |
| Filtros "Sin respuesta" y "En espera" | Filtros por los seis estados; "Pendientes de seguimiento" solo cuando M6 exista | RN-36; los nombres de filtro siguen los estados del dominio. |

## Colors

Todos los colores se usan **solo** a través de tokens. Ninguna clase de Tailwind con color arbitrario (`bg-[#...]`) en el código.

### Primario (marca)
| Token | Hex | Uso |
|---|---|---|
| `primary-50` | `#EEF4FB` | Fondo de icono en tarjetas, fila seleccionada, notificación no leída |
| `primary-100` | `#D9E6F6` | Hover de elementos `primary-50` |
| `primary-200` | `#B3CCEC` | Bordes informativos |
| `primary-500` | `#2F64AE` | Anillo de foco (con 35 % de opacidad), enlaces sobre fondo oscuro |
| `primary-600` | `#1F4F94` | Botón primario, chip activo, barra de sección, enlaces, número de cotización |
| `primary-700` | `#1A4079` | Hover del botón primario |
| `primary-800` | `#163463` | Presionado; tramo medio del degradado del encabezado |
| `primary-900` | `#0F2648` | Texto del botón blanco sobre el encabezado |
| `primary-950` | `#0A1A33` | Inicio del degradado del encabezado y del fondo del login |

El logo de la empresa no cambia la paleta: Zentia mantiene su azul aunque el logo tenga otros colores.

### Neutros
| Token | Hex | Uso |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Tarjetas, inputs, modales |
| `neutral-50` | `#F7F9FC` | Encabezado de tabla, hover de fila |
| `neutral-100` | `#EEF2F6` | Fondo de página, input de solo lectura |
| `neutral-200` | `#E2E8F0` | Bordes de tarjeta y separadores de tabla |
| `neutral-300` | `#CBD5E1` | Borde de input |
| `neutral-400` | `#94A3B8` | Iconos decorativos, borde de input deshabilitado (nunca texto) |
| `neutral-500` | `#64748B` | Texto secundario, placeholder, rótulos `overline` |
| `neutral-600` | `#475569` | Texto de ayuda, iconos de acción |
| `neutral-700` | `#334155` | Etiquetas de campo |
| `neutral-900` | `#0F172A` | Texto principal, toast |

### Retroalimentación
| Rol | `fg` | `bg` | `border` | Uso |
|---|---|---|---|---|
| `success` | `#166534` | `#EAF7EE` | `#A7DDB8` | Confirmaciones, aviso de éxito en línea |
| `warning` | `#92400E` | `#FEF4E2` | `#F6CF8E` | Avisos que no bloquean (producto inactivo, descuento sobre el límite del vendedor) |
| `danger` | `#B42318` | `#FDEEEC` | `#F5BDB6` | Errores, validaciones; `danger-solid` `#C7291C` para el botón destructivo |
| `info` | `#1F4F94` | `#EAF1FB` | `#B3CCEC` | Avisos neutros (estimación por reglas, ayuda contextual) |

### Estados de cotización
Cada estado tiene `fg`, `bg` y `border`, un icono y una etiqueta de `lang/`. **El color nunca es la única señal**: siempre se acompaña de icono y texto.

| Estado | Código | `fg` | `bg` | `border` | Icono | Etiqueta es / en |
|---|---|---|---|---|---|---|
| Borrador | `DRAFT` | `#475569` | `#F1F5F9` | `#CBD5E1` | Lápiz | Borrador / Draft |
| Enviada | `SENT` | `#1F4F94` | `#EAF1FB` | `#B3CCEC` | Avión de papel | Enviada / Sent |
| Aprobada | `APPROVED` | `#166534` | `#EAF7EE` | `#A7DDB8` | Check en círculo | Aprobada / Approved |
| Rechazada | `REJECTED` | `#B42318` | `#FDEEEC` | `#F5BDB6` | X en círculo | Rechazada / Rejected |
| Vencida | `EXPIRED` | `#92400E` | `#FEF4E2` | `#F6CF8E` | Reloj con alerta | Vencida / Expired |
| Anulada | `VOIDED` | `#57534E` | `#F5F5F4` | `#A8A29E` (discontinuo) | Círculo tachado | Anulada / Voided |

Anulada se distingue de Borrador por el tono piedra, el borde discontinuo y el icono; no se tacha el texto (perjudica la lectura).

Los estados de pedido (M7) reutilizan el mismo componente y paleta: `PENDING` → tono `draft` con icono de reloj, `IN_PROGRESS` → tono `sent` con icono de engranaje, `DELIVERED` → tono `approved` con icono de caja, `CANCELLED` → tono `voided`.

Todos los pares `fg`/`bg` cumplen contraste AA (≥ 4,5:1) para texto de 12 px.

## Typography

- **Familia:** Inter, autoalojada en `apps/web/public/fonts/` (woff2, pesos 400, 500, 600 y 700) con `font-display: swap`. Respaldo: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Usar `@fontsource/inter` sería una librería nueva y requiere aprobación previa.
- **Monoespaciada** (solo para el número de cotización `COT-0001` y códigos): pila del sistema `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`. No se descarga otra fuente.
- **Cifras:** todo monto, cantidad, porcentaje y fecha usa `tabular-nums` para que las columnas se alineen.

| Token | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `display` | 28 / 36 | 700 | Saludo del tablero |
| `h1` | 24 / 32 | 700 | Título de página |
| `h2` | 18 / 28 | 600 | Título de tarjeta o modal |
| `h3` | 15 / 22 | 600 | Subtítulo, nombre del cliente en filas |
| `body` | 14 / 20 | 400 | Texto general, celdas, inputs |
| `body-sm` | 13 / 18 | 400 | Chips, texto de apoyo, segunda línea de fila |
| `caption` | 12 / 16 | 400–500 | Ayuda de campo, badges, fechas secundarias |
| `overline` | 11 / 16 | 600, mayúsculas, `tracking 0.06em` | Encabezados de tabla, rótulos de tarjetas KPI, títulos de sección |
| `kpi` | 32 / 40 | 700 | Cifra principal de los indicadores |
| `button` | 13 / 16 | 600, mayúsculas, `tracking 0.04em` | Botones |
| `mono` | 13 / 20 | 600 | Número de cotización |

Las mayúsculas se aplican con CSS (`uppercase`); en `lang/` el texto siempre se escribe en minúsculas normales, para que el lector de pantalla y el otro idioma no hereden mayúsculas forzadas.

## Layout

### Estructura de página privada
```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo] Cotizaciones  Clientes  Productos  Usuarios  Ajustes   [ES|EN] [🔔3] [M María · Admin ▾] [+ NUEVA COTIZACIÓN] │  ← encabezado (degradado)
│ Título de página / saludo                              fecha        │
├──────────────────────────────────────────────────────────────────────┤
│  (tarjetas KPI superpuestas al borde, solo en el tablero)            │
│  Contenido en tarjetas blancas sobre neutral-100, máx. 1280 px       │
└──────────────────────────────────────────────────────────────────────┘
```
- **Encabezado:** alto de barra 72 px, degradado `bg-linear-120 from-primary-950 via-primary-800 to-primary-600`. En el tablero se extiende hacia abajo con el saludo y la fecha; en las demás páginas contiene solo la barra y el título de página con su botón "volver" cuando aplica.
- **Navegación:** entradas registradas por cada feature y filtradas por rol (S0.3.3). En ≥ 1024 px se muestra como píldoras en la barra; la activa con fondo blanco al 15 % y texto blanco. En < 1024 px se colapsa en un botón de menú que abre un **panel lateral** (drawer) desde la izquierda, con las mismas entradas, el selector de idioma y el menú de usuario.
- **Zona derecha del encabezado:** selector de idioma, campana de notificaciones (cuando exista M6), menú de usuario (nombre, rol, "Cambiar contraseña", "Cerrar sesión") y botón blanco "Nueva cotización". En < 640 px el botón se reduce a un icono "+" con `aria-label`.
- **Contenido:** ancho máximo 1280 px, centrado. Margen lateral 16 px (móvil), 24 px (tablet), 32 px (escritorio). Separación entre bloques 24 px; entre tarjetas de una cuadrícula 16 px.
- **Página pública (login):** fondo con el mismo degradado del encabezado, tarjeta centrada de 400 px de ancho máximo (100 % − 32 px en móvil).

### Retícula
| Ancho | Columnas KPI | Editor de cotización | Tablas |
|---|---|---|---|
| < 640 px | 1 (desplazable en horizontal como carrusel con indicadores) | Una columna; totales en barra fija inferior | Se convierten en lista de tarjetas |
| 640–1023 px | 2 | Una columna | Tabla con columnas secundarias ocultas |
| ≥ 1024 px | 4 | Dos columnas: formulario (60 %) y resumen de totales fijo (40 %) | Tabla completa |

Puntos de corte: los de Tailwind por defecto (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Nunca hay scroll horizontal de la página; si una tabla no cabe, el scroll es dentro de su contenedor.

### Espaciado
Escala base de Tailwind v4 (`--spacing: 0.25rem`, 4 px). Valores usados: 4, 8, 12, 16, 20, 24, 32, 48. No se usan valores arbitrarios.

## Elevation & Depth

| Token | Valor | Uso |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgb(15 23 42 / 0.06)` | Inputs, chips |
| `shadow-sm` | `0 1px 3px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)` | Tarjetas y tablas |
| `shadow-md` | `0 8px 24px -6px rgb(15 23 42 / 0.16)` | Menús desplegables, panel de notificaciones, autocompletado |
| `shadow-lg` | `0 24px 48px -12px rgb(15 23 42 / 0.28)` | Modales, tarjeta del login, toasts |
| `shadow-focus` | `0 0 0 3px rgb(47 100 174 / 0.35)` | Anillo de foco de todo elemento interactivo |

Capas (`z-index`): contenido 0 · encabezado fijo 30 · menús y popovers 40 · fondo del modal 50 · modal 51 · toasts 60.

El fondo del modal es `neutral-900` al 50 %. No se usan desenfoques (`backdrop-blur`) por rendimiento en equipos modestos.

## Shapes

| Token | Valor | Uso |
|---|---|---|
| `rounded-sm` | 6 px | Iconos en cuadro, checkbox, etiquetas pequeñas |
| `rounded-md` | 8 px | Botones, inputs, selects |
| `rounded-lg` | 12 px | Tarjetas, tablas, toasts, menús |
| `rounded-xl` | 16 px | Modales, tarjeta del login |
| `rounded-full` | 9999 px | Badges, chips, avatar, contador de la campana, logo |

Bordes: 1 px `neutral-200` en tarjetas y tablas; 1 px `neutral-300` en inputs. Iconos: trazo de 1,75 px, 20 px por defecto (16 px dentro de badges y botones pequeños).

**Iconos:** SVG en línea en `apps/web/src/shared/ui/icons/`, con `aria-hidden="true"` cuando acompañan texto. Si se prefiere una librería (por ejemplo `lucide-react`), requiere propuesta y aprobación previa.

## Tokens para Tailwind v4

Archivo propuesto: `apps/web/src/styles/theme.css`, importado después de `@import "tailwindcss";`. Se reinicia la paleta por defecto para que solo existan los colores del sistema.

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #ffffff;
  --color-transparent: transparent;
  --color-current: currentColor;

  --color-primary-50: #eef4fb;
  --color-primary-100: #d9e6f6;
  --color-primary-200: #b3ccec;
  --color-primary-300: #84aadd;
  --color-primary-400: #5584c8;
  --color-primary-500: #2f64ae;
  --color-primary-600: #1f4f94;
  --color-primary-700: #1a4079;
  --color-primary-800: #163463;
  --color-primary-900: #0f2648;
  --color-primary-950: #0a1a33;

  --color-neutral-0: #ffffff;
  --color-neutral-50: #f7f9fc;
  --color-neutral-100: #eef2f6;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;

  --color-success-fg: #166534;
  --color-success-bg: #eaf7ee;
  --color-success-border: #a7ddb8;
  --color-warning-fg: #92400e;
  --color-warning-bg: #fef4e2;
  --color-warning-border: #f6cf8e;
  --color-danger-fg: #b42318;
  --color-danger-bg: #fdeeec;
  --color-danger-border: #f5bdb6;
  --color-danger-solid: #c7291c;
  --color-info-fg: #1f4f94;
  --color-info-bg: #eaf1fb;
  --color-info-border: #b3ccec;

  --color-status-draft-fg: #475569;
  --color-status-draft-bg: #f1f5f9;
  --color-status-draft-border: #cbd5e1;
  --color-status-sent-fg: #1f4f94;
  --color-status-sent-bg: #eaf1fb;
  --color-status-sent-border: #b3ccec;
  --color-status-approved-fg: #166534;
  --color-status-approved-bg: #eaf7ee;
  --color-status-approved-border: #a7ddb8;
  --color-status-rejected-fg: #b42318;
  --color-status-rejected-bg: #fdeeec;
  --color-status-rejected-border: #f5bdb6;
  --color-status-expired-fg: #92400e;
  --color-status-expired-bg: #fef4e2;
  --color-status-expired-border: #f6cf8e;
  --color-status-voided-fg: #57534e;
  --color-status-voided-bg: #f5f5f4;
  --color-status-voided-border: #a8a29e;

  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-display: 1.75rem;
  --text-display--line-height: 2.25rem;
  --text-display--font-weight: 700;
  --text-h1: 1.5rem;
  --text-h1--line-height: 2rem;
  --text-h1--font-weight: 700;
  --text-h2: 1.125rem;
  --text-h2--line-height: 1.75rem;
  --text-h2--font-weight: 600;
  --text-h3: 0.9375rem;
  --text-h3--line-height: 1.375rem;
  --text-h3--font-weight: 600;
  --text-body: 0.875rem;
  --text-body--line-height: 1.25rem;
  --text-body-sm: 0.8125rem;
  --text-body-sm--line-height: 1.125rem;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-overline: 0.6875rem;
  --text-overline--line-height: 1rem;
  --text-overline--letter-spacing: 0.06em;
  --text-overline--font-weight: 600;
  --text-kpi: 2rem;
  --text-kpi--line-height: 2.5rem;
  --text-kpi--letter-spacing: -0.02em;
  --text-kpi--font-weight: 700;
  --text-button: 0.8125rem;
  --text-button--line-height: 1rem;
  --text-button--letter-spacing: 0.04em;
  --text-button--font-weight: 600;

  --spacing: 0.25rem;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-xs: 0 1px 2px rgb(15 23 42 / 0.06);
  --shadow-sm: 0 1px 3px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04);
  --shadow-md: 0 8px 24px -6px rgb(15 23 42 / 0.16);
  --shadow-lg: 0 24px 48px -12px rgb(15 23 42 / 0.28);
  --shadow-focus: 0 0 0 3px rgb(47 100 174 / 0.35);

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --container-content: 80rem;
}

@layer base {
  html { font-family: var(--font-sans); color: var(--color-neutral-900); background: var(--color-neutral-100); }
  :focus-visible { outline: none; box-shadow: var(--shadow-focus); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}
```

Uso: `bg-primary-600`, `text-status-sent-fg`, `border-status-voided-border`, `text-overline uppercase`, `shadow-sm`, `rounded-lg`, `max-w-content`. Transiciones: 150 ms con `ease-standard` (hover, foco, apertura de menús); 200 ms para modales y toasts.

## Components

Los componentes base viven en `apps/web/src/shared/ui/` y se exportan por su barril. Ningún componente contiene texto: reciben claves o textos ya traducidos.

### Botón (`Button`)
| Variante | Aspecto | Uso |
|---|---|---|
| `primary` | Fondo `primary-600`, texto blanco; hover `primary-700`; presionado `primary-800` | Una sola acción principal por vista |
| `secondary` | Fondo blanco, borde `neutral-300`, texto `neutral-800`; hover `neutral-50` | Acciones secundarias (Descargar PDF, Duplicar, Cancelar) |
| `ghost` | Sin fondo ni borde, texto `primary-600`; hover `primary-50` | Acciones terciarias en tablas y tarjetas |
| `danger` | Fondo `danger-solid`, texto blanco | Solo dentro del modal de confirmación (Anular, Desactivar) |
| `danger-outline` | Fondo blanco, borde `danger-border`, texto `danger-fg` | Botón que abre una acción destructiva desde la página |
| `on-dark` | Fondo blanco, texto `primary-900`, `shadow-sm` | Acción principal dentro del encabezado oscuro |

- Tamaños: `sm` 32 px, `md` 40 px (defecto), `lg` 44 px (login, móvil). Relleno horizontal 12/16/20 px. Icono opcional a la izquierda (16 px, separación 8 px).
- Texto en mayúsculas por CSS, una línea, **ancho determinado por el contenido** (nunca ancho fijo). Si no cabe en móvil, el grupo de botones pasa a columna con ancho completo.
- **Cargando:** el botón conserva su ancho, muestra un indicador giratorio en lugar del icono, queda `disabled` y con `aria-busy="true"`. Impide el doble envío.
- **Deshabilitado:** opacidad 50 %, cursor `not-allowed`. Si la causa no es obvia (por ejemplo, "Abrir en WhatsApp" sin teléfono del cliente), se explica con un texto de ayuda visible junto al botón, no solo con un tooltip.
- Orden en grupos: secundario a la izquierda, primario a la derecha. La acción destructiva va separada del resto (a la izquierda del grupo o en el menú "Más acciones").
- Botón de solo icono: 40 × 40 px, con `aria-label` desde `lang/`.

### Input (`TextField`, `MoneyField`, `NumberField`, `DateField`, `TextArea`)
- **Anatomía:** etiqueta (`body-sm` 500, `neutral-700`) arriba · campo · texto de ayuda o de error debajo (`caption`). La etiqueta siempre visible; el placeholder solo da un ejemplo, nunca reemplaza la etiqueta.
- **Obligatorio:** asterisco `danger-fg` después de la etiqueta, con `aria-required`. Si en un formulario casi todo es obligatorio, se indica en cambio "(opcional)" en los opcionales; un formulario usa una sola convención.
- **Estados:** normal (borde `neutral-300`) · hover (`neutral-400`) · foco (borde `primary-500` + `shadow-focus`) · error (borde `danger-fg`, icono y mensaje en `danger-fg`, `aria-invalid` y `aria-describedby` al mensaje) · deshabilitado (fondo `neutral-100`, texto `neutral-500`) · solo lectura (fondo `neutral-100`, sin borde de foco, texto `neutral-700`, seleccionable).
- **Validación:** al salir del campo y al enviar; nunca mientras se escribe la primera vez. Al enviar con errores, el foco va al primer campo inválido y arriba del formulario aparece un resumen si hay más de 3 errores. Los mensajes salen de `validation.*` o `errors.<CODE>`.
- `MoneyField`: prefijo `$`, alineado a la derecha, solo dígitos; los separadores de miles se insertan al salir del campo. Envía un `string` sin separadores.
- `NumberField` (cantidad, porcentaje): admite hasta 2 decimales y acepta coma o punto como separador decimal, sin separador de miles; muestra el sufijo `%` cuando aplica. Muestra el límite cuando existe ("Máximo 10 %").
- `DateField`: entrada `DD/MM/AAAA` con calendario nativo (`type="date"`) y formato mostrado según la regla de fechas; valida fechas futuras cuando la regla lo exige.
- `TextArea`: altura mínima 3 líneas, crece hasta 8; contador de caracteres cuando hay límite.
- Alto de campo 40 px; ancho por defecto 100 % de su columna.

### Select (`Select`, `Combobox`)
- `Select`: `<select>` nativo estilizado como el input, con chevron propio. Para listas cortas y fijas (rol, tipo de interacción, tarifa IVA, idioma).
- `Combobox` (autocompletado): para cliente, producto, categoría y vendedor. Patrón ARIA `combobox` + `listbox`, navegable con flechas, Enter y Esc. Busca desde 2 caracteres con espera de 250 ms; muestra hasta 8 resultados con texto secundario (NIT del cliente; categoría y precio del producto). Los elementos inactivos no aparecen en contextos donde no se pueden usar. Estados del panel: buscando (indicador), sin resultados (texto de `lang/`), error (texto + reintentar).
- Ambos en `shadow-md`, radio `lg`, ancho mínimo el del campo.

### Tabla (`DataTable`)
- Contenedor tarjeta (`rounded-lg`, `shadow-sm`, borde `neutral-200`), con barra de herramientas arriba: chips de filtro, selects de filtro y búsqueda a la derecha.
- **Encabezado:** fondo `neutral-50`, texto `overline` `neutral-500`; columnas ordenables con icono de dirección y `aria-sort`.
- **Filas:** alto mínimo 56 px, separador `neutral-200`; hover `neutral-50`. Si la fila abre un detalle, toda la fila es clicable y la primera celda contiene el enlace real (accesible por teclado).
- **Celdas:** texto a la izquierda; montos, cantidades y porcentajes a la derecha con `tabular-nums`; fechas en `DD/MM/AAAA`; estado con `StatusBadge`. Número de cotización en `mono` `primary-600`. Celda de dos líneas: principal en `h3`, secundaria en `body-sm` `neutral-500` truncada a una línea con el texto completo en `title`.
- **Acciones por fila:** máximo 2 visibles (`ghost` `sm`); el resto en un menú "Más acciones" (icono de tres puntos con `aria-label`).
- **Paginación:** al pie, "1–20 de 134" + anterior/siguiente; 20 filas por página.
- **Móvil (< 640 px):** cada fila se presenta como tarjeta con: título (número o nombre), estado arriba a la derecha, dos o tres pares etiqueta-valor y el monto destacado.
- Estados de vacío, carga y error: ver "Reglas".

### Badge de estado (`StatusBadge`)
- Píldora de 24 px (`sm`: 20 px), `rounded-full`, borde de 1 px, icono de 14 px + etiqueta en `caption` 500, colores de la tabla "Estados de cotización".
- Recibe el código (`DRAFT`, `SENT`…) y obtiene la etiqueta de `lang/` (`quotes.status.<CODE>`). Nunca se trunca: si el texto es largo, la columna se adapta.
- Es de solo lectura. No lleva chevron ni se usa como control.
- Variante con punto (sin icono) solo en espacios muy reducidos, siempre con el texto.

### Chip de filtro (`FilterChip`)
- Píldora de 32 px con texto y contador entre paréntesis visuales (`Borrador 2`). Activo: `primary-600` con texto blanco; inactivo: blanco con borde `neutral-200`. Se comporta como botón con `aria-pressed`.
- En < 1024 px los chips se desplazan en horizontal dentro de su fila (sin flechas superpuestas al contenido).

### Tarjeta de indicador (`KpiCard`)
- Rótulo `overline` `neutral-500`, icono en cuadro `primary-50` de 36 px arriba a la derecha, cifra en `kpi`, línea secundaria en `body-sm` `neutral-500` (monto o explicación). Línea inferior de 3 px `primary-200` como acento.
- Si el valor no aplica (sin datos para calcular la conversión), muestra "Sin datos" (S8.1.3) con la explicación en la línea secundaria; nunca `0 %` engañoso ni `NaN`.
- Cargando: esqueleto del mismo alto.

### Modal (`Dialog`)
- Ancho: `sm` 440 px (confirmaciones), `md` 560 px (formularios), `lg` 720 px (reactivación con vista previa). En < 640 px ocupa el ancho menos 16 px de margen y crece en alto con scroll interno.
- **Anatomía:** título `h2` · texto de contexto opcional `body` `neutral-600` · cuerpo · pie con acciones a la derecha (secundario "Cancelar" + primario o `danger`). Botón de cerrar (X) arriba a la derecha.
- Accesibilidad: `role="dialog"`, `aria-modal`, `aria-labelledby`; el foco va al primer campo (o al botón seguro en confirmaciones destructivas) y queda atrapado; al cerrar vuelve al elemento que lo abrió.
- Cierre con Esc o clic en el fondo, **salvo** si el formulario tiene cambios: entonces se pregunta "¿Descartar cambios?".
- Confirmación destructiva: describe la consecuencia en una frase concreta ("La cotización COT-0012 quedará anulada y no se podrá editar."), usa el botón `danger` con el verbo de la acción ("Anular", nunca "Aceptar") y, si la regla lo exige, un campo obligatorio (motivo).
- Error del servidor: se muestra dentro del modal, encima del pie, como aviso `danger`; el modal no se cierra.

### Toast (`Toast`)
- Confirmación breve de una acción terminada o error no ligado a un campo. Fondo `neutral-900`, texto blanco, barra izquierda de 4 px en el color del tipo (`success`, `danger`, `warning`, `info`) e icono.
- Posición: abajo a la derecha en escritorio (24 px de margen); abajo, a ancho completo menos 16 px, en móvil. Máximo 3 apilados; el más reciente abajo.
- Duración: 5 s para éxito e información; los errores permanecen hasta cerrarse. Se pausa al pasar el cursor o con foco.
- Puede llevar una acción (`ghost` sobre oscuro): "Ver cotización", "Reintentar".
- `role="status"` (`aria-live="polite"`); los errores con `role="alert"`.
- No se usa para errores de validación de formularios (van en línea) ni para información que el usuario necesita conservar (la contraseña temporal se muestra en un modal).

### Campana de notificaciones (`NotificationBell`) — M6
- Botón de icono de 40 × 40 px en el encabezado, icono blanco. Contador en píldora `danger-solid` con texto blanco (`caption` 600), anclado arriba a la derecha; muestra hasta `99+`. Sin no leídas, no hay contador.
- `aria-label` dinámico desde `lang/`: "Notificaciones, 3 sin leer".
- Al hacer clic abre un panel (`shadow-md`, `rounded-lg`, 380 px; en móvil, ancho completo bajo el encabezado) con:
  - Encabezado: "Notificaciones" + acción `ghost` "Marcar todas como leídas".
  - Lista de las 10 más recientes: icono por tipo (reloj `warning-fg` para "Próxima a vencer", burbuja `info-fg` para "Sin seguimiento"), texto traducido con sus parámetros (número de cotización, cliente, días o fecha), fecha `DD/MM/AAAA`. Las no leídas llevan fondo `primary-50` y punto `primary-600`.
  - Clic en una notificación: la marca como leída y abre el detalle de la cotización.
  - Pie: enlace "Ver todas" a la página de notificaciones.
- El contador se actualiza al iniciar sesión, al navegar y cada 60 s con la pestaña visible (S6.3.1). Al cambiar, el anuncio es `polite`.
- Vacío: "No tienes notificaciones." Error: "No se pudieron cargar las notificaciones." + "Reintentar".

### Línea de tiempo (`Timeline`) — historial unificado de M4
- Lista vertical ordenada de más reciente a más antigua, con línea guía de 2 px `neutral-200` a la izquierda y un nodo por entrada.
- **Nodo de versión:** círculo de 28 px `primary-600` con el número de versión; tarjeta con "Versión N", fecha y hora (`DD/MM/AAAA HH:mm`), autor, bloque "Lo que solicitó el cliente" (texto del usuario, fondo `neutral-50`, recortado a 3 líneas con "Ver más") y resumen de cambios: líneas agregadas, quitadas o modificadas, descuento y envío con valor anterior → nuevo, y total anterior → nuevo. La versión 1 se rotula "Versión inicial (envío)".
- **Nodo de evento:** círculo de 20 px con icono según tipo: `STATE_CHANGED` (flecha; muestra `StatusBadge` anterior → nuevo), `DISCOUNT_OVERRIDE` (porcentaje; anterior → nuevo), `EXPIRY_CHANGED` (calendario; fecha anterior → nueva), `REASSIGNED` (personas; dueño anterior → nuevo). Una línea de texto con actor y fecha; la `note` (motivo de anulación, lo solicitado al reactivar) debajo, recortada a 3 líneas.
- **Agrupación:** la versión y los eventos de una misma operación (por ejemplo, primer envío: versión 1 + `STATE_CHANGED` a Enviada) se muestran como un solo grupo bajo el nodo de la versión.
- **Actor sistema:** cuando `actorId` es `null`, se muestra "Sistema" (clave de `lang/`) con icono de engranaje.
- Contenido vacío (Borrador sin eventos): "Aún no hay historial. Se registra desde el primer envío." Carga: tres nodos esqueleto.
- Accesible como lista (`<ol>`); los iconos son decorativos y el tipo se dice en texto.

### Otros componentes de apoyo
| Componente | Descripción breve |
|---|---|
| `SectionCard` | Tarjeta con título `overline` y barra vertical `primary-600` de 3 px; agrupa campos de un formulario. |
| `PageHeader` | Título `h1`, botón "Volver" opcional, acciones a la derecha. Dentro del encabezado oscuro usa texto blanco. |
| `Alert` (en línea) | Bloque con borde izquierdo de 4 px y fondo del tipo (`info`, `warning`, `danger`, `success`), icono y texto; opcionalmente una acción. Para avisos persistentes en la página (producto inactivo, descuento sobre el límite, "estimación por reglas"). |
| `EmptyState` | Icono de 40 px `neutral-400`, título `h3`, texto `body` `neutral-600` y, si el usuario tiene permiso, una acción. |
| `Skeleton` | Bloques `neutral-200` con pulso suave (se desactiva con `prefers-reduced-motion`). |
| `Avatar` | Círculo de 32 px con la inicial del nombre, fondo blanco al 15 % sobre el encabezado o `primary-100` sobre claro. |
| `LanguageSwitch` | Segmentado `ES` / `EN` en el encabezado; en móvil dentro del panel lateral. |
| `TotalsSummary` | Tarjeta de totales del editor: subtotal, descuento (con signo menos), IVA de líneas, envío, IVA del envío y total en `h2` 700, todos alineados a la derecha. |

## Reglas

### Moneda (COP)
- Formato único en ambos idiomas: símbolo `$` pegado, punto como separador de miles, **sin decimales**: `$5.375.000`, `$0`, `$850`. Descuentos con signo menos tipográfico: `−$537.500`.
- Se formatea desde el `string` que entrega la API, sin convertirlo a número de coma flotante: un único helper `formatCop(value: string)` en `apps/web/src/shared/format/` agrupa los dígitos de a tres. No se usa `Intl.NumberFormat` con `es-CO` porque inserta un espacio (`$ 5.375.000`).
- Los montos siempre a la derecha y con `tabular-nums`. En los indicadores, el monto completo (sin abreviar "5,3 M").
- El código de moneda "COP" solo aparece en el PDF y donde el contexto lo requiera; en la interfaz basta `$`.

### Números, cantidades y porcentajes
- Cantidades y porcentajes con hasta 2 decimales, sin ceros sobrantes: `3`, `1,5`, `12,25 %` en español; `3`, `1.5`, `12.25%` en inglés (separador decimal según el idioma de la interfaz; el porcentaje lleva espacio en español).
- La conversión se muestra con un decimal como máximo (`33,3 %`).

### Fechas y horas
- Fechas de datos: `DD/MM/AAAA` (`08/10/2026`) en ambos idiomas, con cero a la izquierda. Fecha y hora (historial, notificaciones): `DD/MM/AAAA HH:mm` en 24 h.
- Siempre en la zona `America/Bogota`, sin importar la zona del navegador.
- `fechaVencimiento` se muestra como "Vence el 23/10/2026"; si es hoy, "Vence hoy"; si ya pasó y la cotización está Vencida, "Venció el 20/10/2026". En "Próxima a vencer" se agrega el número de días restantes.
- Única excepción: la fecha decorativa del saludo del tablero puede ir en formato largo localizado ("miércoles, 14 de octubre de 2026").
- Un único helper `formatDate`/`formatDateTime` en `shared/format`.

### Número de cotización
`COT-` + número con relleno de 4 dígitos (`COT-0001`; a partir de 10 000 sin relleno). Solo presentación: se genera en el front desde `Quote.number`. Siempre en `mono`.

### Estados de la interfaz
Toda vista que carga datos implementa los cinco estados. Los textos salen de `lang/`.

| Estado | Comportamiento |
|---|---|
| **Cargando** | Esqueletos con la forma del contenido (filas de tabla, tarjetas KPI, campos). Nunca una pantalla en blanco ni un spinner centrado en toda la página, salvo la carga inicial de la app. Si la carga tarda más de 10 s, se agrega "Esto está tardando más de lo normal." Las acciones muestran el estado de carga en su botón. |
| **Vacío** | `EmptyState` que dice qué falta y qué hacer: "Aún no hay cotizaciones. Crea la primera para empezar." + botón si el rol puede crear. Con filtros activos se distingue: "Ninguna cotización coincide con los filtros." + "Limpiar filtros". |
| **Error** | Error de carga: `Alert` `danger` en el lugar del contenido con el texto de `errors.<CODE>` y "Reintentar". Error de acción: en el formulario o modal (en línea) o en un toast si no hay formulario. `NETWORK_ERROR`: "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo." Nunca se muestran códigos técnicos, stack ni mensajes en inglés del servidor. |
| **Sin permiso** | Las acciones no permitidas para el rol **no se muestran** (no se deshabilitan). Si se entra por URL a una pantalla no permitida, página "No tienes permiso para ver esta página." con enlace al inicio. Un 403 durante una acción muestra un toast de error y recarga los datos. |
| **Éxito** | Toast de éxito con verbo en pasado y el objeto: "Cotización COT-0012 enviada." Si la acción crea algo, el toast ofrece abrirlo o la app navega a ello. Los cambios de estado se reflejan de inmediato en el badge. |

**Conflicto de edición** (otro usuario modificó la cotización): `Alert` `warning` "Esta cotización cambió mientras la editabas." con "Recargar"; no se pierde lo escrito hasta que el usuario lo decida.

**Sesión expirada:** si el refresh falla, se redirige al login con el aviso "Tu sesión terminó. Inicia sesión de nuevo." y, tras entrar, se vuelve a la página anterior.

### Formularios y acciones destructivas
- Una acción principal por formulario, con un verbo concreto ("Guardar borrador", "Enviar", "Crear cliente").
- Salir de un formulario con cambios sin guardar pregunta "¿Descartar cambios?".
- Anular, desactivar y reasignar siempre piden confirmación en modal con la consecuencia explicada.
- Lo que el sistema calcula (totales, vencimiento) se muestra como solo lectura junto a lo editable, nunca como input.

### Idiomas (es / en) y textos largos
- Ningún texto en el código: claves en `lang/{es,en}.json`, agrupadas por feature (`quotes.*`, `customers.*`, `errors.*`, `validation.*`, `common.*`).
- **Tolerancia de longitud:** cada componente se prueba con textos un 40 % más largos que el español. Reglas:
  - Botones, chips, badges y pestañas con ancho por contenido; nunca ancho fijo.
  - Las etiquetas de campo hacen salto de línea; no se truncan.
  - Se truncan con puntos suspensivos solo **datos** (nombre de cliente, resumen de productos), nunca acciones ni etiquetas, y el texto completo queda disponible (`title` o detalle).
  - Grupos de botones y la barra de filtros pasan a varias líneas o a scroll horizontal propio antes de desbordar.
  - La navegación del encabezado pasa al panel lateral antes de que las entradas se compriman.
- Pluralización con las reglas de `i18next` (`_one`, `_other`): "1 cotización", "3 cotizaciones".
- Los valores con formato (moneda, fecha) se insertan como parámetros ya formateados: `"Vence el {{date}}"`.
- El selector de idioma cambia la interfaz al instante sin recargar; el idioma del PDF y del mensaje de IA lo define `CompanySettings.documentLocale`, no este selector, y la interfaz lo indica donde aplique.

### Tono de los textos
- Herramienta de trabajo: frases cortas, segunda persona del singular (tú) en español, verbos en imperativo en acciones ("Guarda", no "¡Guarda ya!").
- Sin signos de exclamación, sin emojis, sin adjetivos promocionales, sin humor.
- Mensajes de error con causa y salida: "El correo ya está registrado. Usa otro correo." en vez de "Error 409".
- Nombres de estados y conceptos siempre iguales a los del dominio (Borrador, Enviada, Aprobada, Rechazada, Vencida, Anulada; "fecha de vencimiento"; "lo que solicitó el cliente").

### Accesibilidad
- WCAG 2.1 AA: contraste ≥ 4,5:1 en texto y ≥ 3:1 en bordes de controles e iconos informativos.
- Todo es operable con teclado y tiene foco visible (`shadow-focus`). Orden de foco igual al visual.
- Objetivos táctiles de al menos 40 × 40 px en móvil.
- El color nunca es la única señal (estados, errores, notificaciones no leídas).
- Respeta `prefers-reduced-motion`.
- `lang` del documento HTML sincronizado con el idioma activo.

## Do's and Don'ts

| Hacer | No hacer |
|---|---|
| Usar los tokens (`bg-primary-600`, `text-status-expired-fg`) | Usar colores arbitrarios (`bg-[#1f4f94]`) o la paleta por defecto de Tailwind |
| Acompañar el estado con icono y texto | Comunicar el estado solo con color |
| Ocultar las acciones que el rol no puede ejecutar | Mostrar botones deshabilitados sin explicación |
| Formatear montos con `formatCop` desde el `string` | Convertir montos a `number` para mostrarlos |
| Mostrar fechas `DD/MM/AAAA` en `America/Bogota` | Mostrar fechas relativas ("hace 3 días") como único dato |
| Confirmar en modal las acciones destructivas con el verbo de la acción | Usar "Aceptar" / "Sí" en confirmaciones |
| Diseñar con textos un 40 % más largos | Fijar anchos a botones, chips o columnas de acciones |
| Mostrar errores en línea junto al campo | Mostrar errores de formulario en un toast |
| Una acción primaria por vista | Varias acciones primarias que compiten |

## Decisiones de diseño que requieren validación
| # | Decisión propuesta | Motivo |
|---|---|---|
| D1 | La navegación es horizontal en el encabezado (≥ 1024 px) y lateral (drawer) en pantallas menores. | La referencia usa navegación horizontal; S0.3.3 y el tech plan de M0 dicen "navegación lateral". Se propone actualizar S0.3.3 a "navegación en el encabezado con panel lateral en móvil". |
| D2 | El formato de moneda es `$5.375.000` también con la interfaz en inglés. | La moneda es COP y coincide con el PDF; evita mostrar dos formatos para el mismo valor. |
| D3 | Las fechas son `DD/MM/AAAA` también en inglés. | Pedido explícito; evita la ambigüedad con `MM/DD/YYYY`. |
| D4 | Inter autoalojada (archivos woff2) en lugar de `@fontsource/inter`. | No requiere una librería nueva; si se prefiere el paquete, hay que aprobarlo. |
| D5 | Iconos SVG propios en `shared/ui/icons` en lugar de `lucide-react`. | No requiere una librería nueva; si se prefiere el paquete, hay que aprobarlo. |
| D6 | El estado de la cotización no se cambia desde la tabla. | Las transiciones exigen datos (motivo, lo solicitado por el cliente) y se hacen desde el detalle. |
