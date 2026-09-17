import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import GlobalRecordSearch from './GlobalRecordSearch'

afterEach(cleanup)

const resultsField = { name: 'largo_mm', label: 'Largo [mm]', kind: 'number' }

function renderSearch(overrides = {}) {
  const props = {
    sectionOrder: ['PROBETA', 'RECETAS'],
    draftSearch: { tableName: null, query: '', filters: [] },
    fields: [],
    fieldGroups: [],
    database: {},
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }

  render(<GlobalRecordSearch {...props} />)

  return props
}

describe('GlobalRecordSearch', () => {
  test('integra Probeta en la misma barra sin confirmar la búsqueda', () => {
    const { onDraftChange, onSubmit } = renderSearch()

    const input = screen.getByRole('combobox', { name: 'Tipo de registro' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'probetas' } })
    fireEvent.click(screen.getByRole('option', { name: 'Probeta' }))

    expect(onDraftChange).toHaveBeenCalledWith({ tableName: 'PROBETA', query: '', filters: [] })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('solo confirma el borrador al pulsar la lupa', () => {
    const { onSubmit } = renderSearch({
      draftSearch: { tableName: 'PROBETA', query: 'P-01', filters: [] },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Buscar registros' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  test('añade una condición desde Resultados y permite retirarla', () => {
    const onDraftChange = vi.fn()
    renderSearch({
      draftSearch: { tableName: 'PROBETA', query: '', filters: [] },
      fields: [resultsField],
      fieldGroups: [{ id: 'results', label: 'Resultados', fields: [resultsField] }],
      onDraftChange,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Resultados' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo' }), {
      target: { value: 'largo_mm' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor de Largo [mm]' }), {
      target: { value: '250' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtro' }))

    expect(onDraftChange).toHaveBeenCalledWith({
      tableName: 'PROBETA',
      query: '',
      filters: [{ id: 'largo_mm-0', fieldName: 'largo_mm', operator: 'equals', value: '250' }],
    })

    renderSearch({
      draftSearch: {
        tableName: 'PROBETA',
        query: '',
        filters: [{ id: 'largo_mm-0', fieldName: 'largo_mm', operator: 'equals', value: '250' }],
      },
      fields: [resultsField],
      fieldGroups: [{ id: 'results', label: 'Resultados', fields: [resultsField] }],
      onDraftChange,
    })

    expect(screen.getByRole('button', { name: 'Eliminar filtro: Largo [mm] es 250' })).toBeTruthy()
  })

  test('permite elegir el tipo resaltado con teclado y cerrar sugerencias', () => {
    const { onDraftChange } = renderSearch()

    const input = screen.getByRole('combobox', { name: 'Tipo de registro' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onDraftChange).toHaveBeenCalledWith({ tableName: 'RECETAS', query: '', filters: [] })

    cleanup()
    renderSearch()
    const secondInput = screen.getByRole('combobox', { name: 'Tipo de registro' })
    fireEvent.focus(secondInput)
    fireEvent.keyDown(secondInput, { key: 'Escape' })

    expect(screen.queryByRole('option', { name: 'Probeta' })).toBeNull()
  })
})
