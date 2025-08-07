<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Loader2, Search } from 'lucide-vue-next'

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

// State
const users = ref([])
const categories = ref([])
const loading = ref(false)
const searchQuery = ref('')

const form = ref({
  user_id: '',
  category: '',
  note: ''
})

// Computed
const isEdit = computed(() => !!props.expertItem)
const isFormValid = computed(() => form.value.user_id && form.value.category)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Get selected user for edit mode display
const selectedUserInfo = computed(() => {
  if (isEdit.value && props.expertItem) {
    return {
      full_name: props.expertItem.full_name,
      email: props.expertItem.email
    }
  }
  return null
})

// Watch for changes in props.expertItem and form population
watch(() => props.expertItem, (newExpertItem) => {
  if (newExpertItem) {
    populateForm(newExpertItem)
  }
}, { immediate: true, deep: true })

// Watch for dialog open/close to handle form reset
watch(() => props.open, (newOpen) => {
  if (newOpen) {
    // Dialog opened
    if (props.expertItem) {
      populateForm(props.expertItem)
    } else {
      resetForm()
    }
  }
})

// Function to populate form with expert data
function populateForm(expertItem: any) {
  console.log('Populating form with:', expertItem) // Debug log
  form.value = {
    user_id: expertItem.user_id || '',
    category: expertItem.category || '',
    note: expertItem.note || ''
  }
}

// Load data saat component mount
onMounted(async () => {
  await loadUsers()
  await loadCategories()
  
  // Jika expertItem sudah ada saat mount, populate form
  if (props.expertItem) {
    populateForm(props.expertItem)
  }
})

// Load semua users dengan role 'petani'
async function loadUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
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

// Load categories
async function loadCategories() {
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
    console.error('Error loading categories:', error)
    toast({
      title: "Error",
      description: "Gagal memuat kategori",
      variant: "destructive"
    })
  }
}

// Handle form submit
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
    
    // 1. Tambahkan/update ke tabel experts
    if (isEdit.value && props.expertItem?.id) {
      // Update existing expert - hanya category dan note
      const { error: expertError } = await supabase
        .from('experts')
        .update({
          category: form.value.category,
          note: form.value.note,
          updated_at: now
        })
        .eq('id', props.expertItem.id)

      if (expertError) throw expertError
    } else {
      // Insert new expert
      const { error: expertError } = await supabase
        .from('experts')
        .insert({
          user_id: form.value.user_id,
          category: form.value.category,
          note: form.value.note,
          created_at: now,
          updated_at: now
        })

      if (expertError) throw expertError
      
      // 2. Update role user menjadi 'pakar' hanya untuk expert baru
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'pakar',
          updated_at: now
        })
        .eq('id', form.value.user_id)

      if (profileError) {
        console.warn('Warning: Failed to update user role:', profileError)
      }
    }

    toast({
      title: "Berhasil",
      description: `Expert berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'}${!isEdit.value ? ' dan role user diupdate menjadi pakar' : ''}`
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
  searchQuery.value = ''
}

function handleDialogClose() {
  emit('update:open', false)
  resetForm()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Expert' : 'Tambah Expert Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- User Selection - Berbeda untuk Add dan Edit -->
        <div class="space-y-2">
          <Label>{{ isEdit ? 'Expert' : 'Pilih User' }} *</Label>
          
          <!-- Edit Mode: Show selected user info (read-only) -->
          <div v-if="isEdit && selectedUserInfo" class="p-3 border rounded-md bg-gray-50">
            <div class="font-medium">{{ selectedUserInfo.full_name || 'Nama tidak tersedia' }}</div>
            <div class="text-sm text-gray-500">{{ selectedUserInfo.email }}</div>
          </div>

          <!-- Add Mode: User selection with search -->
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
              <SelectTrigger>
                <SelectValue placeholder="Pilih user yang akan dijadikan expert" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="user in filteredUsers"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ user.full_name || user.email }} ({{ user.role }})
                </SelectItem>
              </SelectContent>
            </Select>
          </template>
        </div>

        <!-- Category Selection -->
        <div class="space-y-2">
          <Label>Kategori Expert *</Label>
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
          <Label>Catatan</Label>
          <Textarea
            v-model="form.note"
            placeholder="Masukkan catatan tentang keahlian expert..."
            rows="3"
            :disabled="loading"
          />
        </div>

        <!-- Debug info (hapus setelah testing) -->
        <div v-if="isEdit" class="p-2 bg-gray-100 text-xs rounded">
          <strong>Debug:</strong> 
          Category: {{ form.category }}, 
          Note: {{ form.note }}, 
          User ID: {{ form.user_id }}
        </div>

        <!-- Info untuk Edit Mode -->
        <div v-if="isEdit" class="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-700">
            <strong>Info:</strong> Dalam mode edit, hanya kategori dan catatan yang dapat diubah.
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
            {{ isEdit ? 'Update' : 'Simpan' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>