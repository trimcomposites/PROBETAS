import { afterEach, describe, expect, test, vi } from 'vitest'

const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null } }))

vi.mock('../lib/supabaseClient', () => ({
  assertSupabaseConfigured: () => supabaseState.client,
}))

import { previewAttachment, saveAttachment } from './fileStorage'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('previewAttachment', () => {
  test('abre una pestaña con el PDF remoto sin descargarlo', async () => {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' })
    const download = vi.fn().mockResolvedValue({ data: pdf, error: null })
    const previewTab = {
      document: { title: '' },
      location: { href: '' },
      addEventListener: vi.fn(),
      close: vi.fn(),
    }
    supabaseState.client = { storage: { from: () => ({ download }) } }
    vi.spyOn(window, 'open').mockReturnValue(previewTab)
    vi.stubGlobal('URL', { ...window.URL, createObjectURL: vi.fn(() => 'blob:pdf-preview') })

    await previewAttachment('PRE-IMPREGNADO/pdf_mds/material.pdf')

    expect(download).toHaveBeenCalledWith('PRE-IMPREGNADO/pdf_mds/material.pdf')
    expect(previewTab.location.href).toBe('blob:pdf-preview')
    expect(previewTab.close).not.toHaveBeenCalled()
  })
})

describe('saveAttachment', () => {
  test('conserva sin cambios el nombre original al subir un PDF remoto', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const file = new File(['pdf'], 'Informe revisión (final).PDF', {
      type: 'application/pdf',
    })
    supabaseState.client = { storage: { from: () => ({ upload }) } }

    const metadata = await saveAttachment(file, {
      tableName: 'PROBETAS',
      fieldName: 'pdf_mds_url',
    })

    const [path, uploadedFile] = upload.mock.calls[0]
    expect(path).toMatch(
      /^probetas\/pdf_mds_url\/[^/]+\/Informe revisión \(final\)\.PDF$/,
    )
    expect(uploadedFile).toBe(file)
    expect(metadata.name).toBe('Informe revisión (final).PDF')
  })
})
