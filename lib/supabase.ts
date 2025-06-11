// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export function useSupabaseClient() {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey,
  )

  return supabase
}
