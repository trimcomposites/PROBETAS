import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import GlobalRecordSearch from './GlobalRecordSearch'

afterEach(cleanup)

const recipeField = {
  name: 'receta_id',
  label: 'Receta',
  kind: 'reference',
  references: 'RECETAS.id',
}

describe('GlobalRecordSearch', () => {
  test('permite escribir y seleccionar Probeta como único tipo', () => {
    const onSelectTable = vi.fn()

    render(
      <GlobalRecordSearch
        sectionOrder={['PROBETA', 'RECETAS']}
        selectedTableName={null}
        fields={[]}
        database={{}}
        query=""
        filters={[]}
        onSelectTable={onSelectTable}
        onClearTable={vi.fn()}
        onQueryChange={vi.fn()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de registro' }), {
      target: { value: 'probet' },
    })
    fireEvent.click(screen.getByRole('option', { name: 'Probeta' }))

    expect(onSelectTable).toHaveBeenCalledWith('PROBETA')
  })

  test('aplica una relación elegida por su etiqueta visible', () => {
    const onAddFilter = vi.fn()

    render(
      <GlobalRecordSearch
        sectionOrder={['PROBETA']}
        selectedTableName="PROBETA"
        fields={[recipeField]}
        database={{ RECETAS: [{ id: 11, nombre: 'Ciclo Époxi' }] }}
        query=""
        filters={[]}
        onSelectTable={vi.fn()}
        onClearTable={vi.fn()}
        onQueryChange={vi.fn()}
        onAddFilter={onAddFilter}
        onRemoveFilter={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Añadir filtro' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo' }), {
      target: { value: 'receta_id' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Valor de Receta' }), {
      target: { value: '11' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtro' }))

    expect(onAddFilter).toHaveBeenCalledWith(
      expect.objectContaining({ fieldName: 'receta_id', operator: 'equals', value: '11' }),
    )
  })

  test('muestra un botón accesible para retirar un filtro aplicado', () => {
    render(
      <GlobalRecordSearch
        selectedTableName="PROBETA"
        sectionOrder={['PROBETA']}
        fields={[{ name: 'title', label: 'Titulo', kind: 'text' }]}
        database={{}}
        query=""
        filters={[{ id: 'title', fieldName: 'title', operator: 'contains', value: 'A-01' }]}
        onSelectTable={vi.fn()}
        onClearTable={vi.fn()}
        onQueryChange={vi.fn()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Eliminar filtro.*Titulo/i })).toBeTruthy()
  })
})
