import { getTableLabel } from '../utils/labels'

function SectionSidebar({ sectionOrder, selectedTableName, database, onSelect }) {
  return (
    <aside className="table-list-panel">
      <div className="panel-header">
        <h2>Secciones</h2>
      </div>
      <div className="table-list">
        {sectionOrder.map((tableName) => {
          const isActive = tableName === selectedTableName

          return (
            <button
              key={tableName}
              type="button"
              className={`table-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(tableName)}
            >
              <strong>{getTableLabel(tableName)}</strong>
              <span>{(database[tableName] ?? []).length} registros</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default SectionSidebar
