import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ArchivedRecordsToggle from './ArchivedRecordsToggle'

afterEach(cleanup)

describe('ArchivedRecordsToggle', () => {
  test('muestra un icono accesible para abrir los registros archivados', () => {
    const onToggle = vi.fn()

    render(<ArchivedRecordsToggle isShowingArchived={false} onToggle={onToggle} />)

    const button = screen.getByRole('button', { name: 'Ver archivados' })
    expect(button.getAttribute('title')).toBe('Ver archivados')
    expect(button.textContent).not.toContain('Archivados')

    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
