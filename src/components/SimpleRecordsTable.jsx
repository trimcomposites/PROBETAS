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
  function getActions(record, index) {
    if (getRecordActions) {
      return getRecordActions(record, index)
    }

    return canDelete ? [{ kind: 'delete', label: 'Eliminar' }] : []
  }

  function handleAction(kind, index) {
    if (onRecordAction) {
      onRecordAction(kind, index)
      return
    }

    if (kind === 'delete') {
      onDelete(index)
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
        {records.map((record, index) => (
          <tr key={`${selectedTableName}-${index}`}>
            {fields.map((field) => (
              <td key={`${index}-${field.name}`}>
                {renderCellValue
                  ? renderCellValue(field, record, index)
                  : formatCellValue(field, record[field.name], database)}
              </td>
            ))}
            <td className="actions-cell">
              <div className="actions-group">
                <button type="button" className="inline-button" onClick={() => onOpenRecord(index)}>
                  {primaryActionLabel}
                </button>
                {getActions(record, index).map((action) => {
                  const isPending =
                    action.kind === 'delete' ? isDeletePending(index) : isActionPending(action.kind, index)

                  return (
                    <button
                      key={action.kind}
                      type="button"
                      className={`inline-button ${action.kind === 'delete' ? 'danger' : action.kind === 'archive' ? 'archive' : ''}`.trim()}
                      onClick={() => handleAction(action.kind, index)}
                      disabled={isPending}
                    >
                      {isPending && action.kind === 'delete' ? 'Eliminando...' : action.label}
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

export default SimpleRecordsTable
