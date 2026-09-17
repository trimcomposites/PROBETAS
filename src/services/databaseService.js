import { localDatabase } from '../data/probetasSchema'
import {
  CURED_THICKNESS_FIELDS,
  UNCURED_THICKNESS_FIELDS,
  getCalculatedDensity,
  getCalculatedThicknessFromMeasurements,
} from '../utils/records'
import { deriveRecipeSteps, getRecipeHeaderTemperatures } from '../utils/recipeSteps'
import { assertSupabaseConfigured } from '../lib/supabaseClient'
import { ARCHIVABLE_TABLES } from '../utils/recordArchiving'

const TABLE_NAME_CANDIDATES = {
  PROBETA: ['PROBETA', 'probeta'],
  CAPA: ['CAPA', 'capa'],
  'PRE-IMPREGNADO': ['PRE-IMPREGNADO', 'PRE_IMPREGNADO', 'pre_impregnado'],
  DIRECCION_CAPA: ['DIRECCION_CAPA', 'direccion_capa'],
  FABRICANTE: ['FABRICANTE', 'fabricante'],
  'PRE-IMPREGNADO_TYPE': [
    'PRE-IMPREGNADO_TYPE',
    'PRE_IMPREGNADO_TYPE',
    'pre_impregnado_type',
  ],
  RESINA_SYSTEM: ['RESINA_SYSTEM', 'resina_system'],
  RESIN_PRODUCT_CATEGORY: ['RESIN_PRODUCT_CATEGORY', 'resin_product_category'],
  FIBRAS_REFUERZO: ['FIBRAS_REFUERZO', 'fibras_refuerzo'],
  RESULTS: ['RESULTS', 'results'],
  ACABADO: ['ACABADO', 'acabado'],
  ESPESORES: ['ESPESORES', 'espesores'],
  RECETAS: ['RECETAS', 'recetas'],
  RECETA_ESCALONES: ['RECETA_ESCALONES', 'receta_escalones'],
  HORNO: ['HORNO', 'horno'],
  PROBETA_CAPA: ['PROBETA_CAPA', 'probeta_capa'],
  PROBETA_PRE_IMPREGNADO: [
    'PROBETA_PRE-IMPREGNADO',
    'PROBETA_PRE_IMPREGNADO',
    'probeta_pre_impregnado',
  ],
  PROBETA_BORRADORES: ['PROBETA_BORRADORES', 'probeta_borradores'],
}

const OPTIONAL_TABLES = new Set([
  'ESPESORES',
  'PROBETA_PRE_IMPREGNADO',
  'HORNO',
  'PROBETA_BORRADORES',
])
const TABLE_NAMES = Object.keys(TABLE_NAME_CANDIDATES)
const resolvedTableNames = new Map()

function isMissingTableError(error) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.status === 404 ||
    error.message?.includes('schema cache') ||
    error.message?.includes('Could not find the table')
  )
}

async function resolveRemoteTableName(tableName) {
  if (resolvedTableNames.has(tableName)) {
    return resolvedTableNames.get(tableName)
  }

  const supabase = assertSupabaseConfigured()
  const candidates = TABLE_NAME_CANDIDATES[tableName] ?? [tableName]

  for (const candidate of candidates) {
    const { error } = await supabase.from(candidate).select('*', { head: true, count: 'exact' })

    if (!error) {
      resolvedTableNames.set(tableName, candidate)
      return candidate
    }

    if (!isMissingTableError(error)) {
      throw new Error(`No se pudo leer ${tableName}: ${error.message}`)
    }
  }

  if (OPTIONAL_TABLES.has(tableName)) {
    resolvedTableNames.set(tableName, null)
    return null
  }

  throw new Error(
    `No se encontro la tabla para ${tableName}. Probadas: ${candidates.join(', ')}`,
  )
}

function normalizeRows(rows) {
  return rows ?? []
}

function isPersistedNumericId(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function stripGeneratedId(record) {
  if (!record || typeof record !== 'object') {
    return record
  }

  const nextRecord = Object.fromEntries(
    Object.entries({ ...record }).map(([key, value]) => [key, value === '' ? null : value]),
  )

  if (!isPersistedNumericId(nextRecord.id)) {
    delete nextRecord.id
  }

  return nextRecord
}

async function getNextNumericId(tableName) {
  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    throw new Error(`La tabla ${tableName} no esta disponible en Supabase.`)
  }

  const { data, error } = await supabase
    .from(remoteTableName)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`No se pudo calcular el siguiente id para ${tableName}: ${error.message}`)
  }

  return (data?.[0]?.id ?? 0) + 1
}

