import { formatCellValue } from '../utils/records'
import { getFieldLabel } from '../utils/labels'

function SimpleRecordsTable({
  fields,
  records,
  database,
  onOpenRecord,
  onDelete,
  onRecordAction,
  getRecordActions,
  selectedTableName,
  renderCellValue,
  primaryActionLabel = 'Editar',
  canDelete = true,
  isDeletePending = () => false,
  isActionPending = () => false,
}) {
  function getActions(record, sourceIndex) {
    if (getRecordActions) {
      return getRecordActions(record, sourceIndex)
    }

    return canDelete ? [{ kind: 'delete', label: 'Eliminar' }] : []
  }

  function handleAction(kind, sourceIndex) {
    if (onRecordAction) {
      onRecordAction(kind, sourceIndex)
      return
    }

    if (kind === 'delete') {
      onDelete(sourceIndex)
    }
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {fields.map((field) => (
            <th key={field.name}>{getFieldLabel(field.name)}</th>
          ))}
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => {
          const sourceIndex = record.sourceIndex ?? index

          return (
            <tr key={`${selectedTableName}-${record.id ?? sourceIndex}-${sourceIndex}`}>
              {fields.map((field) => (
                <td key={`${sourceIndex}-${field.name}`}>
                  {renderCellValue
                    ? renderCellValue(field, record, sourceIndex)
                    : formatCellValue(field, record[field.name], database)}
                </td>
              ))}
              <td className="actions-cell">
                <div className="actions-group">
                  <button type="button" className="inline-button" onClick={() => onOpenRecord(sourceIndex)}>
                    {primaryActionLabel}
                  </button>
                  {getActions(record, sourceIndex).map((action) => {
                    const isPending =
                      action.kind === 'delete'
                        ? isDeletePending(sourceIndex)
                        : isActionPending(action.kind, sourceIndex)

                    return (
                      <button
                        key={action.kind}
                        type="button"
                        className={`inline-button ${action.kind === 'delete' ? 'danger' : action.kind === 'archive' ? 'archive' : ''}`.trim()}
                        onClick={() => handleAction(action.kind, sourceIndex)}
                        disabled={isPending}
                      >
                        {isPending && action.kind === 'delete' ? 'Eliminando...' : action.label}
                      </button>
                    )
                  })}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default SimpleRecordsTable
