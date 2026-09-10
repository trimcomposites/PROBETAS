import { useEffect, useRef, useState } from 'react'

function SectionTable({
  title,
  children,
  onCreate,
  hasRecords,
  statusMessage,
  canCreate = true,
  headerActions,
}) {
  const tableWrapRef = useRef(null)
  const topScrollRef = useRef(null)
  const [tableWidth, setTableWidth] = useState(0)

  useEffect(() => {
    const tableWrap = tableWrapRef.current
    if (!tableWrap) return undefined

    function updateScrollWidth() {
      setTableWidth(tableWrap.scrollWidth)

      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = tableWrap.scrollLeft
      }
    }

    updateScrollWidth()

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollWidth)
    resizeObserver?.observe(tableWrap)
    tableWrap.querySelector('table') && resizeObserver?.observe(tableWrap.querySelector('table'))

    return () => resizeObserver?.disconnect()
  }, [children])

  function syncFromTopScroll(event) {
    if (tableWrapRef.current) {
      tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
  }

  function syncFromTableScroll(event) {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
  }

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

      {hasRecords ? (
        <div
          ref={topScrollRef}
          className="table-scroll-top"
          aria-label="Desplazamiento horizontal de la tabla"
          onScroll={syncFromTopScroll}
          tabIndex="0"
        >
          <div className="table-scroll-top-spacer" style={{ width: tableWidth }} />
        </div>
      ) : null}
      <div ref={tableWrapRef} className="table-wrap" onScroll={syncFromTableScroll}>
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
