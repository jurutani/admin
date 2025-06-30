// middleware/admin.ts
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  // Wait for auth to initialize
  if (loading.value) {
    return
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
