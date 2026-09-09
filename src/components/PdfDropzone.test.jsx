import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import PdfDropzone from './PdfDropzone'

afterEach(cleanup)

describe('PdfDropzone', () => {
  test('permite abrir el PDF en una pestaña nueva', () => {
    const onPreviewFile = vi.fn()

    render(
      <PdfDropzone
        fileMetadata={{ id: 'material/pdf_mds/ficha.pdf', name: 'ficha.pdf', size: 1024 }}
        onSelectFile={vi.fn()}
        onClearFile={vi.fn()}
        onDownloadFile={vi.fn()}
        onPreviewFile={onPreviewFile}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ver' }))

    expect(onPreviewFile).toHaveBeenCalledTimes(1)
  })
})