async function allocateNumericIds(tableName, count) {
  const firstId = await getNextNumericId(tableName)
  return Array.from({ length: count }, (_, index) => firstId + index)
}

function applyArchiveState(query, tableName, archiveState) {
  if (!ARCHIVABLE_TABLES.has(tableName) || typeof query?.is !== 'function') {
    return query
  }

  if (archiveState === 'archived') {
    return query.not('archived_at', 'is', null)
  }

  return query.is('archived_at', null)
}

async function selectAll(tableName, archiveState = 'active') {
  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    return []
  }

  const { data, error } = await applyArchiveState(
    supabase.from(remoteTableName).select('*'),
    tableName,
    archiveState,
  )

  if (error) {
    if (OPTIONAL_TABLES.has(tableName) && isMissingTableError(error)) {
      resolvedTableNames.set(tableName, null)
      return []
    }

    throw new Error(`No se pudo leer ${tableName}: ${error.message}`)
  }

  return normalizeRows(data)
}

export async function loadDatabaseFromSupabase({ archiveState = 'active' } = {}) {
  const results = await Promise.all(
    TABLE_NAMES.map((tableName) => selectAll(tableName, archiveState)),
  )

  return TABLE_NAMES.reduce(
    (database, tableName, index) => ({
      ...database,
      [tableName]: results[index],
    }),
    { ...localDatabase },
  )
}

export async function saveProbetaDraft(draft, draftId = null) {
  // La tabla de borradores puede haberse creado después de que esta sesión
  // recibiera un 404 inicial. No reutilizamos ese resultado negativo al guardar.
  if (resolvedTableNames.get('PROBETA_BORRADORES') === null) {
    resolvedTableNames.delete('PROBETA_BORRADORES')
  }

  const payload = {
    payload: draft,
    updated_at: new Date().toISOString(),
  }

  if (draftId) {
    return updateRecord('PROBETA_BORRADORES', { id: draftId, ...payload })
  }

  return insertRecord('PROBETA_BORRADORES', payload)
}

export async function archiveRecord(tableName, recordId) {
  return updateRecord(tableName, {
    id: recordId,
    archived_at: new Date().toISOString(),
  })
}

export async function restoreRecord(tableName, recordId) {
  return updateRecord(tableName, {
    id: recordId,
    archived_at: null,
    archived_by: null,
  })
}

export async function getArchivedReferenceLabels(references) {
  if (!references?.length) {
    return []
  }

  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase.rpc('get_archived_reference_labels', {
    reference_items: references,
  })

  if (error) {
    throw new Error(`No se pudieron leer las referencias archivadas: ${error.message}`)
  }

  return normalizeRows(data)
}

export async function deleteProbetaDraft(draftId) {
  await deleteByIds('PROBETA_BORRADORES', [draftId])
}

async function updateRecord(tableName, payload) {
  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    throw new Error(`La tabla ${tableName} no esta disponible en Supabase.`)
  }

  const { data, error } = await supabase
    .from(remoteTableName)
    .update(payload)
    .eq('id', payload.id)
    .select()
    .single()

  if (error) {
    throw new Error(`No se pudo guardar en ${tableName}: ${error.message}`)
  }

  return data
}

async function insertRecords(tableName, payload) {
  if (!payload.length) {
    return []
  }

  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    throw new Error(`La tabla ${tableName} no esta disponible en Supabase.`)
  }

  const { data, error } = await supabase
    .from(remoteTableName)
    .insert(payload)
    .select()

  if (error) {
    throw new Error(`No se pudo insertar en ${tableName}: ${error.message}`)
  }

  return data ?? []
}

async function insertRecord(tableName, payload) {
  const [record] = await insertRecords(tableName, [payload])
  return record
}

async function deleteByIds(tableName, ids) {
  if (!ids.length) {
    return
  }

  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    return
  }

  const { error } = await supabase.from(remoteTableName).delete().in('id', ids)

  if (error) {
    throw new Error(`No se pudo eliminar de ${tableName}: ${error.message}`)
  }
}

