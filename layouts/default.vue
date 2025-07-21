<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { useAuth } from '@/composables/useAuth'

// Ambil state dari useAuth
const { isAuthenticated, isAdmin, loading, logout, initialize } = useAuth()

// Inisialisasi auth saat layout dimuat
onMounted(async () => {
  await initialize()

  // Tunggu loading selesai, lalu cek status admin
  watchEffect(async () => {
    if (!loading.value) {
      if (!isAuthenticated.value || !isAdmin.value) {
        await logout()
      }
    }
  })
})
</script>

<template>
  <SidebarProvider v-if="!loading">
    <LayoutAppSidebar />
    <SidebarInset>
      <LayoutHeader />
      <div class="min-w-0 w-full flex-1 overflow-x-auto p-4 lg:p-6">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>

  <div v-else class="w-full h-screen flex items-center justify-center">
    <span>Loading...</span>
  </div>
</template>
