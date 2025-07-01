<script setup lang="ts">
import { Upload, Edit, Trash2, Plus, Eye, EyeOff } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()

// Data refs
const heroes = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingHero = ref<any>(null)

// Form data
const form = ref({
  id: '',
  caption: '',
  title: '',
  description: '',
  button_text: '',
  button_link: '',
  image_url: '',
  status: 'active'
})

// File input ref
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)

// Load hero data
const loadHeroes = async () => {
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from('hero_data')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading heroes:', error)
    } else {
      heroes.value = data || []
    }
  } catch (error) {
    console.error('Error loading heroes:', error)
  }
  loading.value = false
}

// Get image URL from storage
const getImageUrl = (path: string) => {
  if (!path) return ''
  try {
    const { data } = supabase.storage
      .from('hero-image')
      .getPublicUrl(path)
    return data.publicUrl
  } catch (error) {
    console.error('Error getting image URL:', error)
    return ''
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    id: '',
    caption: '',
    title: '',
    description: '',
    button_text: '',
    button_link: '',
    image_url: '',
    status: 'active'
  }
  editingHero.value = null
}

// Show add form
const showAddForm = () => {
  resetForm()
  showForm.value = true
}

// Show edit form
const showEditForm = (hero: any) => {
  form.value = { ...hero }
  editingHero.value = hero
  showForm.value = true
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadImage(file)
  }
}

// Upload image to storage
const uploadImage = async (file: File) => {
  uploading.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `hero-${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hero-image')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return
    }

    form.value.image_url = fileName
  } catch (error) {
    console.error('Error uploading image:', error)
  }
  uploading.value = false
}

// Save hero
const saveHero = async () => {
  saving.value = true
  try {
    const heroData = { ...form.value }
    delete heroData.id

    if (editingHero.value) {
      // Update existing hero
      const { error } = await supabase
        .from('hero_data')
        .update(heroData)
        .eq('id', form.value.id)

      if (error) {
        console.error('Error updating hero:', error)
        return
      }
    } else {
      // Create new hero
      const { error } = await supabase
        .from('hero_data')
        .insert([heroData])

      if (error) {
        console.error('Error creating hero:', error)
        return
      }
    }

    showForm.value = false
    resetForm()
    loadHeroes()
  } catch (error) {
    console.error('Error saving hero:', error)
  }
  saving.value = false
}

// Toggle hero status
const toggleStatus = async (hero: any) => {
  try {
    const newStatus = hero.status === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('hero_data')
      .update({ status: newStatus })
      .eq('id', hero.id)

    if (error) {
      console.error('Error updating status:', error)
      return
    }

    loadHeroes()
  } catch (error) {
    console.error('Error updating status:', error)
  }
}

// Delete hero (soft delete)
const deleteHero = async (hero: any) => {
  if (!confirm('Apakah Anda yakin ingin menghapus hero ini?')) return

  try {
    const { error } = await supabase
      .from('hero_data')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', hero.id)

    if (error) {
      console.error('Error deleting hero:', error)
      return
    }

    loadHeroes()
  } catch (error) {
    console.error('Error deleting hero:', error)
  }
}

// Trigger file input
const triggerFileInput = () => {
  fileInput.value?.click()
}

onMounted(() => {
  loadHeroes()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Add Button -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">Hero Management</h2>
        <p class="text-sm text-muted-foreground">
          Kelola konten hero section aplikasi
        </p>
      </div>
      <Button @click="showAddForm">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Hero
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Memuat data hero...</p>
    </div>

    <!-- Heroes List -->
    <div v-else class="space-y-4">
      <Card v-for="hero in heroes" :key="hero.id" class="overflow-hidden">
        <CardContent class="p-6">
          <div class="flex gap-6">
            <!-- Image -->
            <div class="flex-shrink-0">
              <div class="w-32 h-20 bg-muted rounded-lg overflow-hidden">
                <img
                  v-if="hero.image_url"
                  :src="getImageUrl(hero.image_url)"
                  :alt="hero.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <span class="text-muted-foreground text-xs">No Image</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge :variant="hero.status === 'active' ? 'default' : 'secondary'">
                      {{ hero.status }}
                    </Badge>
                    <span v-if="hero.caption" class="text-xs text-muted-foreground">
                      {{ hero.caption }}
                    </span>
                  </div>
                  <h3 class="font-semibold text-lg mb-1">{{ hero.title }}</h3>
                  <p class="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {{ hero.description }}
                  </p>
                  <div v-if="hero.button_text" class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Button: {{ hero.button_text }}</span>
                    <span v-if="hero.button_link">→ {{ hero.button_link }}</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    @click="toggleStatus(hero)"
                  >
                    <Eye v-if="hero.status === 'inactive'" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    @click="showEditForm(hero)"
                  >
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    @click="deleteHero(hero)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Empty State -->
      <Card v-if="heroes.length === 0" class="text-center py-12">
        <CardContent>
          <div class="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Plus class="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">Belum ada hero</h3>
          <p class="text-muted-foreground mb-4">
            Tambahkan konten hero pertama untuk aplikasi
          </p>
          <Button @click="showAddForm">
            <Plus class="h-4 w-4 mr-2" />
            Tambah Hero
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- Form Dialog -->
    <Dialog v-model:open="showForm">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingHero ? 'Edit Hero' : 'Tambah Hero Baru' }}
          </DialogTitle>
        </DialogHeader>

        <form @submit.prevent="saveHero" class="space-y-4">
          <!-- Caption -->
          <div>
            <Label for="caption">Caption</Label>
            <Input
              id="caption"
              v-model="form.caption"
              placeholder="Masukkan caption (opsional)"
            />
          </div>

          <!-- Title -->
          <div>
            <Label for="title">Title *</Label>
            <Input
              id="title"
              v-model="form.title"
              placeholder="Masukkan judul hero"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="form.description"
              placeholder="Masukkan deskripsi hero"
              rows="3"
            />
          </div>

          <!-- Button Text -->
          <div>
            <Label for="button_text">Button Text</Label>
            <Input
              id="button_text"
              v-model="form.button_text"
              placeholder="Masukkan teks tombol"
            />
          </div>

          <!-- Button Link -->
          <div>
            <Label for="button_link">Button Link</Label>
            <Input
              id="button_link"
              v-model="form.button_link"
              placeholder="Masukkan link tombol"
              type="url"
            />
          </div>

          <!-- Status -->
          <div>
            <Label for="status">Status</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Image Upload -->
          <div>
            <Label>Image</Label>
            <div class="space-y-4">
              <!-- Current Image Preview -->
              <div v-if="form.image_url" class="relative rounded-lg overflow-hidden bg-muted max-w-xs">
                <img
                  :src="getImageUrl(form.image_url)"
                  alt="Preview"
                  class="w-full h-32 object-cover"
                />
              </div>

              <!-- Upload Button -->
              <Button
                type="button"
                variant="outline"
                @click="triggerFileInput"
                :disabled="uploading"
              >
                <Upload class="h-4 w-4 mr-2" />
                {{ uploading ? 'Mengupload...' : (form.image_url ? 'Ganti Gambar' : 'Upload Gambar') }}
              </Button>
            </div>
          </div>

          <!-- Form Actions -->
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="showForm = false"
              :disabled="saving"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="saving || !form.title"
            >
              {{ saving ? 'Menyimpan...' : (editingHero ? 'Update' : 'Simpan') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      @change="handleFileSelect"
      class="hidden"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>