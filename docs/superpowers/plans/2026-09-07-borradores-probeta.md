# Borradores privados de probetas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir guardar y retomar probetas nuevas como borradores privados, visibles únicamente por su creador y convertibles en probetas definitivas.

**Architecture:** Los borradores viven en `PROBETA_BORRADORES`, una tabla RLS con una instantánea JSONB del formulario completo. El cliente carga los borradores autorizados, los adapta a filas de Probeta y los mezcla solo para la tabla. Al finalizar, reutiliza el guardado definitivo actual y borra la instantánea únicamente después de ese éxito.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, Supabase/PostgREST y PostgreSQL RLS.

**Spec:** `docs/superpowers/specs/2026-09-07-borradores-probeta-design.md`

## Global Constraints

- Los borradores solo existen durante la creación de una Probeta; una Probeta definitiva no vuelve a borrador.
- Una fila de borrador solo puede ser leída, modificada o eliminada por `auth.uid()` igual a su `owner_id`, incluidos los administradores.
- La aplicación nunca aplica SQL: el script se entrega en `sql/` para ejecutarlo manualmente en Supabase.
- No se deben crear filas parciales en `PROBETA`, `RESULTS`, `CAPA` ni tablas de enlace.
- Mantener el sistema actual de mensajes de error seguros y la compuerta contra doble envío.

---

### Task 1: Migración privada de borradores de Probeta

**Files:**
- Create: `sql/2026-09-07_add_probeta_borradores.sql`

**Interfaces:**
- Produces: tabla `public."PROBETA_BORRADORES"` con columnas `id uuid`, `owner_id uuid`, `payload jsonb`, `created_at timestamptz` y `updated_at timestamptz`.
- Produces: políticas `PROBETA_BORRADORES_{select,insert,update,delete}_own` para el rol `authenticated`.

- [ ] **Step 1: Escribir una comprobación SQL manual de la seguridad esperada**

Documentar al principio del script la verificación que se ejecutará después de la migración:

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'PROBETA_BORRADORES'
order by policyname;
```

La comprobación debe mostrar cuatro políticas de propietario y no una política `ALL` permisiva.

- [ ] **Step 2: Ejecutar la consulta de comprobación antes de crear la migración**

Run en el editor SQL de Supabase:

```sql
select to_regclass('public."PROBETA_BORRADORES"') as borradores_table;
```

Expected: `null` en una base aún no migrada; si ya existe, revisar las políticas existentes antes de aplicar el script idempotente.

- [ ] **Step 3: Crear la migración idempotente con RLS de propietario**

```sql
begin;

create table if not exists public."PROBETA_BORRADORES" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."PROBETA_BORRADORES" enable row level security;

drop policy if exists "PROBETA_BORRADORES_select_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_insert_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_update_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_delete_own" on public."PROBETA_BORRADORES";

create policy "PROBETA_BORRADORES_select_own"
on public."PROBETA_BORRADORES" for select to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_insert_own"
on public."PROBETA_BORRADORES" for insert to authenticated
with check (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_update_own"
on public."PROBETA_BORRADORES" for update to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid())
with check (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_delete_own"
on public."PROBETA_BORRADORES" for delete to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid());

commit;
```

- [ ] **Step 4: Verificar la migración y las políticas**

Run en el editor SQL de Supabase:

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'PROBETA_BORRADORES'
order by policyname;
```

Expected: las cuatro políticas `*_own`, sin políticas globales de lectura o escritura.

### Task 2: API de borradores y adaptación a filas de Probeta

**Files:**
- Modify: `src/services/databaseService.js:8-42, 143-161, 210-230`
- Modify: `src/utils/records.js:310-425`
- Test: `src/services/databaseService.test.js`
- Test: `src/utils/records.test.js`

**Interfaces:**
- Produces `saveProbetaDraft(draft, draftId = null): Promise<ProbetaDraftRecord>`.
- Produces `deleteProbetaDraft(draftId): Promise<void>`.
- Produces `buildProbetaDraftRows(draftRecords): ProbetaTableRow[]`, donde cada fila contiene `draftPayload` con la instantánea original.
- Extends `loadDatabaseFromSupabase()` with `database.PROBETA_BORRADORES`, siempre una lista y vacía cuando aún no se haya aplicado la migración.

- [ ] **Step 1: Escribir la prueba que exige crear y actualizar el mismo borrador**

En `databaseService.test.js`, extender el cliente falso para que soporte `PROBETA_BORRADORES`, `update().eq().select().single()` y `delete().eq()`. Añadir una prueba con expectativas observables:

