import { describe, expect, test } from 'vitest'
import { buildProbetaDraftRows, buildRecetaRows, getInputType } from './records'
import * as recordUtils from './records'

describe('getInputType', () => {
  test('usa un selector de fecha para las fechas de revisión de PDF', () => {
    expect(getInputType({ name: 'fecha_revision_mds', type: 'date' })).toBe('date')
    expect(getInputType({ name: 'fecha_revision_msdt', type: 'date' })).toBe('date')
  })
})

describe('getMissingPdfReviewDateFields', () => {
  test('identifica la fecha que falta para cada PDF adjunto', () => {
    expect(
      recordUtils.getMissingPdfReviewDateFields({
        pdf_mds_url: 'pdfs/mds.pdf',
        pdf_msdt_url: 'pdfs/msdt.pdf',
      }),
    ).toEqual(['fecha_revision_mds', 'fecha_revision_msdt'])
    expect(
      recordUtils.getMissingPdfReviewDateFields({
        pdf_mds_url: 'pdfs/mds.pdf',
        fecha_revision_mds: '2026-09-10',
      }),
    ).toEqual([])
  })
})

describe('buildProbetaDraftRows', () => {
  test('adapta un borrador parcial a una fila identificada de la tabla', () => {
    expect(
      buildProbetaDraftRows([
        {
          id: 'draft-1',
          owner_id: 'user-1',
          payload: { title: '', capas: [{ id: 'layer-1' }], density: 1.6 },
        },
      ]),
    ).toMatchObject([
      {
        id: 'draft-1',
        draftId: 'draft-1',
        ownerId: 'user-1',
        isDraft: true,
        title: 'Borrador sin título',
        capas: 1,
        density: 1.6,
      },
    ])
  })
})

describe('buildRecetaRows', () => {
  test('conserva la identidad y el estado de archivo para sus acciones de tabla', () => {
    const [row] = buildRecetaRows(
      [
        {
          id: 'receta-archivada',
          archived_at: '2026-09-09T08:00:00.000Z',
          nombre: 'Receta archivada',
        },
      ],
      { RECETA_ESCALONES: [] },
    )

    expect(row).toMatchObject({
      id: 'receta-archivada',
      archived_at: '2026-09-09T08:00:00.000Z',
    })
  })

  test('muestra el pico máximo alcanzado entre todos los escalones', () => {
    const [row] = buildRecetaRows(
      [
        {
          id: 'receta-1',
          nombre: 'Ciclo de prueba',
          descripcion: 'Sube y vuelve a bajar',
          temperatura_inicial_c: 20,
          temperatura_final_c: 40,
        },
      ],
      {
        RECETA_ESCALONES: [
          { receta_id: 'receta-1', escalon: 2, temp_final_c: 40 },
          { receta_id: 'receta-1', escalon: 1, temp_final_c: 180 },
        ],
      },
    )

    expect(row.pico_temperatura_c).toBe(180)
    expect(row.escalones).toBe(2)
  })

  test('no inventa un pico de 0 °C cuando no hay temperaturas registradas', () => {
    const [row] = buildRecetaRows(
      [
        {
          id: 'receta-vacia',
          nombre: 'Sin temperaturas',
          descripcion: '',
          temperatura_inicial_c: '',
          temperatura_final_c: '',
        },
      ],
      { RECETA_ESCALONES: [] },
    )

    expect(row.pico_temperatura_c).toBe('')
  })
})
