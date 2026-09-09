import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ProbetaRecordsTable from './ProbetaRecordsTable'

afterEach(cleanup)

describe('ProbetaRecordsTable', () => {
  test('deshabilita eliminar para la probeta que se está borrando', () => {
    render(
      <ProbetaRecordsTable
        records={[{ id: 8, title: 'P-08' }]}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        isDeletePending={(index) => index === 0}
      />,
    )

    expect(screen.getByRole('button', { name: 'Eliminando...' }).disabled).toBe(true)
  })

  test('identifica un borrador y permite continuarlo o descartarlo', () => {
    render(
      <ProbetaRecordsTable
        records={[{ id: 'draft-1', isDraft: true, title: 'Borrador sin título', capas: 1 }]}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        canDelete={false}
      />,
    )

    expect(screen.getByText('Borrador')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()
  })

  test('permite eliminar y archivar una probeta activa', () => {
    const onRecordAction = vi.fn()

    render(
      <ProbetaRecordsTable
        records={[{ id: 8, title: 'P-08' }]}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        onRecordAction={onRecordAction}
        getRecordActions={() => [
          { kind: 'archive', label: 'Archivar' },
          { kind: 'delete', label: 'Eliminar' },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onRecordAction).toHaveBeenNthCalledWith(1, 'archive', 0)
    expect(onRecordAction).toHaveBeenNthCalledWith(2, 'delete', 0)
  })
})
