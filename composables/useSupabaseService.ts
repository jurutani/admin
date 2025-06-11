export async function useSupabaseService() {
  // Hanya bisa digunakan di server-side
  if (import.meta.client) {
    throw new Error('useSupabaseService can only be used on server-side');
  }

  const config = useRuntimeConfig();
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRole, // Private key, hanya di server
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return supabase;
}