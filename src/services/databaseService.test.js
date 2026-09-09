import { describe, expect, test, vi } from 'vitest'

const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null } }))

vi.mock('../lib/supabaseClient', () => ({
  assertSupabaseConfigured: () => supabaseState.client,
}))

import { saveProbetaDraft, saveRecetaRecord } from './databaseService'

function createSupabaseWithDraftStorage() {
  const rows = {
    PROBETA_BORRADORES: [],
  }

  return {
    rows,
    from(tableName) {
      const tableRows = rows[tableName]

      return {
        select(columns, options) {
          if (options?.head) {
            return Promise.resolve({ data: null, error: null })
          }

          return Promise.resolve({ data: tableRows, error: null })
        },
        insert(payload) {
          return {
            select: async () => {
              const insertedRows = payload.map((record, index) => ({
                ...record,
                id: `draft-${tableRows.length + index + 1}`,
              }))
              tableRows.push(...insertedRows)
              return { data: insertedRows, error: null }
            },
          }
        },
        update(payload) {
          return {
            eq: (_fieldName, value) => ({
              select: () => ({
                single: async () => {
                  const index = tableRows.findIndex((record) => record.id === value)
                  const updatedRecord = { ...tableRows[index], ...payload }
                  tableRows[index] = updatedRecord
                  return { data: updatedRecord, error: null }
                },
              }),
            }),
          }
        },
      }
    },
  }
}

function createSupabaseWithFailingStepInsert() {
  const rows = {
    RECETAS: [],
    RECETA_ESCALONES: [],
  }

  return {
    rows,
    from(tableName) {
      const tableRows = rows[tableName]

      return {
        select(columns, options) {
          if (options?.head) {
            return Promise.resolve({ data: null, error: null })
          }

          if (columns === 'id') {
            return {
              order: () => ({
                limit: async () => ({ data: [...tableRows].reverse().slice(0, 1), error: null }),
              }),
            }
          }

          return Promise.resolve({ data: tableRows, error: null })
        },
        insert(payload) {
          return {
            select: async () => {
              if (tableName === 'RECETA_ESCALONES') {
                return { data: null, error: { message: 'fallo esperado al guardar escalones' } }
              }

              tableRows.push(...payload)
              return { data: payload, error: null }
            },
          }
        },
        delete() {
          return {
            eq: async (fieldName, value) => {
              rows[tableName] = tableRows.filter((row) => row[fieldName] !== value)
              return { error: null }
            },
            in: async (fieldName, values) => {
              rows[tableName] = tableRows.filter((row) => !values.includes(row[fieldName]))
              return { error: null }
            },
          }
        },
      }
    },
  }
}

describe('saveRecetaRecord', () => {
  test('removes a newly created recipe when saving its steps fails', async () => {
    const supabase = createSupabaseWithFailingStepInsert()
    supabaseState.client = supabase

    await expect(
      saveRecetaRecord({
        nombre: 'Receta de prueba',
        descripcion: '',
        temperatura_inicial_c: 20,
        temperatura_final_c: 40,
        escalones: [
          {
            id: 'step-1',
            temp_final_c: 40,
            temp_dwell: false,
            temp_tiempo_min: 10,
            temp_control_mode: 'time',
            presion_bar: 1,
            pres_final_bar: 1,
            pres_dwell: true,
            vacio_mbar: 0,
            vacio_final_mbar: 0,
            vacio_dwell: true,
          },
        ],
      }),
    ).rejects.toThrow('No se pudo insertar en RECETA_ESCALONES')

    expect(supabase.rows.RECETAS).toEqual([])
    expect(supabase.rows.RECETA_ESCALONES).toEqual([])
  })

})

describe('saveProbetaDraft', () => {
  test('actualiza el mismo borrador sin crear duplicados', async () => {
    const supabase = createSupabaseWithDraftStorage()
    supabaseState.client = supabase

    const created = await saveProbetaDraft({ title: 'P-01', capas: [] })
    const updated = await saveProbetaDraft({ title: 'P-01 revisada', capas: [] }, created.id)

    expect(updated.id).toBe(created.id)
    expect(supabase.rows.PROBETA_BORRADORES).toHaveLength(1)
    expect(supabase.rows.PROBETA_BORRADORES[0].payload.title).toBe('P-01 revisada')
  })

  test('vuelve a detectar la tabla si se creó después del primer 404 de la sesión', async () => {
    vi.resetModules()
    let isDraftTableAvailable = false
    const storedRows = []

    supabaseState.client = {
      from(tableName) {
        const isDraftTable = ['PROBETA_BORRADORES', 'probeta_borradores'].includes(tableName)

        return {
          select(_columns, options) {
            if (options?.head && isDraftTable && !isDraftTableAvailable) {
              return Promise.resolve({
                data: null,
                error: { code: '42P01', message: 'relation does not exist', status: 404 },
              })
            }

            return Promise.resolve({ data: storedRows, error: null })
          },
          insert(payload) {
            return {
              select: async () => {
                const insertedRows = payload.map((record, index) => ({
                  ...record,
                  id: `draft-recovered-${index + 1}`,
                }))
                storedRows.push(...insertedRows)
                return { data: insertedRows, error: null }
              },
            }
          },
        }
      },
    }

    const { saveProbetaDraft: saveDraft } = await import('./databaseService')

    await expect(saveDraft({ title: 'Antes de crear tabla' })).rejects.toThrow('no esta disponible')

    isDraftTableAvailable = true

    await expect(saveDraft({ title: 'Después de crear tabla' })).resolves.toMatchObject({
      id: 'draft-recovered-1',
    })
  })
})

