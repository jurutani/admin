<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/toast'
import { Check, ChevronsUpDown, User, Loader2 } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const { toast } = useToast()

// Props dan Emits
const props = defineProps<{
  open: boolean
  expertItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

// Types
interface User {
  id: string
  full_name: string
  avatar_url?: string
  role?: string
  email?: string
}

interface Category {
  name: string
  value: string
}

// State management
const categories = ref<Category[]>([])
const users = ref<User[]>([])
const loading = ref(false)
const userSearch = ref('')
const userOpen = ref(false)
const searchingUsers = ref(false)

const form = ref({
  user_id: '',
  category: '',
  note: ''
})

// Computed properties
const isEdit = computed(() => !!props.expertItem)

const selectedUser = computed(() => {
  return users.value.find(user => user.id === form.value.user_id)
})

const isFormValid = computed(() => {
  return form.value.user_id.trim() !== '' && form.value.category.trim() !== ''
})

// Search optimization dengan AbortController
let searchController: AbortController | null = null
let searchTimeout: NodeJS.Timeout | null = null

// Debounced search function
const debouncedSearch = (searchTerm: string, delay = 300) => {
  return new Promise<void>((resolve) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    searchTimeout = setTimeout(async () => {
      await performSearch(searchTerm)
      resolve()
    }, delay)
  })
}

// Optimized search function dengan abort controller
async function performSearch(searchTerm = '') {
  try {
    // Abort previous search if still running
    if (searchController) {
      searchController.abort()
    }
    
    // Create new controller for this search
    searchController = new AbortController()
    searchingUsers.value = true
    
    // Build query - simplified without abortSignal for compatibility
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, email')
      .eq('role', 'petani')
      .order('full_name', { ascending: true })
      .limit(20)

    // Apply search filter
    if (searchTerm && searchTerm.length > 0) {
      // Simple ilike search for full_name only (more reliable)
      query = query.ilike('full_name', `%${searchTerm}%`)
    }

    const { data, error } = await query

    // Check if request was aborted
    if (searchController && searchController.signal.aborted) {
      return
    }

    if (error) throw error
    
    users.value = data || []
    console.log('Users found:', users.value.length, 'Search term:', searchTerm)
    
  } catch (error: any) {
    // Ignore abort errors
    if (error.name === 'AbortError') {
      return
    }
    
    console.error('Error searching users:', error)
    toast({
      title: "Error",
      description: "Gagal mencari user",
      variant: "destructive"
    })
  } finally {
    searchingUsers.value = false
    searchController = null
  }
}

// Watchers
watch(userSearch, async (newSearch) => {
  const trimmedSearch = newSearch.trim()
  await debouncedSearch(trimmedSearch)
})

watch(() => props.expertItem, (newItem) => {
  if (newItem) {
    form.value = {
      user_id: newItem.user_id || '',
      category: newItem.category || '',
      note: newItem.note || ''
    }
    
    // Load user data if editing
    if (newItem.user_id) {
      loadUserById(newItem.user_id)
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Lifecycle hooks
onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    performSearch() // Load initial users
  ])
})

onUnmounted(() => {
  // Cleanup
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  if (searchController) {
    searchController.abort()
  }
})

// API functions
async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('category_expert')
      .select('name')
      .order('name', { ascending: true })

    if (error) throw error
    
    categories.value = data?.map(item => ({
      name: item.name,
      value: item.name
    })) || []
  } catch (error) {
    console.error('Error fetching categories:', error)
    toast({
      title: "Error",
      description: "Gagal memuat kategori",
      variant: "destructive"
    })
  }
}

async function loadUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, email')
      .eq('role', 'petani')
      .eq('id', userId)
      .single()

    if (error) throw error
    
    // Add user to list if not already present
    if (data && !users.value.find(u => u.id === data.id)) {
      users.value.unshift(data)
    }
  } catch (error) {
    console.error('Error loading user:', error)
  }
}

