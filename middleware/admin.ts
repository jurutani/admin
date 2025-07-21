// middleware/admin.ts
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { isAuthenticated, isAdmin, loading, logout } = useAuth()

  // Tunggu sampai auth selesai
  while (loading.value) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Belum login
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }

  // Bukan admin
  if (!isAdmin.value) {
    await logout()
    return navigateTo('/login')
  }
})
