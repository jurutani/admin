export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseClient()
  
  if (!user.value) {
    return navigateTo('/login')
  }
})