```js
test('actualiza el mismo borrador sin crear duplicados', async () => {
  const supabase = createSupabaseWithDraftStorage()
  supabaseState.client = supabase

  const created = await saveProbetaDraft({ title: 'P-01', capas: [] })
  const updated = await saveProbetaDraft({ title: 'P-01 revisada', capas: [] }, created.id)

  expect(updated.id).toBe(created.id)
  expect(supabase.rows.PROBETA_BORRADORES).toHaveLength(1)
  expect(supabase.rows.PROBETA_BORRADORES[0].payload.title).toBe('P-01 revisada')
})
```

- [ ] **Step 2: Ejecutar la prueba de API para comprobar que falla**

Run:

```bash
npm test -- src/services/databaseService.test.js
```

Expected: FAIL porque `saveProbetaDraft` no está exportada.

- [ ] **Step 3: Escribir la prueba de filas de borrador**

En `records.test.js`, añadir una fila de almacenamiento con un `payload` parcial y comprobar la salida de la tabla:

```js
expect(buildProbetaDraftRows([{
  id: 'draft-1',
  owner_id: 'user-1',
  payload: { title: '', capas: [{ id: 'layer-1' }], density: 1.6 },
}])).toMatchObject([{
  id: 'draft-1',
  draftId: 'draft-1',
  ownerId: 'user-1',
  isDraft: true,
  title: 'Borrador sin título',
  capas: 1,
  density: 1.6,
}])
```

- [ ] **Step 4: Ejecutar la prueba de adaptación para comprobar que falla**

Run:

```bash
npm test -- src/utils/records.test.js
```

Expected: FAIL porque `buildProbetaDraftRows` no existe.

- [ ] **Step 5: Implementar la API de Supabase y la adaptación pura**

En `databaseService.js`:

```js
const TABLE_NAME_CANDIDATES = {
  // entradas actuales
  PROBETA_BORRADORES: ['PROBETA_BORRADORES', 'probeta_borradores'],
}

const OPTIONAL_TABLES = new Set([
  'ESPESORES', 'PROBETA_PRE_IMPREGNADO', 'HORNO', 'PROBETA_BORRADORES',
])

export async function saveProbetaDraft(draft, draftId = null) {
  const payload = { payload: draft, updated_at: new Date().toISOString() }
  return draftId
    ? updateRecord('PROBETA_BORRADORES', { id: draftId, ...payload })
    : insertRecord('PROBETA_BORRADORES', payload)
}

export async function deleteProbetaDraft(draftId) {
  await deleteByIds('PROBETA_BORRADORES', [draftId])
}
```

Actualizar `stripGeneratedId` o crear un inserto UUID específico para que no intente asignar un id numérico a `PROBETA_BORRADORES`; el servidor debe generar su UUID. Mantener el campo `owner_id` fuera del payload para que su valor proceda exclusivamente de la política y el valor por defecto SQL.

En `records.js`, implementar `buildProbetaDraftRows` sin tocar la base de datos: debe leer `record.payload ?? {}`, calcular `capas` a partir de su array y devolver `isDraft`, `draftId`, `ownerId`, `draftPayload`, `title`, `espesor` y `density` de forma tolerante a campos vacíos.

- [ ] **Step 6: Ejecutar las pruebas específicas y toda la suite**

Run:

```bash
npm test -- src/services/databaseService.test.js src/utils/records.test.js
npm test
```

Expected: PASS, sin crear filas duplicadas y con una fila visual de borrador correctamente marcada.

### Task 3: Confirmación de cierre que permite guardar un borrador

**Files:**
- Modify: `src/components/FormModal.jsx:1-106`
- Modify: `src/App.css:1360-1405`
- Test: `src/components/FormModal.test.jsx`

**Interfaces:**
- Extends `FormModal` with `onSaveDraft?: () => Promise<void>` and `submitLabel?: string`.
- `onSaveDraft` is available only if the caller supplies it and `mode === 'create'`.
- Produces an accessible action button named `Guardar borrador` inside the discard confirmation dialog.

- [ ] **Step 1: Escribir la prueba del nuevo diálogo de tres acciones**

En `FormModal.test.jsx` renderizar una creación con `onSaveDraft` y validar que el cierre abre un diálogo con las tres acciones y que guardar no invoca el descarte:

```jsx
fireEvent.click(container.querySelector('.form-overlay'))
expect(screen.getByRole('button', { name: 'Seguir editando' })).toBeTruthy()
expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeTruthy()
expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()

fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1))
expect(onClose).not.toHaveBeenCalled()
```

