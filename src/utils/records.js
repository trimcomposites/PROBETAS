import { getReferencedTableName } from './schema'
import { generateUuid } from './cryptoPolyfills'
import { deriveRecipeSteps } from './recipeSteps'

export const CURED_THICKNESS_FIELDS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
export const UNCURED_THICKNESS_FIELDS = [
  'uncured_t1',
  'uncured_t2',
  'uncured_t3',
  'uncured_t4',
  'uncured_t5',
  'uncured_t6',
  'uncured_t7',
  'uncured_t8',
]

export function createEmptyLayer() {
  return {
    id: generateUuid(),
    direccion_id: '',
    pre_impregnado_id: '',
  }
}

export function createEmptyRecipeStep(stepNumber = 1) {
  return {
    id: generateUuid(),
    escalon: stepNumber,
    temperatura_c: '',
    temp_grados_por_min: '',
    temp_tiempo_min: '',
    temp_control_mode: 'time',
    temp_final_c: '',
    temp_dwell: false,
    presion_bar: '',
    pres_bar_por_min: '',
    pres_tiempo_min: '',
    pres_control_mode: 'time',
    pres_final_bar: '',
    pres_dwell: false,
    vacio_mbar: '',
    vacio_mbar_por_min: '',
    vacio_tiempo_min: '',
    vacio_control_mode: 'time',
    vacio_final_mbar: '',
    vacio_dwell: false,
  }
}

export function createBaseRecord(table) {
  return Object.fromEntries(
    table.fields.map((field) => {
      if (field.primaryKey && field.type === 'uuid') {
        return [field.name, generateUuid()]
      }

      if (field.name === 'created_at') {
        return [field.name, new Date().toISOString()]
      }

      if (field.type === 'bool') {
        return [field.name, false]
      }

      if (field.primaryKey) {
        return [field.name, '']
      }

      return [field.name, '']
    }),
  )
}

export function createEmptyDraft(tableName, table) {
  if (tableName === 'RECETAS') {
    return {
      ...createBaseRecord(table),
      escalones: [createEmptyRecipeStep(1)],
    }
  }

  if (tableName !== 'PROBETA') {
    return createBaseRecord(table)
  }

  return {
    ...createBaseRecord(table),
    receta_id: '',
    capas: [createEmptyLayer()],
    largo_mm: 10000,
    ancho_mm: 10000,
    espesor_mm: '',
    espesor: '',
    ...Object.fromEntries(CURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, ''])),
    has_uncured_thickness: false,
    espesor_sin_curado: '',
    ...Object.fromEntries(UNCURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, ''])),
    weight_g: '',
    density: '',
    acabado_id: '',
    has_acabado_cara_b: false,
    acabado_cara_b_id: '',
    anotaciones: '',
  }
}

export function parseFieldValue(field, value) {
  if (field.type === 'bool') {
    return Boolean(value)
  }

  if (value === '') {
    return ''
  }

  if (field.type.startsWith('float') || field.type.startsWith('int')) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }

  return value
}

export function getInputType(field) {
  if (field.type.startsWith('float') || field.type.startsWith('int')) {
    return 'number'
  }

  if (field.name.includes('pdf') || field.name.endsWith('_url')) {
    return 'url'
  }

  return 'text'
}

export function getRecordLabel(record, index = 0) {
  if (record.title) {
    return record.title
  }

  if (record.text_id) {
    return String(record.text_id)
  }

  const candidates = [record.nombre, record.alias, record.text_id, record.author, record.id].filter(Boolean)

  return candidates[0] ?? `Registro ${index + 1}`
}

export function formatCellValue(field, value, database) {
  if (value === '' || value === null || value === undefined) {
    return 'Sin dato'
  }

  if (field.type === 'bool') {
    return value ? 'Si' : 'No'
  }

  const referencedTableName = getReferencedTableName(field)
  if (referencedTableName) {
    const referencedRecord = (database[referencedTableName] ?? []).find(
      (record) => String(record.id) === String(value),
    )

    return referencedRecord ? getRecordLabel(referencedRecord) : 'Sin asignar'
  }

  if (typeof value === 'string' && value.length > 48) {
    return `${value.slice(0, 45)}...`
  }

  return String(value)
}

export function getAverageThicknessFromMeasurements(record, fieldNames) {
  const values = fieldNames
    .map((fieldName) => {
      const rawValue = record?.[fieldName]

      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        return null
      }

      return Number(rawValue)
    })
    .filter((value) => Number.isFinite(value))

  if (!values.length) {
    return ''
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Number(average.toFixed(3))
}

export function hasSingleMaterialAcrossLayers(record) {
  const layers = Array.isArray(record?.capas) ? record.capas : []

  if (!layers.length) {
    return false
  }

  const materialIds = layers
    .map((layer) => String(layer?.pre_impregnado_id ?? '').trim())
    .filter(Boolean)

  if (!materialIds.length) {
    return false
  }

  return new Set(materialIds).size === 1
}

