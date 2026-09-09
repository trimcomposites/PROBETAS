import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase no esta configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null

export function assertSupabaseConfigured() {
  if (!supabase) {
    throw new Error(
      'Falta configurar Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en tu entorno.',
    )
  }

  return supabase
}
