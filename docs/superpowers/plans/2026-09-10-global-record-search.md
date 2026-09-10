# Global Record Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users choose one record type by writing its name, then narrow its active records with text and column filters.

**Architecture:** A pure `recordSearch` utility builds searchable field metadata, resolves displayed relationship values, and applies filters to already loaded rows. `GlobalRecordSearch` owns the search-bar interaction, while `App` owns the selected section and controlled filter state, passing filtered rows to the existing tables.

**Tech Stack:** React 19, JavaScript modules, Vitest, React Testing Library, existing CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-09-10-global-record-search-design.md`

## Global Constraints

- Offer only the entries in `SECTION_ORDER`; exactly one type may be selected.
- Start with no type selected; selecting the sidebar is equivalent to selecting a type in the search bar.
- Search locally in active, already loaded records; add no Supabase query or database migration.
- Compare text without case or accent differences and combine all applied conditions with AND.
- Preserve current row actions after filtering by retaining each row's source index.
- Do not stage or alter the user-owned `.vite/` directory.

---

### Task 1: Create the pure search domain and its tests

**Files:**
- Create: `src/utils/recordSearch.js`
- Create: `src/utils/recordSearch.test.js`

**Interfaces:**
- Consumes: `getTable()` and `getReferencedTableName()` from `src/utils/schema.js`, `getRecordLabel()` from `src/utils/records.js`.
- Produces: `normalizeSearchText(value)`, `getSearchFieldOptions(tableName, records)`, `getOperatorsForSearchField(field)`, `getReferenceOptions(field, database)`, `filterRecordRows({ records, fields, database, query, filters })`.
- Filter shape: `{ id: string, fieldName: string, operator: 'contains' | 'equals' | 'greaterThan' | 'lessThan' | 'hasValue' | 'hasNoValue', value: string | boolean | number }`.

- [ ] **Step 1: Write failing utility tests**

Create `src/utils/recordSearch.test.js` with representative records and assert text normalization, relationship matching, typed comparisons, PDF presence, AND semantics, and calculated row fields:

```js
import { describe, expect, test } from 'vitest'
import {
  filterRecordRows,
  getOperatorsForSearchField,
  getReferenceOptions,
  getSearchFieldOptions,
  normalizeSearchText,
} from './recordSearch'

const database = {
  RECETAS: [{ id: 11, nombre: 'Ciclo Époxi' }],
  'PRE-IMPREGNADO': [],
}

const rows = [
  { id: 1, title: 'Probeta Álamo', receta_id: 11, density: 1.58, pdf_mds_url: 'file-1' },
  { id: 2, title: 'Probeta control', receta_id: '', density: 1.72, pdf_mds_url: '' },
]

