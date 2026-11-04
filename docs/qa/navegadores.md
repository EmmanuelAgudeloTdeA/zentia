# Matriz de navegadores (RNF-06)

> Story: S10.2.2. **Estado: parcial.** Se ejecuta en staging; cualquier fallo bloqueante abre una corrección antes de cerrar M10.

## Depende de
- S10.1.1 (entorno desplegado) y M5 (PDF y envío asistido).

## Checklist por navegador
| # | Paso | OK si… |
|---|---|---|
| 1 | Login | Entra al tablero; el refresco de página mantiene la sesión. |
| 2 | Crear cotización | Se guarda un borrador con cliente y dos líneas; la vista previa de totales coincide. |
| 3 | Descargar el PDF | El PDF se descarga y se abre con los datos correctos. |
| 4 | Abrir WhatsApp y correo | "Enviar" abre `wa.me` y el cliente de correo con el mensaje y el enlace. |
| 5 | Cambiar estado | Enviada → Aprobada, con el historial actualizado. |
| 6 | Ver el dashboard | Indicadores y gráficos se cargan sin errores en consola. |

## Resultados
Marcar cada paso con ✅, ❌ (con nota) o — (no ejecutado).

| Navegador | Versión | SO | Fecha | 1 | 2 | 3 | 4 | 5 | 6 | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| Chrome (última) | | | | | | | | | | |
| Chrome (anterior) | | | | | | | | | | |
| Edge (última) | | | | | | | | | | |
| Edge (anterior) | | | | | | | | | | |
| Firefox (última) | | | | | | | | | | |
| Firefox (anterior) | | | | | | | | | | |
| Safari (última) | | macOS | | | | | | | | Requiere macOS o iOS |
| Safari (anterior) | | macOS | | | | | | | | |
| Móvil 360 px | | Android/iOS | | | | | | | | Navegación, formulario de cotización y tablas en tarjetas |

## Fallos y correcciones
| # | Navegador | Paso | Descripción | Bloqueante | Corrección (commit/PR) |
|---|---|---|---|---|---|
| | | | | | |
