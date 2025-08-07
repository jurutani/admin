<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Loader2, Search } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const supabase = useSupabaseClient()
const { toast } = useToast()

// Props & Emits
const props = defineProps<{
  open: boolean
  instructorItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'instructor-added'): void
}>()

// State
const districts = ref([])
const users = ref([])
const loading = ref(false)
const searchQuery = ref('')

const form = ref({
  user_id: '',
  district: '',
  province: '',
  note: ''
})

// Computed
const isEdit = computed(() => !!props.instructorItem?.id)

const isFormValid = computed(() => {
  if (isEdit.value) {
    // Untuk edit, hanya butuh district dan province
    return form.value.district && form.value.province
  } else {
    // Untuk create, butuh semua field
    return form.value.user_id && form.value.district && form.value.province
  }
})

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Get selected user info for edit mode display
const selectedUserInfo = computed(() => {
  if (isEdit.value && props.instructorItem) {
    return {
      full_name: props.instructorItem.full_name,
      email: props.instructorItem.email,
      avatar_url: props.instructorItem.avatarUrl || props.instructorItem.profiles?.avatar_url,
      phone: props.instructorItem.phone,
      address: props.instructorItem.address
    }
  }
  return null
})

// Helper functions
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarUrl(avatarPath: string | null) {
  if (!avatarPath) return null
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarPath)
  return data.publicUrl
}

// Load users dengan role 'petani'
const loadUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, role')
      .eq('role', 'petani')
      .order('full_name', { ascending: true })

    if (error) throw error
    users.value = data || []
  } catch (error) {
    console.error('Error loading users:', error)
    toast({
      title: "Error",
      description: "Gagal memuat data user",
      variant: "destructive"
    })
  }
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
    
    if (isEdit.value && props.instructorItem?.id) {
      // Update existing instructor - hanya update district, province, dan note
      const instructorData = {
        district: form.value.district,
        provinces: form.value.province,
        note: form.value.note,
        updated_at: now
      }

      const { error } = await supabase
        .from('instructors')
        .update(instructorData)
        .eq('id', props.instructorItem.id)
      
      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Data instructor berhasil diperbarui"
      })
    } else {
      // Create new instructor
      const instructorData = {
        user_id: form.value.user_id,
        district: form.value.district,
        provinces: form.value.province,
        note: form.value.note,
        created_at: now,
        updated_at: now
      }

      const { error } = await supabase
        .from('instructors')
        .insert(instructorData)
      
      if (error) throw error

      // Update user role to 'penyuluh'
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
        description: "Instructor berhasil ditambahkan dan role user diubah menjadi penyuluh"
      })
    }

    closeDialog()

  } catch (error) {
    console.error('Error saving instructor:', error)
    toast({
      title: "Error",
      description: `Gagal ${isEdit.value ? 'memperbarui' : 'menyimpan'} data instructor`,
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
  searchQuery.value = ''
}

const closeDialog = () => {
  emit('instructor-added')
  emit('update:open', false)
  resetForm()
}

const handleDialogClose = () => {
  emit('update:open', false)
  resetForm()
}

const populateFormForEdit = (instructor) => {
  console.log('Populating form for edit:', instructor) // Debug log
  
  form.value = {
    user_id: instructor.user_id || '',
    district: instructor.district || '',
    province: instructor.provinces || instructor.province || '',
    note: instructor.note || ''
  }
  
  console.log('Form populated:', form.value) // Debug log
}

// Handle district selection
const handleDistrictSelect = (districtId) => {
  const selectedDistrict = districts.value.find(d => d.id === districtId)
  if (selectedDistrict) {
    form.value.district = selectedDistrict.name
    form.value.province = selectedDistrict.province
  }
}

// Watch untuk props.instructorItem
watch(() => props.instructorItem, async (newItem) => {
  console.log('instructorItem changed:', newItem) // Debug log
  
  if (newItem && props.open) {
    // Wait for next tick to ensure the dialog is fully rendered
    await nextTick()
    populateFormForEdit(newItem)
  } else if (!newItem) {
    resetForm()
  }
}, { immediate: true, deep: true })

// Watch untuk props.open
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.instructorItem) {
    // Populate form when dialog opens with instructor data
    await nextTick()
    populateFormForEdit(props.instructorItem)
  } else if (!isOpen) {
    // Reset form when dialog closes
    resetForm()
  }
})

