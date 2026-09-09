function createUuidFromRandomValues() {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function generateUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return createUuidFromRandomValues()
  }

  throw new Error('El navegador no soporta las APIs criptograficas necesarias para generar identificadores.')
}

export function ensureCryptoRandomUuid() {
  if (typeof globalThis.crypto === 'undefined') {
    return
  }

  if (typeof globalThis.crypto.randomUUID === 'function') {
    return
  }

  if (typeof globalThis.crypto.getRandomValues !== 'function') {
    return
  }

  globalThis.crypto.randomUUID = createUuidFromRandomValues
}
