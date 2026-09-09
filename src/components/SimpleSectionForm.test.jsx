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
})