async function deleteByField(tableName, fieldName, value) {
  const supabase = assertSupabaseConfigured()
  const remoteTableName = await resolveRemoteTableName(tableName)

  if (!remoteTableName) {
    return
  }

  const { error } = await supabase
    .from(remoteTableName)
    .delete()
    .eq(fieldName, value)

  if (error) {
    throw new Error(`No se pudo eliminar de ${tableName}: ${error.message}`)
  }
}

export async function saveSimpleRecord(tableName, record) {
  const payload = stripGeneratedId(record)

  if (isPersistedNumericId(record.id)) {
    return updateRecord(tableName, payload)
  }

  return insertRecord(tableName, { ...payload, id: await getNextNumericId(tableName) })
}

export async function saveRecetaRecord(draft, existingRecipeId = null) {
  const isNewRecipe = existingRecipeId === null || existingRecipeId === undefined
  const headerTemperatures = getRecipeHeaderTemperatures(draft)
  const recipeRecord = stripGeneratedId({
    ...(existingRecipeId ? { id: existingRecipeId } : {}),
    created_at: draft.created_at ?? new Date().toISOString(),
    nombre: draft.nombre,
    descripcion: draft.descripcion,
    temperatura_inicial_c: headerTemperatures.initial,
    temperatura_final_c: headerTemperatures.final,
  })

  const savedRecipe = existingRecipeId
    ? await updateRecord('RECETAS', recipeRecord)
    : await insertRecord('RECETAS', {
        ...recipeRecord,
        id: await getNextNumericId('RECETAS'),
      })

  try {
    await deleteByField('RECETA_ESCALONES', 'receta_id', savedRecipe.id)

    const derivedSteps = deriveRecipeSteps(draft)

    const nextSteps = derivedSteps.map((step, index) =>
      stripGeneratedId({
        id: isPersistedNumericId(step.id) ? step.id : null,
        created_at: step.created_at ?? new Date().toISOString(),
        receta_id: savedRecipe.id,
        escalon: index + 1,
        temp_tiempo_min: step.tempTransition.time,
        temp_control_mode: step.temp_control_mode,
        temp_grados_por_min: step.temp_dwell ? null : step.temp_grados_por_min,
        temp_final_c: step.temp_dwell ? step.temperatura_c : step.temp_final_c,
        temp_dwell: step.temp_dwell,
        pres_bar_por_min: step.pres_dwell ? null : step.pres_bar_por_min,
        pres_tiempo_min: step.pressureTransition.time,
        pres_control_mode: step.pres_control_mode,
        pres_final_bar: step.pres_dwell ? step.presion_bar : step.pres_final_bar,
        pres_dwell: step.pres_dwell,
        vacio_mbar_por_min: step.vacio_dwell ? null : step.vacio_mbar_por_min,
        vacio_tiempo_min: step.vacuumTransition.time,
        vacio_control_mode: step.vacio_control_mode,
        vacio_final_mbar: step.vacio_dwell ? step.vacio_mbar : step.vacio_final_mbar,
        vacio_dwell: step.vacio_dwell,
      }),
    )

    const recetaEscalonesIds = await allocateNumericIds('RECETA_ESCALONES', nextSteps.length)
    await insertRecords(
      'RECETA_ESCALONES',
      nextSteps.map((step, index) => ({
        ...step,
        id: step.id ?? recetaEscalonesIds[index],
      })),
    )
  } catch (error) {
    if (isNewRecipe) {
      try {
        await deleteRecetaRecord(savedRecipe.id)
      } catch (cleanupError) {
        throw new Error(
          `${error.message}. Además, no se pudo revertir la receta parcial: ${cleanupError.message}`,
          { cause: cleanupError },
        )
      }
    }

    throw error
  }

  return savedRecipe
}

