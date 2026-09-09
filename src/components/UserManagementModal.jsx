import FormModal from './FormModal'
import { ROLE_LABELS } from '../utils/permissions'
import { getUserError } from '../utils/userError'
import { useState } from 'react'

const ROLE_OPTIONS = ['lector', 'creador', 'editor', 'gestor', 'admin']

function UserManagementModal({
  profiles,
  currentUserId,
  isLoading,
  errorMessage,
  onClose,
  onRefresh,
  onRoleChange,
  onApprovalToggle,
  onCreateUser,
  onSendRecovery,
  onDeleteUser,
  updatingUserId,
  isCreatingUser,
  isSendingRecoveryForUserId,
  isDeletingUserId,
}) {
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
  })
  const [createError, setCreateError] = useState('')
  const adminCount = profiles.filter((profile) => profile.role === 'admin').length

  function handleCreateFieldChange(fieldName, value) {
    setCreateForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))
  }

  async function submitCreateUser() {
    setCreateError('')

    const fullName = String(createForm.fullName ?? '').trim()
    const email = String(createForm.email ?? '').trim()

    if (!fullName || !email) {
      setCreateError('Indica nombre y correo electronico.')
      return
    }

    try {
      const wasCreated = await onCreateUser({ fullName, email })

      if (wasCreated !== false) {
        setCreateForm({
          fullName: '',
          email: '',
        })
      }
    } catch (error) {
      setCreateError(getUserError(error, 'No se pudo crear el usuario.').message)
    }
  }

  return (
    <FormModal title="Usuarios" mode="manage" onClose={onClose}>
      <div className="user-management-shell">
        <div className="user-management-toolbar">
          <p className="step-copy">
            Gestiona permisos desde el perfil interno de cada cuenta.
          </p>
          <button type="button" className="ghost-button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <section className="user-create-panel">
          <div className="user-create-panel-header">
            <div>
              <p className="eyebrow">Alta manual</p>
              <h3>Crear nuevo usuario</h3>
            </div>
            <p className="auth-card-copy">
              La cuenta se crea validada y con cambio obligatorio de contraseña en el primer acceso.
            </p>
          </div>

          <div className="user-create-form">
            <label className="form-field auth-form-field">
              <span className="field-label">Nombre</span>
              <input
                type="text"
                value={createForm.fullName}
                onChange={(event) => handleCreateFieldChange('fullName', event.target.value)}
                autoComplete="name"
                disabled={isCreatingUser}
                required
              />
            </label>
            <label className="form-field auth-form-field">
              <span className="field-label">Correo electronico</span>
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => handleCreateFieldChange('email', event.target.value)}
                autoComplete="email"
                disabled={isCreatingUser}
                required
              />
            </label>
          </div>

          <div className="user-create-panel-footer">
            <p className="step-copy">
              La contraseña temporal inicial sera `Cambiala@ya2026`.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void submitCreateUser()}
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </section>

        {createError ? <p className="auth-error">{createError}</p> : null}
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <div className="user-list-header">
          <div>
            <p className="eyebrow">Usuarios existentes</p>
            <h3>Gestion y acceso</h3>
          </div>
          <p className="auth-card-copy">
            Cambia roles, validacion, recuperacion de contraseña o elimina cuentas.
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Validacion</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const isLastAdmin =
                  profile.role === 'admin' && profile.is_approved && adminCount === 1
                const isUpdating = updatingUserId === profile.id
                const isSendingRecovery = isSendingRecoveryForUserId === profile.id
                const isDeleting = isDeletingUserId === profile.id
                const isCurrentUser = profile.id === currentUserId

                return (
                  <tr key={profile.id}>
                    <td>
                      <div className="user-cell">
                        <strong>{profile.full_name || 'Sin nombre'}</strong>
                        {profile.id === currentUserId ? <span className="recipe-badge">Tu cuenta</span> : null}
                      </div>
                    </td>
                    <td>{profile.email}</td>
                    <td>
                      <span className={`status-badge ${profile.is_approved ? 'approved' : 'pending'}`}>
                        {profile.is_approved ? 'Validado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={profile.role}
                        onChange={(event) => onRoleChange(profile.id, event.target.value)}
                        disabled={isUpdating}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option
                            key={role}
                            value={role}
                            disabled={isLastAdmin && role !== 'admin'}
                          >
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button compact"
                        onClick={() => onApprovalToggle(profile.id, !profile.is_approved)}
                        disabled={isUpdating || (isLastAdmin && profile.is_approved)}
                      >
                        {profile.is_approved ? 'Revocar' : 'Validar'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button compact"
                        onClick={() => onSendRecovery(profile)}
                        disabled={isSendingRecovery || isDeleting}
                      >
                        {isSendingRecovery ? 'Enviando...' : 'Enviar enlace'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button compact destructive-button"
                        onClick={() => onDeleteUser(profile)}
                        disabled={isDeleting || isLastAdmin || isCurrentUser}
                        title={
                          isCurrentUser
                            ? 'No puedes eliminar tu propia cuenta desde este panel.'
                            : isLastAdmin
                              ? 'No puedes eliminar al ultimo administrador validado.'
                              : undefined
                        }
                      >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!profiles.length && !isLoading ? (
                <tr>
                  <td colSpan="6">No hay perfiles disponibles.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </FormModal>
  )
}

export default UserManagementModal
