import { tables } from '../data/probetasSchema'

export function getTable(tableName) {
  return tables.find((table) => table.name === tableName)
}

export function getReferencedTableName(field) {
  return field.references?.split('.')[0] ?? null
}
