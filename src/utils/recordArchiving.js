import { relations } from '../data/probetasSchema'
import { getRecordLabel } from './records'

export const ARCHIVABLE_TABLES = new Set([
  'PROBETA',
  'FIBRAS_REFUERZO',
  'PRE-IMPREGNADO',
  'RECETAS',
  'FABRICANTE',
  'PRE-IMPREGNADO_TYPE',
  'RESINA_SYSTEM',
])

export function isRecordInUse({ tableName, recordId, database }) {
  if (recordId === null || recordId === undefined) {
    return false
  }

  return relations.some((relation) => {
    if (relation.toTable !== tableName) {
      return false
    }

    return (database[relation.fromTable] ?? []).some(
      (record) => String(record[relation.fromField]) === String(recordId),
    )
  })
}

export function getRecordAction({ tableName, record, database }) {
  if (!record || !ARCHIVABLE_TABLES.has(tableName)) {
    return null
  }

  if (record.archived_at) {
    return 'restore'
  }

  if (tableName === 'PROBETA') {
    return 'both'
  }

  return isRecordInUse({ tableName, recordId: record.id, database }) ? 'archive' : 'delete'
}

export function getArchivedReferenceLabel(record, fallbackIndex = 0) {
  return `${getRecordLabel(record, fallbackIndex)} (Archivado)`
}
