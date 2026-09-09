import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import FormModal from './FormModal'

afterEach(cleanup)

describe('FormModal', () => {
  test('envía el formulario una sola vez mientras el guardado está pendiente', async () => {
    let finishSave
    const onSubmit = vi.fn(
      () =>
        new Promise((resolve) => {
          finishSave = resolve
        }),
    )
    const { container } = render(
      <FormModal title="Nueva probeta" mode="create" onClose={vi.fn()} onSubmit={onSubmit}>
        <label>
          Título
          <input defaultValue="Probeta en proceso" />
        </label>
      </FormModal>,
    )

    const form = container.querySelector('form')
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Guardando...' }).disabled).toBe(true)

    finishSave()
  })

  test('pide confirmación antes de descartar un registro nuevo al pulsar fuera', () => {
    const onClose = vi.fn()
    const { container } = render(
      <FormModal title="Nueva probeta" mode="create" onClose={onClose} onSubmit={vi.fn()}>
        <label>
          Título
          <input defaultValue="Probeta en proceso" />
        </label>
      </FormModal>,
    )

    fireEvent.click(container.querySelector('.form-overlay'))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Descartar registro nuevo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descartar' }).className).toContain('destructive-button')

    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByRole('dialog', { name: 'Descartar registro nuevo' })).toBeNull()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('.form-overlay'))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('permite guardar un borrador desde la confirmación de cierre', async () => {
    const onClose = vi.fn()
    const onSaveDraft = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <FormModal
        title="Nueva probeta"
        mode="create"
        onClose={onClose}
        onSaveDraft={onSaveDraft}
        onSubmit={vi.fn()}
      >
        <label>
          Título
          <input defaultValue="Probeta en proceso" />
        </label>
      </FormModal>,
    )

    fireEvent.click(container.querySelector('.form-overlay'))

    expect(screen.getByRole('button', { name: 'Seguir editando' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('usa el descarte específico cuando el formulario continúa un borrador', async () => {
    const onClose = vi.fn()
    const onDiscard = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <FormModal
        title="Borrador de probeta"
        mode="create"
        onClose={onClose}
        onDiscard={onDiscard}
        onSubmit={vi.fn()}
      >
        <input defaultValue="Probeta en proceso" aria-label="Título" />
      </FormModal>,
    )

    fireEvent.click(container.querySelector('.form-overlay'))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    await waitFor(() => expect(onDiscard).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
  })
})
