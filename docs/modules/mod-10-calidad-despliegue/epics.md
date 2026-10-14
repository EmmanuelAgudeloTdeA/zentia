# M10 Calidad y despliegue – Épicas

> Fuentes: `docs/fuente/desglose.md` (M10; decisiones 53, 54, 66, 67, 79, 85, 88, 171–178), `CLAUDE.md`, `docs/prd.md` (RNF-01, RNF-02, RNF-05, RNF-06), `docs/architecture.md` §7, §8 y §10.

## Objetivo
Desplegar Zentia en la nube como una instalación por empresa, con migraciones y seed automáticos, y verificar formalmente los requisitos no funcionales de usabilidad, portabilidad y rendimiento.

**Cubre:** RNF-01 (usabilidad), RNF-02 (disponibilidad web), RNF-05 (rendimiento de PDF e IA) y RNF-06 (portabilidad entre navegadores).

## Depende de
| Módulo / hito | Qué necesita exactamente |
|---|---|
| M0 | CI (S0.1.4), validación de env (S0.2.4), `TRUST_PROXY`, `DOCS_ENABLED`, logs JSON |
| M1 | Seed del primer administrador, rutas públicas con rate limit |
| M2 | Seed de `CompanySettings` |
| M5 | Flujos críticos completos (crear → PDF → cambiar estado) y ruta de PDF: **condición para empezar** |
| M6 | Scheduler con `SCHEDULER_ENABLED` y recuperación al arrancar |
| M9 | Ruta del asistente para medir el p95 de IA y seed de demostración: **condición para cerrar** |

H10.1 y la verificación de RNF-01, RNF-05 (PDF) y RNF-06 pueden empezar al cerrar M5. La medición de IA (RNF-05) y el cierre del módulo esperan a M9.

## Lo desbloquea
| Módulo | Qué necesita de M10 |
|---|---|
| Entrega del proyecto | Entorno de producción operativo y evidencia de RNF-01, RNF-05 y RNF-06 |

---

## H10.1 Despliegue en la nube
**Objetivo:** que una empresa tenga su instalación accesible por HTTPS, con base de datos administrada, migraciones y seed al desplegar, y web y API en el mismo dominio.
**Depende de:** M5 (para empezar).

### S10.1.1 Migraciones en despliegue
Como administrador, quiero que cada despliegue aplique las migraciones y el seed sin pasos manuales, para actualizar el sistema sin riesgo de olvidar algo.
- **RF de origen:** — (RNF-02)
- **Criterios de aceptación:**
  1. Una imagen Docker multi-etapa compila `shared`, `api` y `web`; en ejecución, Express sirve la API bajo `/api` y la web compilada en `/` (mismo origen, decisión 62).
  2. Al iniciar, el contenedor ejecuta `prisma migrate deploy` y luego el seed idempotente (`QuoteSequence`, `CompanySettings`, primer `ADMIN`); si la migración falla, el contenedor no arranca.
  3. Un despliegue sin cambios de schema no modifica la base.
  4. El despliegue se dispara al hacer merge a `main` solo si el CI pasa.
- **Depende de:** M0 (S0.1.4), M1 y M2 (seeds)
- **Tamaño:** M

### S10.1.2 Variables de entorno del entorno productivo
Como administrador, quiero las variables de producción definidas y validadas, para que el sistema arranque seguro y con la configuración correcta.
- **RF de origen:** — (RNF-02, RNF-03)
- **Criterios de aceptación:**
  1. `.env.example` documenta todas las variables del proyecto; producción las define en el gestor de secretos del proveedor, nunca en el repositorio.
  2. En producción: `NODE_ENV=production`, `DOCS_ENABLED=false`, `TRUST_PROXY=1`, `SCHEDULER_ENABLED=true` en una sola instancia, `TZ=America/Bogota`, `JWT_ACCESS_SECRET` de 32 caracteres o más.
  3. `ADMIN_EMAIL` y `ADMIN_PASSWORD` solo se usan en el primer despliegue; luego se eliminan.
  4. Con `TRUST_PROXY=1`, el rate limit usa la IP real del cliente y las cookies `Secure` funcionan detrás del proxy HTTPS.