export function getCalculatedThicknessFromMeasurements(record, fieldNames) {
  const baseThickness = getAverageThicknessFromMeasurements(record, fieldNames)

  if (baseThickness === '') {
    return ''
  }

  if (!hasSingleMaterialAcrossLayers(record)) {
    return baseThickness
  }

  const layerCount = record.capas.filter((layer) =>
    String(layer?.pre_impregnado_id ?? '').trim() !== '',
  ).length

  if (!Number.isFinite(layerCount) || layerCount <= 0) {
    return baseThickness
  }

  return Number((baseThickness / layerCount).toFixed(3))
}

export function getCalculatedDensity(record) {
  const weight = record?.weight_g
  const largo = record?.largo_mm
  const ancho = record?.ancho_mm
  const hasGeometricThickness = !(
    record?.espesor_mm === '' ||
    record?.espesor_mm === null ||
    record?.espesor_mm === undefined
  )
  const espesor = hasGeometricThickness
    ? record.espesor_mm
    : getCalculatedThicknessFromMeasurements(
        record,
        record?.has_uncured_thickness ? CURED_THICKNESS_FIELDS : UNCURED_THICKNESS_FIELDS,
      )

  if (
    weight === '' || weight === null || weight === undefined ||
    largo === '' || largo === null || largo === undefined ||
    ancho === '' || ancho === null || ancho === undefined ||
    espesor === '' || espesor === null || espesor === undefined
  ) {
    return ''
  }

  const weightValue = Number(weight)
  const largoValue = Number(largo)
  const anchoValue = Number(ancho)
  const espesorValue = Number(espesor)

  if (
    !Number.isFinite(weightValue) ||
    !Number.isFinite(largoValue) ||
    !Number.isFinite(anchoValue) ||
    !Number.isFinite(espesorValue) ||
    largoValue <= 0 ||
    anchoValue <= 0 ||
    espesorValue <= 0
  ) {
    return ''
  }

  return Number((weightValue / (largoValue * anchoValue * espesorValue)).toFixed(6))
}

export function formatDensityValue(value, unit = 'g/cm3') {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const densityValue = Number(value)

  if (!Number.isFinite(densityValue)) {
    return ''
  }

  const densityInGramsPerCm3 = densityValue * 1000

  if (unit === 'kg/l') {
    return Number(densityInGramsPerCm3.toFixed(3))
  }

  return Number(densityInGramsPerCm3.toFixed(3))
}

export function buildProbetaDraftFromRecord(record, database) {
  const result = (database.RESULTS ?? []).find(
    (item) => String(item.id) === String(record.results_id),
  )
  const acabadoCaraA = result
    ? (database.ACABADO ?? []).find((item) => String(item.id) === String(result.acabado_id))
    : null
  const acabadoCaraB = result
    ? (database.ACABADO ?? []).find((item) => String(item.id) === String(result.acabado_cara_b_id))
    : null
  const linkedLayers = (database.PROBETA_CAPA ?? [])
    .filter((item) => String(item.probeta_id) === String(record.id))
    .map((item) => {
      const layer = (database.CAPA ?? []).find(
        (capa) => String(capa.id) === String(item.capa_id),
      )

      return {
        id: layer?.id ?? generateUuid(),
        created_at: layer?.created_at ?? '',
        direccion_id: layer?.direccion_id ?? '',
        pre_impregnado_id: layer?.pre_impregnado_id ?? '',
      }
    })
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))

  const capas = linkedLayers.length ? linkedLayers : [createEmptyLayer()]

  return {
    ...record,
    capas,
    largo_mm: result?.largo_mm ?? '',
    ancho_mm: result?.ancho_mm ?? '',
    espesor_mm: result?.espesor_mm ?? '',
    espesor:
      getCalculatedThicknessFromMeasurements({ ...result, capas }, CURED_THICKNESS_FIELDS) ||
      result?.espesor ||
      '',
    ...Object.fromEntries(
      CURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, result?.[fieldName] ?? '']),
    ),
    has_uncured_thickness: result?.has_uncured_thickness ?? false,
    espesor_sin_curado:
      getCalculatedThicknessFromMeasurements({ ...result, capas }, UNCURED_THICKNESS_FIELDS) ||
      result?.espesor_sin_curado ||
      '',
    ...Object.fromEntries(
      UNCURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, result?.[fieldName] ?? '']),
    ),
    weight_g: result?.weight_g ?? '',
    density: result?.density ?? getCalculatedDensity(result),
    acabado_id: acabadoCaraA?.id ?? '',
    has_acabado_cara_b: result?.has_acabado_cara_b ?? Boolean(result?.acabado_cara_b_id),
    acabado_cara_b_id: acabadoCaraB?.id ?? '',
    anotaciones: result?.anotaciones ?? '',
  }
}

