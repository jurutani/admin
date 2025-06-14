<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'

// Props
interface Props {
  loading?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  variant: 'outline',
  size: 'default',
})

// Emits
const emit = defineEmits<{
  refresh: []
}>()

// State
const isRefreshing = ref(false)

// Methods
async function handleRefresh() {
  if (props.disabled || isRefreshing.value) 
  return isRefreshing.value = true
  try {
    emit('refresh')
    // Simulate minimum loading time for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  } finally {
    isRefreshing.value = false
  }
}

// Computed
const isLoading = computed(() => props.loading || isRefreshing.value)
const isDisabled = computed(() => props.disabled || isRefreshing.value)
</script>

<template>
  <Button
    :variant="variant"
    :size="size"
    :disabled="isDisabled"
    class="relative"
    @click="handleRefresh"
  >
    <RefreshCw 
      :class="['h-4 w-4', isLoading && 'animate-spin',
      ]"
    />
    <span v-if="size !== 'sm'" class="ml-2">
      {{ isLoading ? 'Memuat...' : 'Refresh' }}
    </span>
  </Button>
</template>
