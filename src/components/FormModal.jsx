import { useRef, useState } from 'react'

function FormModal({ title, mode, onClose, onSubmit, onSaveDraft, onDiscard, submitLabel, children }) {
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const isCreateMode = mode === 'create'
  const isViewMode = mode === 'view'
  const isManageMode = mode === 'manage'
  const kicker = isCreateMode ? 'Nuevo registro' : isViewMode ? 'Detalle del registro' : isManageMode ? 'Administracion' : 'Editar registro'

  function requestClose() {
    if (isSubmitting) {
      return
    }

    if (isCreateMode) {
      setIsDiscardConfirmationOpen(true)
      return
    }

    onClose()
  }

  async function runSubmitAction(action) {
    if (isSubmittingRef.current || !action) {
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      await action()
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await runSubmitAction(() => onSubmit?.(event))
  }

  return (
    <div
      className="form-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section className="form-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={requestClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <form className="crud-form" onSubmit={onSubmit ? handleSubmit : undefined}>
          {children}
          {isManageMode ? null : (
            <div className="form-footer">
              <button type="button" className="ghost-button" onClick={requestClose} disabled={isSubmitting}>
                {isViewMode ? 'Cerrar' : 'Cancelar'}
              </button>
              {isViewMode ? null : (
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Guardando...'
                    : submitLabel ?? (isCreateMode ? 'Guardar registro' : 'Guardar cambios')}
                </button>
              )}
            </div>
          )}
        </form>
      </section>

      {isDiscardConfirmationOpen ? (
        <div className="discard-confirmation-overlay">
          <section
            className="discard-confirmation-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Descartar registro nuevo"
          >
            <p className="section-kicker">Cambios sin guardar</p>
            <h3>¿Descartar el registro nuevo?</h3>
            <p>Se perderán todos los datos introducidos en este formulario.</p>
            <div className="discard-confirmation-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={isSubmitting}
                onClick={() => setIsDiscardConfirmationOpen(false)}
              >
                Seguir editando
              </button>
              {isCreateMode && onSaveDraft ? (
                <button
                  type="button"
                  className="primary-button"
                  disabled={isSubmitting}
                  onClick={() => runSubmitAction(onSaveDraft)}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar borrador'}
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-button destructive-button"
                disabled={isSubmitting}
                onClick={() => (onDiscard ? runSubmitAction(onDiscard) : onClose())}
              >
                Descartar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default FormModal
