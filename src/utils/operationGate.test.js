import { describe, expect, test } from 'vitest'
import { createOperationGate } from './operationGate'

describe('createOperationGate', () => {
  test('ignora una segunda operación con la misma clave mientras la primera sigue pendiente', async () => {
    const gate = createOperationGate()
    let resolveFirstOperation
    let calls = 0
    const firstOperation = gate.run('delete:PROBETA:8', async () => {
      calls += 1
      await new Promise((resolve) => {
        resolveFirstOperation = resolve
      })
    })
    const secondOperation = gate.run('delete:PROBETA:8', async () => {
      calls += 1
    })

    expect(await secondOperation).toBe(false)
    expect(calls).toBe(1)

    resolveFirstOperation()
    expect(await firstOperation).toBe(true)
    expect(await gate.run('delete:PROBETA:8', async () => { calls += 1 })).toBe(true)
    expect(calls).toBe(2)
  })
})
