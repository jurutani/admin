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
import { Check, ChevronsUpDown, User, Loader2, MapPin } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const { toast } = useToast()

// Props dan Emits
const props = defineProps<{
  open: boolean
  instructorItem?: any
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

interface District {
  id: string
  name: string
  province: string
}

// State management
const districts = ref<District[]>([])
const users = ref<User[]>([])
const loading = ref(false)
const userSearch = ref('')
const userOpen = ref(false)
const searchingUsers = ref(false)
const districtOpen = ref(false)
const districtSearch = ref('')

const form = ref({
  user_id: '',
  district: '',
  province: '',
  note: ''
})

// Computed properties
const isEdit = computed(() => !!props.instructorItem)

const selectedUser = computed(() => {
  return users.value.find(user => user.id === form.value.user_id)
})

const selectedDistrict = computed(() => {
  return districts.value.find(district => district.name === form.value.district)
})

const filteredDistricts = computed(() => {
  if (!districtSearch.value.trim()) return districts.value
  
  const search = districtSearch.value.toLowerCase()
  return districts.value.filter(district => 
    district.name.toLowerCase().includes(search) ||
    district.province.toLowerCase().includes(search)
  )
})

const isFormValid = computed(() => {
  return form.value.user_id.trim() !== '' && 
         form.value.district.trim() !== '' && 
         form.value.province.trim() !== ''
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

watch(() => props.instructorItem, (newItem) => {
  if (newItem) {
    form.value = {
      user_id: newItem.user_id || '',
      district: newItem.district || '',
      province: newItem.province || '',
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

// Watch district selection to auto-fill province
watch(() => form.value.district, (newDistrict) => {
  const district = districts.value.find(d => d.name === newDistrict)
  if (district) {
    form.value.province = district.province
  }
})

// Lifecycle hooks
onMounted(async () => {
  await Promise.all([
    fetchDistricts(),
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
async function fetchDistricts() {
  try {
    const { data, error } = await supabase
      .from('districts')
      .select('id, name, province')
      .order('province', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    
    districts.value = data || []
  } catch (error) {
    console.error('Error fetching districts:', error)
    toast({
      title: "Error",
      description: "Gagal memuat data kabupaten/kota",
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
      description: "User, kabupaten/kota, dan provinsi harus dipilih",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    const now = new Date().toISOString()
    
    // Prepare instructor data
    const instructorData = {
      user_id: form.value.user_id,
      district: form.value.district,
      provinces: form.value.province,
      note: form.value.note,
      updated_at: now,
      created_at: now,
      deleted_at: null,
    }

    // Add id for edit mode
    if (isEdit.value && props.instructorItem?.id) {
      instructorData.id = props.instructorItem.id
    }

    // Use upsert for instructors table
    const { data: instructorResult, error: instructorError } = nst
    await supabase
      .from('instructors')
      .upsert(instructorData, {
        onConflict: 'user_id,district'
      })
      .select()

    if (instructorError) throw instructorError

    // Update user role to 'instruktur' 
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'instruktur',
        updated_at: now
      })
      .eq('id', form.value.user_id)

    // Profile update failure is not critical
    if (profileError) {
      console.warn('Warning: Failed to update user role:', profileError)
    }

    toast({
      title: "Berhasil",
      description: `Instruktur berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'}${
        !profileError ? ' dan role user diupdate ke instruktur' : ''
      }`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving instructor:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan data instruktur",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    user_id: '',
    district: '',
    province: '',
    note: ''
  }
  userSearch.value = ''
  districtSearch.value = ''
  
  // Reset users list to initial state
  performSearch()
}

function selectUser(user: User) {
  form.value.user_id = user.id
  userOpen.value = false
  userSearch.value = user.full_name || user.email || ''
}

function selectDistrict(district: District) {
  form.value.district = district.name
  form.value.province = district.province
  districtOpen.value = false
  districtSearch.value = district.name
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
          {{ isEdit ? 'Edit Instruktur' : 'Tambah Instruktur Baru' }}
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
            Cari berdasarkan nama atau email user yang akan dijadikan instruktur
          </p>
        </div>

        <!-- District Selection -->
        <div class="space-y-2">
          <Label>Kabupaten/Kota *</Label>
          <Popover v-model:open="districtOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                :aria-expanded="districtOpen"
                class="w-full justify-between h-auto min-h-[2.5rem] py-2"
                :disabled="loading"
              >
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <MapPin class="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div class="flex-1 min-w-0 text-left">
                    <div v-if="selectedDistrict" class="truncate">
                      <span class="font-medium">{{ selectedDistrict.name }}</span>
                      <span class="text-xs text-muted-foreground ml-2">
                        ({{ selectedDistrict.province }})
                      </span>
                    </div>
                    <span v-else class="text-muted-foreground">
                      Pilih kabupaten/kota...
                    </span>
                  </div>
                </div>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-full p-0">
              <Command>
                <CommandInput 
                  v-model="districtSearch"
                  placeholder="Ketik nama kabupaten/kota atau provinsi..." 
                />
                <CommandEmpty>
                  <div class="p-4 text-center">
                    <p class="text-sm text-muted-foreground">
                      {{ districtSearch.trim() ? 'Kabupaten/kota tidak ditemukan.' : 'Ketik untuk mencari kabupaten/kota.' }}
                    </p>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <CommandList class="max-h-60">
                    <CommandItem
                      v-for="district in filteredDistricts"
                      :key="district.id"
                      :value="`${district.name} ${district.province}`"
                      @select="selectDistrict(district)"
                      class="cursor-pointer"
                    >
                      <div class="flex items-center space-x-3 w-full">
                        <MapPin class="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div class="flex-1 min-w-0">
                          <p class="font-medium truncate">{{ district.name }}</p>
                          <p class="text-xs text-muted-foreground truncate">{{ district.province }}</p>
                        </div>
                        <Check
                          :class="[
                            'ml-auto h-4 w-4 flex-shrink-0',
                            form.district === district.name ? 'opacity-100' : 'opacity-0'
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
            Pilih kabupaten/kota tempat instruktur akan bertugas
          </p>
        </div>

        <!-- Province (Read-only) -->
        <div class="space-y-2">
          <Label for="province">Provinsi *</Label>
          <Input
            id="province"
            v-model="form.province"
            placeholder="Provinsi akan terisi otomatis"
            :disabled="true"
            class="bg-gray-50"
          />
          <p class="text-xs text-muted-foreground">
            Provinsi akan terisi otomatis berdasarkan kabupaten/kota yang dipilih
          </p>
        </div>

        <!-- Note -->
        <div class="space-y-2">
          <Label for="note">Catatan</Label>
          <Textarea
            id="note"
            v-model="form.note"
            placeholder="Masukkan catatan tentang instruktur..."
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