export async function saveProbetaRecord(draft, currentDatabase, existingProbeta = null) {
  const previousLinks = existingProbeta
    ? (currentDatabase.PROBETA_CAPA ?? []).filter((item) => item.probeta_id === existingProbeta.id)
    : []
  const previousLayerIds = previousLinks.map((item) => item.capa_id).filter(Boolean)
  const previousResultId = existingProbeta?.results_id ?? null

  const resultPayload = stripGeneratedId({
    ...(previousResultId ? { id: previousResultId } : {}),
    created_at: existingProbeta?.results_id
      ? (currentDatabase.RESULTS ?? []).find((item) => item.id === existingProbeta.results_id)?.created_at ??
        new Date().toISOString()
      : new Date().toISOString(),
    largo_mm: draft.largo_mm,
    ancho_mm: draft.ancho_mm,
    espesor_mm: draft.espesor_mm,
    espesor: draft.has_uncured_thickness
      ? getCalculatedThicknessFromMeasurements(draft, CURED_THICKNESS_FIELDS)
      : null,
    ...Object.fromEntries(
      CURED_THICKNESS_FIELDS.map((fieldName) => [
        fieldName,
        draft.has_uncured_thickness ? draft[fieldName] : null,
      ]),
    ),
    has_uncured_thickness: draft.has_uncured_thickness,
    espesor_sin_curado: getCalculatedThicknessFromMeasurements(draft, UNCURED_THICKNESS_FIELDS),
    ...Object.fromEntries(
      UNCURED_THICKNESS_FIELDS.map((fieldName) => [fieldName, draft[fieldName]]),
    ),
    weight_g: draft.weight_g,
    density: getCalculatedDensity(draft),
    acabado_id: draft.acabado_id,
    has_acabado_cara_b: draft.has_acabado_cara_b,
    acabado_cara_b_id: draft.has_acabado_cara_b ? draft.acabado_cara_b_id : null,
    anotaciones: draft.anotaciones,
  })

  const savedResult = previousResultId
    ? await updateRecord('RESULTS', resultPayload)
    : await insertRecord('RESULTS', {
        ...resultPayload,
        id: await getNextNumericId('RESULTS'),
      })

  if (existingProbeta) {
    await deleteByField('PROBETA_CAPA', 'probeta_id', existingProbeta.id)
    await deleteByIds('CAPA', previousLayerIds)
  }

  const capaRecords = draft.capas.map((layer) =>
    stripGeneratedId({
      created_at: new Date().toISOString(),
      direccion_id: layer.direccion_id,
      pre_impregnado_id: layer.pre_impregnado_id,
    }),
  )

  const capaIds = await allocateNumericIds('CAPA', capaRecords.length)
  const insertedCapas = await insertRecords(
    'CAPA',
    capaRecords.map((layer, index) => ({
      ...layer,
      id: capaIds[index],
    })),
  )

  const probetaPayload = stripGeneratedId({
    ...(existingProbeta?.id ? { id: existingProbeta.id } : {}),
    created_at: existingProbeta?.created_at ?? draft.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    title: draft.title,
    author: draft.author,
    reviewed: draft.reviewed,
    receta_id: draft.receta_id,
    referencia: draft.referencia,
    results_id: savedResult.id,
    espesores_id: existingProbeta?.espesores_id ?? null,
  })

  const savedProbeta = existingProbeta?.id
    ? await updateRecord('PROBETA', probetaPayload)
    : await insertRecord('PROBETA', {
        ...probetaPayload,
        id: await getNextNumericId('PROBETA'),
      })

  await insertRecords(
    'PROBETA_CAPA',
    insertedCapas.map((layer) => ({
      probeta_id: savedProbeta.id,
      capa_id: layer.id,
    })),
  )

  await deleteByField('PROBETA_PRE_IMPREGNADO', 'probeta_id', savedProbeta.id)
  await insertRecords(
    'PROBETA_PRE_IMPREGNADO',
    Array.from(new Set(insertedCapas.map((layer) => layer.pre_impregnado_id).filter(Boolean))).map(
      (materialId) => ({
        probeta_id: savedProbeta.id,
        material_id: materialId,
      }),
    ),
  )

  return savedProbeta
}

export async function deleteSimpleRecord(tableName, recordId) {
  await deleteByIds(tableName, [recordId])
}

export async function deleteRecetaRecord(recipeId) {
  await deleteByField('RECETA_ESCALONES', 'receta_id', recipeId)
  await deleteByIds('RECETAS', [recipeId])
}

export async function deleteProbetaRecord(probeta, currentDatabase) {
  const layerLinks = (currentDatabase.PROBETA_CAPA ?? []).filter(
    (item) => item.probeta_id === probeta?.id,
  )
  const layerIds = layerLinks.map((item) => item.capa_id).filter(Boolean)

  await deleteByField('PROBETA_CAPA', 'probeta_id', probeta.id)
  await deleteByField('PROBETA_PRE_IMPREGNADO', 'probeta_id', probeta.id)
  await deleteByIds('CAPA', layerIds)

  if (probeta.results_id) {
    await deleteByIds('RESULTS', [probeta.results_id])
  }

  await deleteByIds('PROBETA', [probeta.id])
}
