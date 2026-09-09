# Archivo lógico de registros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir archivar y restaurar registros gestionables sin romper las referencias existentes, manteniendo activos y archivados separados por permisos.

**Architecture:** Las tablas gestionables tendrán estado de archivo lógico (`archived_at`, `archived_by`). El servicio cargará activos o archivados explícitamente y centralizará la detección de referencias. La UI elegirá entre eliminar, archivar o restaurar y mostrará confirmaciones antes de modificar Supabase.

**Tech Stack:** React 19, Vite, Vitest, Supabase JS v2, PostgreSQL/RLS de Supabase.

**Spec:** `docs/superpowers/specs/2026-09-09-archivo-logico-registros-design.md`

## Global Constraints

- No mover ni duplicar registros: el archivo es lógico mediante `archived_at` y `archived_by`.
- Los registros existentes deben permanecer activos tras la migración.
- Gestor y admin pueden eliminar o archivar; solo admin puede listar archivados y restaurar.
- Los formularios nuevos solo listan activos; una referencia existente archivada se muestra como `Nombre (Archivado)`.
- Mantener los mensajes seguros actuales y bloquear acciones duplicadas.
- No existe un repositorio Git en este directorio; omitir los pasos de commit.

---

## Estructura de archivos

- `sql/2026-09-09_add_record_archiving.sql`: migración idempotente, protección de transiciones y RPC restringida para etiquetas archivadas.
- `src/data/probetasSchema.js`: metadatos de archivado no editables en las entidades de sección.
- `src/utils/recordArchiving.js`: catálogo de tablas archivables, detección de referencias y presentación de etiquetas archivadas.
- `src/utils/recordArchiving.test.js`: pruebas unitarias de referencia, acciones y etiquetas.
- `src/services/databaseService.js`: carga por estado, archivo, restauración y consulta limitada de referencias archivadas.
- `src/services/databaseService.test.js`: contratos Supabase de filtro, archivo y restauración.
- `src/utils/permissions.js`: permisos explícitos de archivo, consulta de archivados y restauración.
- `src/utils/permissions.test.js`: matriz de permisos por rol.
- `src/components/RecordActionConfirmation.jsx`: diálogo reutilizable para confirmar eliminar, archivar o restaurar.
- `src/components/RecordActionConfirmation.test.jsx`: confirma/cancela y bloquea doble envío.
- `src/components/SimpleRecordsTable.jsx` y `src/components/ProbetaRecordsTable.jsx`: renderizan las acciones recibidas en lugar de asumir Eliminar.
- `src/components/*.test.jsx`: cobertura de etiquetas y acciones contextuales.
- `src/App.jsx`: estado de vista activa/archivada, selección de acciones, refresco y permisos.
- `src/App.css`: estilos de estado archivado, acción secundaria y diálogo de confirmación.

## Contratos compartidos

```js
// src/utils/recordArchiving.js
export const ARCHIVABLE_TABLES = new Set([
  'PROBETA', 'FIBRAS_REFUERZO', 'PRE-IMPREGNADO', 'RECETAS',
  'FABRICANTE', 'PRE-IMPREGNADO_TYPE', 'RESINA_SYSTEM',
])

export function getRecordAction({ tableName, record, database })
// => 'delete' | 'archive' | 'both' | 'restore' | null

export function isRecordInUse({ tableName, recordId, database })
// => boolean; inspecciona relations y PROBETA_PRE_IMPREGNADO/PROBETA_CAPA

export function getArchivedReferenceLabel(record, fallbackIndex)
// => `${getRecordLabel(record, fallbackIndex)} (Archivado)`
```

```js
// src/services/databaseService.js
export async function loadDatabaseFromSupabase({ archiveState = 'active' } = {})
// archiveState: 'active' | 'archived'; aplica archived_at is null/not null

export async function archiveRecord(tableName, recordId)
export async function restoreRecord(tableName, recordId)
export async function getArchivedReferenceLabels(references)
// references: [{ ownerTable, ownerId, referencedTable, referencedId, fieldName }]
```

