import { getFieldLabel } from './labels'
import { getRecordLabel } from './records'
import { getReferencedTableName, getTable } from './schema'

const INTERNAL_FIELD_NAMES = new Set(['id', 'created_at', 'updated_at', 'archived_at', 'archived_by'])

const DERIVED_SEARCH_FIELDS = {
  PROBETA: {
    receta: 'text',
    capas: 'number',
    materiales: 'text',
    largo_mm: 'number',
    ancho_mm: 'number',
    espesor_mm: 'number',
    espesor: 'number',
    t1: 'number',
    t2: 'number',
    t3: 'number',
    t4: 'number',
    t5: 'number',
    t6: 'number',
    t7: 'number',
    t8: 'number',
    has_uncured_thickness: 'boolean',
    espesor_sin_curado: 'number',
    uncured_t1: 'number',
    uncured_t2: 'number',
    uncured_t3: 'number',
    uncured_t4: 'number',
    uncured_t5: 'number',
    uncured_t6: 'number',
    uncured_t7: 'number',
    uncured_t8: 'number',
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

export const SEARCH_FIELD_GROUPS = {
  PROBETA: [
    {
      id: 'general',
      label: 'Datos generales',
      fieldNames: ['title', 'author', 'reviewed', 'receta_id', 'referencia'],
    },
    { id: 'layers', label: 'Capas', fieldNames: ['capas', 'materiales'] },
    { id: 'curing', label: 'Curado', fieldNames: ['receta'] },
    {
      id: 'results',
      label: 'Resultados',
      fieldNames: [
        'largo_mm',
        'ancho_mm',
        'espesor_mm',
        'espesor',
        't1',
        't2',
        't3',
        't4',
        't5',
        't6',
        't7',
        't8',
        'has_uncured_thickness',
        'espesor_sin_curado',
        'uncured_t1',
        'uncured_t2',
        'uncured_t3',
        'uncured_t4',
        'uncured_t5',
        'uncured_t6',
        'uncured_t7',
        'uncured_t8',
        'weight_g',
        'density',
        'acabado_alias',
        'anotaciones',
      ],
    },
  ],
  'PRE-IMPREGNADO': [
    {
      id: 'material',
      label: 'Material',
      fieldNames: ['text_id', 'alias', 'type_id', 'fabricante_id', 'espesor_curado', 'espesor_sin_curar'],
    },
    {
      id: 'composition',
      label: 'Composición',
      fieldNames: ['resina_system_id', 'resina_volume', 'fibra_refuerzo_id', 'fibra_refuerzo2_id'],
    },
    {
      id: 'documentation',
      label: 'Documentación',
      fieldNames: ['pdf_mds_url', 'pdf_msdt_url', 'fecha_revision_mds', 'fecha_revision_msdt'],
    },
  ],
  FIBRAS_REFUERZO: [
    { id: 'data', label: 'Datos', fieldNames: ['alias'] },
    { id: 'documentation', label: 'Documentación', fieldNames: ['pdf_mds_url', 'fecha_revision_mds'] },
  ],
  RESINA_SYSTEM: [
    { id: 'data', label: 'Datos', fieldNames: ['alias'] },
    {
      id: 'documentation',
      label: 'Documentación',
      fieldNames: ['pdf_mds_url', 'pdf_msdt_url', 'fecha_revision_mds', 'fecha_revision_msdt'],
    },
  ],
  RECETAS: [
    { id: 'data', label: 'Datos', fieldNames: ['nombre', 'descripcion'] },
    {
      id: 'temperature',
      label: 'Temperatura',
      fieldNames: ['temperatura_inicial_c', 'temperatura_final_c', 'pico_temperatura_c'],
    },
    { id: 'steps', label: 'Escalones', fieldNames: ['escalones'] },
  ],
  FABRICANTE: [{ id: 'data', label: 'Datos', fieldNames: ['alias'] }],
  'PRE-IMPREGNADO_TYPE': [{ id: 'data', label: 'Datos', fieldNames: ['alias'] }],
}

const OPERATORS_BY_KIND = {
  text: [{ value: 'contains', label: 'contiene' }],
  reference: [{ value: 'equals', label: 'es' }],
  boolean: [{ value: 'equals', label: 'es' }],
  number: [
    { value: 'equals', label: 'es' },
    { value: 'greaterThan', label: 'mayor que' },
    { value: 'lessThan', label: 'menor que' },
  ],
  date: [
    { value: 'equals', label: 'es' },
    { value: 'greaterThan', label: 'posterior a' },
    { value: 'lessThan', label: 'anterior a' },
  ],
  pdf: [
    { value: 'hasValue', label: 'tiene' },
    { value: 'hasNoValue', label: 'no tiene' },
  ],
}

function isNumericType(type) {
  return /^(int|float|numeric|decimal)/.test(type ?? '')
}

function getSearchFieldKind(field) {
  if (/^pdf_.*_url$/.test(field.name)) {
    return 'pdf'
  }

  if (getReferencedTableName(field)) {
    return 'reference'
  }

  if (field.type === 'bool') {
    return 'boolean'
  }

  if (field.type === 'date' || field.name.startsWith('fecha_revision_')) {
    return 'date'
  }

  if (isNumericType(field.type)) {
    return 'number'
  }

  return 'text'
}

function createSearchField(field) {
  return {
    ...field,
    label: getFieldLabel(field.name),
    kind: getSearchFieldKind(field),
  }
}

function isAbsent(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function getSearchDisplayValue(record, field, database) {
  const value = record?.[field.name]

  if (isAbsent(value)) {
    return ''
  }

  const referencedTableName = getReferencedTableName(field)
  if (referencedTableName) {
    const referencedRecord = (database[referencedTableName] ?? []).find(
      (item) => String(item.id) === String(value),
    )

    return referencedRecord ? getRecordLabel(referencedRecord) : ''
  }

  if (field.kind === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  return String(value)
}

function getSearchField(fields, fieldName) {
  return fields.find((field) => field.name === fieldName)
}

function compareEquals(value, filterValue, field) {
  if (field.kind === 'number') {
    return Number(value) === Number(filterValue)
  }

  if (field.kind === 'boolean') {
    return Boolean(value) === (filterValue === true || filterValue === 'true')
  }

  if (field.kind === 'date' || field.kind === 'reference') {
    return String(value) === String(filterValue)
  }

  return normalizeSearchText(value) === normalizeSearchText(filterValue)
}

function matchesSearchFilter(record, filter, fields, database) {
  const field = getSearchField(fields, filter.fieldName)
  if (!field) {
    return false
  }

  const value = record?.[field.name]

  if (filter.operator === 'hasValue') {
    return !isAbsent(value)
  }

  if (filter.operator === 'hasNoValue') {
    return isAbsent(value)
  }

  if (isAbsent(value) || isAbsent(filter.value)) {
    return false
  }

  if (filter.operator === 'contains') {
    return normalizeSearchText(getSearchDisplayValue(record, field, database)).includes(
      normalizeSearchText(filter.value),
    )
  }

  if (filter.operator === 'equals') {
    return compareEquals(value, filter.value, field)
  }

  if (filter.operator === 'greaterThan' || filter.operator === 'lessThan') {
    const comparedValue = field.kind === 'date' ? String(value) : Number(value)
    const comparedFilterValue = field.kind === 'date' ? String(filter.value) : Number(filter.value)

    if (
      (field.kind !== 'date' && !Number.isFinite(comparedValue)) ||
      (field.kind !== 'date' && !Number.isFinite(comparedFilterValue))
    ) {
      return false
    }

    return filter.operator === 'greaterThan'
      ? comparedValue > comparedFilterValue
      : comparedValue < comparedFilterValue
  }

  return false
}

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
}

export function getSearchFieldOptions(tableName, records = []) {
  const schemaFields = (getTable(tableName)?.fields ?? [])
    .filter((field) => !INTERNAL_FIELD_NAMES.has(field.name))
    .map(createSearchField)
  const derivedFields = Object.entries(DERIVED_SEARCH_FIELDS[tableName] ?? {})
    .filter(([name]) => records.some((record) => Object.hasOwn(record, name)))
    .map(([name, kind]) => ({ name, type: kind, label: getFieldLabel(name), kind }))

  return [...schemaFields, ...derivedFields]
}

export function getSearchFieldGroups(tableName, fields) {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]))

  return (SEARCH_FIELD_GROUPS[tableName] ?? [])
    .map((group) => ({
      id: group.id,
      label: group.label,
      fields: group.fieldNames.map((fieldName) => fieldsByName.get(fieldName)).filter(Boolean),
    }))
    .filter((group) => group.fields.length > 0)
}

export function getOperatorsForSearchField(field) {
  return OPERATORS_BY_KIND[field?.kind] ?? []
}

export function getReferenceOptions(field, database) {
  const referencedTableName = getReferencedTableName(field)
  if (!referencedTableName) {
    return []
  }

  return (database[referencedTableName] ?? [])
    .filter((record) => !isAbsent(record.id))
    .map((record) => ({ value: String(record.id), label: getRecordLabel(record) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'es'))
}

export function filterRecordRows({ records, fields, database, query, filters }) {
  const normalizedQuery = normalizeSearchText(query)

  return records.filter((record) => {
    const matchesQuery =
      !normalizedQuery ||
      fields.some((field) =>
        normalizeSearchText(getSearchDisplayValue(record, field, database)).includes(normalizedQuery),
      )

    return matchesQuery && filters.every((filter) => matchesSearchFilter(record, filter, fields, database))
  })
}