describe('recordSearch', () => {
  test('normaliza mayúsculas y acentos', () => {
    expect(normalizeSearchText(' ÁLAMO ')).toBe('alamo')
  })

  test('busca texto y nombres de relaciones visibles', () => {
    const fields = getSearchFieldOptions('PROBETA', rows)
    expect(filterRecordRows({ records: rows, fields, database, query: 'epoxi', filters: [] })).toEqual([rows[0]])
  })

  test('combina filtros numéricos y de PDF con Y', () => {
    const fields = getSearchFieldOptions('PROBETA', rows)
    expect(
      filterRecordRows({
        records: rows,
        fields,
        database,
        query: '',
        filters: [
          { id: 'density', fieldName: 'density', operator: 'greaterThan', value: '1.6' },
          { id: 'pdf', fieldName: 'pdf_mds_url', operator: 'hasNoValue', value: '' },
        ],
      }),
    ).toEqual([rows[1]])
  })

  test('expone operadores y opciones para relaciones', () => {
    const fields = getSearchFieldOptions('PROBETA', rows)
    const recipe = fields.find((field) => field.name === 'receta_id')
    expect(getOperatorsForSearchField(recipe).map((operator) => operator.value)).toEqual(['equals'])
    expect(getReferenceOptions(recipe, database)).toEqual([{ value: '11', label: 'Ciclo Époxi' }])
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/utils/recordSearch.test.js`

Expected: FAIL because `./recordSearch` does not exist.

- [ ] **Step 3: Implement field discovery and filtering**

Create `src/utils/recordSearch.js` with these rules:

```js
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
}

export function filterRecordRows({ records, fields, database, query, filters }) {
  const normalizedQuery = normalizeSearchText(query)
  return records.filter((record) => {
    const matchesQuery = !normalizedQuery || fields.some((field) =>
      normalizeSearchText(getSearchDisplayValue(record, field, database)).includes(normalizedQuery),
    )
    return matchesQuery && filters.every((filter) => matchesSearchFilter(record, filter, fields, database))
  })
}
```

Build `getSearchFieldOptions()` from `getTable(tableName).fields`, excluding only internal keys (`id`, `created_at`, `updated_at`, `archived_at`, `archived_by`). Add only these row keys not present in the schema, with the declared kind, so consolidated lists remain fully searchable without exposing implementation metadata:

```js
const DERIVED_SEARCH_FIELDS = {
  PROBETA: {
    receta: 'text',
    capas: 'number',
    materiales: 'text',
    espesor: 'number',
    weight_g: 'number',
    density: 'number',
    acabado_alias: 'text',
    anotaciones: 'text',
    status: 'text',
  },
  RECETAS: {
    pico_temperatura_c: 'number',
    escalones: 'number',
  },
}
```

Infer `pdf`, `reference`, `boolean`, `number`, `date`, and `text` kinds from schema metadata and field names; a schema field named `fecha_revision_*` is `date`, and any `pdf_*_url` field is `pdf`. Resolve a reference's comparable value to its label with `getRecordLabel()`, and use the raw id only for the `equals` comparison. Treat `null`, `undefined`, and blank strings as absent. Return no match instead of throwing for a missing referenced record or invalid numeric/date value.

- [ ] **Step 4: Run the focused utility test to verify it passes**

Run: `npm test -- src/utils/recordSearch.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the search domain**

```bash
git add src/utils/recordSearch.js src/utils/recordSearch.test.js
git commit -m "feat: add record search filters"
```

### Task 2: Build the controlled global search bar

**Files:**
- Create: `src/components/GlobalRecordSearch.jsx`
- Create: `src/components/GlobalRecordSearch.test.jsx`
- Modify: `src/App.css` near `.workspace` and responsive rules

**Interfaces:**
- Consumes: `SECTION_ORDER`, `getTableLabel()`, `getFieldLabel()`, and the Task 1 field/operator/reference helpers.
- Produces: `GlobalRecordSearch` with controlled props `{ sectionOrder, selectedTableName, fields, database, query, filters, onSelectTable, onClearTable, onQueryChange, onAddFilter, onRemoveFilter }`.
- `onAddFilter` receives a complete filter shape from Task 1. `onSelectTable(tableName)` is called by either a type suggestion or the parent-controlled sidebar selection.

- [ ] **Step 1: Write failing interaction tests**

Create `src/components/GlobalRecordSearch.test.jsx` with a controlled harness and cover the type autocomplete, chip removal, a reference filter, and accessibility labels:

```jsx
test('permite escribir y seleccionar Probetas como único tipo', () => {
  const onSelectTable = vi.fn()
  render(<GlobalRecordSearch sectionOrder={['PROBETA', 'RECETAS']} selectedTableName={null} fields={[]} database={{}} query="" filters={[]} onSelectTable={onSelectTable} onClearTable={vi.fn()} onQueryChange={vi.fn()} onAddFilter={vi.fn()} onRemoveFilter={vi.fn()} />)

  fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de registro' }), { target: { value: 'probet' } })
  fireEvent.click(screen.getByRole('option', { name: 'Probeta' }))
  expect(onSelectTable).toHaveBeenCalledWith('PROBETA')
})

test('muestra un botón accesible para retirar un filtro aplicado', () => {
  render(<GlobalRecordSearch selectedTableName="PROBETA" sectionOrder={['PROBETA']} fields={[{ name: 'title', label: 'Titulo', kind: 'text' }]} database={{}} query="" filters={[{ id: 'title', fieldName: 'title', operator: 'contains', value: 'A-01' }]} onSelectTable={vi.fn()} onClearTable={vi.fn()} onQueryChange={vi.fn()} onAddFilter={vi.fn()} onRemoveFilter={vi.fn()} />)

  expect(screen.getByRole('button', { name: /Eliminar filtro.*Titulo/i })).toBeTruthy()
})
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- src/components/GlobalRecordSearch.test.jsx`

Expected: FAIL because `./GlobalRecordSearch` does not exist.

- [ ] **Step 3: Implement the accessible search UI**

Create the component with two explicit states:

```jsx
{selectedTableName ? (
  <>
    <button type="button" aria-label={`Eliminar tipo ${getTableLabel(selectedTableName)}`} onClick={onClearTable}>
      {getTableLabel(selectedTableName)} ×
    </button>
    <input aria-label="Buscar en registros" value={query} onChange={(event) => onQueryChange(event.target.value)} />
    <button type="button" onClick={() => setIsFilterEditorOpen(true)}>Añadir filtro</button>
  </>
) : (
  <input role="combobox" aria-label="Tipo de registro" /* show matching SECTION_ORDER options */ />
)}
```

Keep the in-progress filter editor local to the component. It must choose a field first, then show only the operators returned by `getOperatorsForSearchField()`. For reference fields, offer `getReferenceOptions()` labels; for boolean fields, `Sí` and `No`; for PDF fields, no value control. Disable the apply button until a value is supplied when that operator requires one. Render applied filters as chips and give each removal button the form `aria-label="Eliminar filtro: <descripción>"`. Support ArrowDown/ArrowUp and Enter for type suggestions, and Escape to close either suggestion/editor surface.

Add scoped `.global-record-search*` CSS above `.workspace`: a panel layout with wrapping chips, a compact filter editor, visible focus states, and a one-column mobile layout without changing existing table styles.

- [ ] **Step 4: Run the focused component test to verify it passes**

Run: `npm test -- src/components/GlobalRecordSearch.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit the search bar**

```bash
git add src/components/GlobalRecordSearch.jsx src/components/GlobalRecordSearch.test.jsx src/App.css
git commit -m "feat: add global record search bar"
```

### Task 3: Connect search state, filtered rows, and safe row actions

**Files:**
- Modify: `src/App.jsx: imports, workspace state, derived records, selectTable(), resetWorkspaceState(), main render`
- Modify: `src/components/SimpleRecordsTable.jsx: record callback index handling`
- Modify: `src/components/ProbetaRecordsTable.jsx: record callback index handling`
- Modify: `src/components/SimpleRecordsTable.test.jsx`
- Modify: `src/components/ProbetaRecordsTable.test.jsx`

**Interfaces:**
- Consumes: `GlobalRecordSearch` from Task 2 and `filterRecordRows()`/`getSearchFieldOptions()` from Task 1.
- Produces: `visibleSectionRecords`, whose rows retain `sourceIndex`, and a selected type shared by the sidebar and global search chip.
- Tables consume `record.sourceIndex ?? index` for all callbacks and pending checks, preserving the parent API of numeric source indexes.

- [ ] **Step 1: Write failing regression tests for filtered action indexes**

Add one test to each table test file proving it passes `sourceIndex`, not the index in the filtered list:

```jsx
test('uses the original source index for an action on a filtered row', () => {
  const onRecordAction = vi.fn()
  render(<SimpleRecordsTable fields={[{ name: 'alias', type: 'text' }]} records={[{ id: 9, alias: 'Resultado', sourceIndex: 4 }]} database={{}} selectedTableName="ACABADO" onOpenRecord={vi.fn()} onDelete={vi.fn()} onRecordAction={onRecordAction} getRecordActions={() => [{ kind: 'archive', label: 'Archivar' }]} />)

  fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
  expect(onRecordAction).toHaveBeenCalledWith('archive', 4)
})
```

Use the same assertion in `ProbetaRecordsTable.test.jsx` for a row with `sourceIndex: 4`.

- [ ] **Step 2: Run the two regression tests to verify they fail**

Run: `npm test -- src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx`

Expected: FAIL because both components still use the filtered array index `0`.

- [ ] **Step 3: Wire the feature into App and preserve original indexes**

In `App.jsx`:

1. Set `selectedTableName` to `null` initially and in `resetWorkspaceState()`. Continue using `SECTION_ORDER[0]` only as the inert initial draft source.
2. Add controlled `searchQuery` and `searchFilters` state. `selectTable(tableName)` clears query/filters and keeps its current reset and refresh behavior. Add `clearSearchTable()` to set the selected table to `null`, clear both filters, close forms, and restore the inactive workspace.
3. Derive `sectionRecordsWithSourceIndexes` by mapping every current `sectionRecords` row to `{ ...record, sourceIndex }`. Derive `searchFields` with `getSearchFieldOptions(selectedTableName, sectionRecordsWithSourceIndexes)`. Derive `visibleSectionRecords` with `filterRecordRows()` only while a table is selected; otherwise use an empty list.
4. Render `GlobalRecordSearch` between `AppHeader` and `<main>`, passing the controlled callbacks. Keep `SectionSidebar` bound to `selectedTableName`, so a sidebar click also selects the global type chip.
5. Pass `visibleSectionRecords` and its length to both existing record tables and `SectionTable`. When no type is selected, show the title `Búsqueda de registros`, disable creation, and show `Escribe o selecciona un tipo de registro para empezar.` rather than the generic empty-table copy.
6. Ensure every create/open/action handler is unreachable while no type is selected. Existing form behavior resumes unchanged once a type is selected.

In each table component, compute `const sourceIndex = record.sourceIndex ?? index` in the row map. Use `sourceIndex` for `onOpenRecord`, `onRecordAction`, `onDelete`, `isDeletePending`, `isActionPending`, and `getRecordActions`; keep the DOM key stable using record id plus source index.

- [ ] **Step 4: Run regression and feature tests to verify they pass**

Run: `npm test -- src/utils/recordSearch.test.js src/components/GlobalRecordSearch.test.jsx src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx`

Expected: PASS.

- [ ] **Step 5: Run the full verification suite and production build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite completes the production build. Treat the existing chunk-size warning as non-blocking only if it is the sole build warning.

- [ ] **Step 6: Commit the integration**

```bash
git add src/App.jsx src/components/SimpleRecordsTable.jsx src/components/ProbetaRecordsTable.jsx src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx
git commit -m "feat: filter records from global search"
```

### Task 4: Publish the small branch for review

**Files:**
- Modify: none beyond the Task 1–3 implementation files.

**Interfaces:**
- Consumes: the verified commits from Tasks 1–3.
- Produces: a remote task branch ready for the PR `feature/client-requests-2026-09-08-global-record-search → feature/client-requests-2026-09-08`.

- [ ] **Step 1: Inspect the final change set**

Run: `git status --short && git log --oneline origin/feature/client-requests-2026-09-08..HEAD && git diff --check origin/feature/client-requests-2026-09-08...HEAD`

Expected: only intentional tracked feature files appear; `.vite/` is untracked and excluded.

- [ ] **Step 2: Push the task branch**

Run:

```bash
git push -u origin feature/client-requests-2026-09-08-global-record-search
```

Expected: the remote branch is updated with the documented design, plan, feature code, and tests.

- [ ] **Step 3: Prepare the correct PR direction**

Open or provide the GitHub compare URL with this exact direction:

```text
feature/client-requests-2026-09-08-global-record-search
  → feature/client-requests-2026-09-08
```

Do not merge it automatically. The integration branch remains the only branch that will later target `develop`.