```js
// src/components/RecordActionConfirmation.jsx
function RecordActionConfirmation({ action, recordLabel, isSubmitting, onCancel, onConfirm })
// action: 'delete' | 'archive' | 'restore'
```

## Task 1: Migración y protección de Supabase

**Files:**
- Create: `sql/2026-09-09_add_record_archiving.sql`
- Test: ejecución manual en Supabase SQL Editor y consultas de verificación incluidas en el script

**Interfaces:**
- Produces las columnas `archived_at`, `archived_by` en las siete tablas archivables.
- Produces `public.enforce_record_archive_transition()` y un trigger `enforce_archive_transition` por tabla.
- Produces `public.get_archived_reference_labels(jsonb)` para etiquetas puntuales y autorizadas.

- [ ] **Step 1: Escribir las consultas de verificación antes de la migración**

Incluir al inicio del script consultas comentadas para comprobar que cada tabla no tiene aún
`archived_at`, y al final estas comprobaciones ejecutables:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('PROBETA', 'FIBRAS_REFUERZO', 'PRE-IMPREGNADO', 'RECETAS',
                     'FABRICANTE', 'PRE-IMPREGNADO_TYPE', 'RESINA_SYSTEM')
  and column_name in ('archived_at', 'archived_by')
order by table_name, column_name;
```

- [ ] **Step 2: Ejecutar la comprobación inicial en Supabase**

Ejecutar la consulta inicial y documentar el resultado en la ejecución de la migración. Si ya
existen columnas, continuar con `add column if not exists` para mantener la idempotencia.

- [ ] **Step 3: Implementar columnas, índices y trigger de transición**

Crear una transacción que añada ambas columnas y un índice parcial por tabla:

```sql
alter table public."RECETAS"
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

create index if not exists "RECETAS_active_idx"
  on public."RECETAS" (id) where archived_at is null;

create index if not exists "RECETAS_archived_idx"
  on public."RECETAS" (archived_at desc) where archived_at is not null;
```

Repetir el bloque para las siete tablas. Definir una función `security invoker` de trigger que
rechace modificar solo `archived_by`, permita pasar de activo a archivado únicamente a gestor o
admin y fuerce `archived_at = now()` y `archived_by = auth.uid()`, y permita pasar de archivado a
activo solo a admin, restableciendo ambos valores a `null`.

- [ ] **Step 4: Añadir las políticas y RPC de lectura puntual**

Crear políticas RLS **restrictive** de `select` que permitan `archived_at is null` a usuarios
aprobados y permitan filas archivadas solo a admin. Crear
`get_archived_reference_labels(references jsonb)` como `security definer`, con `search_path`
fijo, validando una lista cerrada de relaciones permitidas antes de leer la etiqueta de una fila
archivada. La función devolverá `owner_table`, `owner_id`, `field_name`, `referenced_table`,
`referenced_id` y `label`; devolverá cero filas si la relación no existe o no está archivada.

- [ ] **Step 5: Ejecutar las verificaciones de la migración**

Ejecutar el script en Supabase SQL Editor y comprobar:

```sql
select count(*) filter (where archived_at is not null) as archived,
       count(*) filter (where archived_at is null) as active
from public."RECETAS";

select tgname, tgrelid::regclass
from pg_trigger
where tgname = 'enforce_archive_transition'
  and not tgisinternal
order by tgrelid::regclass::text;
```

Esperado: todos los datos preexistentes activos y un trigger por tabla archivada.

## Task 2: Utilidades, permisos y servicios de archivo

**Files:**
- Create: `src/utils/recordArchiving.js`
- Create: `src/utils/recordArchiving.test.js`
- Modify: `src/utils/permissions.js`
- Modify: `src/utils/permissions.test.js`
- Modify: `src/services/databaseService.js`
- Modify: `src/services/databaseService.test.js`

**Interfaces:**
- Consumes las relaciones de `src/data/probetasSchema.js` y las columnas creadas en Task 1.
- Produces `getRecordAction`, `isRecordInUse`, `archiveRecord`, `restoreRecord` y
  `loadDatabaseFromSupabase({ archiveState })`.

- [ ] **Step 1: Escribir pruebas unitarias de acción y referencia**

Crear `recordArchiving.test.js` con una base literal donde un preimpregnado está enlazado mediante
`CAPA` y `PROBETA_CAPA`; comprobar que no se puede eliminar, pero sí archivar:

```js
expect(isRecordInUse({
  tableName: 'PRE-IMPREGNADO', recordId: 7, database,
})).toBe(true)

