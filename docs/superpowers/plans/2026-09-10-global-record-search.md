# Barra única de búsqueda global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Reemplazar el buscador global actual por una sola barra con grupos de campos y una búsqueda que solo se aplica al pulsar la lupa.

**Architecture:** recordSearch definirá de forma explícita los grupos visibles y seguirá proporcionando funciones puras de filtrado. GlobalRecordSearch controlará exclusivamente el borrador de interacción y emitirá una instantánea al confirmar; App conservará por separado el borrador y la búsqueda aplicada para derivar la tabla visible sin efectos durante la edición.

**Tech Stack:** React 19, JavaScript modules, Vitest, React Testing Library y CSS con las propiedades personalizadas existentes.

**Spec:** docs/superpowers/specs/2026-09-10-global-record-search-design.md

## Global Constraints

- Buscar solo en los registros activos ya cargados; no añadir consultas a Supabase ni migraciones.
- Usar la paleta neutra y verde existente, sin introducir azul para esta interfaz.
- Un borrador no cambia la sección ni los resultados: la única confirmación es el botón con icono de lupa.
- Normalizar texto sin distinguir mayúsculas, acentos ni espacios extremos; combinar texto y condiciones mediante AND.
- Conservar sourceIndex en las filas filtradas para que editar, archivar y eliminar operen sobre el registro original.
- No modificar ni añadir al área .vite/ que pertenece al usuario.

---

### Task 1: Declarar los grupos buscables y los campos derivados

**Files:**
- Modify: src/utils/recordSearch.js
- Modify: src/utils/recordSearch.test.js

**Interfaces:**
- Consumes: getTable() y getReferencedTableName() de src/utils/schema.js, y getFieldLabel() de src/utils/labels.js.
- Produces: getSearchFieldGroups(tableName, fields), que devuelve objetos { id, label, fields } sin grupos vacíos.
- Extends: getSearchFieldOptions(tableName, records) con los valores consolidados de resultados de PROBETA.

- [ ] **Step 1: Escribir las pruebas que fallen para los grupos y dimensiones**

Añadir a src/utils/recordSearch.test.js estos casos; verifican la configuración sin depender del orden de un esquema externo:

~~~js
import { getSearchFieldGroups } from './recordSearch'

test('agrupa los campos de Probeta y excluye los que no existan', () => {
  const fields = [
    { name: 'title', label: 'Titulo', kind: 'text' },
    { name: 'capas', label: 'Capas', kind: 'number' },
    { name: 'largo_mm', label: 'Largo [mm]', kind: 'number' },
    { name: 'ancho_mm', label: 'Ancho [mm]', kind: 'number' },
  ]

  expect(getSearchFieldGroups('PROBETA', fields)).toEqual([
    { id: 'general', label: 'Datos generales', fields: [fields[0]] },
    { id: 'layers', label: 'Capas', fields: [fields[1]] },
    { id: 'results', label: 'Resultados', fields: [fields[2], fields[3]] },
  ])
})

test('clasifica los PDF presentes bajo Documentación', () => {
  const pdf = { name: 'pdf_mds_url', label: 'PDF MDS', kind: 'pdf' }
  expect(getSearchFieldGroups('RESINA_SYSTEM', [pdf])).toEqual([
    { id: 'documentation', label: 'Documentación', fields: [pdf] },
  ])
})
~~~

- [ ] **Step 2: Ejecutar las pruebas focalizadas y confirmar que fallan**

Run: npm test -- src/utils/recordSearch.test.js

Expected: FAIL porque getSearchFieldGroups todavía no está exportada.

- [ ] **Step 3: Implementar la configuración de grupos**

En src/utils/recordSearch.js, exportar SEARCH_FIELD_GROUPS. Usar esta configuración, preservando ids y orden:

~~~js
export const SEARCH_FIELD_GROUPS = {
  PROBETA: [
    { id: 'general', label: 'Datos generales', fieldNames: ['title', 'author', 'reviewed', 'receta_id', 'referencia'] },
    { id: 'layers', label: 'Capas', fieldNames: ['capas', 'materiales'] },
    { id: 'curing', label: 'Curado', fieldNames: ['receta'] },
    { id: 'results', label: 'Resultados', fieldNames: ['largo_mm', 'ancho_mm', 'espesor_mm', 'espesor', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 'has_uncured_thickness', 'espesor_sin_curado', 'uncured_t1', 'uncured_t2', 'uncured_t3', 'uncured_t4', 'uncured_t5', 'uncured_t6', 'uncured_t7', 'uncured_t8', 'weight_g', 'density', 'acabado_alias', 'anotaciones'] },
  ],
  'PRE-IMPREGNADO': [
    { id: 'material', label: 'Material', fieldNames: ['text_id', 'alias', 'type_id', 'fabricante_id', 'espesor_curado', 'espesor_sin_curar'] },
    { id: 'composition', label: 'Composición', fieldNames: ['resina_system_id', 'resina_volume', 'fibra_refuerzo_id', 'fibra_refuerzo2_id'] },
    { id: 'documentation', label: 'Documentación', fieldNames: ['pdf_mds_url', 'pdf_msdt_url', 'fecha_revision_mds', 'fecha_revision_msdt'] },
  ],
  FIBRAS_REFUERZO: [
    { id: 'data', label: 'Datos', fieldNames: ['alias'] },
    { id: 'documentation', label: 'Documentación', fieldNames: ['pdf_mds_url', 'fecha_revision_mds'] },
  ],
  RESINA_SYSTEM: [
    { id: 'data', label: 'Datos', fieldNames: ['alias'] },
    { id: 'documentation', label: 'Documentación', fieldNames: ['pdf_mds_url', 'pdf_msdt_url', 'fecha_revision_mds', 'fecha_revision_msdt'] },
  ],
  RECETAS: [
    { id: 'data', label: 'Datos', fieldNames: ['nombre', 'descripcion'] },
    { id: 'temperature', label: 'Temperatura', fieldNames: ['temperatura_inicial_c', 'temperatura_final_c', 'pico_temperatura_c'] },
    { id: 'steps', label: 'Escalones', fieldNames: ['escalones'] },
  ],
  FABRICANTE: [{ id: 'data', label: 'Datos', fieldNames: ['alias'] }],
  'PRE-IMPREGNADO_TYPE': [{ id: 'data', label: 'Datos', fieldNames: ['alias'] }],
}
~~~

Implementar la función con Map y filtrado de campos inexistentes:

~~~js
export function getSearchFieldGroups(tableName, fields) {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]))
  return (SEARCH_FIELD_GROUPS[tableName] ?? [])
    .map((group) => ({
      id: group.id,
      label: group.label,
      fields: group.fieldNames.map((name) => fieldsByName.get(name)).filter(Boolean),
    }))
    .filter((group) => group.fields.length > 0)
}
~~~

Extender DERIVED_SEARCH_FIELDS.PROBETA con los campos de Resultados que no están en el esquema de PROBETA: dimensiones, espesores y medidas son number; has_uncured_thickness es boolean; receta, materiales, acabado_alias y anotaciones son text. Excluir sourceIndex, isDraft y draftPayload.

- [ ] **Step 4: Ejecutar las pruebas focalizadas y confirmar que pasan**

Run: npm test -- src/utils/recordSearch.test.js

Expected: PASS.

- [ ] **Step 5: Crear el commit de la configuración buscable**

~~~bash
git add src/utils/recordSearch.js src/utils/recordSearch.test.js
git commit -m "feat: group record search fields"
~~~

### Task 2: Exponer todos los resultados de Probeta a la búsqueda

**Files:**
- Modify: src/utils/records.js
- Modify: src/utils/records.test.js

**Interfaces:**
- Consumes: buildProbetaDraftFromRecord(record, database) y las listas RESULTS, RECETAS, ACABADO y PRE-IMPREGNADO.
- Produces: buildProbetaRows(records, database) con las propiedades de Resultados de Task 1, sin mutar los registros almacenados.

- [ ] **Step 1: Escribir una prueba que falle para dimensiones consolidadas**

Importar buildProbetaRows en src/utils/records.test.js y añadir:

