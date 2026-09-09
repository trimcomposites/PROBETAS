export function createOperationGate() {
  const pendingKeys = new Set()

  return {
    async run(key, operation) {
      if (pendingKeys.has(key)) {
        return false
      }

      pendingKeys.add(key)

      try {
        await operation()
        return true
      } finally {
        pendingKeys.delete(key)
      }
    },
  }
}
