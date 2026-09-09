import { afterEach, describe, expect, test, vi } from 'vitest'

const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null } }))

vi.mock('../lib/supabaseClient', () => ({
  assertSupabaseConfigured: () => supabaseState.client,
}))

import { previewAttachment } from './fileStorage'

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
