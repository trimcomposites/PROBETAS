import { useRef, useState } from 'react'

const ACTION_CONTENT = {
  delete: {
    title: 'Eliminar registro',
    message: 'Esta acción eliminará el registro y no se puede deshacer.',
    confirmLabel: 'Eliminar',
    confirmClassName: 'destructive-button',
  },
  archive: {
    title: 'Archivar registro',
    message: 'El registro dejará de aparecer en listas y selectores, pero mantendrá las referencias existentes.',
    confirmLabel: 'Archivar',
    confirmClassName: 'archive-button',
  },
  restore: {
    title: 'Restaurar registro',
    message: 'El registro volverá a las listas activas y estará disponible en los selectores.',
    confirmLabel: 'Restaurar',
    confirmClassName: '',
  },
}

function RecordActionConfirmation({ action, recordLabel, isSubmitting, onCancel, onConfirm }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const isConfirmingRef = useRef(false)
  const content = ACTION_CONTENT[action] ?? ACTION_CONTENT.delete
  const isBusy = isSubmitting || isConfirming

  function handleConfirm() {
    if (isConfirmingRef.current || isSubmitting) {
      return
    }

    isConfirmingRef.current = true
    setIsConfirming(true)

    Promise.resolve(onConfirm()).finally(() => {
      isConfirmingRef.current = false
      setIsConfirming(false)
    })
  }

  return (
    <div className="record-action-confirmation-overlay">
      <section className="record-action-confirmation-panel" role="dialog" aria-modal="true" aria-label={content.title}>
        <p className="section-kicker">Confirmar acción</p>
        <h3>{content.title}</h3>
        <p>
          <strong>{recordLabel}</strong>
        </p>
        <p>{content.message}</p>
        <div className="record-action-confirmation-actions">
          <button type="button" className="ghost-button" disabled={isBusy} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`primary-button ${content.confirmClassName}`.trim()}
            disabled={isBusy}
            onClick={handleConfirm}
          >
            {isBusy ? 'Guardando...' : content.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default RecordActionConfirmation
