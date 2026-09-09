import { assertSupabaseConfigured } from '../lib/supabaseClient'

function getAuthClient() {
  return assertSupabaseConfigured().auth
}

function getErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage
  }

  return error.message || fallbackMessage
}

function isMissingProfilesTableError(error) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes('Could not find the table') ||
    error.message?.includes("relation 'public.profiles' does not exist") ||
    error.message?.includes('schema cache')
  )
}

function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL

  if (configuredUrl) {
    return configuredUrl
  }

  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.origin}${window.location.pathname}`
}

export function userMustChangePassword(user) {
  return user?.user_metadata?.must_change_password === true
}

export async function getCurrentSession() {
  const { data, error } = await getAuthClient().getSession()

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo recuperar la sesion actual.'))
  }

  return data.session
}

export function subscribeToAuthChanges(callback) {
  const {
    data: { subscription },
  } = getAuthClient().onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => subscription.unsubscribe()
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await getAuthClient().signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo iniciar sesion.'))
  }

  return data.session
}

export async function signUpWithPassword({ email, password, fullName }) {
  const { data, error } = await getAuthClient().signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo crear la cuenta.'))
  }

  return data
}

async function invokeAdminUsersFunction(payload) {
  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase.functions.invoke('admin-manage-users', {
    body: payload,
  })

  if (error) {
    const errorMessage = await getFunctionErrorMessage(error)
    throw new Error(errorMessage || getErrorMessage(error, 'No se pudo completar la accion de administracion.'))
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  return data
}

async function getFunctionErrorMessage(error) {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const context = error.context

  if (!context || typeof context.json !== 'function') {
    return ''
  }

  try {
    const body = await context.json()

    if (typeof body?.error === 'string' && body.error) {
      return body.error
    }

    if (typeof body?.message === 'string' && body.message) {
      return body.message
    }
  } catch {
    return ''
  }

  return ''
}

export async function signOut() {
  const { error } = await getAuthClient().signOut()

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cerrar la sesion.'))
  }
}

export async function requestPasswordReset(email) {
  const redirectTo = getAuthRedirectUrl()

  const { error } = await getAuthClient().resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo enviar el correo de recuperacion.'))
  }
}

export async function updateUserPassword(password) {
  const {
    data: { user },
    error: getUserError,
  } = await getAuthClient().getUser()

  if (getUserError) {
    throw new Error(getErrorMessage(getUserError, 'No se pudo cargar el usuario actual.'))
  }

  const nextUserMetadata = {
    ...(user?.user_metadata ?? {}),
    must_change_password: false,
  }

  const { error } = await getAuthClient().updateUser({
    password,
    data: nextUserMetadata,
  })

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar la contraseña.'))
  }
}

export async function getCurrentProfile(userId) {
  if (!userId) {
    return null
  }

  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_approved, approved_at, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingProfilesTableError(error)) {
      return null
    }

    throw new Error(getErrorMessage(error, 'No se pudo cargar el perfil del usuario.'))
  }

  return data
}

export async function listProfiles() {
  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_approved, approved_at, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la lista de usuarios.'))
  }

  return data ?? []
}

export async function updateProfileRole(userId, role) {
  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id, email, full_name, role, is_approved, approved_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el rol del usuario.'))
  }

  return data
}

export async function updateProfileApproval(userId, isApproved) {
  const supabase = assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_approved: isApproved })
    .eq('id', userId)
    .select('id, email, full_name, role, is_approved, approved_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar la validacion del usuario.'))
  }

  return data
}

export async function createManagedUser({ fullName, email }) {
  return invokeAdminUsersFunction({
    action: 'create_user',
    fullName,
    email,
    redirectTo: getAuthRedirectUrl(),
  })
}

export async function sendManagedPasswordRecovery({ email, userId }) {
  return invokeAdminUsersFunction({
    action: 'send_recovery',
    email,
    userId,
    redirectTo: getAuthRedirectUrl(),
  })
}

export async function deleteManagedUser({ userId }) {
  return invokeAdminUsersFunction({
    action: 'delete_user',
    userId,
  })
}