expect(getRecordAction({ tableName: 'PRE-IMPREGNADO', record: { id: 7 }, database }))
  .toBe('archive')
expect(getRecordAction({ tableName: 'PROBETA', record: { id: 3 }, database }))
  .toBe('both')
```

Añadir un caso sin relaciones que espere `delete` y una etiqueta literal que espere
`'Fibra T700 (Archivado)'`.

- [ ] **Step 2: Ejecutar las nuevas pruebas para comprobar el fallo**

Run: `npm test -- src/utils/recordArchiving.test.js`

Expected: FAIL porque no existen el módulo ni sus exportaciones.

- [ ] **Step 3: Implementar la utilidad mínima y ampliar permisos**

Crear `recordArchiving.js` usando `relations` de `probetasSchema.js` y comprobando además las
filas de `PROBETA_CAPA` y `PROBETA_PRE_IMPREGNADO`. En `permissions.js`, añadir:

```js
canArchive: hasMinimumRole(normalizedRole, 'gestor'),
canViewArchived: hasMinimumRole(normalizedRole, 'admin'),
canRestore: hasMinimumRole(normalizedRole, 'admin'),
```

No considerar los borradores de probeta como registros archivables.

- [ ] **Step 4: Verificar las utilidades y permisos**

Run: `npm test -- src/utils/recordArchiving.test.js src/utils/permissions.test.js`

Expected: PASS, incluyendo gestor puede archivar y solo admin puede restaurar/ver archivados.

- [ ] **Step 5: Escribir pruebas de servicio antes de modificarlo**

En `databaseService.test.js`, modelar un cliente Supabase que capture filtros y payloads. Añadir
casos para:

```js
await loadDatabaseFromSupabase({ archiveState: 'active' })
// cada tabla archivada recibe .is('archived_at', null)

await archiveRecord('FABRICANTE', 4)
// realiza update({ archived_at: new Date().toISOString() }) filtrado por id

await restoreRecord('FABRICANTE', 4)
// realiza update({ archived_at: null, archived_by: null }) filtrado por id
```

El primer caso debe fallar porque la carga actual no recibe opciones de estado y los otros dos
porque no existen las funciones.

- [ ] **Step 6: Ejecutar la prueba de servicio en rojo**

Run: `npm test -- src/services/databaseService.test.js`

Expected: FAIL en los casos de filtro y funciones de archivo/restauración.

- [ ] **Step 7: Implementar consultas de archivo**

Extender `selectAll(tableName, archiveState)` para aplicar `.is('archived_at', null)` a tablas de
`ARCHIVABLE_TABLES` cuando el estado sea `active`, y `.not('archived_at', 'is', null)` cuando sea
`archived`; las tablas auxiliares se cargan siempre para poder detectar referencias. Exponer:

```js
export async function archiveRecord(tableName, recordId) {
  return updateRecord(tableName, { id: recordId, archived_at: new Date().toISOString() })
}

