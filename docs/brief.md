# Zentia – Brief

> Jerarquía de fuentes: `docs/fuente/desglose.md` > `CLAUDE.md` > `docs/prd.md` > `docs/fuente/ppi-zentia.md`.

## Problema
Las pymes cotizan con herramientas ofimáticas sin integración (PPI, sección 2.2 y Anexo 2):
- Registran los productos y los valores en Excel y los copian a mano en un documento de propuesta, lo que duplica información y genera errores.
- Las cotizaciones quedan dispersas: si el cliente vuelve o pide cambios, hay que buscarlas y rehacerlas.
- El seguimiento depende de la memoria del vendedor y no hay forma de saber qué cotizaciones están pendientes, inactivas o por vencer.
- El resultado (aprobada, rechazada, vencida) y los cambios de la negociación no quedan registrados de forma estructurada.

## Usuarios
| Rol | Qué hace en Zentia |
|---|---|
| Vendedor | Gestiona los clientes (compartidos entre todos los vendedores). Crea, edita, envía y da seguimiento solo a sus cotizaciones. |
| Gerente comercial | Crea cotizaciones propias y ve y gestiona todas: aplica descuentos sobre el límite del vendedor y reasigna. Ve el dashboard de todos. No administra usuarios. |
| Administrador | Gestiona usuarios (incluido el restablecimiento de contraseñas), catálogo, parámetros y logo de la empresa; también crea cotizaciones propias y gestiona todas. |

Las alertas de seguimiento las recibe el dueño de cada cotización, sea cual sea su rol. El cliente final no accede al sistema: recibe el PDF.

## Propuesta de valor
1. Toda la cotización en un solo lugar: se crea, se calcula, se genera el PDF y se envía sin copiar datos entre herramientas.
2. Cada cotización tiene estado, fecha de vencimiento y alertas, así que ninguna queda sin seguimiento.
3. La negociación queda trazada en un historial unificado: versiones con los cambios de contenido y eventos con quién, cuándo y qué pidió el cliente.
4. Apoyo de IA para redactar mensajes de seguimiento y estimar la probabilidad de cierre, sin enviar datos personales ni texto libre.

## Alcance del MVP (M0–M5)
| Módulo | Incluye |
|---|---|
| M0 Fundación | Monorepo, CI (lint, typecheck, test), API base con Swagger y manejo de errores, front base con i18n. |
| M1 Acceso y usuarios | Login, refresh token, logout, cambiar contraseña, roles, gestión de usuarios, restablecimiento de contraseña. |
| M2 Configuración | Datos, logo y branding público para el login; parámetros comerciales. |
| M3 Clientes y catálogo | Clientes compartidos (con teléfono o correo); productos con tarifa de IVA, sin borrado (se desactivan). |
| M4 Cotizaciones | Creación y cálculo, consecutivo, estados, anulación, vigencia, edición, versiones y eventos, reactivación, duplicado y reasignación. |
| M5 Documento y envío | PDF con la plantilla de la empresa y accesos "Abrir en WhatsApp" y "Abrir en correo". |

Después del MVP: M6 Seguimiento, M7 Pedidos, M8 Dashboard, M9 IA y M10 Calidad y despliegue. M10 empieza al cerrar M5 y termina con M9.

## Fuera de alcance
Portal del cliente, envío automático por SMTP o por la API de WhatsApp, flujo de solicitud y aprobación de descuentos, descuento por línea, retenciones, inventario, facturación, notificaciones push, multiempresa y correo de recuperación de contraseña.

## Métricas de éxito
| Métrica | Fuente | Meta |
|---|---|---|
| Usuarios sin formación técnica que, tras 30 min, crean una cotización, generan el PDF y cambian su estado sin ayuda | RNF-01 | ≥ 80 % (prueba con 3 a 5 usuarios) |
| Tiempo de generación del PDF y de respuesta de la IA | RNF-05 | < 5 s en p95 |
| Tasa de conversión = aprobadas / (aprobadas + rechazadas + vencidas), por período según `firstSentAt` | RF-13 | Se mide en el dashboard; sin meta definida |
| Montos cotizados frente a montos aprobados, por período según `firstSentAt` | RF-13 | Se mide en el dashboard; sin meta definida |
| Cotizaciones activas y pendientes de seguimiento (regla de Y días), según el estado actual y sin filtro de período | RF-13 | Se mide en el dashboard; sin meta definida |
