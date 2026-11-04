# Prueba de usabilidad (RNF-01)

> Story: S10.2.1. **Estado: pendiente de ejecutar** (requiere participantes y el entorno de staging).

## Depende de
- S10.1.1: entorno de staging desplegado con `seed:demo` (datos marcados `[DEMO]`).
- M5: flujo completo de crear cotización → PDF → cambiar estado.

## Criterio
Se cumple si **al menos el 80 %** de los participantes completa las tres tareas **sin ayuda**.

## Participantes
Entre 3 y 5 personas sin formación técnica que no participaron en el desarrollo. Cada una usa un usuario vendedor propio de staging (creado por el administrador; la contraseña temporal se cambia en el primer ingreso, antes de empezar).

## Protocolo
1. Explicar el objetivo en una frase: "Vamos a evaluar el sistema, no a usted". No se muestra el sistema.
2. **Familiarización libre: 30 minutos** en staging con los datos de demostración. Se pueden hacer preguntas solo en esta etapa.
3. **Tareas sin ayuda**. El moderador lee cada tarea, cronometra y anota los errores; no responde preguntas. Una tarea se abandona tras 10 minutos o si la persona lo pide (cuenta como no completada).
4. Breve entrevista final: qué fue lo más difícil y qué cambiaría.

### Tareas
| # | Tarea (texto que se lee) | Se considera completada cuando |
|---|---|---|
| T1 | "Cree una cotización para el cliente [DEMO] Café Origen con dos productos y guárdela." | Existe un borrador con ese cliente y dos líneas. |
| T2 | "Genere el PDF de esa cotización." | El PDF se descarga o se abre. |
| T3 | "Marque la cotización como enviada y luego como aprobada." | La cotización queda en estado Aprobada. |

**Error:** acción que no lleva a la meta y que la persona debe deshacer o corregir (p. ej., entrar a un módulo equivocado, guardar con datos inválidos).

## Resultados
Fecha: ____ · Entorno: staging ____ · Versión (commit): ____ · Moderador: ____

| Participante | Perfil | T1 completó | T1 tiempo | T1 errores | T2 completó | T2 tiempo | T2 errores | T3 completó | T3 tiempo | T3 errores | Las 3 sin ayuda |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | | | | |
| P2 | | | | | | | | | | | |
| P3 | | | | | | | | | | | |
| P4 | | | | | | | | | | | |
| P5 | | | | | | | | | | | |

**Resultado:** ___ de ___ participantes (___ %) completaron las tres tareas sin ayuda → RNF-01 **cumple / no cumple**.

## Hallazgos
| # | Hallazgo | Participantes | Severidad (alta/media/baja) | Acción |
|---|---|---|---|---|
| | | | | |