export async function restoreRecord(tableName, recordId) {
  return updateRecord(tableName, { id: recordId, archived_at: null, archived_by: null })
}
```

Implementar `getArchivedReferenceLabels` mediante `supabase.rpc('get_archived_reference_labels',
{ references })`, normalizando las filas y propagando errores con el patrón seguro existente.

- [ ] **Step 8: Ejecutar pruebas de servicios en verde**

Run: `npm test -- src/services/databaseService.test.js src/utils/recordArchiving.test.js src/utils/permissions.test.js`

Expected: PASS.

## Task 3: Diálogo reutilizable y tablas de acciones

**Files:**
- Create: `src/components/RecordActionConfirmation.jsx`
- Create: `src/components/RecordActionConfirmation.test.jsx`
- Modify: `src/components/SimpleRecordsTable.jsx`
- Modify: `src/components/SimpleRecordsTable.test.jsx`
- Modify: `src/components/ProbetaRecordsTable.jsx`
- Modify: `src/components/ProbetaRecordsTable.test.jsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes una acción `delete`, `archive` o `restore` y el estado pendiente de App.
- Produce un `onConfirm` único, que no se invoca al cancelar ni dos veces durante el envío.
- Las tablas reciben `getRecordActions(record, index)` en lugar de decidir internamente que todo es
  eliminable.

- [ ] **Step 1: Escribir las pruebas de confirmación**

Crear el test con dos casos independientes:

```jsx
const onCancel = vi.fn()
const onConfirm = vi.fn().mockResolvedValue()

render(
  <RecordActionConfirmation
    action="archive"
    recordLabel="Resina 914"
    isSubmitting={false}
    onCancel={onCancel}
    onConfirm={onConfirm}
  />,
)
await user.click(screen.getByRole('button', { name: 'Cancelar' }))
expect(onConfirm).not.toHaveBeenCalled()

await user.dblClick(screen.getByRole('button', { name: 'Archivar' }))
expect(onConfirm).toHaveBeenCalledTimes(1)
```

Comprobar que la variante de eliminar comunica que es irreversible y la de archivar que conserva
las referencias existentes.

- [ ] **Step 2: Ejecutar el test de diálogo en rojo**

Run: `npm test -- src/components/RecordActionConfirmation.test.jsx`

Expected: FAIL porque el componente no existe.

- [ ] **Step 3: Implementar el diálogo y estilos**

Crear el diálogo con `role="dialog"`, `aria-modal="true"`, título y texto dependientes de
`action`. Reutilizar `primary-button`, `ghost-button` y `destructive-button`; el botón de archivo
usa una variante no destructiva y restaurar la variante primaria. Proteger el envío con `useRef`
y deshabilitar los tres botones mientras se confirma.

- [ ] **Step 4: Adaptar las tablas a acciones declarativas**

Cambiar ambas tablas para recibir un array por fila:

```js
getRecordActions(record, index)
// [{ kind: 'delete', label: 'Eliminar' }, { kind: 'archive', label: 'Archivar' }]
```

Cada botón llama `onRecordAction(kind, index)`. Mantener el tratamiento de borradores como
`discard`, sin mezclarlo con archive. En `ProbetaRecordsTable`, las probetas activas devuelven
siempre eliminar y archivar; las archivadas no se renderizan aquí.

- [ ] **Step 5: Ejecutar pruebas de componentes en verde**

Run: `npm test -- src/components/RecordActionConfirmation.test.jsx src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx`

Expected: PASS; comprobar explícitamente la presencia de ambas acciones de probeta y solo
Archivar para un registro normal referenciado.

## Task 4: Integración en App, formularios y vistas Archivados

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx` (crear si no existe)
- Modify: `src/components/SimpleRecordsTable.jsx`
- Modify: `src/components/ProbetaRecordsTable.jsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes servicios de Task 2 y componentes de Task 3.
- Produce navegación activo/archivado por sección, confirmación de acciones y etiquetas de
  referencias archivadas.

- [ ] **Step 1: Escribir pruebas de integración de los flujos**

Crear `src/App.test.jsx` usando un cliente de servicio simulado a nivel de módulo. Cubrir:

```jsx
// admin ve "Archivados" y abre el listado archivado de la sección
expect(screen.getByRole('button', { name: 'Archivados' })).toBeInTheDocument()

// gestor no ve "Archivados", pero puede confirmar "Archivar"
expect(screen.queryByRole('button', { name: 'Archivados' })).not.toBeInTheDocument()

// cancelar el diálogo no llama archiveRecord; confirmar lo llama una vez y refresca
```

