export const useSession = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseClient()
  
  // Reactive states
  const isAdmin = ref(false)
  const isLoading = ref(true)
  const profile = ref(null)

  const fetchUserProfile = async () => {
    if (!user.value) {
      isAdmin.value = false
      profile.value = null
      isLoading.value = false
      return null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        throw error
      }

      profile.value = data
      isAdmin.value = data?.is_admin === true
      
      return data
    } catch (err) {
      console.error('Profile fetch error:', err)
      isAdmin.value = false
      profile.value = null
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const refreshSession = async () => {
    isLoading.value = true
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      // Re-fetch profile after session refresh
      await fetchUserProfile()
      
      return data
    } catch (err) {
      console.error('Session refresh error:', err)
      throw err
    }
  }

  // Watch for user changes
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchUserProfile()
    } else {
      isAdmin.value = false
      profile.value = null
      isLoading.value = false
    }
  }, { immediate: true })

  return {
    user: readonly(user),
    isAdmin: readonly(isAdmin),
    profile: readonly(profile),
    isLoading: readonly(isLoading),
    fetchUserProfile,
    refreshSession,
  }
}