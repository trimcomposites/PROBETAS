import BrandWordmark from './BrandWordmark'

function AppHeader({
  onOpenSqlConsole,
  onOpenUserManagement,
  canManageUsers,
  theme,
  onToggleTheme,
  currentUserLabel,
  currentUserRoleLabel,
  onSignOut,
  isSigningOut,
}) {
  return (
    <header className="hero-panel">
      <div className="hero-panel-main">
        <BrandWordmark className="brand-wordmark-header" />
        <p className="eyebrow">Composite Coupons &amp; Test Data</p>
        <h1>Composite Lab</h1>
        {currentUserLabel ? (
          <div className="hero-user-meta">
            <p className="hero-user-badge">{currentUserLabel}</p>
            {currentUserRoleLabel ? <span className="hero-role-badge">{currentUserRoleLabel}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="hero-actions">
        <button
          type="button"
          className="terminal-button"
          onClick={onToggleTheme}
          aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          title={`Tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.25v2.1m0 13.3v2.1m8.75-8.75h-2.1M5.35 12H3.25m14.94 6.19-1.48-1.48M6.29 6.29 4.81 4.81m13.38 0-1.48 1.48M6.29 17.71l-1.48 1.48M12 7.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M19.25 14.8A7.75 7.75 0 0 1 9.2 4.75 8.5 8.5 0 1 0 19.25 14.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="terminal-button"
          onClick={onOpenSqlConsole}
          aria-label="Abrir consola SQL"
          title="Abrir consola SQL"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Zm2.2 2.4 2.7 3.1-2.7 3.1m5-3.1h5.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {canManageUsers ? (
          <button
            type="button"
            className="ghost-button header-signout-button"
            onClick={onOpenUserManagement}
          >
            Usuarios
          </button>
        ) : null}
        <button
          type="button"
          className="ghost-button header-signout-button"
          onClick={onSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Cerrando...' : 'Cerrar sesion'}
        </button>
      </div>
    </header>
  )
}

export default AppHeader
