# Recetas con rampas independientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir definir cada transición de temperatura, presión y vacío por tiempo o por rampa, con la temperatura como límite temporal del escalón.

**Architecture:** Extraer la derivación de escalones a `src/utils/recipeSteps.js`, que será la única fuente de cálculo para editor, guardado, resultados y gráfica. Persistir los tres tiempos y sus modos de control; el formulario solo muta la fuente seleccionada y la utilidad deriva el valor contrario.

**Tech Stack:** React 19, Vite, Vitest, Supabase/PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-09-03-receta-rampas-independientes-design.md`

## Global Constraints

- Eliminar de la aplicación `tiempo_ciclo_min` y `tiempo_min`; migrar sus datos antes de desplegar el cliente.
- Persistir `*_tiempo_min` y `*_control_mode` para temperatura, presión y vacío.
- El tiempo de temperatura cierra el escalón; presión y vacío no pueden superarlo.
- En mantenimiento, solo temperatura muestra tiempo; presión y vacío no muestran ni tiempo ni rampa.
- Este directorio no es un repositorio Git; no hay pasos de commit hasta que exista uno.

---

## Estructura de archivos

- Crear `src/utils/recipeSteps.js`: cálculo, validación y derivación reutilizable de escalones.
- Crear `src/utils/recipeSteps.test.js`: pruebas unitarias de las reglas de transición.
- Crear `src/components/RecetaForm.test.jsx`: comportamiento de edición de los bloques.
- Crear `src/components/RecipeChart.test.jsx`: puntos temporales y tramos de mantenimiento de la gráfica.
- Crear `sql/2026-09-03_add_independent_recipe_control_times.sql`: migración idempotente de PostgreSQL.
- Modificar `src/utils/records.js`, `src/services/databaseService.js`, `src/App.jsx`, `src/config/appConfig.js`, `src/data/probetasSchema.js`, `src/components/RecetaForm.jsx`, `src/components/RecipeChart.jsx` y `src/components/ProbetaForm.jsx`.

### Task 1: Migración y contrato de campos

**Files:**
- Create: `sql/2026-09-03_add_independent_recipe_control_times.sql`
- Modify: `src/data/probetasSchema.js:156-184`
- Modify: `src/config/appConfig.js:45-62, 143-157`

**Produces:** Campos `temp_tiempo_min`, `pres_tiempo_min`, `vacio_tiempo_min` (`float8`) y los modos `temp_control_mode`, `pres_control_mode`, `vacio_control_mode` (`text`) en `RECETA_ESCALONES`.

- [ ] **Step 1: Escribir la prueba de contrato local**

En `src/utils/recipeSteps.test.js`, importar `createEmptyRecipeStep` y comprobar los valores iniciales:

```js
expect(createEmptyRecipeStep(1)).toMatchObject({
  temp_tiempo_min: '', temp_control_mode: 'time',
  pres_tiempo_min: '', pres_control_mode: 'time',
  vacio_tiempo_min: '', vacio_control_mode: 'time',
})
```

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: FAIL porque los campos no existen.

- [ ] **Step 3: Añadir la migración idempotente**

La migración debe preservar temporalmente y recrear las vistas `V_RECETAS_DETALLE` y `V_RECETAS_TIEMPO_CICLO`, como hace `sql/2026-06-30_unify_recipe_step_time.sql`; después añadirá las seis columnas, rellenará los tres tiempos desde `tiempo_min`, fijará los modos a `'time'`, eliminará `RECETAS.tiempo_ciclo_min` y `RECETA_ESCALONES.tiempo_min`, y usará restricciones `check (mode in ('time','ramp'))`.

```sql
alter table public."RECETA_ESCALONES"
  add column if not exists temp_tiempo_min double precision,
  add column if not exists temp_control_mode text not null default 'time';
update public."RECETA_ESCALONES"
set temp_tiempo_min = coalesce(temp_tiempo_min, tiempo_min),
    temp_control_mode = 'time';
