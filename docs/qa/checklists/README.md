# Checklists de QA

## Depende de
- `docs/modules/mod-<N>-<nombre>/epics.md` de cada módulo (criterios de aceptación).
- `CLAUDE.md` (reglas críticas que cada checklist verifica al final).

## Estado
Hay un checklist por módulo (M0 a M10). Cada criterio marcado (`- [x]`) cita una prueba real con el formato `archivo › describe › prueba`; los pendientes (`- [ ]`) son verificaciones manuales (UI, despliegue, staging) que no tienen prueba automática.

| Módulo | Archivo | Criterios cubiertos por prueba | Pendientes manuales |
|---|---|---:|---:|
| M0 Fundación | [mod-0-fundacion.md](mod-0-fundacion.md) | 60 | 1 |
| M1 Acceso y usuarios | [mod-1-acceso-usuarios.md](mod-1-acceso-usuarios.md) | 58 | 0 |
| M2 Configuración de empresa | [mod-2-configuracion-empresa.md](mod-2-configuracion-empresa.md) | 35 | 1 |
| M3 Clientes y catálogo | [mod-3-clientes-catalogo.md](mod-3-clientes-catalogo.md) | 36 | 1 |
| M4 Cotizaciones | [mod-4-cotizaciones.md](mod-4-cotizaciones.md) | 110 | 3 |
| M5 Documento y envío | [mod-5-documento-envio.md](mod-5-documento-envio.md) | 42 | 5 |
| M6 Seguimiento | [mod-6-seguimiento.md](mod-6-seguimiento.md) | 75 | 5 |
| M7 Pedidos | [mod-7-pedidos.md](mod-7-pedidos.md) | 40 | 3 |
| M8 Dashboard | [mod-8-dashboard.md](mod-8-dashboard.md) | 40 | 4 |
| M9 IA | [mod-9-ia.md](mod-9-ia.md) | 59 | 4 |
| M10 Calidad y despliegue | [mod-10-calidad-despliegue.md](mod-10-calidad-despliegue.md) | 17 | 17 |
| **Total** | | **572** | **44** |

## Cómo se ejecutan las pruebas
`pnpm test` corre con Vitest las pruebas de `packages/shared`, `apps/api` (unitarias y de rutas con Supertest sobre repositorios en memoria) y `apps/web` (Testing Library sobre jsdom). Las pruebas `*.integration.test.ts` usan PostgreSQL real y se omiten si no existe `TEST_DATABASE_URL`; en CI (GitHub Actions) un servicio `postgres:17` define esa variable, se aplican las migraciones con `prisma:deploy` y las pruebas de la API corren sin paralelismo entre archivos porque comparten la base. Para correrlas en local, apunta `TEST_DATABASE_URL` a una base migrada exclusiva para pruebas (se vacía en cada archivo).