Añadir un formulario con una referencia existente fuera de activos y comprobar una opción
seleccionada `Material X (Archivado)` deshabilitada, junto a opciones activas seleccionables.

- [ ] **Step 2: Ejecutar las pruebas de integración en rojo**

Run: `npm test -- src/App.test.jsx`

Expected: FAIL porque App no tiene estado de vista de archivados, botón ni diálogo de acciones.

- [ ] **Step 3: Añadir el estado de vista y carga contextual**

En App, introducir `recordListMode` con valores `active` y `archived`, reiniciándolo a `active`
al cambiar de sección. Usar `refreshDatabase(recordListMode)` y deshabilitar Crear cuando el modo
sea archivado. Renderizar el botón `Archivados` solo con `permissions.canViewArchived`; en modo
archivado, mostrar un botón `Volver a activos`.

- [ ] **Step 4: Integrar la acción contextual y la confirmación**

Sustituir `handleDelete` por `requestRecordAction(action, index)` y
`confirmRecordAction()`. El primer método calcula el registro, abre el diálogo y no hace I/O. El
segundo usa `runExclusiveOperation` y:

```js
if (action === 'archive') await archiveRecord(selectedTableName, record.id)
if (action === 'restore') await restoreRecord(selectedTableName, record.id)
if (action === 'delete') await deleteExistingRecord(record)
```

Conservar `deleteExistingRecord` con las rutas actuales para probeta, receta y registros simples.
Antes de eliminar, volver a ejecutar `isRecordInUse`; si da verdadero, cerrar la confirmación de
eliminar, abrir la de archivar y notificar de forma segura que el registro ha pasado a estar en
uso.

- [ ] **Step 5: Integrar etiquetas archivadas en formularios**

Al abrir un registro, reunir sus referencias actuales y llamar a
`getArchivedReferenceLabels`. Guardar el resultado en un mapa por
`ownerTable:ownerId:fieldName`. En `renderFieldControlForDraft`, añadir una opción seleccionada y
deshabilitada cuando el valor no exista entre los activos pero tenga etiqueta archivada:

```jsx
<option value={value} disabled>{archivedLabel}</option>
```

Nunca añadir esas etiquetas a las opciones de un formulario nuevo ni al resto de selectores.

- [ ] **Step 6: Ejecutar las pruebas de integración en verde**

Run: `npm test -- src/App.test.jsx src/components/RecordActionConfirmation.test.jsx`

Expected: PASS para admin, gestor, cancelar/confirmar y etiqueta archivada.

## Task 5: Verificación completa y entrega SQL

**Files:**
- Modify: `sql/2026-09-09_add_record_archiving.sql` solo si las pruebas revelan una incompatibilidad real con los contratos de Tasks 2–4.

**Interfaces:**
- Consume implementación completa y el proyecto Supabase remoto.
- Produce una compilación Vite válida y un script SQL listo para aplicar manualmente.

- [ ] **Step 1: Ejecutar toda la suite de pruebas**

Run: `npm test`

Expected: todas las pruebas pasan, incluidas las existentes de borradores, recetas, permisos y
tablas.

- [ ] **Step 2: Generar la compilación de producción**

Run: `npm run build`

Expected: salida exitosa de Vite. Documentar el aviso de tamaño de chunk solo si continúa siendo
el aviso conocido sin errores.

- [ ] **Step 3: Aplicar y verificar la migración de forma manual en Supabase**

Entregar `sql/2026-09-09_add_record_archiving.sql` para ejecutarlo en Supabase SQL Editor. No
afirmar que está aplicado hasta que el usuario comparta el resultado de las consultas de
verificación del script.

- [ ] **Step 4: Verificación manual de permisos**

Con cuentas aprobadas de gestor y admin, verificar: gestor archiva pero no ve Archivados; admin
ve Archivados y restaura; una probeta que mantiene una referencia archivada muestra la etiqueta
y no permite reseleccionarla en una probeta nueva.
