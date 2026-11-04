# Rendimiento: p95 de PDF e IA (RNF-05)

> Story: S10.2.3. **Estado: medición local hecha; la oficial en staging está pendiente** (requiere el despliegue y la clave de Gemini).

## Depende de
- S10.1.1 (imagen desplegable), M5 (PDF) y M9 (asistente).

## Método
- Script: `apps/api/scripts/perf/p95.ts`.
  ```bash
  pnpm --filter @zentia/api perf:p95 -- --base-url <url> --email <admin> --password <clave> [--n 100]
  ```
- Inicia sesión como administrador. Crea datos marcados `[PERF]`: un cliente, 100 productos, una cotización de 10 líneas (enviada) y otra de 100 líneas.
- Hace **100 solicitudes secuenciales autenticadas por escenario** y calcula el p50, el p95 y el máximo del tiempo de respuesta completo, incluida la lectura del cuerpo.
- Entre llamadas al asistente espera 6,1 s para respetar su rate limit (10 por minuto por usuario).
- **Criterio:** p95 < 5 s en cada escenario de PDF y de asistente, sin errores. `GET /api/quotes` y `GET /api/dashboard/summary` son solo referencia.

## Escenarios
| Escenario | Ruta |
|---|---|
| PDF de 10 líneas | `GET /api/quotes/:id/pdf` |
| PDF de 100 líneas (3 páginas) | `GET /api/quotes/:id/pdf` |
| Asistente con Gemini | `POST /api/quotes/:id/follow-up-message` con `LLM_PROVIDER=gemini` (solo en staging) |
| Asistente con la plantilla de respaldo | Misma ruta con `LLM_PROVIDER=none` |
| Referencia | `GET /api/quotes?page=1&pageSize=20` y `GET /api/dashboard/summary` |

## Resultado local (preliminar)
- **Fecha:** 2026-11-04.
- **Entorno:** imagen Docker `zentia:local` (commit `bda50d6`) en un Mac con Docker 28.5. Usa el PostgreSQL 17 local, sin latencia de red.
- **Configuración:** `LLM_PROVIDER=none`, así que el asistente mide la ruta de la plantilla de respaldo.

| Escenario | N | p50 | p95 | Máximo | Errores | p95 < 5 s |
|---|---|---|---|---|---|---|
| PDF de 10 líneas | 100 | 0,03 s | 0,07 s | 0,15 s | 0 | Sí |
| PDF de 100 líneas | 100 | 0,05 s | 0,07 s | 0,08 s | 0 | Sí |
| Asistente (plantilla de respaldo) | 100 | 0,05 s | 0,10 s | 0,25 s | 0 | Sí |
| `GET /api/quotes` (referencia) | 100 | < 0,01 s | < 0,01 s | 0,02 s | 0 | Sí |
| `GET /api/dashboard/summary` (referencia) | 100 | < 0,01 s | 0,01 s | 0,07 s | 0 | Sí |

**Lectura:**
- La generación de PDF queda muy por debajo del umbral, incluso con 100 líneas.
- El asistente con Gemini está acotado por diseño: timeout de 4 s más la plantilla de respaldo, así que su peor caso queda alrededor de 4,1 s. Aun así hay que medirlo en staging, porque depende de la red y del proveedor.

## Resultado en staging (oficial)
- **Fecha:** ____
- **URL:** ____
- **Commit:** ____
- **Plan de Render:** ____
- **Modelo:** ____

| Escenario | N | p50 | p95 | Máximo | Errores | p95 < 5 s |
|---|---|---|---|---|---|---|
| PDF de 10 líneas | | | | | | |
| PDF de 100 líneas | | | | | | |
| Asistente con Gemini | | | | | | |
| Asistente con la plantilla de respaldo | | | | | | |
| `GET /api/quotes` (referencia) | | | | | | |
| `GET /api/dashboard/summary` (referencia) | | | | | | |

> En un plan que se suspende por inactividad, la primera solicitud incluye el arranque en frío. Antes de medir, se hace una solicitud de calentamiento a `/api/health`.