export function buildProbetaRows(records, database) {
  return records.map((record) => {
    const draft = buildProbetaDraftFromRecord(record, database)
    const receta = (database.RECETAS ?? []).find(
      (item) => String(item.id) === String(record.receta_id),
    )

    return {
      ...record,
      title: draft.title,
      author: draft.author,
      receta: receta ? getRecordLabel(receta) : 'Sin receta',
      capas: draft.capas.length,
      materiales: draft.capas
        .map((layer) => {
          const material = (database['PRE-IMPREGNADO'] ?? []).find(
            (item) => String(item.id) === String(layer.pre_impregnado_id),
          )

          return material ? getRecordLabel(material) : ''
        })
        .filter(Boolean)
        .join(', '),
      largo_mm: draft.largo_mm,
      ancho_mm: draft.ancho_mm,
      espesor_mm: draft.espesor_mm,
      espesor: draft.espesor,
      ...Object.fromEntries(
        CURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, draft[fieldName]]),
      ),
      has_uncured_thickness: draft.has_uncured_thickness,
      espesor_sin_curado: draft.espesor_sin_curado,
      ...Object.fromEntries(
        UNCURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, draft[fieldName]]),
      ),
      weight_g: draft.weight_g,
      density: formatDensityValue(draft.density),
      acabado_alias:
        (database.ACABADO ?? []).find((item) => String(item.id) === String(draft.acabado_id))
          ?.alias ?? 'Sin acabado',
      anotaciones: draft.anotaciones,
    }
  })
}

export function buildProbetaDraftRows(records) {
  return records.map((record) => {
    const draftPayload = record?.payload ?? {}
    const capas = Array.isArray(draftPayload.capas) ? draftPayload.capas : []

    return {
      id: record.id,
      draftId: record.id,
      ownerId: record.owner_id,
      draftPayload,
      isDraft: true,
      title: String(draftPayload.title ?? '').trim() || 'Borrador sin título',
      author: draftPayload.author ?? '',
      capas: capas.length,
      espesor: draftPayload.espesor ?? '',
      density: draftPayload.density ?? '',
    }
  })
}

export function buildRecetaDraftFromRecord(record, database) {
  const escalones = (database.RECETA_ESCALONES ?? [])
    .filter((item) => item.receta_id === record.id)
    .sort((a, b) => (a.escalon ?? 0) - (b.escalon ?? 0))
    .map((item, index) => ({
      id: item.id ?? generateUuid(),
      escalon: item.escalon ?? index + 1,
      temperatura_c: item.temperatura_c ?? '',
      temp_grados_por_min: item.temp_grados_por_min ?? '',
      temp_tiempo_min: item.temp_tiempo_min ?? item.tiempo_min ?? '',
      temp_control_mode: item.temp_control_mode ?? 'time',
      temp_final_c: item.temp_final_c ?? '',
      temp_dwell: item.temp_dwell ?? false,
      presion_bar: item.presion_bar ?? '',
      pres_bar_por_min: item.pres_bar_por_min ?? '',
      pres_tiempo_min: item.pres_tiempo_min ?? item.tiempo_min ?? '',
      pres_control_mode: item.pres_control_mode ?? 'time',
      pres_final_bar: item.pres_final_bar ?? '',
      pres_dwell: item.pres_dwell ?? false,
      vacio_mbar: item.vacio_mbar ?? '',
      vacio_mbar_por_min: item.vacio_mbar_por_min ?? '',
      vacio_tiempo_min: item.vacio_tiempo_min ?? item.tiempo_min ?? '',
      vacio_control_mode: item.vacio_control_mode ?? 'time',
      vacio_final_mbar: item.vacio_final_mbar ?? '',
      vacio_dwell: item.vacio_dwell ?? false,
    }))

  return {
    ...record,
    escalones: escalones.length ? escalones : [createEmptyRecipeStep(1)],
  }
}

export function buildRecetaRows(records, database) {
  return records.map((record) => {
    const escalones = (database.RECETA_ESCALONES ?? []).filter(
      (item) => item.receta_id === record.id,
    )
    const derivedSteps = deriveRecipeSteps({ ...record, escalones })
    const temperatureValues = [record.temperatura_inicial_c, record.temperatura_final_c]

    derivedSteps.forEach((step) => {
      temperatureValues.push(step.temperatura_c, step.temperatureEnd)
    })

    const numericTemperatures = temperatureValues
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          !(typeof value === 'string' && value.trim() === ''),
      )
      .map((value) => Number(value))
      .filter(Number.isFinite)
    const picoTemperatura = numericTemperatures.length ? Math.max(...numericTemperatures) : ''

    return {
      ...record,
      nombre: record.nombre,
      descripcion: record.descripcion,
      temperatura_inicial_c: record.temperatura_inicial_c,
      pico_temperatura_c: picoTemperatura,
      escalones: escalones.length,
    }
  })
}

export function moveItem(list, fromIndex, toIndex) {
  const nextList = [...list]
  const [item] = nextList.splice(fromIndex, 1)
  nextList.splice(toIndex, 0, item)
  return nextList.map((entry, index) => ({
    ...entry,
    escalon: entry.escalon !== undefined ? index + 1 : entry.escalon,
  }))
}
