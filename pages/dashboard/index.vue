<script setup lang="ts">
import { ref } from 'vue'
import HeroTabs from '~/components/Dashboard/HeroTabs.vue'
import BannerTabs from '~/components/Dashboard/BannerTabs.vue'

// Active tab state
const activeTab = ref('hero')

const tabs = [
  { id: 'hero', name: 'Hero Management', icon: 'Type' },
  { id: 'banner', name: 'Banner Management', icon: 'Image' }
]
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Content Management</h1>
        <p class="text-sm text-muted-foreground">
          Kelola konten hero dan banner aplikasi Juru Tani
        </p>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="border-b border-border">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="mt-6">
      <HeroTabs v-if="activeTab === 'hero'" />
      <BannerTabs v-if="activeTab === 'banner'" />
    </div>
  </div>
</template>

<style scoped>
/* Custom styles if needed */
</style>