~~~js
test('expone las dimensiones y medidas de resultados para buscar una probeta', () => {
  const [row] = buildProbetaRows(
    [{ id: 1, title: 'P-01', results_id: 7, receta_id: '' }],
    {
      RESULTS: [{ id: 7, largo_mm: 250, ancho_mm: 120, espesor_mm: 2.1, t1: 2, weight_g: 82 }],
      RECETAS: [],
      ACABADO: [],
      PROBETA_CAPA: [],
      CAPA: [],
      'PRE-IMPREGNADO': [],
    },
  )

  expect(row).toMatchObject({
    largo_mm: 250,
    ancho_mm: 120,
    espesor_mm: 2.1,
    t1: 2,
    weight_g: 82,
  })
})
~~~

- [ ] **Step 2: Ejecutar la prueba focalizada y confirmar que falla**

Run: npm test -- src/utils/records.test.js

Expected: FAIL porque la fila consolidada no contiene todavía largo_mm, ancho_mm, espesor_mm ni t1.

- [ ] **Step 3: Copiar resultados del borrador consolidado a la fila**

En buildProbetaRows(), después de materiales, añadir largo_mm, ancho_mm, espesor_mm, espesor, t1 a t8, has_uncured_thickness, espesor_sin_curado, uncured_t1 a uncured_t8, weight_g, density, acabado_alias y anotaciones desde draft. Conservar los nombres ya existentes y su valor mostrado actualmente.

- [ ] **Step 4: Ejecutar las pruebas de filas y confirmar que pasan**

Run: npm test -- src/utils/records.test.js

Expected: PASS.

- [ ] **Step 5: Crear el commit de resultados buscables**

~~~bash
git add src/utils/records.js src/utils/records.test.js
git commit -m "feat: expose probeta result search values"
~~~

### Task 3: Convertir la interfaz en una barra integrada con grupos

**Files:**
- Modify: src/components/GlobalRecordSearch.jsx
- Modify: src/components/GlobalRecordSearch.test.jsx
- Modify: src/App.css

**Interfaces:**
- Consumes: getSearchFieldGroups(), getOperatorsForSearchField(), getReferenceOptions(), normalizeSearchText(), getTableLabel() y getFieldLabel().
- Consumes props: { sectionOrder, draftSearch, fields, fieldGroups, database, onDraftChange, onSubmit, onClear }.
- draftSearch tiene forma { tableName, query, filters }.
- Produces: onDraftChange(nextDraft) en cada edición y onSubmit() solo desde la lupa o el equivalente de teclado.

- [ ] **Step 1: Escribir pruebas de interacción que fallen**

Reemplazar los casos de src/components/GlobalRecordSearch.test.jsx por pruebas de la nueva API. Incluir estas dos:

~~~jsx
test('integra Probeta en la misma barra sin confirmar la búsqueda', () => {
  const onDraftChange = vi.fn()
  render(
    <GlobalRecordSearch
      sectionOrder={['PROBETA']}
      draftSearch={{ tableName: null, query: '', filters: [] }}
      fields={[]}
      fieldGroups={[]}
      database={{}}
      onDraftChange={onDraftChange}
      onSubmit={vi.fn()}
      onClear={vi.fn()}
    />,
  )

  const input = screen.getByRole('combobox', { name: 'Tipo de registro' })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: 'probetas' } })
  fireEvent.click(screen.getByRole('option', { name: 'Probeta' }))

  expect(onDraftChange).toHaveBeenCalledWith({ tableName: 'PROBETA', query: '', filters: [] })
})