- [ ] **Step 2: Ejecutar la prueba de diálogo para comprobar que falla**

Run:

```bash
npm test -- src/components/FormModal.test.jsx
```

Expected: FAIL porque el botón `Guardar borrador` no existe.

- [ ] **Step 3: Implementar una única compuerta para guardar y guardar borrador**

Refactorizar el guardado de `FormModal` en una función que reciba una acción asíncrona y controle `isSubmittingRef`:

```jsx
async function runSubmitAction(action) {
  if (isSubmittingRef.current || !action) return
  isSubmittingRef.current = true
  setIsSubmitting(true)
  try {
    await action()
  } finally {
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }
}
```

El botón de borrador debe ejecutar `runSubmitAction(onSaveDraft)`, quedar deshabilitado durante el envío y conservar el diálogo abierto cuando la acción rechace o cuando el padre no cierre el formulario. Mantener `Descartar` con la clase `destructive-button`; usar la clase `primary-button` para guardar borrador y ajustar el contenedor de acciones para que envuelva correctamente en móvil.

- [ ] **Step 4: Ejecutar las pruebas específicas y toda la suite**

Run:

```bash
npm test -- src/components/FormModal.test.jsx
npm test
```

Expected: PASS; el doble envío sigue bloqueado y el nuevo botón queda disponible solo en creaciones que reciben `onSaveDraft`.

### Task 4: Integrar el ciclo de vida de borradores en App

**Files:**
- Modify: `src/App.jsx:20-85, 120-185, 430-875, 1760-1900`
- Test: `src/utils/records.test.js`

**Interfaces:**
- Consumes `buildProbetaDraftRows`, `saveProbetaDraft` y `deleteProbetaDraft`.
- Produces filas combinadas para `ProbetaRecordsTable` y un `activeProbetaDraftId: string | null` en el estado de la aplicación.
- Passes `onSaveDraft={handleSaveProbetaDraft}` only for a new/continued Probeta.

- [ ] **Step 1: Escribir una prueba para la combinación de definitivas y borradores**

En `records.test.js`, construir una probeta definitiva con `buildProbetaRows` y un borrador con `buildProbetaDraftRows`; concatenar ambos como hará `App` y comprobar que el borrador conserva `isDraft: true` y la definitiva no:

```js
expect(rows.map(({ title, isDraft }) => ({ title, isDraft }))).toEqual([
  { title: 'P-02', isDraft: undefined },
  { title: 'P-03 en curso', isDraft: true },
])
```

- [ ] **Step 2: Ejecutar la prueba de combinación para comprobar que falla**

Run:

```bash
npm test -- src/utils/records.test.js
```

Expected: FAIL hasta que las filas definitivas y los borradores compartan el contrato de tabla necesario.

- [ ] **Step 3: Implementar apertura, actualización, finalización y descarte**

En `App.jsx`:

```jsx
const [activeProbetaDraftId, setActiveProbetaDraftId] = useState(null)

const probetaRows = [
  ...buildProbetaRows(database.PROBETA ?? [], database),
  ...buildProbetaDraftRows(database.PROBETA_BORRADORES ?? []),
]
```

Al abrir una fila `isDraft`, restaurar `row.draftPayload`, establecer `activeProbetaDraftId` y conservar `formMode: 'create'`; no usar `selectedRecordIndex` para ella. Al cerrar el formulario, limpiar ambos estados.

Implementar `handleSaveProbetaDraft` bajo `runExclusiveOperation('save-probeta-draft')`: comprobar `permissions.canCreate`, llamar `saveProbetaDraft(draft, activeProbetaDraftId)`, guardar el id devuelto, refrescar, mostrar `Borrador guardado correctamente.` y cerrar sin limpiar archivos adjuntos no aplicables.

En el guardado normal de `PROBETA`, crear la definitiva con `saveProbetaRecord`; después, si existe `activeProbetaDraftId`, llamar `deleteProbetaDraft(activeProbetaDraftId)`. Si falla la creación definitiva, no ejecutar el borrado del borrador. Si el borrado posterior falla, mostrar un error seguro que indique que la probeta se creó pero el borrador debe descartarse manualmente, y no repetir la inserción de la probeta.

En `handleDelete`, distinguir `sectionRecords[index].isDraft`: permitir el descarte al creador sin consultar `permissions.canDelete`, usar la clave `delete-probeta-draft:${draftId}`, llamar `deleteProbetaDraft` y mostrar `Borrador descartado correctamente.`. Las filas definitivas mantienen exactamente sus permisos y llamadas actuales.

