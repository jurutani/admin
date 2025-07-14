<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/toast'
import { Check, ChevronsUpDown, User, Loader2, MapPin } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const { toast } = useToast()

// Props & Emits
const props = defineProps<{
  open: boolean
  instructorItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

// State
const districts = ref([])
const users = ref([])
const loading = ref(false)
const userSearch = ref('')
const userOpen = ref(false)
const searchingUsers = ref(false)
const districtOpen = ref(false)
const districtSearch = ref('')
const searchTimeout = ref(null)

const form = ref({
  user_id: '',
  district: '',
  province: '',
  note: ''
})

// Computed
const isEdit = computed(() => !!props.instructorItem)
const selectedUser = computed(() => users.value.find(user => user.id === form.value.user_id))
const selectedDistrict = computed(() => districts.value.find(district => district.name === form.value.district))
const isFormValid = computed(() => form.value.user_id && form.value.district && form.value.province)

const filteredDistricts = computed(() => {
  if (!districtSearch.value.trim()) return districts.value
  const search = districtSearch.value.toLowerCase()
  return districts.value.filter(district => 
    district.name.toLowerCase().includes(search) ||
    district.province.toLowerCase().includes(search)
  )
})

// Methods
const searchUsers = async (searchTerm = '') => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(async () => {
    try {
      searchingUsers.value = true
      
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('role', 'petani')
        .order('full_name')
        .limit(20)

      if (searchTerm.trim()) {
        query = query.ilike('full_name', `%${searchTerm}%`)
      }

      const { data, error } = await query
      if (error) throw error
      
      users.value = data || []
    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: "Error",
        description: "Gagal mencari user",
        variant: "destructive"
      })
    } finally {
      searchingUsers.value = false
    }
  }, 300)
}

const fetchDistricts = async () => {
  try {
    const { data, error } = await supabase
      .from('districts')
      .select('id, name, province')
      .order('province')
      .order('name')

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

const handleSubmit = async () => {
  if (!isFormValid.value) {
    toast({
      title: "Error",
      description: "Semua field wajib harus diisi",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    const now = new Date().toISOString()
    
    // 1. Save to instructors table
    const instructorData = {
      user_id: form.value.user_id,
      district: form.value.district,
      provinces: form.value.province,
      note: form.value.note,
      updated_at: now
    }

    if (isEdit.value && props.instructorItem?.id) {
      // Update existing instructor
      const { error } = await supabase
        .from('instructors')
        .update(instructorData)
        .eq('id', props.instructorItem.id)
      
      if (error) throw error
    } else {
      // Create new instructor
      const { error } = await supabase
        .from('instructors')
        .insert({ ...instructorData, created_at: now })
      
      if (error) throw error
    }

    // 2. Update user role to 'penyuluh'
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ 
        role: 'penyuluh',
        updated_at: now
      })
      .eq('id', form.value.user_id)

    if (roleError) {
      console.warn('Failed to update user role:', roleError)
    }

    toast({
      title: "Berhasil",
      description: `Penyuluh berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'} dan role user diubah menjadi penyuluh`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving instructor:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan data penyuluh",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    user_id: '',
    district: '',
    province: '',
    note: ''
  }
  userSearch.value = ''
  districtSearch.value = ''
  users.value = []
}

const selectUser = (user) => {
  form.value.user_id = user.id
  userOpen.value = false
  userSearch.value = user.full_name || user.email
}

const selectDistrict = (district) => {
  form.value.district = district.name
  form.value.province = district.province
  districtOpen.value = false
  districtSearch.value = district.name
}

const handleDialogClose = () => {
  emit('update:open', false)
  resetForm()
}

// Watchers
watch(userSearch, (newSearch) => {
  searchUsers(newSearch.trim())
})

watch(() => props.instructorItem, (newItem) => {
  if (newItem) {
    form.value = {
      user_id: newItem.user_id || '',
      district: newItem.district || '',
      province: newItem.provinces || '',
      note: newItem.note || ''
    }
    
    if (newItem.user_id) {
      // Load user data for edit mode
      searchUsers()
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  fetchDistricts()
  searchUsers()
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Penyuluh' : 'Tambah Penyuluh Baru' }}
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
                    <p class="text-sm text-muted-foresize">
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
                  placeholder="Ketik nama kabupaten/kota..." 
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
                    </Commanditem>
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
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
        </div>

        <!-- Note -->
        <div class="space-y-2">
          <Label for="note">Catatan</Label>
          <Textarea
            id="note"
            v-model="form.note"
            placeholder="Masukkan catatan tentang penyuluh..."
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

