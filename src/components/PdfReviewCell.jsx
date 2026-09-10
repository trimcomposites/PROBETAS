function formatReviewDate(value) {
  const [year, month, day] = String(value).split('-')

  return year && month && day ? `${day}/${month}/${year}` : value
}

function PdfReviewCell({ attachmentId, reviewDate, onPreview, onDownload }) {
  if (!attachmentId) return 'Sin archivo'

  return (
    <div className="pdf-review-cell">
      <div className="pdf-review-actions">
        <button type="button" className="ghost-button compact" onClick={() => onPreview(attachmentId)}>
          Ver
        </button>
        <button type="button" className="ghost-button compact" onClick={() => onDownload(attachmentId)}>
          Descargar
        </button>
      </div>
      {reviewDate ? <small className="pdf-review-date">Revisión: {formatReviewDate(reviewDate)}</small> : null}
    </div>
  )
}

export default PdfReviewCell