- [ ] **Step 4: Ejecutar las pruebas de utilidades y la suite**

Run:

```bash
npm test -- src/utils/records.test.js
npm test
```

Expected: PASS; la adaptación no confunde identificadores UUID de borrador con ids numéricos de Probeta.

### Task 5: Mostrar y operar borradores en la tabla de Probetas

**Files:**
- Modify: `src/components/ProbetaRecordsTable.jsx:1-55`
- Modify: `src/App.css:480-560`
- Test: `src/components/ProbetaRecordsTable.test.jsx`

**Interfaces:**
- Consumes filas con `isDraft: boolean`, `title`, `capas`, `espesor`, `density` y las callbacks existentes.
- Produces una columna `Estado`, etiqueta `Borrador`, acción `Continuar` y acción `Descartar` para filas de borrador.

- [ ] **Step 1: Escribir una prueba visual de una fila de borrador**

En `ProbetaRecordsTable.test.jsx` usar un borrador y comprobar textos y acciones:

```jsx
render(
  <ProbetaRecordsTable
    records={[{ id: 'draft-1', isDraft: true, title: 'Borrador sin título', capas: 1 }]}
    onOpenRecord={onOpenRecord}
    onDelete={onDelete}
    canDelete={false}
  />,
)

expect(screen.getByText('Borrador')).toBeTruthy()
expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy()
expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()
```

- [ ] **Step 2: Ejecutar la prueba de tabla para comprobar que falla**

Run:

```bash
npm test -- src/components/ProbetaRecordsTable.test.jsx
```

Expected: FAIL porque la columna, etiqueta y acciones específicas no existen.

- [ ] **Step 3: Implementar estado y acciones específicas por fila**

Añadir `{ key: 'status', label: 'Estado' }` a las columnas. Para `status`, renderizar:

```jsx
record.isDraft
  ? <span className="status-badge draft">Borrador</span>
  : <span className="status-badge approved">Completada</span>
```

Usar `record.isDraft ? 'Continuar' : primaryActionLabel` para la acción principal. Mostrar el botón de borrado cuando `record.isDraft || canDelete`; para un borrador su etiqueta es `Descartar`, y durante la operación `Descartando...`. Mantener `Eliminar` y su permiso actual para filas definitivas.

En `App.css`, añadir `.status-badge.draft` con la paleta ámbar ya usada para estados pendientes, sin cambiar el estilo de `approved` o `pending` utilizado por usuarios.

- [ ] **Step 4: Ejecutar pruebas de componente y toda la suite**

Run:

```bash
npm test -- src/components/ProbetaRecordsTable.test.jsx
npm test
```

Expected: PASS; un creador ve y puede descartar su borrador, y la prop `canDelete={false}` no habilita borrar una probeta definitiva.

### Task 6: Verificación de extremo a extremo y entrega de migración

**Files:**
- Modify: `docs/superpowers/specs/2026-09-07-borradores-probeta-design.md` solo si la implementación obliga a corregir una decisión aprobada.
- Verify: `sql/2026-09-07_add_probeta_borradores.sql`
- Verify: `src/services/databaseService.js`, `src/utils/records.js`, `src/components/FormModal.jsx`, `src/components/ProbetaRecordsTable.jsx`, `src/App.jsx`

**Interfaces:**
- Verifies the public behavior defined by the spec, with no additional API surface.

- [ ] **Step 1: Revisar la cobertura frente a la especificación**

Comprobar manualmente cada transición: crear y cerrar → guardar borrador → aparece identificado → continuar → cerrar actualiza el mismo UUID → guardar probeta → desaparece el borrador y aparece la definitiva → fallo de guardado definitivo conserva el borrador → otro usuario no recibe la fila por RLS.

- [ ] **Step 2: Ejecutar las pruebas completas**

Run:

```bash
npm test
```

Expected: PASS sin pruebas omitidas ni fallos.

- [ ] **Step 3: Compilar el cliente de producción**

Run:

```bash
npm run build
```

Expected: exit code 0. Documentar cualquier advertencia existente de tamaño de bundle sin ocultarla.

- [ ] **Step 4: Entregar el script de Supabase y el cambio de interfaz**

Indicar al usuario que ejecute `sql/2026-09-07_add_probeta_borradores.sql` en el editor SQL de Supabase antes de usar la función, y resumir los resultados de `npm test` y `npm run build`.
