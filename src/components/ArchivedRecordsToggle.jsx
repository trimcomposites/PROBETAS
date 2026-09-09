function ArchivedRecordsToggle({ isShowingArchived, onToggle }) {
  if (isShowingArchived) {
    return (
      <button type="button" className="ghost-button" onClick={onToggle}>
        Volver a activos
      </button>
    )
  }

  return (
    <button
      type="button"
      className="ghost-button archive-records-toggle"
      onClick={onToggle}
      aria-label="Ver archivados"
      title="Ver archivados"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 7.25h15v11.5h-15zM3.75 4.25h16.5v3h-16.5zM9.25 11.75h5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default ArchivedRecordsToggle
