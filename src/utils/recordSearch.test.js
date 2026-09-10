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
  test('normaliza mayúsculas y acentos para una búsqueda de texto', () => {
    expect(normalizeSearchText(' ÁLAMO ')).toBe('alamo')
  })

  test('encuentra una probeta por el nombre visible de su receta', () => {
    const fields = getSearchFieldOptions('PROBETA', rows)

    expect(filterRecordRows({ records: rows, fields, database, query: 'epoxi', filters: [] })).toEqual([
      rows[0],
    ])
  })

  test('exige que se cumplan a la vez un filtro numérico y uno de PDF', () => {
    const materialRows = [
      { id: 1, text_id: 'MAT-01', resina_volume: 42, pdf_mds_url: 'file-1' },
      { id: 2, text_id: 'MAT-02', resina_volume: 58, pdf_mds_url: '' },
    ]
    const fields = getSearchFieldOptions('PRE-IMPREGNADO', materialRows)

    expect(
      filterRecordRows({
        records: materialRows,
        fields,
        database,
        query: '',
        filters: [
          { id: 'resin', fieldName: 'resina_volume', operator: 'greaterThan', value: '50' },
          { id: 'pdf', fieldName: 'pdf_mds_url', operator: 'hasNoValue', value: '' },
        ],
      }),
    ).toEqual([materialRows[1]])
  })

  test('ofrece igualdad y etiquetas de registros para una relación', () => {
    const fields = getSearchFieldOptions('PROBETA', rows)
    const recipe = fields.find((field) => field.name === 'receta_id')

    expect(getOperatorsForSearchField(recipe).map((operator) => operator.value)).toEqual(['equals'])
    expect(getReferenceOptions(recipe, database)).toEqual([{ value: '11', label: 'Ciclo Époxi' }])
  })

  test('compara fechas sin romperse ante una fecha vacía', () => {
    const dateFields = [{ name: 'fecha_revision_mds', label: 'Fecha de revisión MDS', kind: 'date' }]
    const dateRows = [
      { id: 1, fecha_revision_mds: '2026-09-10' },
      { id: 2, fecha_revision_mds: '' },
    ]

    expect(
      filterRecordRows({
        records: dateRows,
        fields: dateFields,
        database: {},
        query: '',
        filters: [
          {
            id: 'review-date',
            fieldName: 'fecha_revision_mds',
            operator: 'greaterThan',
            value: '2026-09-09',
          },
        ],
      }),
    ).toEqual([dateRows[0]])
  })
})
