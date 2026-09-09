import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import UserManagementModal from './UserManagementModal'

afterEach(cleanup)

describe('UserManagementModal', () => {
  test('no muestra el mensaje técnico si falla la creación de un usuario', async () => {
    const permissionError = Object.assign(
      new Error('new row violates row-level security policy'),
      { code: '42501' },
    )

    render(
      <UserManagementModal
        profiles={[]}
        currentUserId={null}
        isLoading={false}
        errorMessage=""
        onClose={() => {}}
        onRefresh={() => {}}
        onRoleChange={() => {}}
        onApprovalToggle={() => {}}
        onCreateUser={() => Promise.reject(permissionError)}
        onSendRecovery={() => {}}
        onDeleteUser={() => {}}
        updatingUserId={null}
        isCreatingUser={false}
        isSendingRecoveryForUserId={null}
        isDeletingUserId={null}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), {
      target: { value: 'Ana' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Correo electronico' }), {
      target: { value: 'ana@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeTruthy()
    expect(screen.queryByText('new row violates row-level security policy')).toBeNull()
  })
})