- **Depende de:** S10.1.1
- **Tamaño:** S

### S10.1.3 Endpoint de health
Como administrador, quiero un endpoint de salud, para que la plataforma detecte si la aplicación dejó de responder y la reinicie.
- **RF de origen:** — (RNF-02, decisiones 53 y 85)
- **Criterios de aceptación:**
  1. `GET /api/health` es público, con rate limit, y responde 200 `{ status: "ok" }` si la base responde a `SELECT 1` en menos de 1 s.
  2. Si la base no responde, responde 503 `{ status: "error" }`, sin detalles internos.
  3. La plataforma usa esta ruta como health check del servicio.
- **Depende de:** S10.1.1
- **Tamaño:** S

---

## H10.2 Verificación
**Objetivo:** dejar evidencia de que se cumplen RNF-01, RNF-05 y RNF-06, en un entorno de staging con datos de demostración.
**Depende de:** H10.1; M9 para la medición de IA.

### S10.2.1 Prueba de usabilidad con 3–5 usuarios (RNF-01)
Como gerente comercial, quiero comprobar con personas sin formación técnica que el sistema se aprende rápido, para saber si cumple RNF-01.
- **RF de origen:** — (RNF-01)
- **Criterios de aceptación:**
  1. Se recluta a entre 3 y 5 participantes sin formación técnica, que no participaron en el desarrollo.
  2. Cada uno tiene 30 min de familiarización libre en staging con datos de demostración y luego, sin ayuda, debe: crear una cotización, generar su PDF y cambiar su estado.
  3. Se registra por participante y tarea: completó (sí/no), tiempo y errores.
  4. Se cumple si al menos el 80 % de los participantes completa las tres tareas sin ayuda.
  5. Los resultados y los hallazgos quedan en `docs/qa/usabilidad.md`.
- **Depende de:** S10.1.1 (staging), M5
- **Tamaño:** M

### S10.2.2 Matriz de navegadores con flujos críticos (RNF-06)
Como vendedor, quiero que el sistema funcione en los navegadores más usados, para trabajar desde el equipo que tenga.
- **RF de origen:** — (RNF-06)
- **Criterios de aceptación:**
  1. La matriz cubre las dos últimas versiones estables de Chrome, Edge, Firefox y Safari.
  2. En cada navegador se ejecuta la checklist: login, crear cotización, descargar el PDF, abrir WhatsApp y correo, cambiar estado, y ver el dashboard.
  3. También se verifica el ancho de 360 px en un navegador móvil.
  4. Los resultados (versión, fecha, resultado por paso) quedan en `docs/qa/navegadores.md`; cualquier fallo bloqueante abre una corrección antes de cerrar M10.
- **Depende de:** S10.1.1, M5
- **Tamaño:** S

### S10.2.3 Medición p95 de PDF e IA (RNF-05)
Como gerente comercial, quiero medir los tiempos de respuesta del PDF y del asistente, para confirmar que responden en menos de 5 s.
- **RF de origen:** — (RNF-05)
- **Criterios de aceptación:**
  1. Un script (`apps/api/scripts/perf/p95.ts`, ejecutado con `tsx`) hace 100 solicitudes secuenciales autenticadas contra staging por escenario y calcula el p50, el p95 y el máximo.
  2. Escenarios: PDF de 10 líneas, PDF de 100 líneas, asistente con Gemini y asistente con la plantilla de respaldo.
  3. Se cumple si el p95 de cada escenario es menor a 5 s.
  4. Como referencia, también se miden `GET /api/quotes` y `GET /api/dashboard/summary` (impacto del guard por PK y de las agregaciones).
  5. Los resultados quedan en `docs/qa/rendimiento.md`, con la fecha, el entorno y la versión desplegada.
- **Depende de:** S10.1.1, M5; para IA, M9
- **Tamaño:** M
