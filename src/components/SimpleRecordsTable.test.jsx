import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import SimpleRecordsTable from './SimpleRecordsTable'

afterEach(cleanup)

describe('SimpleRecordsTable', () => {
  test('deshabilita eliminar para el registro que se está borrando', () => {
    render(
      <SimpleRecordsTable
        fields={[{ name: 'alias', type: 'text' }]}
        records={[{ id: 4, alias: 'Acabado A' }]}
        database={{}}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        selectedTableName="ACABADO"
        isDeletePending={(index) => index === 0}
      />,
    )

    expect(screen.getByRole('button', { name: 'Eliminando...' }).disabled).toBe(true)
  })

  test('muestra la acción contextual recibida para un registro en uso', () => {
    const onRecordAction = vi.fn()

    render(
      <SimpleRecordsTable
        fields={[{ name: 'alias', type: 'text' }]}
        records={[{ id: 4, alias: 'Acabado A' }]}
        database={{}}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        onRecordAction={onRecordAction}
        getRecordActions={() => [{ kind: 'archive', label: 'Archivar' }]}
        selectedTableName="ACABADO"
      />,
    )

    expect(screen.getByRole('button', { name: 'Archivar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    expect(onRecordAction).toHaveBeenCalledWith('archive', 0)
  })

  test('usa el índice original para una acción sobre una fila filtrada', () => {
    const onRecordAction = vi.fn()

    render(
      <SimpleRecordsTable
        fields={[{ name: 'alias', type: 'text' }]}
        records={[{ id: 9, alias: 'Resultado', sourceIndex: 4 }]}
        database={{}}
        onOpenRecord={vi.fn()}
        onDelete={vi.fn()}
        onRecordAction={onRecordAction}
        getRecordActions={() => [{ kind: 'archive', label: 'Archivar' }]}
        selectedTableName="ACABADO"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))

    expect(onRecordAction).toHaveBeenCalledWith('archive', 4)
  })
})
