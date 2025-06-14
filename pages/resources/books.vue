<script setup lang="ts">
const supabase = useSupabaseClient()

const coursesList = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  const { data, error } = await supabase
    .from('courses') // ganti dengan nama itabel kamu
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Gagal memuat data:', error)
  } else {
    coursesList.value = data
  }

  loading.value = false
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-4">Data dari Supabase</h1>
    <div v-if="loading">Memuat data...</div>
    <pre v-else class="  p-4 rounded text-sm overflow-auto">
{{ JSON.stringify(coursesList, null, 2) }}
    </pre>
  </div>
</template>
