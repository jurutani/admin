<script setup lang="ts">
import { useAsyncData } from '#app'

const supabase = useSupabaseClient()
// Ambil data pengumuman
const { data: announcements, pending, error } = await useAsyncData('announcements', async () => {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })

  if
  (error) {
    throw error // Jika ada error, lempar error} 
  } else if (data.length === 0) {
    return []
  }
  return data
})
console.warn('Data pengumuman:', announcements)
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Announcements
        </h2>
        <p class="text-muted-foreground">
          ini adalah data dari pengumuman yang ada di dashboard juru tani
        </p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="pending">
      Loading...
    </div>

    <!-- Error state -->
    <div v-else-if="error">
      {{ error.message }}
    </div>

    <!-- Data -->
    <div v-else>
      <ul>
        <li v-for="item in announcements" :key="item.id">
          <pre>{{ item }}</pre>
        </li>
      </ul>
    </div>
  </div>
</template>
