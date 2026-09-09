function SectionTable({
  title,
  children,
  onCreate,
  hasRecords,
  statusMessage,
  canCreate = true,
  headerActions,
}) {
  return (
    <section className="schema-panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Seccion</p>
          <h2>{title}</h2>
        </div>
        <div className="panel-header-actions">
          {headerActions}
          {canCreate ? (
            <button type="button" className="primary-button" onClick={onCreate}>
              Nuevo registro
            </button>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        {hasRecords ? (
          children
        ) : (
          <div className="empty-table">
            <p className="empty-state">
              {statusMessage ?? 'Todavia no hay registros en esta seccion.'}
            </p>
            {statusMessage || !canCreate ? null : (
              <button type="button" className="ghost-button" onClick={onCreate}>
                Crear primer registro
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default SectionTable
