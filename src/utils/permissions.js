const ROLE_ORDER = ['lector', 'creador', 'editor', 'gestor', 'admin']

export const ROLE_LABELS = {
  lector: 'Lector',
  creador: 'Creador',
  editor: 'Editor',
  gestor: 'Gestor',
  admin: 'Admin',
}

export function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'lector'
}

export function hasMinimumRole(role, minimumRole) {
  return ROLE_ORDER.indexOf(normalizeRole(role)) >= ROLE_ORDER.indexOf(normalizeRole(minimumRole))
}

export function getPermissionSet(role) {
  const normalizedRole = normalizeRole(role)

  return {
    role: normalizedRole,
    canRead: hasMinimumRole(normalizedRole, 'lector'),
    canCreate: hasMinimumRole(normalizedRole, 'creador'),
    canUpdate: hasMinimumRole(normalizedRole, 'editor'),
    canDelete: hasMinimumRole(normalizedRole, 'gestor'),
    canArchive: hasMinimumRole(normalizedRole, 'gestor'),
    canViewArchived: hasMinimumRole(normalizedRole, 'admin'),
    canRestore: hasMinimumRole(normalizedRole, 'admin'),
    canManageUsers: hasMinimumRole(normalizedRole, 'admin'),
  }
}
