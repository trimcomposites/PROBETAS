import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import PdfReviewCell from './PdfReviewCell'

afterEach(cleanup)

describe('PdfReviewCell', () => {
  test('muestra las acciones y la fecha de revisión sin exponer el nombre del PDF', () => {
    const onPreview = vi.fn()
    const onDownload = vi.fn()

    render(
      <PdfReviewCell
        attachmentId="pdfs/Informe técnico.pdf"
        fileName="Informe técnico.pdf"
        reviewDate="2026-09-10"
        onPreview={onPreview}
        onDownload={onDownload}
      />,
    )

    expect(screen.getByText('Revisión: 10/09/2026')).toBeTruthy()
    expect(screen.queryByText('Informe técnico.pdf')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver' }))
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }))

    expect(onPreview).toHaveBeenCalledWith('pdfs/Informe técnico.pdf')
    expect(onDownload).toHaveBeenCalledWith('pdfs/Informe técnico.pdf')
  })
})
