<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const supabase = useSupabaseClient()

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const categories = ref<{ name: string; value: string }[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('category_news')
      .select('name, value')
      .order('name', { ascending: true })

    if (error) {
      console.error('Gagal mengambil kategori:', error)
    } else {
      categories.value = data || []
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
})

function onValueChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-2 max-w-md">
    <Label for="category-filter">Filter Kategori</Label>
    <Select 
      :model-value="modelValue" 
      @update:model-value="onValueChange"
      :disabled="loading"
    >
      <SelectTrigger id="category-filter">
        <SelectValue placeholder="Semua Kategori" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Semua Kategori</SelectItem>
        <SelectItem
          v-for="cat in categories"
          :key="cat.value"
          :value="cat.value"
        >
          {{ cat.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>