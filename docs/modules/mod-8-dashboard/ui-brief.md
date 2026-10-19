# M8 Dashboard – UI brief

> Fuentes: `epics.md` y `tech-plan.md` de este módulo, `docs/prd.md` (RF-13, RN-02, RN-36), `docs/design/design-system.md` y la pantalla de referencia del tablero. Formatos de moneda, fechas, estados de carga y textos largos: ver las **Reglas** de `design-system.md`; aquí no se repiten.

## Depende de
| Módulo / hito | Qué necesita la interfaz |
|---|---|
| M0 · H0.3 | Layout privado, encabezado con degradado, i18n, carga diferida de `recharts` |
| M1 · H1.2 | Rol del usuario para mostrar u ocultar el filtro por vendedor |
| M1 · S1.3.2 | Lista de usuarios activos para el filtro por vendedor |
| M4 | Botón "Nueva cotización" del encabezado y listado de cotizaciones al que se navega |
| M6 · H6.2 | Regla de Y días para la tarjeta "Pendientes de seguimiento" |
| M9 · S9.3.2 | Bloque "Mayor probabilidad de cierre" (se agrega después; la pantalla reserva su lugar) |

## Pantallas
| Pantalla | Quién la usa | Cuándo se llega |
|---|---|---|
| Tablero (`DashboardPage`) | Vendedor, gerente comercial, administrador | Es la página de inicio de los tres roles (S8.2.1): al iniciar sesión, al hacer clic en el logo o en "Tablero" de la navegación |

---

## Tablero
**Historias:** H8.1 Indicadores (S8.1.1–S8.1.4) · H8.2 Alcance por rol (S8.2.1, S8.2.2).

### Distribución (toma la referencia)
1. **Banda del encabezado** (degradado): saludo en `display` ("Buenas tardes, María"), una línea de contexto con el estado actual ("3 cotizaciones pendientes de seguimiento." o, si no hay, "Todo al día: no hay cotizaciones pendientes de seguimiento.") y, a la derecha, la fecha decorativa en formato largo.
2. **Fila de 4 `KpiCard` superpuestas** al borde inferior de la banda: los indicadores de **estado actual** y los dos que más se consultan del período.
3. **Barra de filtros**: período (chips) y vendedor (solo gerente y administrador).
4. **Fila de indicadores del período** y dos gráficos.
5. **Bloques de extensión** (`DashboardSections`): vacío en M8; M9 agrega "Mayor probabilidad de cierre".

### Datos que muestra
| Bloque | Indicador | Valor | Línea secundaria | Universo |
|---|---|---|---|---|
| KPI 1 | Activas | Conteo de Enviadas | Rótulo "Estado actual" | Estado actual |
| KPI 2 | Pendientes de seguimiento | Conteo de Enviadas que cumplen la regla de Y días | "Sin seguimiento hace {{Y}} días o más" + rótulo "Estado actual" | Estado actual |
| KPI 3 | Conversión | Porcentaje con un decimal como máximo | "{{n}} cerradas en el período"; si no hay cerradas: valor "Sin datos" | Período |
| KPI 4 | Monto aprobado | `$` COP | "de $X cotizados" | Período |
| Fila período | Aprobadas · Rechazadas · Vencidas | Conteos, cada uno con su `StatusBadge` como rótulo | — | Período |
| Fila período | Monto cotizado | `$` COP | "Sin anuladas" | Período |
| Gráfico | Cierres del período (`ClosingStatusChart`) | Barras aprobadas / rechazadas / vencidas con los colores de estado y etiqueta de valor | — | Período |
| Gráfico | Cotizado frente a aprobado (`AmountsChart`) | Dos barras en COP con etiqueta de valor | — | Período |

- Las tarjetas de estado actual llevan una marca visible "Estado actual" y las del período "Período: 01/10/2026 – 31/10/2026", para que nadie crea que el filtro las afecta (S8.1.4.3).
- En < 640 px las 4 KPI se muestran como carrusel horizontal; la fila del período en cuadrícula de 2 columnas; los gráficos uno debajo del otro.

### Filtros (formulario)
| Campo | Tipo | Obligatorio | Validación visible | Quién lo ve |
|---|---|---|---|---|
| Período | `FilterChip`: "Este mes" (defecto), "Mes anterior", "Últimos 90 días", "Personalizado" | Sí (siempre hay uno activo) | — | Todos |
| Desde / Hasta | Dos `DateField`, aparecen solo con "Personalizado" | Sí, ambos | "La fecha inicial no puede ser posterior a la final." · "El período no puede superar 366 días." (en línea, antes de consultar) | Todos |
| Vendedor | `Combobox` con "Todos" (defecto) + usuarios activos | No | — | Gerente comercial, administrador |