```

Repetir para presión y vacío antes de eliminar las columnas antiguas. Reflejar el mismo contrato en esquema local y etiquetas; retirar los dos campos antiguos.

- [ ] **Step 4: Ejecutar la prueba y lint**

Run: `npm test -- src/utils/recipeSteps.test.js && npx eslint src/utils/records.js src/data/probetasSchema.js src/config/appConfig.js`

Expected: PASS.

### Task 2: Utilidad única de cálculo de transiciones

**Files:**
- Create: `src/utils/recipeSteps.js`
- Modify: `src/utils/records.js:24-41, 386-410`
- Test: `src/utils/recipeSteps.test.js`

**Produces:** `deriveRecipeSteps(draft)` y `getTransition({ start, end, mode, time, ramp, isDwell })`.

- [ ] **Step 1: Escribir pruebas de cálculo**

```js
expect(getTransition({ start: 20, end: 40, mode: 'time', time: 10 })).toMatchObject({ time: 10, ramp: 2 })
expect(getTransition({ start: 20, end: 40, mode: 'ramp', ramp: 2 })).toMatchObject({ time: 10, ramp: 2 })
expect(getTransition({ start: 40, end: 20, mode: 'ramp', ramp: -2 })).toMatchObject({ time: 10 })
expect(getTransition({ start: 20, end: 40, mode: 'ramp', ramp: -2 }).time).toBe('')
```

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: FAIL porque no existe `getTransition`.

- [ ] **Step 3: Implementar derivación pura**

`getTransition` devuelve cadena vacía para datos no válidos y redondea la rampa a tres decimales. `deriveRecipeSteps` debe encadenar los valores finales, aplicar mantenimiento, derivar los tres controles y exponer `stepDuration` desde temperatura. Para presión/vacío con duración menor, conservar el final y un tramo de mantenimiento hasta `stepDuration`.

- [ ] **Step 4: Adaptar borradores y carga**

`createEmptyRecipeStep` y `buildRecetaDraftFromRecord` deben usar los campos nuevos y no devolver `tiempo_min`.

- [ ] **Step 5: Ejecutar pruebas**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: PASS con cálculo directo, inverso, descendente, inválido y mantenimiento.

### Task 3: Persistencia compatible de recetas

**Files:**
- Modify: `src/services/databaseService.js:1-42, 302-390`
- Test: `src/utils/recipeSteps.test.js`

**Consumes:** `deriveRecipeSteps(draft)`.

- [ ] **Step 1: Escribir prueba de payload de guardado**

Extraer un helper exportado `buildRecipeStepRecords(draft, recipeId)` y comprobar:

```js
expect(buildRecipeStepRecords(recipeDraft, 7)[0]).toMatchObject({
  receta_id: 7, temp_tiempo_min: 10, temp_control_mode: 'time',
  pres_tiempo_min: 5, pres_control_mode: 'time', tiempo_min: undefined,
})
```

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: FAIL porque el helper no existe.

- [ ] **Step 3: Sustituir el cálculo duplicado del servicio**

`saveRecetaRecord` debe dejar de enviar `tiempo_ciclo_min` y `tiempo_min`, llamar a `buildRecipeStepRecords`, persistir modos, tiempos, rampas derivadas y finales efectivos. Mantener la eliminación/reinserción existente de escalones.

- [ ] **Step 4: Ejecutar pruebas del helper**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: PASS y ningún payload contiene campos eliminados.

### Task 4: Reglas de edición y limpieza de dependencias

**Files:**
- Modify: `src/App.jsx:540-585`
- Test: `src/utils/recipeSteps.test.js`

**Produces:** `handleRecipeStepFieldChange` y `handleRecetaModalStepFieldChange` aplican reglas idénticas.

- [ ] **Step 1: Escribir pruebas de mutación de borrador**

Exportar una función pura `updateRecipeStep(step, name, value)` desde `src/utils/recipeSteps.js` y comprobar:

```js
expect(updateRecipeStep({ pres_tiempo_min: 5, vacio_tiempo_min: 4 }, 'temp_tiempo_min', 10))
  .toMatchObject({ temp_tiempo_min: 10, pres_tiempo_min: '', vacio_tiempo_min: '' })
```

También comprobar que presión/vacío superiores al tiempo de temperatura devuelven un error de validación y no cambian el valor.

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: FAIL porque no existe `updateRecipeStep`.

- [ ] **Step 3: Implementar actualización centralizada**

Al cambiar el modo, vaciar el valor que deja de ser fuente. Al cambiar `temp_tiempo_min`, vaciar `pres_tiempo_min` y `vacio_tiempo_min`. Al editar tiempos de presión/vacío, rechazar valores mayores que el tiempo de temperatura cuando este exista. Reutilizar esta función en ambos handlers de `App.jsx`.

- [ ] **Step 4: Ejecutar las pruebas**

Run: `npm test -- src/utils/recipeSteps.test.js`

Expected: PASS para limpieza, límite y selección de fuente.

### Task 5: Editor de receta por bloque

**Files:**
- Modify: `src/components/RecetaForm.jsx:1-430`
- Modify: `src/App.css` (estilos de selector y botón X)
- Create: `src/components/RecetaForm.test.jsx`

**Consumes:** `deriveRecipeSteps` y los handlers de Task 4.

- [ ] **Step 1: Escribir pruebas de interfaz**

Renderizar un escalón no-dwell y comprobar que aparecen los botones `Tiempo` y `Rampa` para cada bloque, el campo opuesto es `readOnly`, y la X llama al handler con cadena vacía. Para `temp_dwell`, comprobar `Tiempo de mantenimiento` y ausencia de selector/rampa; para `pres_dwell` y `vacio_dwell`, comprobar ausencia de tiempo y rampa.

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/components/RecetaForm.test.jsx`

