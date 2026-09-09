import { assertSupabaseConfigured } from '../lib/supabaseClient'
import { generateUuid } from './cryptoPolyfills'

const DB_NAME = 'probetas-files'
const STORE_NAME = 'attachments'
const DB_VERSION = 1
const PDF_BUCKET = import.meta.env.VITE_SUPABASE_PDF_BUCKET ?? 'pdfs'

function sanitizePathSegment(value, fallback = 'documento') {
  const normalized = String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return normalized || fallback
}

function sanitizeFileName(value) {
  const normalized = String(value ?? 'documento.pdf')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  const safeName = normalized || 'documento.pdf'
  return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`
}

function isRemoteAttachmentPath(value) {
  return typeof value === 'string' && value.includes('/')
}

function buildRemoteAttachmentMetadata(path, overrides = {}) {
  const pathSegments = String(path ?? '').split('/')
  const rawName = pathSegments[pathSegments.length - 1] ?? 'documento.pdf'

  return {
    id: path,
    path,
    name: rawName,
    size: null,
    type: 'application/pdf',
    updatedAt: null,
    isRemote: true,
    ...overrides,
  }
}

function isMissingLocalAttachmentError(error) {
  return error instanceof Error && error.message.includes('almacen local')
}

function buildStoragePath({ tableName, fieldName, fileName }) {
  const recordId = generateUuid()

  return [
    sanitizePathSegment(tableName, 'documentos'),
    sanitizePathSegment(fieldName, 'pdf'),
    recordId,
    sanitizeFileName(fileName),
  ].join('/')
}

function triggerBrowserDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'documento.pdf'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function openDatabase() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(
      new Error('Este navegador no permite usar almacenamiento local de archivos.'),
    )
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('No se pudo abrir el almacen local de archivos.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function runTransaction(mode, handler) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)

        transaction.oncomplete = () => {
          database.close()
        }
        transaction.onerror = () => {
          reject(new Error('No se pudo completar la operacion con archivos locales.'))
          database.close()
        }

        handler(store, resolve, reject)
      }),
  )
}

export function isPdfField(field) {
  return field.name.includes('pdf')
}

export function listAttachmentMetadata() {
  return runTransaction('readonly', (store, resolve, reject) => {
    const request = store.getAll()

    request.onerror = () => reject(new Error('No se pudo leer el indice de archivos locales.'))
    request.onsuccess = () => {
      const index = Object.fromEntries(
        request.result.map(({ id, name, size, type, updatedAt }) => [
          id,
          { id, name, size, type, updatedAt },
        ]),
      )

      resolve(index)
    }
  })
}

async function saveRemoteAttachment(file, options = {}) {
  const supabase = assertSupabaseConfigured()
  const fileName = sanitizeFileName(options.fileName ?? file.name)
  const path = buildStoragePath({
    tableName: options.tableName,
    fieldName: options.fieldName,
    fileName,
  })

  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'application/pdf',
    upsert: false,
  })

  if (error) {
    throw new Error(`No se pudo subir el PDF a Supabase Storage: ${error.message}`)
  }

  return buildRemoteAttachmentMetadata(path, {
    name: fileName,
    size: file.size,
    updatedAt: new Date().toISOString(),
  })
}

export function saveAttachment(file, options = {}) {
  if (options.storage === 'local') {
    const customName = options.fileName ?? file.name

    return runTransaction('readwrite', (store, resolve, reject) => {
      const record = {
        id: generateUuid(),
        name: customName,
        type: file.type || 'application/pdf',
        size: file.size,
        updatedAt: new Date().toISOString(),
        blob: file,
      }
      const request = store.put(record)

      request.onerror = () => reject(new Error('No se pudo guardar el PDF localmente.'))
      request.onsuccess = () =>
        resolve({
          id: record.id,
          name: record.name,
          size: record.size,
          type: record.type,
          updatedAt: record.updatedAt,
          isRemote: false,
        })
    })
  }

  return saveRemoteAttachment(file, options)
}

function deleteLocalAttachment(id) {
  return runTransaction('readwrite', (store, resolve, reject) => {
    const request = store.delete(id)

    request.onerror = () => reject(new Error('No se pudo eliminar el PDF local.'))
    request.onsuccess = () => resolve()
  })
}

export async function deleteAttachment(id) {
  if (!id) {
    return
  }

  if (!isRemoteAttachmentPath(id)) {
    return deleteLocalAttachment(id)
  }

  const supabase = assertSupabaseConfigured()
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([id])

  if (error) {
    throw new Error(`No se pudo eliminar el PDF de Supabase Storage: ${error.message}`)
  }
}

function downloadLocalAttachment(id) {
  if (!id) {
    return Promise.reject(new Error('No hay archivo disponible para descargar.'))
  }

  return runTransaction('readonly', (store, resolve, reject) => {
    const request = store.get(id)

    request.onerror = () => reject(new Error('No se pudo leer el PDF local.'))
    request.onsuccess = () => {
      const attachment = request.result

      if (!attachment?.blob) {
        reject(new Error('El PDF ya no esta disponible en el almacen local.'))
        return
      }

      triggerBrowserDownload(attachment.blob, attachment.name)
      resolve()
    }
  })
}

export async function downloadAttachment(id) {
  if (!id) {
    throw new Error('No hay archivo disponible para descargar.')
  }

  if (!isRemoteAttachmentPath(id)) {
    try {
      return await downloadLocalAttachment(id)
    } catch (error) {
      if (!isMissingLocalAttachmentError(error)) {
        throw error
      }
    }
  }

  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(id)

  if (error) {
    throw new Error(`No se pudo descargar el PDF desde Supabase Storage: ${error.message}`)
  }

  triggerBrowserDownload(data, buildRemoteAttachmentMetadata(id).name)
}

export async function previewAttachment(id) {
  if (!id) {
    throw new Error('No hay archivo disponible para visualizar.')
  }

  const previewTab = window.open('', '_blank')

  if (!previewTab) {
    throw new Error('El navegador ha bloqueado la nueva pestaña del PDF.')
  }

  previewTab.opener = null
  previewTab.document.title = 'Cargando PDF...'

  try {
    const supabase = assertSupabaseConfigured()
    const { data, error } = await supabase.storage.from(PDF_BUCKET).download(id)

    if (error) {
      throw new Error(`No se pudo abrir el PDF desde Supabase Storage: ${error.message}`)
    }

    const previewUrl = window.URL.createObjectURL(data)
    previewTab.document.title = buildRemoteAttachmentMetadata(id).name
    previewTab.location.href = previewUrl
    previewTab.addEventListener('beforeunload', () => window.URL.revokeObjectURL(previewUrl), {
      once: true,
    })
  } catch (error) {
    previewTab.close()
    throw error
  }
}

export function getAttachmentMetadata(id) {
  if (!id || !isRemoteAttachmentPath(id)) {
    return null
  }

  return buildRemoteAttachmentMetadata(id)
}

export function isRemoteAttachmentId(value) {
  return isRemoteAttachmentPath(value)
}

export function getPdfBucketName() {
  return PDF_BUCKET
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return 'PDF'
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}
