// middleware/admin.ts
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { isAuthenticated, isAdmin, loading, logout } = useAuth()

  // Tunggu hingga loading selesai
  while (loading.value) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Jika belum login, arahkan ke halaman login
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }

  // Jika bukan admin, logout lalu arahkan ke login
  if (!isAdmin.value) {
    await logout()
    return navigateTo('/login')
  }
})
