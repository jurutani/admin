<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '~/components/ui/button'

interface CategoryMarket {
  id: string
  name: string
  created_at: string
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const supabase = useSupabaseClient()
const categories = ref<CategoryMarket[]>([])
const loading = ref(true)

onMounted(async () => {
  await fetchCategories()
})

async function fetchCategories() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('category_expert')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) throw error
    
    categories.value = data || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  } finally {
    loading.value = false
  }
}

function selectCategory(categoryName: string) {
  emit('update:modelValue', categoryName)
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button
      variant="outline"
      size="sm"
      :class="modelValue === '' ? 'bg-primary text-primary-foreground' : ''"
      @click="selectCategory('')"
    >
      Semua Kategori
    </Button>
    <div v-if="loading" class="flex items-center text-sm text-muted-foreground">
      Memuat kategori...
    </div>
    <Button
      v-for="category in categories"
      :key="category.id"
      variant="outline"
      size="sm"
      :class="modelValue === category.name ? 'bg-primary text-primary-foreground' : ''"
      @click="selectCategory(category.name)"
    >
      {{ category.name }}
    </Button>
  </div>
</template>