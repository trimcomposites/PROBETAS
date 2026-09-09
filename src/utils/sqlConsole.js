import { createBaseRecord } from './records'

function splitCsv(input) {
  const values = []
  let current = ''
  let quote = null

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if ((char === "'" || char === '"') && input[index - 1] !== '\\') {
      if (quote === char) {
        quote = null
      } else if (!quote) {
        quote = char
      }
      current += char
      continue
    }

    if (char === ',' && !quote) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim() !== '') {
    values.push(current.trim())
  }

  return values
}

function splitStatements(input) {
  const statements = []
  let current = ''
  let quote = null

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if ((char === "'" || char === '"') && input[index - 1] !== '\\') {
      if (quote === char) {
        quote = null
      } else if (!quote) {
        quote = char
      }
      current += char
      continue
    }

    if (char === ';' && !quote) {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

function parseLiteral(rawValue) {
  const value = rawValue.trim()

  if (/^null$/i.test(value)) return null
  if (/^true$/i.test(value)) return true
  if (/^false$/i.test(value)) return false
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  const numberValue = Number(value)
  if (!Number.isNaN(numberValue) && value !== '') {
    return numberValue
  }

  return value
}

function parseAssignments(input) {
  return Object.fromEntries(
    splitCsv(input).map((entry) => {
      const [rawKey, ...rest] = entry.split('=')
      return [rawKey.trim(), parseLiteral(rest.join('='))]
    }),
  )
}

function parseWhere(input) {
  if (!input) return null

  const [rawKey, ...rest] = input.split('=')
  return {
    field: rawKey.trim(),
    value: parseLiteral(rest.join('=')),
  }
}

function matchesWhere(record, whereClause) {
  if (!whereClause) return true
  return record[whereClause.field] === whereClause.value
}

function getTable(schemaTables, tableName) {
  return schemaTables.find((table) => table.name === tableName)
}

export function executeSqlQuery(database, sql, schemaTables) {
  const statements = splitStatements(sql)

  if (!statements.length) {
    return {
      nextDatabase: database,
      output: 'Consulta vacia.',
    }
  }

  let currentDatabase = database
  const outputs = []

  for (const statement of statements) {
    const result = executeSingleStatement(currentDatabase, statement, schemaTables)
    currentDatabase = result.nextDatabase
    outputs.push(`> ${statement}\n${result.output}`)
  }

  return {
    nextDatabase: currentDatabase,
    output: outputs.join('\n\n'),
  }
}

function executeSingleStatement(database, statement, schemaTables) {
  const normalizedStatement = statement.trim().replace(/;$/, '')

  if (/^help$/i.test(normalizedStatement)) {
    return {
      nextDatabase: database,
      output:
        'Comandos soportados: SHOW TABLES, SELECT * FROM tabla [WHERE campo=valor], INSERT INTO tabla (... ) VALUES (...), UPDATE tabla SET ... [WHERE ...], DELETE FROM tabla [WHERE ...].',
    }
  }

  if (/^show tables$/i.test(normalizedStatement)) {
    return {
      nextDatabase: database,
      output: schemaTables.map((table) => table.name).join('\n'),
    }
  }

  const selectMatch = normalizedStatement.match(
    /^select\s+\*\s+from\s+([A-Z0-9_-]+)(?:\s+where\s+([\s\S]+))?$/i,
  )
  if (selectMatch) {
    const [, tableName, whereRaw] = selectMatch
    const table = getTable(schemaTables, tableName)
    if (!table) throw new Error(`Tabla no encontrada: ${tableName}`)

    const whereClause = parseWhere(whereRaw)
    const rows = (database[tableName] ?? []).filter((record) =>
      matchesWhere(record, whereClause),
    )

    return {
      nextDatabase: database,
      output: JSON.stringify(rows, null, 2),
    }
  }

  const insertMatch = normalizedStatement.match(
    /^insert\s+into\s+([A-Z0-9_-]+)\s*\(([\s\S]+)\)\s*values\s*\(([\s\S]+)\)$/i,
  )
  if (insertMatch) {
    const [, tableName, columnsRaw, valuesRaw] = insertMatch
    const table = getTable(schemaTables, tableName)
    if (!table) throw new Error(`Tabla no encontrada: ${tableName}`)

    const columns = splitCsv(columnsRaw)
    const values = splitCsv(valuesRaw).map(parseLiteral)

    if (columns.length !== values.length) {
      throw new Error('El numero de columnas y valores no coincide.')
    }

    const baseRecord = createBaseRecord(table)
    const insertedRecord = { ...baseRecord }
    columns.forEach((column, index) => {
      insertedRecord[column] = values[index]
    })

    return {
      nextDatabase: {
        ...database,
        [tableName]: [...(database[tableName] ?? []), insertedRecord],
      },
      output: `1 fila insertada en ${tableName}.`,
    }
  }

  const updateMatch = normalizedStatement.match(
    /^update\s+([A-Z0-9_-]+)\s+set\s+([\s\S]+?)(?:\s+where\s+([\s\S]+))?$/i,
  )
  if (updateMatch) {
    const [, tableName, setRaw, whereRaw] = updateMatch
    const table = getTable(schemaTables, tableName)
    if (!table) throw new Error(`Tabla no encontrada: ${tableName}`)

    const updates = parseAssignments(setRaw)
    const whereClause = parseWhere(whereRaw)
    let affectedRows = 0

    const nextRows = (database[tableName] ?? []).map((record) => {
      if (!matchesWhere(record, whereClause)) {
        return record
      }
      affectedRows += 1
      return { ...record, ...updates }
    })

    return {
      nextDatabase: {
        ...database,
        [tableName]: nextRows,
      },
      output: `${affectedRows} fila(s) actualizadas en ${tableName}.`,
    }
  }

  const deleteMatch = normalizedStatement.match(
    /^delete\s+from\s+([A-Z0-9_-]+)(?:\s+where\s+(.+))?$/i,
  )
  if (deleteMatch) {
    const [, tableName, whereRaw] = deleteMatch
    const table = getTable(schemaTables, tableName)
    if (!table) throw new Error(`Tabla no encontrada: ${tableName}`)

    const whereClause = parseWhere(whereRaw)
    const currentRows = database[tableName] ?? []
    const nextRows = currentRows.filter((record) => !matchesWhere(record, whereClause))
    const affectedRows = currentRows.length - nextRows.length

    return {
      nextDatabase: {
        ...database,
        [tableName]: nextRows,
      },
      output: `${affectedRows} fila(s) eliminadas de ${tableName}.`,
    }
  }

  throw new Error('Consulta no soportada. Escribe HELP para ver ejemplos.')
}
