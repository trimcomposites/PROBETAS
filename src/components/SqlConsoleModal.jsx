import { useState } from 'react'

function SqlConsoleModal({ onClose, onRun }) {
  const [query, setQuery] = useState('SELECT * FROM RECETAS;')
  const [output, setOutput] = useState('Escribe HELP para ver comandos disponibles.')

  function handleSubmit(event) {
    event.preventDefault()
    const result = onRun(query)
    setOutput(result)
  }

  return (
    <div className="form-overlay" onClick={onClose}>
      <section className="form-panel sql-console-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="section-kicker">Terminal SQL</p>
            <h2>Consola de base local</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form className="sql-console-form" onSubmit={handleSubmit}>
          <textarea
            className="sql-console-input"
            rows="6"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            spellCheck="false"
          />

          <div className="sql-console-actions">
            <button type="submit" className="primary-button">
              Ejecutar
            </button>
            <span className="sql-console-hint">
              Soporta `SHOW TABLES`, `SELECT`, `INSERT`, `UPDATE` y `DELETE`.
            </span>
          </div>
        </form>

        <div className="sql-console-output">
          <pre>{output}</pre>
        </div>
      </section>
    </div>
  )
}

export default SqlConsoleModal
