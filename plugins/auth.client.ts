// plugins/auth.client.ts
export default defineNuxtPlugin(async () => {
  const { initialize } = useAuth()
  // Initialize auth state
  await initialize()
})
