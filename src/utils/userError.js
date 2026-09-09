function getErrorDetails(error) {
  const details = []
  let currentError = error

  while (currentError && details.length < 4) {
    details.push({
      code: currentError.code,
      message: String(currentError.message ?? ''),
    })
    currentError = currentError.cause
  }

  return details
}

function getDuplicateFieldName(details) {
  const source = details.map(({ message }) => message).join(' ').toLowerCase()

  if (source.includes('nombre')) return 'nombre'
  if (source.includes('text_id')) return 'text_id'
  if (source.includes('alias')) return 'alias'
  if (source.includes('title')) return 'title'

  return null
}

export function getUserError(error, fallbackMessage) {
  const details = getErrorDetails(error)
  const codes = details.map(({ code }) => code)
  const source = details.map(({ message }) => message).join(' ').toLowerCase()

  if (
    codes.includes('42501') ||
    source.includes('permission denied') ||
    source.includes('row-level security')
  ) {
    return { message: 'No tienes permiso para realizar esta acción.', fieldName: null }
  }

  if (codes.includes('23505') || source.includes('duplicate key')) {
    if (source.includes('probeta_pre-impregnado') || source.includes('probeta_pre_impregnado')) {
      return {
        message: 'No se pudieron actualizar los materiales de la probeta.',
        fieldName: null,
      }
    }

    return {
      message: 'Ya existe un registro con ese valor.',
      fieldName: getDuplicateFieldName(details),
    }
  }

  if (codes.includes('23503') || source.includes('foreign key constraint')) {
    return {
      message: 'No se puede eliminar porque el registro está en uso.',
      fieldName: null,
    }
  }

  if (source.includes('invalid key')) {
    return {
      message:
        'No se pudo subir el PDF porque el nombre del archivo contiene caracteres no compatibles. Renómbralo sin tildes ni caracteres especiales y vuelve a intentarlo.',
      fieldName: null,
    }
  }

  return { message: fallbackMessage, fieldName: null }
}