- La elección de período y vendedor se recuerda al volver al tablero (store).
- Al cambiar un filtro, se actualizan las tarjetas sin recargar la página; las tarjetas muestran su esqueleto mientras tanto.

### Acciones
| Acción | Rol | Resultado |
|---|---|---|
| Cambiar período | Todos | Recalcula los indicadores del período |
| Filtrar por vendedor | Gerente comercial, administrador | Recalcula **todos** los indicadores, también los de estado actual (S8.2.2.3) |
| Nueva cotización (encabezado) | Todos | Abre el editor de M4 |

### Estados
| Estado | Qué se ve |
|---|---|
| Cargando | Banda con el saludo (no depende de datos); esqueletos de las 4 KPI, de la fila del período y de los gráficos. |
| Vacío | Instalación sin cotizaciones enviadas: tarjetas en `0` y `$0`, conversión "Sin datos"; en lugar de los gráficos, `EmptyState` "Aún no hay cotizaciones enviadas. Los indicadores aparecen desde el primer envío." + "Nueva cotización". Período sin cohorte: gráficos reemplazados por "No hay cotizaciones enviadas en este período." |
| Error | `Alert` `danger` en el área de indicadores con el texto del código y "Reintentar". `DASHBOARD_INVALID_PERIOD` se muestra en línea bajo las fechas personalizadas. |
| Sin permiso | No aplica: todos los roles entran. Un vendedor nunca ve el filtro por vendedor ni datos ajenos (S8.2.1). |
| Éxito | No hay acciones que guarden; los indicadores se actualizan en su lugar. |

---

## Flujos
- Login → Tablero (página de inicio de todos los roles).
- Tablero → "Nueva cotización" (encabezado) → editor de cotización (M4).
- Tablero → navegación "Cotizaciones" → listado de cotizaciones (M4).
- Tablero → bloque "Mayor probabilidad de cierre" → detalle de la cotización (cuando exista M9).

## Reglas que cambian lo que se ve
| Regla | Efecto en la interfaz |
|---|---|
| Rol `SELLER` (S8.2.1) | Todos los indicadores son solo de sus cotizaciones; no aparece el filtro por vendedor. El saludo y la línea de contexto hablan de "tus cotizaciones". |
| Rol `MANAGER` / `ADMIN` (S8.2.2) | Aparece el filtro por vendedor; con "Todos" se ven todas las cotizaciones. Los vendedores inactivos no están en el filtro, pero sus datos cuentan en "Todos". |
| Estado actual frente a período (RN-36) | Activas y pendientes de seguimiento no cambian con el período; se rotulan "Estado actual". |
| Conversión sin denominador (S8.1.3.2) | Se muestra "Sin datos", nunca `0 %`. |
| Borradores y anuladas (RN-36) | No cuentan en ningún indicador; el monto cotizado lo aclara con "Sin anuladas". |
| M9 disponible (S9.3.2) | Aparece el bloque "Mayor probabilidad de cierre" debajo de los gráficos. |

## Vacíos detectados
| # | Vacío | Resolución propuesta | Bloquea |
|---|---|---|---|
| V1 | La referencia combina tablero y listado de cotizaciones en una sola página; M8 solo define indicadores y M4 tiene su propio `QuotesListPage`. | El tablero no incluye el listado; se llega a él por la navegación. Si se quiere un acceso rápido, que sea un enlace "Ver cotizaciones", sin tabla. | No (tech plan M8) |
| V2 | No hay claves de `lang/` para el saludo ni para la línea de contexto de la banda. | Agregar `dashboard.greeting.morning/afternoon/evening` (con `{{name}}`) y `dashboard.context.pending_one/_other` y `dashboard.context.allClear`, calculadas con `current.pendingFollowUp`. | No (tech plan M8) |
| V3 | No se define si las tarjetas llevan al listado filtrado (por ejemplo, Activas → listado con estado Enviada). | Hacer clicables Activas y Aprobadas/Rechazadas/Vencidas hacia el listado de M4 con el filtro de estado (que M4 ya tiene). Pendientes de seguimiento no enlaza hasta que M4/M6 tengan ese filtro. | No (tech plan M8) |
| V4 | `design-system.md` indica "—" para un KPI sin valor; S8.1.3.2 indica "Sin datos". | Prevalece S8.1.3.2: el valor muestra "Sin datos" (clave `dashboard.noData`). Ajustar el texto de `KpiCard` en `design-system.md`. | No |