Expected: FAIL porque el editor aún contiene el bloque `Tiempo` común y rampas de solo lectura.

- [ ] **Step 3: Implementar el control reutilizable**

Crear dentro de `RecetaForm.jsx` un componente local `TransitionControl` que reciba `label`, `modeField`, `timeField`, `rampField`, valores derivados y `onChange`. Debe mostrar selector, input fuente, salida calculada y botón `aria-label="Vaciar <label>"`. Eliminar `Tiempo de ciclo` de la cabecera y el bloque de tiempo común.

- [ ] **Step 4: Ejecutar las pruebas de interfaz**

Run: `npm test -- src/components/RecetaForm.test.jsx`

Expected: PASS en modos, limpieza y mantenimiento.

### Task 6: Gráfica con duraciones independientes

**Files:**
- Modify: `src/components/RecipeChart.jsx:1-154`
- Create: `src/components/RecipeChart.test.jsx`

**Consumes:** Escalones derivados con `stepDuration`, `tempTransition`, `presTransition` y `vacioTransition`.

- [ ] **Step 1: Escribir prueba de puntos temporales**

Exportar `buildRecipeSeries(steps)` y comprobar el caso temperatura 10 min, presión 5 min:

```js
expect(buildRecipeSeries([step]).pressurePoints).toEqual([
  { x: 0, y: 1 }, { x: 5, y: 2 }, { x: 10, y: 2 },
])
```

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/components/RecipeChart.test.jsx`

Expected: FAIL porque la serie actual solo usa `tiempo_min`.

- [ ] **Step 3: Implementar las tres series**

Usar `stepDuration` para el eje X. Añadir temperatura, presión y vacío al SVG, sus leyendas y escalas; cuando una transición termina antes, añadir el punto final y el punto horizontal al fin del escalón.

- [ ] **Step 4: Ejecutar pruebas de gráfica**

Run: `npm test -- src/components/RecipeChart.test.jsx`

Expected: PASS para horizontales, mantenimiento y encadenado de escalones.

### Task 7: Consumidores, verificación y despliegue de migración

**Files:**
- Modify: `src/components/ProbetaForm.jsx` (usar `deriveRecipeSteps` en la vista de resultados)
- Modify: `src/config/appConfig.js` (sin campos eliminados en listados)
- Test: `src/components/ProbetaForm.test.jsx`, `src/utils/recipeSteps.test.js`, `src/components/RecetaForm.test.jsx`, `src/components/RecipeChart.test.jsx`

- [ ] **Step 1: Escribir prueba de integración de resultados**

Comprobar que una receta con presión de 5 min y temperatura de 10 min conserva la presión final en el resumen de resultados sin depender de `tiempo_min`.

- [ ] **Step 2: Ejecutar la prueba para verla fallar**

Run: `npm test -- src/components/ProbetaForm.test.jsx`

Expected: FAIL porque la vista aún deriva usando tiempo común.

- [ ] **Step 3: Reemplazar derivación duplicada y eliminar referencias antiguas**

Importar `deriveRecipeSteps` en `ProbetaForm.jsx`; eliminar helpers locales de rampas. Confirmar con `rg -n "tiempo_min|tiempo_ciclo_min" src` que solo queden referencias explícitas de compatibilidad/migración, nunca de interfaz o guardado.

- [ ] **Step 4: Ejecutar la batería completa**

Run: `npx eslint src/App.jsx src/components/RecetaForm.jsx src/components/RecipeChart.jsx src/components/ProbetaForm.jsx src/services/databaseService.js src/utils/records.js src/utils/recipeSteps.js && npm test && npm run build`

Expected: lint sin errores, todas las pruebas en verde y build de Vite correcto.

- [ ] **Step 5: Aplicar la migración en Supabase antes del despliegue del cliente**

Ejecutar `sql/2026-09-03_add_independent_recipe_control_times.sql` en el editor SQL del proyecto Supabase y verificar que las columnas antiguas no aparecen en `information_schema.columns`.
