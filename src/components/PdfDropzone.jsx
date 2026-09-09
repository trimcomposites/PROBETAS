import { useId, useState } from 'react'
import { formatFileSize } from '../utils/fileStorage'

function PdfDropzone({
  fileMetadata,
  onSelectFile,
  onClearFile,
  onDownloadFile,
  onPreviewFile,
  disabled = false,
}) {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file) {
    if (!file) {
      return
    }

    if (disabled) {
      return
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return
    }

    onSelectFile(file)
  }

  return (
    <div className={`pdf-dropzone ${isDragging ? 'dragging' : ''}`}>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="pdf-input"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <label
        htmlFor={disabled ? undefined : inputId}
        className={`pdf-dropzone-surface ${disabled ? 'disabled' : ''}`}
        onDragEnter={() => {
          if (!disabled) {
            setIsDragging(true)
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          if (disabled) {
            return
          }
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={(event) => {
          if (disabled) {
            return
          }
          event.preventDefault()
          setIsDragging(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
      >
        <span className="pdf-dropzone-icon" aria-hidden="true">
          PDF
        </span>
        <strong>{fileMetadata ? 'PDF cargado' : 'Arrastra un PDF o haz clic'}</strong>
        <span className="step-copy">
          {fileMetadata
            ? `${fileMetadata.name} · ${formatFileSize(fileMetadata.size)}`
            : 'Se sube a Supabase Storage y queda disponible para toda la app.'}
        </span>
      </label>

      {fileMetadata ? (
        <div className="pdf-dropzone-actions">
          <button type="button" className="ghost-button compact" onClick={onPreviewFile}>
            Ver
          </button>
          <button type="button" className="ghost-button compact" onClick={onDownloadFile}>
            Descargar
          </button>
          {disabled ? null : (
            <button type="button" className="ghost-button compact" onClick={onClearFile}>
              Quitar
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default PdfDropzone
