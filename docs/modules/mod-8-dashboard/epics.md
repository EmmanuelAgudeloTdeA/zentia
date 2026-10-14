# M8 Dashboard – Épicas

> Fuentes: `docs/fuente/desglose.md` (M8; decisiones 10, 11, 20, 40, 69, 72, 76, 80, 95, 154–160), `CLAUDE.md`, `docs/prd.md` (RF-13, RN-02, RN-36), `docs/architecture.md` §4 y §10.

## Objetivo
Mostrar en una sola pantalla los indicadores del proceso comercial, filtrados por rol y por período, para apoyar la toma de decisiones (N-01, N-07).

**Cubre:** RF-13. El bloque "oportunidades con mayor probabilidad de cierre" lo agrega M9 (H9.3).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | Registro de módulos, OpenAPI, carga diferida de `recharts` en el front |
| M1 · H1.2 | Política de alcance (`resolveScope`, `scopeFilter`) |
| M1 · S1.3.2 | `GET /users/options` para el filtro por vendedor |
| M4 | Tablas `Quote` (`status`, `ownerId`, `firstSentAt`, `total`) para el repositorio de solo lectura; `Clock` |
| M6 · H6.2 | Regla "sin seguimiento" (fecha de referencia y Y) exportada por el barril, para contar las pendientes de seguimiento |
| M2 · S2.2.3 | `SettingsReader`: `followUpDays` (Y) |

## Lo desbloquea
| Módulo | Qué necesita de M8 |
|---|---|
| M9 IA | Punto de extensión `DashboardSection` para agregar el bloque de mayor probabilidad (H9.3) |

---

## H8.1 Indicadores
**Objetivo:** calcular los indicadores con definiciones exactas: estado actual para activas y pendientes, cohorte por `firstSentAt` para el resto.
**Depende de:** M4, M6 (H6.2).

### S8.1.1 Conteo por estado
Como gerente comercial, quiero ver cuántas cotizaciones están activas, pendientes de seguimiento, aprobadas, rechazadas y vencidas, para conocer el estado del proceso.
- **RF de origen:** RF-13.1, RN-36, decisiones 10, 76, 80
- **Criterios de aceptación:**
  1. `GET /api/dashboard/summary` devuelve `current.active` (cotizaciones en `SENT`) y `current.pendingFollowUp` (`SENT` que cumplen la regla de Y días), ambos del estado actual y sin filtro de período.
  2. Devuelve `period.approved`, `period.rejected` y `period.expired`: cotizaciones de la cohorte (`firstSentAt` dentro del período) con ese estado actual.
  3. Los borradores no cuentan en ningún indicador y las anuladas no cuentan en la cohorte.
  4. En el front, cada indicador es una tarjeta con su valor y su etiqueta desde `lang/`, y un gráfico de barras muestra los conteos de cierre del período.
- **Depende de:** M4, M6 (H6.2)
- **Tamaño:** M

### S8.1.2 Montos cotizados frente a montos aprobados
Como gerente comercial, quiero comparar lo cotizado con lo aprobado en un período, para medir cuánto negocio se concreta.
- **RF de origen:** RF-13.2, RN-36
- **Criterios de aceptación:**
  1. `period.quotedAmount` = suma de `total` de la cohorte, sin anuladas.
  2. `period.approvedAmount` = suma de `total` de la cohorte en `APPROVED`.
  3. Los montos se calculan en SQL sobre `Decimal(15,0)` y viajan como `string`.
  4. El front los muestra en COP sin decimales, como tarjetas y en un gráfico comparativo.
- **Depende de:** S8.1.1
- **Tamaño:** S

### S8.1.3 Tasa de conversión sin anuladas
Como gerente comercial, quiero ver la tasa de conversión del período, para saber qué proporción de oportunidades cerradas se aprueba.
- **RF de origen:** RF-13.2, RN-36, decisión 11
- **Criterios de aceptación:**
  1. `period.conversionRate` = aprobadas / (aprobadas + rechazadas + vencidas) de la cohorte, como `string` con 2 decimales (porcentaje).
  2. Si el denominador es 0, el valor es `null` y el front muestra "Sin datos".
  3. Excluye anuladas, borradores y enviadas abiertas.
- **Depende de:** S8.1.1
- **Tamaño:** S

### S8.1.4 Filtro por período
Como vendedor, quiero elegir el período de los indicadores, para comparar meses o revisar el trimestre.
- **RF de origen:** RF-13.3, RN-36, decisión 40
- **Criterios de aceptación:**
  1. `from` y `to` (`YYYY-MM-DD`, en `America/Bogota`, ambos incluidos) filtran la cohorte por `firstSentAt`; por defecto, el mes en curso.
  2. `from > to` o un rango mayor a 366 días responde 400 `DASHBOARD_INVALID_PERIOD`.
  3. El filtro no afecta `current.active` ni `current.pendingFollowUp`; el front lo indica junto a esas tarjetas.
  4. El front ofrece "Este mes", "Mes anterior", "Últimos 90 días" y "Personalizado", y recuerda la última elección en el store.
- **Depende de:** S8.1.1
- **Tamaño:** S

---

## H8.2 Alcance por rol
**Objetivo:** una sola pantalla para todos los roles, con los datos que a cada uno le corresponde ver.
**Depende de:** H8.1.

### S8.2.1 Alcance según rol
Como vendedor, quiero ver los indicadores de mis propias cotizaciones, para medir mi gestión sin ver la de otros.
- **RF de origen:** RF-13.3, RN-02
- **Criterios de aceptación:**
  1. Para `SELLER`, todos los indicadores se calculan solo sobre cotizaciones con `ownerId = actor.id` (`scopeFilter`).
  2. Para `MANAGER` y `ADMIN`, sobre todas las cotizaciones.
  3. El dashboard es la página de inicio de los tres roles.
- **Depende de:** S8.1.1
- **Tamaño:** S

### S8.2.2 Filtro por vendedor
Como gerente comercial, quiero filtrar los indicadores por vendedor, para revisar el desempeño de cada uno.
- **RF de origen:** RF-13.3, decisión 95
- **Criterios de aceptación:**
  1. `ownerId` es opcional y solo lo usan `MANAGER` y `ADMIN`; si un `SELLER` lo envía, se ignora y se aplica su propio alcance.
  2. El selector usa `GET /users/options` (usuarios activos) e incluye "Todos".
  3. El filtro aplica a todos los indicadores, también a los del estado actual.
- **Depende de:** S8.2.1, M1 (S1.3.2)
- **Tamaño:** S