// Lifecycle
onMounted(async () => {
  console.log('Component mounted') // Debug log
  await fetchDistricts()
  await loadUsers()
  
  // Jika instructorItem sudah ada saat mount, populate form
  if (props.instructorItem) {
    populateFormForEdit(props.instructorItem)
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Instructor' : 'Tambah Instructor Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- User Info Section -->
        <div class="space-y-2">
          <Label>{{ isEdit ? 'Instructor' : 'Pilih User' }} *</Label>
          
          <!-- Mode Edit: Display instructor info (read-only) -->
          <div v-if="isEdit && selectedUserInfo" class="border rounded-md p-4 bg-gray-50">
            <div class="flex items-center space-x-3">
              <Avatar class="h-12 w-12">
                <AvatarImage 
                  :src="getAvatarUrl(selectedUserInfo.avatar_url)" 
                  :alt="selectedUserInfo.full_name" 
                />
                <AvatarFallback class="bg-blue-100 text-blue-700 text-sm">
                  {{ getInitials(selectedUserInfo.full_name || 'Instructor') }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-lg">{{ selectedUserInfo.full_name || 'Nama tidak tersedia' }}</h3>
                <p class="text-sm text-muted-foreground">{{ selectedUserInfo.email || 'Email tidak tersedia' }}</p>
                <p v-if="selectedUserInfo.phone" class="text-xs text-muted-foreground mt-1">
                  📞 {{ selectedUserInfo.phone }}
                </p>
                <div v-if="selectedUserInfo.address" class="text-xs text-muted-foreground mt-1 max-w-md">
                  📍 {{ selectedUserInfo.address }}
                </div>
              </div>
            </div>
          </div>

          <!-- Mode Create: User selection with search -->
          <template v-else-if="!isEdit">
            <!-- Search Input -->
            <div class="relative">
              <Search class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                v-model="searchQuery"
                placeholder="Cari user..."
                class="pl-10"
                :disabled="loading"
              />
            </div>

            <!-- User Select -->
            <Select v-model="form.user_id" :disabled="loading">
              <SelectTrigger class="h-auto min-h-[2.5rem] py-2">
                <SelectValue placeholder="Pilih user yang akan dijadikan instructor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="user in filteredUsers"
                  :key="user.id"
                  :value="user.id"
                  class="cursor-pointer"
                >
                  <div class="flex items-center space-x-3 w-full">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img 
                        v-if="user.avatar_url" 
                        :src="getAvatarUrl(user.avatar_url)" 
                        :alt="user.full_name"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="text-xs font-medium text-gray-600">
                        {{ getInitials(user.full_name || user.email || 'U') }}
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium truncate">{{ user.full_name || user.email }}</p>
                      <p class="text-xs text-muted-foreground truncate">{{ user.role }}</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </template>
        </div>

        <!-- District Selection (Always editable) -->
        <div class="space-y-2">
          <Label>Kabupaten/Kota *</Label>
          <Select 
            :model-value="districts.find(d => d.name === form.district)?.id || ''"
            @update:model-value="handleDistrictSelect"
            :disabled="loading"
          >
            <SelectTrigger>
              <SelectValue 
                :placeholder="form.district || 'Pilih kabupaten/kota...'"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="district in districts"
                :key="district.id"
                :value="district.id"
              >
                {{ district.name }} - {{ district.province }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Province (Read-only, auto-filled) -->
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

        <!-- Note (Always editable) -->
        <div class="space-y-2">
          <Label for="note">Catatan</Label>
          <Textarea
            id="note"
            v-model="form.note"
            placeholder="Masukkan catatan tentang instructor..."
            rows="4"
            :disabled="loading"
          />
        </div>

        <!-- Info untuk Edit Mode -->
        <div v-if="isEdit" class="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-700">
            <strong>Info:</strong> Dalam mode edit, hanya kabupaten/kota, provinsi, dan catatan yang dapat diubah.
          </p>
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