describe('loadDatabaseFromSupabase', () => {
  test('carga los registros existentes si la tabla opcional de borradores responde 404', async () => {
    vi.resetModules()
    supabaseState.client = {
      from(tableName) {
        return {
          select(_columns, options) {
            if (options?.head && ['PROBETA_BORRADORES', 'probeta_borradores'].includes(tableName)) {
              return Promise.resolve({
                data: null,
                error: {
                  code: '42P01',
                  message: 'relation "PROBETA_BORRADORES" does not exist',
                  status: 404,
                },
              })
            }

            if (options?.head) {
              return Promise.resolve({ data: null, error: null })
            }

            return Promise.resolve({ data: [], error: null })
          },
        }
      },
    }

    const { loadDatabaseFromSupabase } = await import('./databaseService')
    const database = await loadDatabaseFromSupabase()

    expect(database.PROBETA).toEqual([])
    expect(database.PROBETA_BORRADORES).toEqual([])
  })

  test('mantiene la carga si el select real de borradores responde 404', async () => {
    vi.resetModules()
    supabaseState.client = {
      from(tableName) {
        return {
          select(_columns, options) {
            if (options?.head) {
              return Promise.resolve({ data: null, error: null })
            }

            if (tableName === 'PROBETA_BORRADORES') {
              return Promise.resolve({
                data: null,
                error: {
                  code: '42P01',
                  message: 'relation "PROBETA_BORRADORES" does not exist',
                  status: 404,
                },
              })
            }

            return Promise.resolve({ data: [], error: null })
          },
        }
      },
    }

    const { loadDatabaseFromSupabase } = await import('./databaseService')
    const database = await loadDatabaseFromSupabase()

    expect(database.PROBETA).toEqual([])
    expect(database.PROBETA_BORRADORES).toEqual([])
  })
})

function createSupabaseWithArchivingQueries() {
  const filters = []
  const updates = []

  function createSelectableQuery(tableName) {
    const query = {
      is(fieldName, value) {
        filters.push({ tableName, kind: 'is', fieldName, value })
        return query
      },
      not(fieldName, operator, value) {
        filters.push({ tableName, kind: 'not', fieldName, operator, value })
        return query
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected)
      },
    }

    return query
  }

  return {
    filters,
    updates,
    from(tableName) {
      return {
        select(_columns, options) {
          if (options?.head) {
            return Promise.resolve({ data: null, error: null })
          }

          return createSelectableQuery(tableName)
        },
        update(payload) {
          return {
            eq(fieldName, value) {
              updates.push({ tableName, payload, fieldName, value })
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: value, ...payload }, error: null }),
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('archivado de registros', () => {
  test('filtra los registros activos de las tablas archivables', async () => {
    vi.resetModules()
    const supabase = createSupabaseWithArchivingQueries()
    supabaseState.client = supabase

    const { loadDatabaseFromSupabase } = await import('./databaseService')
    await loadDatabaseFromSupabase({ archiveState: 'active' })

    expect(
      supabase.filters
        .filter(({ kind }) => kind === 'is')
        .map(({ tableName, fieldName, value }) => ({ tableName, fieldName, value })),
    ).toEqual(
      expect.arrayContaining([
        { tableName: 'PROBETA', fieldName: 'archived_at', value: null },
        { tableName: 'RECETAS', fieldName: 'archived_at', value: null },
        { tableName: 'FABRICANTE', fieldName: 'archived_at', value: null },
      ]),
    )
  })

  test('archiva y restaura el mismo registro con su identificador', async () => {
    vi.resetModules()
    const supabase = createSupabaseWithArchivingQueries()
    supabaseState.client = supabase

    const databaseService = await import('./databaseService')

    await databaseService.archiveRecord('FABRICANTE', 4)
    await databaseService.restoreRecord('FABRICANTE', 4)

    expect(supabase.updates).toMatchObject([
      {
        tableName: 'FABRICANTE',
        fieldName: 'id',
        value: 4,
        payload: { id: 4, archived_at: expect.any(String) },
      },
      {
        tableName: 'FABRICANTE',
        fieldName: 'id',
        value: 4,
        payload: { id: 4, archived_at: null, archived_by: null },
      },
    ])
  })

  test('solicita solo las etiquetas archivadas de referencias existentes', async () => {
    vi.resetModules()
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          owner_table: 'CAPA',
          owner_id: 11,
          field_name: 'pre_impregnado_id',
          referenced_table: 'PRE-IMPREGNADO',
          referenced_id: 7,
          label: 'M-914 (Archivado)',
        },
      ],
      error: null,
    })
    supabaseState.client = { rpc }

    const { getArchivedReferenceLabels } = await import('./databaseService')
    const references = [
      {
        ownerTable: 'CAPA',
        ownerId: 11,
        fieldName: 'pre_impregnado_id',
        referencedTable: 'PRE-IMPREGNADO',
        referencedId: 7,
      },
    ]

    await expect(getArchivedReferenceLabels(references)).resolves.toEqual([
      expect.objectContaining({ label: 'M-914 (Archivado)' }),
    ])
    expect(rpc).toHaveBeenCalledWith('get_archived_reference_labels', {
      reference_items: references,
    })
  })
})
