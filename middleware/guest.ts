// middleware/guest.ts
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, loading } = useAuth()
  // Wait for auth to initialize
  if (loading.value) {
    return
  }
  if (isAuthenticated.value) {
    return navigateTo('/dashboard')
  }
})
