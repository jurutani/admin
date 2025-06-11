export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseClient()
  const { isAdmin, fetchUserProfile } = useSession()
  
  // Jika belum login
  if (!user.value) {
    return navigateTo('/login')
  }
  
  // Fetch profile jika belum ada data
  if (!isAdmin.value) {
    try {
      await fetchUserProfile()
    } catch (error) {
      console.error('Error checking admin status:', error)
      return navigateTo('/login')
    }
  }
  
  // Jika bukan admin
  if (!isAdmin.value) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied: Admin only'
    })
  }
})
