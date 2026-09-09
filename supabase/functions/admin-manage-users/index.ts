import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TEMP_PASSWORD = 'Cambiala@ya2026'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? ''

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getRedirectTo(requestedRedirectTo?: string) {
  return requestedRedirectTo || PUBLIC_APP_URL || undefined
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return jsonResponse(500, {
        error: 'Missing Supabase environment variables for admin-manage-users function.',
      })
    }

    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing authorization header.' })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return jsonResponse(401, {
        error: getErrorMessage(authError, 'No se pudo validar la sesion.'),
      })
    }

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()

    if (adminProfileError) {
      return jsonResponse(403, {
        error: getErrorMessage(adminProfileError, 'No se pudo validar el perfil administrador.'),
      })
    }

    if (adminProfile?.role !== 'admin' || adminProfile?.is_approved !== true) {
      return jsonResponse(403, { error: 'Solo un administrador validado puede gestionar usuarios.' })
    }

    const body = await request.json()
    const action = String(body?.action ?? '')
    const redirectTo = getRedirectTo(
      typeof body?.redirectTo === 'string' ? body.redirectTo : undefined,
    )

    if (action === 'create_user') {
      const fullName = String(body?.fullName ?? '').trim()
      const email = String(body?.email ?? '').trim().toLowerCase()

      if (!fullName || !email) {
        return jsonResponse(400, { error: 'Nombre y correo electronico son obligatorios.' })
      }

      const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          must_change_password: true,
        },
      })

      if (createUserError || !createdUserData.user) {
        return jsonResponse(400, {
          error: getErrorMessage(createUserError, 'No se pudo crear el usuario.'),
        })
      }

      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({
          email,
          full_name: fullName,
          role: 'lector',
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', createdUserData.user.id)

      if (profileUpdateError) {
        return jsonResponse(500, {
          error: getErrorMessage(profileUpdateError, 'Usuario creado, pero no se pudo actualizar el perfil.'),
        })
      }

      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        return jsonResponse(500, {
          error: getErrorMessage(resetError, 'Usuario creado, pero no se pudo enviar el correo.'),
        })
      }

      return jsonResponse(200, {
        success: true,
        userId: createdUserData.user.id,
      })
    }

    if (action === 'send_recovery') {
      const requestedEmail = String(body?.email ?? '').trim().toLowerCase()
      const requestedUserId = String(body?.userId ?? '').trim()

      if (!requestedEmail && !requestedUserId) {
        return jsonResponse(400, { error: 'Falta el usuario para enviar la recuperacion.' })
      }

      let email = requestedEmail

      if (!email && requestedUserId) {
        const { data: targetProfile, error: targetProfileError } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', requestedUserId)
          .single()

        if (targetProfileError || !targetProfile?.email) {
          return jsonResponse(404, {
            error: getErrorMessage(targetProfileError, 'No se encontro el usuario solicitado.'),
          })
        }

        email = String(targetProfile.email).trim().toLowerCase()
      }

      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        return jsonResponse(500, {
          error: getErrorMessage(resetError, 'No se pudo enviar el correo de recuperacion.'),
        })
      }

      return jsonResponse(200, { success: true })
    }

    if (action === 'delete_user') {
      const requestedUserId = String(body?.userId ?? '').trim()

      if (!requestedUserId) {
        return jsonResponse(400, { error: 'Falta el usuario a eliminar.' })
      }

      if (requestedUserId === user.id) {
        return jsonResponse(400, { error: 'No puedes eliminar tu propia cuenta desde este panel.' })
      }

      const { data: targetProfile, error: targetProfileError } = await adminClient
        .from('profiles')
        .select('id, role, is_approved')
        .eq('id', requestedUserId)
        .single()

      if (targetProfileError || !targetProfile) {
        return jsonResponse(404, {
          error: getErrorMessage(targetProfileError, 'No se encontro el usuario solicitado.'),
        })
      }

      if (targetProfile.role === 'admin' && targetProfile.is_approved === true) {
        const { count: approvedAdminCount, error: approvedAdminCountError } = await adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('is_approved', true)

        if (approvedAdminCountError) {
          return jsonResponse(500, {
            error: getErrorMessage(approvedAdminCountError, 'No se pudo validar el numero de administradores.'),
          })
        }

        if ((approvedAdminCount ?? 0) <= 1) {
          return jsonResponse(400, { error: 'No puedes eliminar al ultimo administrador validado.' })
        }
      }

      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(requestedUserId)

      if (deleteUserError) {
        return jsonResponse(500, {
          error: getErrorMessage(deleteUserError, 'No se pudo eliminar el usuario.'),
        })
      }

      return jsonResponse(200, { success: true })
    }

    return jsonResponse(400, { error: 'Unsupported action.' })
  } catch (error) {
    return jsonResponse(500, {
      error: getErrorMessage(error, 'Unexpected error in admin-manage-users function.'),
    })
  }
})
