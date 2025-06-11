export function useSupabaseClient(): ReturnType<typeof useSupabaseClient> {
  const supabase: ReturnType<typeof useSupabaseClient> = (globalThis as any).useSupabaseClient();
  return supabase;
}