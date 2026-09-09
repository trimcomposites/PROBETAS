import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import RecordActionConfirmation from './RecordActionConfirmation'

afterEach(cleanup)

describe('RecordActionConfirmation', () => {
  test('no ejecuta el archivo al cancelar', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <RecordActionConfirmation
        action="archive"
        recordLabel="Resina 914"
        isSubmitting={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText(/mantendrá las referencias existentes/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('solo confirma una vez aunque se pulse dos veces', () => {
    const onConfirm = vi.fn()

    render(
      <RecordActionConfirmation
        action="delete"
        recordLabel="Fabricante A"
        isSubmitting={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText(/no se puede deshacer/)).toBeTruthy()
    const confirmButton = screen.getByRole('button', { name: 'Eliminar' })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