// Form handling dengan upsert
async function handleSubmit() {
  if (!isFormValid.value) {
    toast({
      title: "Error",
      description: "User dan kategori harus dipilih",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    const now = new Date().toISOString()
    
    // Prepare expert data
    const expertData = {
      user_id: form.value.user_id,
      category: form.value.category,
      note: form.value.note,
      updated_at: now,
      created_at: now
    }

    // Add id for edit mode
    if (isEdit.value && props.expertItem?.id) {
      expertData.id = props.expertItem.id
    }

    // Use upsert for experts table - much simpler!
    const { data: expertResult, error: expertError } = await supabase
      .from('experts')
      .upsert(expertData, { 
        onConflict: isEdit.value ? 'id' : 'user_id,category',
        ignoreDuplicates: false 
      })
      .select()

    if (expertError) throw expertError

    // Update user role to 'pakar' 
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'pakar',
        updated_at: now
      })
      .eq('id', form.value.user_id)

    // Profile update failure is not critical
    if (profileError) {
      console.warn('Warning: Failed to update user role:', profileError)
    }

    toast({
      title: "Berhasil",
      description: `Expert berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'}${
        !profileError ? ' dan role user diupdate ke pakar' : ''
      }`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving expert:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan data expert",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    user_id: '',
    category: '',
    note: ''
  }
  userSearch.value = ''
  
  // Reset users list to initial state
  performSearch()
}

function selectUser(user: User) {
  form.value.user_id = user.id
  userOpen.value = false
  userSearch.value = user.full_name || user.email || ''
}

function handleDialogClose() {
  emit('update:open', false)
  resetForm()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Expert' : 'Tambah Expert Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- User Selection -->
        <div class="space-y-2">
          <Label>Pilih User *</Label>
          <Popover v-model:open="userOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                :aria-expanded="userOpen"
                class="w-full justify-between h-auto min-h-[2.5rem] py-2"
                :disabled="loading"
              >
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img 
                      v-if="selectedUser?.avatar_url" 
                      :src="selectedUser.avatar_url" 
                      :alt="selectedUser.full_name"
                      class="w-full h-full object-cover"
                    />
                    <User v-else class="h-3 w-3 text-gray-500" />
                  </div>
                  <div class="flex-1 min-w-0 text-left">
                    <div v-if="selectedUser" class="truncate">
                      <span class="font-medium">{{ selectedUser.full_name || selectedUser.email }}</span>
                      <span v-if="selectedUser.role" class="text-xs text-muted-foreground ml-2">
                        ({{ selectedUser.role }})
                      </span>
                    </div>
                    <span v-else class="text-muted-foreground">
                      Pilih user...
                    </span>
                  </div>
                </div>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-full p-0">
              <Command>
                <CommandInput 
                  v-model="userSearch"
                  placeholder="Ketik nama atau email untuk mencari..." 
                />
                <CommandEmpty>
                  <div v-if="searchingUsers" class="p-4 text-center">
                    <Loader2 class="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    <p class="mt-2 text-sm text-muted-foreground">Mencari user...</p>
                  </div>
                  <div v-else class="p-4 text-center">
                    <p class="text-sm text-muted-foreground">
                      {{ userSearch.trim() ? 'User tidak ditemukan.' : 'Ketik untuk mencari user.' }}
                    </p>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <CommandList class="max-h-60">
                    <CommandItem
                      v-for="user in users"
                      :key="user.id"
                      :value="`${user.full_name} ${user.email}`"
                      @select="selectUser(user)"
                      class="cursor-pointer"
                    >
                      <div class="flex items-center space-x-3 w-full">
                        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img 
                            v-if="user.avatar_url" 
                            :src="user.avatar_url" 
                            :alt="user.full_name"
                            class="w-full h-full object-cover"
                          />
                          <User v-else class="h-4 w-4 text-gray-500" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-medium truncate">{{ user.full_name }}</p>
                          <p class="text-xs text-muted-foreground truncate">{{ user.email }}</p>
                          <p v-if="user.role" class="text-xs text-muted-foreground">
                            Role: {{ user.role }}
                          </p>
                        </div>
                        <Check
                          :class="[
                            'ml-auto h-4 w-4 flex-shrink-0',
                            form.user_id === user.id ? 'opacity-100' : 'opacity-0'
                          ]"
                        />
                      </div>
                    </CommandItem>
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <p class="text-xs text-muted-foreground">
            Cari berdasarkan nama atau email user yang akan dijadikan expert
          </p>
        </div>

        <!-- Category Selection -->
        <div class="space-y-2">
          <Label for="category">Kategori Expert *</Label>
          <Select v-model="form.category" :disabled="loading">
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori expert" />
            </SelectTrigger>
            <SelectContent>
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

        <!-- Note -->
        <div class="space-y-2">
          <Label for="note">Catatan</Label>
          <Textarea
            id="note"
            v-model="form.note"
            placeholder="Masukkan catatan tentang keahlian expert..."
            rows="4"
            :disabled="loading"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            @click="handleDialogClose"
            :disabled="loading"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            :disabled="loading || !isFormValid"
            class="min-w-[100px]"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            <span>
              {{ isEdit ? 'Update' : 'Simpan' }}
            </span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>