# Recetas con rampas independientes por variable

## Objetivo

Cada escalón de una receta controla temperatura, presión y vacío de forma independiente. Cada variable puede definirse introduciendo su tiempo o su rampa; el valor opuesto se calcula automáticamente. La duración del escalón siempre es la duración de temperatura.

## Modelo de datos

Se elimina de la interfaz y del modelo de aplicación `RECETAS.tiempo_ciclo_min`, así como `RECETA_ESCALONES.tiempo_min`.

Cada escalón incorpora los siguientes campos persistidos:

| Variable | Tiempo | Modo de entrada |
| --- | --- | --- |
| Temperatura | `temp_tiempo_min` | `temp_control_mode` (`time` o `ramp`) |
| Presión | `pres_tiempo_min` | `pres_control_mode` (`time` o `ramp`) |
| Vacío | `vacio_tiempo_min` | `vacio_control_mode` (`time` o `ramp`) |

Las rampas existentes (`temp_grados_por_min`, `pres_bar_por_min` y `vacio_mbar_por_min`) y los valores finales se conservan. El modo identifica qué campo fue introducido por la persona usuaria después de recargar la receta.

La migración de recetas existentes copia `tiempo_min` a los tres tiempos nuevos y establece los tres modos en `time`. Así se conserva la duración y las curvas anteriores. Para presión o vacío en mantenimiento, el tiempo migrado no afecta al cálculo y queda oculto en la interfaz.

## Reglas de cálculo

Para una variable sin mantenimiento:

- En modo `time`, el tiempo es editable y la rampa se calcula como `(fin - inicio) / tiempo`.
- En modo `ramp`, la rampa es editable y el tiempo se calcula como `abs((fin - inicio) / rampa)`.
- Una duración nula, una rampa nula o una rampa con signo incompatible con el cambio de valor deja el campo calculado vacío.
- La X vacía el campo editable y también elimina su cálculo asociado.

La temperatura determina la duración del escalón:

- Si cambia de valor, puede definirse por tiempo o por rampa.
- Si está en mantenimiento, se muestra solo `Tiempo de mantenimiento`; no se muestra selector ni rampa.

Para presión y vacío:

- En mantenimiento no se muestra ni tiempo ni rampa; mantienen su valor durante todo el escalón.
- Su duración calculada o introducida no puede ser mayor que la duración de temperatura.
- Si se introduce presión o vacío antes de que exista un tiempo de temperatura, puede editarse provisionalmente. Al introducir o cambiar el tiempo de temperatura, se vacían automáticamente los tiempos de presión y vacío para exigir una nueva entrada válida dentro del límite.

## Interfaz

Se elimina el bloque de tiempo común del editor y el campo de tiempo de ciclo de los datos generales.

Cada bloque de Temperatura, Presión y Vacío muestra:

1. valor inicial calculado;
2. interruptor de mantenimiento;
3. valor final, si no está en mantenimiento;
4. selector `Tiempo` / `Rampa`;
5. campo editable según el selector, con botón X para vaciarlo;
6. campo calculado de solo lectura para la alternativa.

El bloque de Temperatura marca explícitamente su duración como la que cierra el escalón. Al estar en mantenimiento, reemplaza el selector por su tiempo de mantenimiento. Los bloques de Presión y Vacío muestran una validación inmediata si intentan superar ese tiempo.

## Gráfica

La gráfica calcula cada curva con su propia duración. Temperatura fija el final temporal del escalón. Presión o vacío que alcanzan su objetivo antes permanecen horizontales en el valor final hasta dicho final. No se permiten duraciones de presión o vacío posteriores al fin de temperatura.

## Integración y compatibilidad

La aplicación actualiza de forma coordinada:

- el esquema local y la migración SQL de Supabase;
- los borradores vacíos, carga y guardado de recetas;
- el editor de recetas y su estado de formulario;
- la derivación usada en resultados de probeta;
- la gráfica de recetas;
- etiquetas y columnas visibles de recetas.

Los campos antiguos dejan de leerse y escribirse tras la migración. La migración se ejecuta antes de desplegar el cliente que usa los nuevos campos.

## Pruebas

Se cubrirán con pruebas unitarias e integración:

- cálculo de tiempo a partir de rampa y viceversa;
- cambios ascendentes y descendentes, y rampas no válidas;
- duración independiente de cada variable y mantenimiento horizontal;
- límite de presión/vacío respecto a temperatura y reinicio al cambiar esta;
- migración de un escalón existente con tiempo común;
- persistencia y recarga del modo seleccionado;
- representación de la gráfica con tiempos desiguales.
