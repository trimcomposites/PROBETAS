import { useState } from 'react'
import BrandWordmark from './BrandWordmark'

function PasswordRecoveryScreen({
  theme,
  onToggleTheme,
  onRequestReset,
  onUpdatePassword,
  onCancel,
  isLoading,
  errorMessage,
  noticeMessage,
  mode = 'request',
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError('')

    if (mode === 'request') {
      await onRequestReset(email)
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.')
      return
    }

    await onUpdatePassword(password)
  }

  const currentError = localError || errorMessage

  return (
    <div className="app-shell auth-shell">
      <div className="auth-layout auth-layout-compact">
        <section className="hero-panel auth-hero-panel auth-hero-panel-compact">
          <div className="auth-hero-topbar">
            <span className="auth-security-pill">
              {mode === 'request' ? 'Te ayudamos a entrar' : 'Ultimo paso'}
            </span>
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
          </div>
          <div className="auth-hero-copy">
            <BrandWordmark className="brand-wordmark-hero brand-wordmark-compact" />
            <p className="eyebrow">Composite Lab</p>
            <h1>{mode === 'request' ? 'Recupera tu acceso' : 'Elige una contraseña nueva'}</h1>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow">{mode === 'request' ? 'Recuperacion por email' : 'Actualiza tu acceso'}</p>
              <h2>{mode === 'request' ? 'Te enviaremos un enlace' : 'Escribe tu nueva contraseña'}</h2>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'request' ? (
              <label className="form-field auth-form-field">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
            ) : (
              <>
                <label className="form-field auth-form-field">
                  <span className="field-label">Nueva contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="form-field auth-form-field">
                  <span className="field-label">Repetir contraseña</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            )}

            {noticeMessage ? <p className="auth-notice">{noticeMessage}</p> : null}
            {currentError ? <p className="auth-error">{currentError}</p> : null}

            <button type="submit" className="primary-button auth-submit-button" disabled={isLoading}>
              {isLoading
                ? 'Procesando...'
                : mode === 'request'
                  ? 'Enviar correo'
                  : 'Guardar y continuar'}
            </button>

            <button type="button" className="ghost-button auth-secondary-button" onClick={onCancel}>
              Volver al acceso
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default PasswordRecoveryScreen
