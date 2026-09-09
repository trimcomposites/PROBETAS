import { describe, expect, test } from 'vitest'
import { getPermissionSet } from './permissions'
import {
  getArchivedReferenceLabel,
  getRecordAction,
  isRecordInUse,
} from './recordArchiving'

const database = {
  PROBETA: [{ id: 3, title: 'P-03' }],
  CAPA: [{ id: 11, pre_impregnado_id: 7 }],
  PROBETA_CAPA: [{ probeta_id: 3, capa_id: 11 }],
  'PRE-IMPREGNADO': [{ id: 7, text_id: 'M-914' }, { id: 8, text_id: 'M-LIBRE' }],
  FIBRAS_REFUERZO: [{ id: 15, alias: 'Fibra T700' }],
}

describe('recordArchiving', () => {
  test('archiva un material que ya está referenciado por una capa', () => {
    expect(
      isRecordInUse({
        tableName: 'PRE-IMPREGNADO',
        recordId: 7,
        database,
      }),
    ).toBe(true)

    expect(
      getRecordAction({
        tableName: 'PRE-IMPREGNADO',
        record: { id: 7 },
        database,
      }),
    ).toBe('archive')
  })

  test('elimina un material que no tiene referencias', () => {
    expect(
      getRecordAction({
        tableName: 'PRE-IMPREGNADO',
        record: { id: 8 },
        database,
      }),
    ).toBe('delete')
  })

  test('ofrece archivar y eliminar para una probeta', () => {
    expect(
      getRecordAction({
        tableName: 'PROBETA',
        record: { id: 3 },
        database,
      }),
    ).toBe('both')
  })

  test('identifica las referencias archivadas con su etiqueta original', () => {
    expect(getArchivedReferenceLabel({ id: 15, alias: 'Fibra T700' })).toBe(
      'Fibra T700 (Archivado)',
    )
  })

  test('da permisos de archivo a gestor y reserva archivados y restauración a admin', () => {
    expect(getPermissionSet('gestor')).toMatchObject({
      canArchive: true,
      canViewArchived: false,
      canRestore: false,
    })
    expect(getPermissionSet('admin')).toMatchObject({
      canArchive: true,
      canViewArchived: true,
      canRestore: true,
    })
  })
})
