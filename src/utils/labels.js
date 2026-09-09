import { FIELD_LABELS, TABLE_LABELS } from '../config/appConfig'

export function getTableLabel(tableName) {
  return TABLE_LABELS[tableName] ?? tableName
}

export function getFieldLabel(fieldName) {
  return FIELD_LABELS[fieldName] ?? fieldName
}
