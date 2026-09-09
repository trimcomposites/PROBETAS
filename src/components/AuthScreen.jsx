import { useState } from 'react'
import BrandWordmark from './BrandWordmark'

const INITIAL_FORM = {
  email: '',
  password: '',
}

function AuthScreen({
  theme,
  onToggleTheme,
  onSignIn,
  onForgotPassword,
  isLoading,
  errorMessage,
  noticeMessage,
}) {
  const [signInForm, setSignInForm] = useState(INITIAL_FORM)

  function handleChange(fieldName, value) {
    setSignInForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSignIn(signInForm)
  }

  return (
    <div className="app-shell auth-shell">
      <div className="auth-layout">
        <section className="hero-panel auth-hero-panel">
          <div className="auth-hero-topbar">
            <span className="auth-security-pill">Acceso privado</span>
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
            <BrandWordmark className="brand-wordmark-hero" />
            <p className="eyebrow">Composite Coupons &amp; Test Data</p>
            <h1>Composite Lab</h1>
            <p className="auth-hero-description">
              Plataforma interna para gestionar la fabricación, trazabilidad y caracterización de
              probetas de materiales compuestos, vinculando cada muestra con su plybook,
              materiales, espesores, proceso de fabricación y resultados de ensayo.
            </p>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow">Bienvenido de nuevo</p>
              <h2>Inicia sesion</h2>
            </div>
            <p className="auth-card-copy">Introduce tus datos para continuar.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field auth-form-field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={signInForm.email}
                onChange={(event) => handleChange('email', event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="form-field auth-form-field">
              <span className="field-label">Contraseña</span>
              <input
                type="password"
                value={signInForm.password}
                onChange={(event) => handleChange('password', event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {noticeMessage ? <p className="auth-notice">{noticeMessage}</p> : null}
            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

            <button type="submit" className="primary-button auth-submit-button" disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Iniciar sesion'}
            </button>

            <button type="button" className="auth-text-link" onClick={onForgotPassword}>
              He olvidado mi contraseña
            </button>

            <p className="auth-switch-copy">
              Si todavia no tienes cuenta, solicita el alta a un administrador.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}

export default AuthScreen
