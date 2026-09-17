import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import SimpleSectionForm from './SimpleSectionForm'

afterEach(cleanup)

describe('SimpleSectionForm', () => {
  test('marca el campo identificado por el error', () => {
    render(
      <SimpleSectionForm
        fields={[{ name: 'nombre' }]}
        fieldErrors={{ nombre: true }}
        renderFieldControl={() => <input type="text" />}
      />,
    )

    expect(screen.getByRole('textbox').closest('.form-field').className).toContain('has-field-error')
  })

  test('identifica los campos obligatorios', () => {
    render(
      <SimpleSectionForm
        fields={[{ name: 'fabricante_id', required: true }]}
        renderFieldControl={() => <select required><option value="">Selecciona una opcion</option></select>}
      />,
    )

    expect(screen.getByText('Fabricante *')).toBeTruthy()
  })
})
