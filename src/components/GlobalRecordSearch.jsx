import { useMemo, useState } from 'react'
import { getFieldLabel, getTableLabel } from '../utils/labels'
import {
  getOperatorsForSearchField,
  getReferenceOptions,
  normalizeSearchText,
} from '../utils/recordSearch'

function getFilterDescription(filter, fields, database) {
  const field = fields.find((item) => item.name === filter.fieldName)
  const operator = getOperatorsForSearchField(field).find((item) => item.value === filter.operator)
  let value = filter.value

  if (field?.kind === 'reference') {
    value = getReferenceOptions(field, database).find((item) => item.value === String(filter.value))?.label ?? value
  }

  if (field?.kind === 'boolean') {
    value = filter.value === true || filter.value === 'true' ? 'Sí' : 'No'
  }

  return [field?.label ?? getFieldLabel(filter.fieldName), operator?.label, value]
    .filter((item) => item !== '' && item !== undefined && item !== null)
    .join(' ')
}

function matchesTypeQuery(tableName, query) {
  const normalizedLabel = normalizeSearchText(getTableLabel(tableName)).replace(/[^a-z0-9]/g, '')
  const normalizedQuery = normalizeSearchText(query).replace(/[^a-z0-9]/g, '')

  return normalizedLabel.includes(normalizedQuery) || normalizedQuery.includes(normalizedLabel)
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.2 15.2 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function GlobalRecordSearch({
  sectionOrder,
  draftSearch,
  fields,
  fieldGroups,
  database,
  onDraftChange,
  onSubmit,
  onClear,
}) {
  const [typeQuery, setTypeQuery] = useState('')
  const [highlightedTypeIndex, setHighlightedTypeIndex] = useState(0)
  const [isTypeInputActive, setIsTypeInputActive] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [draftFieldName, setDraftFieldName] = useState('')
  const [draftOperator, setDraftOperator] = useState('')
  const [draftValue, setDraftValue] = useState('')
  const [nextFilterId, setNextFilterId] = useState(0)

  const matchingTables = useMemo(
    () => sectionOrder.filter((tableName) => matchesTypeQuery(tableName, typeQuery)),
    [sectionOrder, typeQuery],
  )
  const selectedField = fields.find((field) => field.name === draftFieldName)
  const operators = getOperatorsForSearchField(selectedField)
  const needsValue = selectedField?.kind !== 'pdf'

  function resetFilterEditor() {
    setDraftFieldName('')
    setDraftOperator('')
    setDraftValue('')
  }

  function selectType(tableName) {
    setTypeQuery('')
    setHighlightedTypeIndex(0)
    setIsTypeInputActive(false)
    resetFilterEditor()
    onDraftChange({ tableName, query: '', filters: [] })
  }

  function handleTypeKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedTypeIndex((index) => Math.min(index + 1, matchingTables.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedTypeIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === 'Enter' && matchingTables[highlightedTypeIndex]) {
      event.preventDefault()
      selectType(matchingTables[highlightedTypeIndex])
      return
    }

    if (event.key === 'Escape') {
      setTypeQuery('')
      setHighlightedTypeIndex(0)
      setIsTypeInputActive(false)
    }
  }

  function handleFieldChange(event) {
    const fieldName = event.target.value
    const field = fields.find((item) => item.name === fieldName)

    setDraftFieldName(fieldName)
    setDraftOperator(getOperatorsForSearchField(field)[0]?.value ?? '')
    setDraftValue('')
  }

  function applyFilter() {
    if (!selectedField || !draftOperator || (needsValue && String(draftValue).trim() === '')) {
      return
    }

    onDraftChange({
      ...draftSearch,
      filters: [
        ...draftSearch.filters,
        {
          id: draftFieldName + '-' + nextFilterId,
          fieldName: draftFieldName,
          operator: draftOperator,
          value: draftValue,
        },
      ],
    })
    setNextFilterId((currentId) => currentId + 1)
    resetFilterEditor()
  }

  function toggleGroup(groupId) {
    setActiveGroupId((currentGroupId) => {
      const nextGroupId = currentGroupId === groupId ? null : groupId
      if (nextGroupId !== currentGroupId) {
        resetFilterEditor()
      }
      return nextGroupId
    })
  }

  function removeFilter(filterId) {
    onDraftChange({
      ...draftSearch,
      filters: draftSearch.filters.filter((filter) => filter.id !== filterId),
    })
  }

  return (
    <section className="global-record-search" aria-label="Búsqueda global de registros">
      {draftSearch.tableName ? (
        <>
          <div className="global-record-search-bar">
            <button
              type="button"
              className="global-record-search-type"
              aria-label={'Quitar tipo ' + getTableLabel(draftSearch.tableName)}
              onClick={onClear}
            >
              <span>{getTableLabel(draftSearch.tableName)}</span>
              <span aria-hidden="true">×</span>
            </button>
            <input
              aria-label="Buscar en registros"
              type="search"
              value={draftSearch.query}
              onChange={(event) => onDraftChange({ ...draftSearch, query: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSubmit()
                }
              }}
              placeholder="Buscar texto"
            />
            <button
              type="button"
              className="global-record-search-submit"
              aria-label="Buscar registros"
              onClick={onSubmit}
            >
              <SearchIcon />
            </button>
          </div>

          <div className="global-record-search-groups" aria-label="Grupos de campos">
            {fieldGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={'global-record-search-group' + (activeGroupId === group.id ? ' active' : '')}
                aria-expanded={activeGroupId === group.id}
                onClick={() => toggleGroup(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>

          {draftSearch.filters.length ? (
            <div className="global-record-search-chips" aria-label="Filtros preparados">
              {draftSearch.filters.map((filter) => {
                const description = getFilterDescription(filter, fields, database)

                return (
                  <span key={filter.id} className="global-record-search-chip">
                    {description}
                    <button
                      type="button"
                      aria-label={'Eliminar filtro: ' + description}
                      onClick={() => removeFilter(filter.id)}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          ) : null}

          {activeGroupId ? (
            <div className="global-record-search-filter-editor" onKeyDown={(event) => event.key === 'Escape' && setActiveGroupId(null)}>
              <label>
                <span>Campo</span>
                <select aria-label="Campo" value={draftFieldName} onChange={handleFieldChange}>
                  <option value="">Selecciona una columna</option>
                  {(fieldGroups.find((group) => group.id === activeGroupId)?.fields ?? []).map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedField ? (
                <label>
                  <span>Operador</span>
                  <select
                    aria-label="Operador"
                    value={draftOperator}
                    onChange={(event) => setDraftOperator(event.target.value)}
                  >
                    {operators.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selectedField?.kind === 'reference' ? (
                <label>
                  <span>Valor de {selectedField.label}</span>
                  <select
                    aria-label={'Valor de ' + selectedField.label}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                  >
                    <option value="">Selecciona un registro</option>
                    {getReferenceOptions(selectedField, database).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : selectedField?.kind === 'boolean' ? (
                <label>
                  <span>Valor de {selectedField.label}</span>
                  <select
                    aria-label={'Valor de ' + selectedField.label}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                  >
                    <option value="">Selecciona un valor</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
              ) : selectedField && needsValue ? (
                <label>
                  <span>Valor de {selectedField.label}</span>
                  <input
                    aria-label={'Valor de ' + selectedField.label}
                    type={selectedField.kind === 'date' ? 'date' : selectedField.kind === 'number' ? 'number' : 'text'}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="global-record-search-filter-actions">
                <button type="button" className="ghost-button" onClick={resetFilterEditor}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!selectedField || !draftOperator || (needsValue && String(draftValue).trim() === '')}
                  onClick={applyFilter}
                >
                  Aplicar filtro
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <label className="global-record-search-type-control">
          <span>Tipo de registro</span>
          <input
            role="combobox"
            aria-label="Tipo de registro"
            aria-expanded={isTypeInputActive && matchingTables.length > 0}
            aria-controls="global-record-search-suggestions"
            value={typeQuery}
            onChange={(event) => {
              setTypeQuery(event.target.value)
              setHighlightedTypeIndex(0)
            }}
            onFocus={() => setIsTypeInputActive(true)}
            onBlur={() => setIsTypeInputActive(false)}
            onKeyDown={handleTypeKeyDown}
            placeholder="Buscar registros…"
          />
          {isTypeInputActive && matchingTables.length ? (
            <div id="global-record-search-suggestions" className="global-record-search-suggestions" role="listbox">
              {matchingTables.map((tableName, index) => (
                <button
                  key={tableName}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedTypeIndex}
                  className={index === highlightedTypeIndex ? 'active' : ''}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectType(tableName)}
                >
                  {getTableLabel(tableName)}
                </button>
              ))}
            </div>
          ) : isTypeInputActive ? (
            <p className="global-record-search-hint">No hay tipos de registro que coincidan.</p>
          ) : null}
        </label>
      )}
    </section>
  )
}

export default GlobalRecordSearch
