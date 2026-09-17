import { describe, expect, test } from 'vitest'
import { getUserError } from './userError'

describe('getUserError', () => {
  test('traduce un rechazo de permisos de Supabase', () => {
    expect(
      getUserError(
        { code: '42501', message: 'new row violates row-level security policy' },
        'No se pudo guardar el registro.',
      ),
    ).toEqual({
      message: 'No tienes permiso para realizar esta acción.',
      fieldName: null,
    })
  })

  test('identifica el campo de un duplicado sin exponer el error técnico', () => {
    expect(
      getUserError(
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint "RECETAS_NOMBRE_UX"',
        },
        'No se pudo guardar la receta.',
      ),
    ).toEqual({
      message: 'Ya existe un registro con ese valor.',
      fieldName: 'nombre',
    })
  })

  test('explica el conflicto de enlaces auxiliares de una probeta', () => {
    expect(
      getUserError(
        {
          code: '23505',
          message:
            'duplicate key value violates unique constraint "PROBETA_PRE-IMPREGNADO_pkey"',
        },
        'No se pudo guardar la probeta.',
      ),
    ).toEqual({
      message: 'No se pudieron actualizar los materiales de la probeta.',
      fieldName: null,
    })
  })

  test('usa el mensaje contextual ante un error no reconocido', () => {
    expect(
      getUserError(
        { code: 'XX000', message: 'internal server diagnostic that users must not see' },
        'No se pudo eliminar el registro.',
      ),
    ).toEqual({
      message: 'No se pudo eliminar el registro.',
      fieldName: null,
    })
  })

  test('explica un nombre de archivo no admitido sin mostrar la clave técnica', () => {
    expect(
      getUserError(
        {
          message:
            'No se pudo subir el PDF a Supabase Storage: Invalid key: resina_system/pdf_mds_url/uuid/Artículo.pdf',
        },
        'No se pudo subir el PDF.',
      ),
    ).toEqual({
      message:
          'No se pudo subir el PDF porque el nombre del archivo contiene caracteres no compatibles. Renómbralo sin tildes ni caracteres especiales y vuelve a intentarlo.',
      fieldName: null,
    })
  })
})
