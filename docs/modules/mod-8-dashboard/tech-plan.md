# M8 Dashboard – Tech plan

> Implementa `epics.md` de este módulo. Referencias: `CLAUDE.md`, `docs/prd.md` (RN-36), `docs/architecture.md` §4 y §10; base de M1, M4 y M6.

## 1. Entidades Prisma
M8 no agrega modelos. Agrega en su migración un índice sobre `Quote` para las consultas por dueño y cohorte:
```prisma
// en model Quote (M4), agregado por la migración de M8
@@index([ownerId, firstSentAt])
```

## 2. Endpoints
| Método | Ruta | Rol | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/dashboard/summary` | Todos (alcance por rol) | query `{ from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD', ownerId? (solo M/A) }` | 200 `DashboardSummaryDto` | 400 `VALIDATION_ERROR`, `DASHBOARD_INVALID_PERIOD` |

```ts
DashboardSummaryDto = {
  scope: { ownerId: string | null },         // null = todos
  current: { active: number, pendingFollowUp: number },
  period: {
    from: string, to: string,
    approved: number, rejected: number, expired: number,
    quotedAmount: string, approvedAmount: string,
    conversionRate: string | null            // "37.50" (porcentaje, 2 decimales)
  },
  sections: DashboardSectionDto[]            // vacío hasta M9 (H9.3)
}
```

## 3. Application: casos de uso y puertos
| Caso de uso | Puertos | Notas |
|---|---|---|
| `GetDashboardSummaryUseCase` | `DashboardReadRepository`, `SettingsReader` (M2), `Clock`, `DashboardSection[]` | Resuelve período por defecto y alcance, y ejecuta las consultas en paralelo |

**Puertos**
| Puerto | Contrato | Adaptador |
|---|---|---|
| `DashboardReadRepository` (solo lectura, decisión 72) | `countCurrent(scope, today, y)`, `periodStats(scope, fromTs, toTs)` → DTOs | SQL con Prisma `$queryRaw` (parametrizado) |
| `DashboardSection` | Registro de `(actor, filters) => Promise<DashboardSectionDto>`; vacío en M8 | Punto de extensión; M9 aporta "mayor probabilidad" |
| `SettingsReader` | `followUpDays` | M2 |

**Consultas** (`scope`: `ownerId = :ownerId` o sin filtro)
```sql
-- current (sin período)
SELECT
  COUNT(*) FILTER (WHERE q.status = 'SENT')                                         AS active,
  COUNT(*) FILTER (WHERE q.status = 'SENT' AND <regla sin seguimiento de M6>)       AS pending_follow_up
FROM "Quote" q
WHERE <scope>;

-- period (cohorte por firstSentAt)
SELECT
  COUNT(*) FILTER (WHERE q.status = 'APPROVED')                     AS approved,
  COUNT(*) FILTER (WHERE q.status = 'REJECTED')                     AS rejected,
  COUNT(*) FILTER (WHERE q.status = 'EXPIRED')                      AS expired,
  COALESCE(SUM(q.total) FILTER (WHERE q.status <> 'VOIDED'), 0)     AS quoted_amount,
  COALESCE(SUM(q.total) FILTER (WHERE q.status = 'APPROVED'), 0)    AS approved_amount
FROM "Quote" q
WHERE <scope> AND q."firstSentAt" >= :fromTs AND q."firstSentAt" < :toTsExclusive;
```
- `fromTs` = inicio de `from` en `America/Bogota`; `toTsExclusive` = inicio del día siguiente a `to`.
- `<regla sin seguimiento de M6>` es el fragmento SQL que exporta el barril de `follow-up` (decisión 139): `GREATEST(última interacción, sentAt)::date + Y <= today`.
- `conversionRate` se calcula en el caso de uso con `decimal.js`, `ROUND_HALF_UP`, 2 decimales.

## 4. Front
| Tipo | Elemento | Responsabilidad |
|---|---|---|
| Pantalla | `DashboardPage` (`/`, página de inicio; carga diferida con `React.lazy`) | Filtros y tarjetas; gráficos con `recharts` en carga diferida |
| Componente | `PeriodFilter` | "Este mes", "Mes anterior", "Últimos 90 días", "Personalizado" |
| Componente | `SellerFilter` | Solo `MANAGER`/`ADMIN`; opciones de `GET /users/options` + "Todos" |
| Componente | `KpiCard` | Valor, etiqueta y la marca "estado actual" o "período" |
| Componente | `ClosingStatusChart`, `AmountsChart` | Barras de aprobadas, rechazadas y vencidas; cotizado frente a aprobado |
| Componente | `DashboardSections` | Renderiza `sections` (vacío hasta M9) |
| Store | `features/dashboard/store/dashboard-filters.store.ts` | Preset del período, fechas, `ownerId` |
| Service | `features/dashboard/services/dashboard.service.ts` | `getSummary(filters)` |

## 5. Claves de `lang/` (front)
- `nav.dashboard`
- `dashboard.title`, `dashboard.currentStateHint`, `dashboard.periodHint`, `dashboard.noData`
- `dashboard.kpi.active`, `dashboard.kpi.pendingFollowUp`, `dashboard.kpi.approved`, `dashboard.kpi.rejected`, `dashboard.kpi.expired`, `dashboard.kpi.quotedAmount`, `dashboard.kpi.approvedAmount`, `dashboard.kpi.conversionRate`
- `dashboard.period.thisMonth`, `dashboard.period.lastMonth`, `dashboard.period.last90Days`, `dashboard.period.custom`, `dashboard.period.from`, `dashboard.period.to`
- `dashboard.seller.label`, `dashboard.seller.all`
- `dashboard.charts.closing`, `dashboard.charts.amounts`
- `errors.DASHBOARD_INVALID_PERIOD`

## 6. Reglas de negocio
| Indicador | Universo | Definición |
|---|---|---|
| Activas | Estado actual | `status = SENT` |
| Pendientes de seguimiento | Estado actual | `SENT` y `referenceDate + Y ≤ today` (regla de M6) |
| Aprobadas, rechazadas, vencidas | Cohorte | `firstSentAt ∈ período` y estado actual correspondiente |
| Monto cotizado | Cohorte | `Σ total` sin `VOIDED` |
| Monto aprobado | Cohorte | `Σ total` de `APPROVED` |
| Conversión | Cohorte | `approved / (approved + rejected + expired)`; `null` si el denominador es 0 |

| Filtro | Regla |
|---|---|
| Período | `from`, `to` inclusivos en Bogotá; por defecto, el mes en curso; `from ≤ to`; máximo 366 días |
| Alcance | `SELLER` → solo propias, ignora `ownerId`; `MANAGER`/`ADMIN` → todas o `ownerId` |
| Borradores | Nunca cuentan (no tienen `firstSentAt` ni son activas) |

## 7. Pruebas
| Prueba | Tipo | Verifica |
|---|---|---|
| `dashboard-period.spec` | Unitaria | Período por defecto, límites inclusivos en Bogotá, `DASHBOARD_INVALID_PERIOD` |
| `conversion-rate.spec` | Unitaria | Redondeo a 2 decimales; `null` con denominador 0 |
| `dashboard.read-repository.spec` | Integración (Postgres + `Clock` fijo) | Escenario fijo: borradores excluidos; anuladas fuera de los montos; reactivada contada como activa y no como vencida; cohorte en el borde del día; pendientes con la regla de M6 |
| `dashboard.routes.spec` | Supertest | `SELLER` con `ownerId` ajeno ve solo lo suyo; `MANAGER` con y sin `ownerId`; montos como `string` |
| `dashboard-page.spec` | Testing Library | Presets del período, filtro de vendedor solo para `MANAGER`/`ADMIN`, "Sin datos" en la conversión |

## 8. Riesgos y puntos abiertos
| Punto | Decisión (aprobada: decisiones 154–160) |
|---|---|
| Agregaciones SQL (decisión 79) | Dos consultas agregadas con `FILTER`, con el índice nuevo `(ownerId, firstSentAt)`; el p95 se mide en H10.2. |
| Monto usado | Se suma el `total` actual de la cotización (última versión), no el del primer envío. |
| Anuladas en los montos | Se excluyen del monto cotizado, igual que de la conversión. |
| `ownerId` enviado por un `SELLER` | Se ignora y se aplica su propio alcance (sin error). |
| Vendedores inactivos en el filtro | `GET /users/options` solo lista activos; los datos de inactivos se ven en "Todos", pero no se pueden filtrar por separado. |
| Rango máximo de 366 días | Limita el costo de las consultas. |
| Página de inicio | El dashboard es la ruta `/` para los tres roles. |
| Bloque de probabilidad | Punto de extensión `DashboardSection`; M9 lo llena en H9.3. |
