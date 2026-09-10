import { describe, expect, test } from 'vitest'
import { SIMPLE_SECTION_FIELDS } from './appConfig'

describe('SIMPLE_SECTION_FIELDS', () => {
  test('declara una fecha de revisión por cada PDF admitido', () => {
    expect(SIMPLE_SECTION_FIELDS.FIBRAS_REFUERZO).toEqual(
      expect.arrayContaining([
        { name: 'pdf_mds_url', type: 'text' },
        { name: 'fecha_revision_mds', type: 'date' },
      ]),
    )
    expect(SIMPLE_SECTION_FIELDS['PRE-IMPREGNADO']).toEqual(
      expect.arrayContaining([
        { name: 'pdf_mds_url', type: 'text' },
        { name: 'fecha_revision_mds', type: 'date' },
        { name: 'pdf_msdt_url', type: 'text' },
        { name: 'fecha_revision_msdt', type: 'date' },
      ]),
    )
    expect(SIMPLE_SECTION_FIELDS.RESINA_SYSTEM).toEqual(
      expect.arrayContaining([
        { name: 'pdf_mds_url', type: 'text' },
        { name: 'fecha_revision_mds', type: 'date' },
        { name: 'pdf_msdt_url', type: 'text' },
        { name: 'fecha_revision_msdt', type: 'date' },
      ]),
    )
  })
})
