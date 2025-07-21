export default defineNuxtRouteMiddleware(async (_to) => {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  // Tunggu sampai auth selesai (opsional, tergantung useAuth-mu)
  while (loading.value) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (!isAdmin.value) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied - Admin Only',
    })
  }
})