test('solo confirma el borrador al pulsar la lupa', () => {
  const onSubmit = vi.fn()
  render(
    <GlobalRecordSearch
      sectionOrder={['PROBETA']}
      draftSearch={{ tableName: 'PROBETA', query: 'P-01', filters: [] }}
      fields={[]}
      fieldGroups={[]}
      database={{}}
      onDraftChange={vi.fn()}
      onSubmit={onSubmit}
      onClear={vi.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Buscar registros' }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
})
~~~

Añadir un caso que abra Resultados, elija largo_mm, rellene 250, cree la condición y vea un botón accesible Eliminar filtro: Largo [mm] mayor que 250. Añadir otro que compruebe Escape para cerrar sugerencias y ArrowDown + Enter para escoger el tipo resaltado.

- [ ] **Step 2: Ejecutar la prueba del componente y confirmar que falla**

Run: npm test -- src/components/GlobalRecordSearch.test.jsx

Expected: FAIL porque el componente conserva la API de chips y dos controles, sin botón de lupa.

- [ ] **Step 3: Reescribir el componente con un único contenedor**

Mantener como estado local solo sugerencias, grupo abierto, editor de condición, índice resaltado e id incremental. En reposo usar el combobox con placeholder Buscar registros…. Al seleccionar, llamar a onDraftChange({ tableName, query: '', filters: [] }) y nunca a onSubmit.

Con tipo seleccionado, renderizar dentro de .global-record-search una primera línea compuesta por el segmento de tipo, la entrada de texto y el botón de lupa:

~~~jsx
<div className="global-record-search-bar">
  <button
    type="button"
    className="global-record-search-type"
    aria-label={'Quitar tipo ' + getTableLabel(draftSearch.tableName)}
    onClick={onClear}
  >
    {getTableLabel(draftSearch.tableName)} ×
  </button>
  <input
    aria-label="Buscar en registros"
    type="search"
    value={draftSearch.query}
    onChange={(event) => onDraftChange({ ...draftSearch, query: event.target.value })}
  />
  <button type="button" aria-label="Buscar registros" onClick={onSubmit}>
    <svg viewBox="0 0 24 24" aria-hidden="true">...</svg>
  </button>
</div>
~~~

Tras esa línea, aún dentro del mismo borde, renderizar botones de fieldGroups. El grupo activo abre un select Campo limitado a group.fields, sus operadores y el valor adecuado: select con getReferenceOptions para relaciones; Sí/No para booleanos; date para fechas; number para números; texto para texto; sin valor para PDF. Deshabilitar aplicar si falta campo, operador o valor requerido. Añadir filtros al borrador con id fieldName + '-' + nextFilterId y mostrar chips dentro de la misma barra. Las x de filtros llaman onDraftChange con el filtro eliminado; la x del tipo llama onClear.

Mantener sugerencias solo mientras el combobox tenga foco, comparación sin plural/acento, y controles ArrowDown, ArrowUp, Enter y Escape.

- [ ] **Step 4: Sustituir estilos de panel por estilos de barra única**

En src/App.css reemplazar los selectores actuales del buscador por global-record-search-bar, global-record-search-type, global-record-search-groups, global-record-search-group, global-record-search-chips y global-record-search-filter-editor. Mantener borde, panel, sombra y foco verde rgba(123, 224, 178, 0.34). No usar azul ni el chip separado de tipo. En el media query de 760px permitir que entrada, tipo, lupa, grupos y editor se envuelvan a una columna sin ocultar la lupa.

- [ ] **Step 5: Ejecutar las pruebas del componente y confirmar que pasan**

Run: npm test -- src/components/GlobalRecordSearch.test.jsx

Expected: PASS.

- [ ] **Step 6: Crear el commit de barra integrada**

~~~bash
git add src/components/GlobalRecordSearch.jsx src/components/GlobalRecordSearch.test.jsx src/App.css
git commit -m "feat: unify global record search bar"
~~~

### Task 4: Aplicar instantáneas de búsqueda desde App

**Files:**
- Modify: src/App.jsx
- Modify: src/components/SimpleRecordsTable.test.jsx
- Modify: src/components/ProbetaRecordsTable.test.jsx

**Interfaces:**
- Consumes: GlobalRecordSearch, getSearchFieldOptions, getSearchFieldGroups y filterRecordRows.
- Produces: draftSearch y appliedSearch; este último es null o una copia de { tableName, query, filters }.
- Existing tables reciben sourceIndex y sus callbacks usan record.sourceIndex ?? visibleIndex.

- [ ] **Step 1: Proteger los índices fuente antes de reconectar App**

Conservar o añadir en cada prueba de tabla una fila con sourceIndex: 4 y comprobar que una acción Archivar llama onRecordAction('archive', 4). Usar alias: 'Resultado' en SimpleRecordsTable y title: 'P-09' en ProbetaRecordsTable.

- [ ] **Step 2: Ejecutar las pruebas de índices y confirmar su estado inicial**

Run: npm test -- src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx

Expected: PASS; estas pruebas evitan que las acciones operen sobre el índice visual de una tabla filtrada.

- [ ] **Step 3: Separar borrador y búsqueda aplicada**

En src/App.jsx sustituir searchTableName, searchQuery y searchFilters por:

~~~js
const [draftSearch, setDraftSearch] = useState({ tableName: null, query: '', filters: [] })
const [appliedSearch, setAppliedSearch] = useState(null)
~~~

Extraer un helper local getRowsForTable(tableName) que reproduzca la consolidación actual de PROBETA, RECETAS y tablas simples, añadiendo sourceIndex. Calcular searchFields y searchFieldGroups desde draftSearch.tableName para poder preparar criterios antes de confirmar. Calcular visibleSectionRecords desde la sección normal si appliedSearch es null; si existe, desde appliedSearch.tableName mediante filterRecordRows con los campos de esa instantánea.

Implementar applySearch(): si draftSearch.tableName es nulo no hace nada; si existe, copiar tableName, query y cada filtro, guardar la instantánea, y después seleccionar esa sección con selectTable(tableName, { preserveSearch: true }). El modo preserveSearch mantiene la instantánea; un click normal de la barra lateral restablece borrador e instantánea.

Implementar clearSearch(): restablece el borrador a { tableName: null, query: '', filters: [] }, appliedSearch a null y conserva selectedTableName y su listado normal.

- [ ] **Step 4: Conectar props, lupa y navegación lateral**

Renderizar GlobalRecordSearch con draftSearch, searchFields, searchFieldGroups, database, onDraftChange={setDraftSearch}, onSubmit={applySearch} y onClear={clearSearch}. Mantener SectionSidebar con onSelect={selectTable}. Al confirmar una búsqueda de Recetas, la tabla pasa a Recetas solo entonces. Al elegir una sección lateral, se limpian ambos estados antes de cargar la lista activa. Conservar los callbacks de edición, archivo y eliminación; los registros filtrados deben seguir aportando sourceIndex.

- [ ] **Step 5: Ejecutar la suite relacionada y confirmar que pasa**

Run: npm test -- src/components/GlobalRecordSearch.test.jsx src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx src/utils/recordSearch.test.js src/utils/records.test.js

Expected: PASS.

- [ ] **Step 6: Crear el commit de aplicación explícita**

~~~bash
git add src/App.jsx src/components/SimpleRecordsTable.test.jsx src/components/ProbetaRecordsTable.test.jsx
git commit -m "feat: apply record search on demand"
~~~

### Task 5: Verificar la experiencia completa y preparar la rama

**Files:**
- Modify only if verification reveals a defect in src/App.jsx, src/App.css, src/components/GlobalRecordSearch.jsx, src/utils/recordSearch.js or their tests.

**Interfaces:**
- Consumes: todos los entregables de Tasks 1–4.
- Produces: una rama verificable con barra única y resultados aplicados por lupa.

- [ ] **Step 1: Ejecutar todas las pruebas**

Run: npm test -- --run

Expected: PASS, sin fallos de Vitest.

- [ ] **Step 2: Generar la aplicación de producción**

Run: npm run build

Expected: exit code 0. Anotar cualquier aviso existente de tamaño de bundle sin ampliar el alcance.

- [ ] **Step 3: Comprobar formato de diffs y estado de Git**

Run: git diff --check && git status --short --branch

Expected: sin errores de espacios y sin incluir .vite/ en staging.

- [ ] **Step 4: Comprobación manual en navegador**

Iniciar npm run dev -- --host 127.0.0.1 y comprobar: barra en reposo; foco que muestra tipos; selección de Probeta dentro de la misma barra; apertura de Capas y Resultados; condición Largo [mm] mayor que; que editar no altera la tabla; que la lupa muestra resultados; que una x elimina el filtro solo del borrador hasta pulsar de nuevo la lupa; y que una sección lateral limpia la búsqueda.

- [ ] **Step 5: Crear el commit de cualquier corrección de verificación**

Si la comprobación modifica archivos, añadir únicamente los corregidos y ejecutar:

~~~bash
git add <archivos-corregidos>
git commit -m "fix: refine global record search"
~~~

Si no se modifica ningún archivo, no crear un commit vacío.

- [ ] **Step 6: Publicar la rama de tarea**

Run: git push origin feature/client-requests-2026-09-08-global-record-search

Expected: la rama remota contiene toda la implementación y está lista para abrir una PR hacia feature/client-requests-2026-09-08.
