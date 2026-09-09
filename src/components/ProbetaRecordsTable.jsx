function ProbetaRecordsTable({
  records,
  onOpenRecord,
  onDelete,
  onRecordAction,
  getRecordActions,
  primaryActionLabel = 'Editar',
  canDelete = true,
  isDeletePending = () => false,
  isActionPending = () => false,
}) {
  const columns = [
    { key: 'title', label: 'Probeta' },
    { key: 'status', label: 'Estado' },
    { key: 'capas', label: 'Capas' },
    { key: 'espesor', label: 'Espesor medio' },
    { key: 'density', label: 'Densidad [g/cm3]' },
  ]

  function getActions(record, index) {
    if (getRecordActions) {
      return getRecordActions(record, index)
    }

    if (record.isDraft) {
      return [{ kind: 'discard', label: 'Descartar' }]
    }

    return canDelete ? [{ kind: 'delete', label: 'Eliminar' }] : []
  }

  function handleAction(kind, index) {
    if (onRecordAction) {
      onRecordAction(kind, index)
      return
    }

    if (kind === 'delete' || kind === 'discard') {
      onDelete(index)
    }
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => (
          <tr key={`PROBETA-${index}`}>
            {columns.map((column) => (
              <td key={`${index}-${column.key}`}>
                {column.key === 'status' ? (
                  <span className={`status-badge ${record.isDraft ? 'draft' : 'approved'}`}>
                    {record.isDraft ? 'Borrador' : 'Completada'}
                  </span>
                ) : (
                  record[column.key] || 'Sin dato'
                )}
              </td>
            ))}
            <td className="actions-cell">
              <div className="actions-group">
                <button type="button" className="inline-button" onClick={() => onOpenRecord(index)}>
                  {record.isDraft ? 'Continuar' : primaryActionLabel}
                </button>
                {getActions(record, index).map((action) => {
                  const isPending =
                    action.kind === 'delete' || action.kind === 'discard'
                      ? isDeletePending(index)
                      : isActionPending(action.kind, index)
                  const pendingLabel =
                    action.kind === 'discard'
                      ? 'Descartando...'
                      : action.kind === 'delete'
                        ? 'Eliminando...'
                        : action.label

                  return (
                    <button
                      key={action.kind}
                      type="button"
                      className={`inline-button ${action.kind === 'delete' || action.kind === 'discard' ? 'danger' : action.kind === 'archive' ? 'archive' : ''}`.trim()}
                      onClick={() => handleAction(action.kind, index)}
                      disabled={isPending}
                    >
                      {isPending ? pendingLabel : action.label}
                    </button>
                  )
                })}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ProbetaRecordsTable
