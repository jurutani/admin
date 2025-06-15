<script setup lang="ts">
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()

// Data refs
const banner = ref<any>(null)
const loading = ref(true)
const uploading = ref(false)
const imagePreview = ref('')

// File input ref
const fileInput = ref<HTMLInputElement>()

// Load banner data
const loadBanner = async () => {
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from('banner')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error loading banner:', error)
    } else {
      banner.value = data && data.length > 0 ? data[0] : null
      if (banner.value?.image_url) {
        imagePreview.value = getImageUrl(banner.value.image_url)
      }
    }
  }
  catch (error) {
    console.error('Error loading banner:', error)
  }
  loading.value = false
}

// Get image URL from storage
const getImageUrl = (path: string) => {
  if (!path) return ''
  try {
    const { data } = supabase.storage
      .from('banner-image')
      .getPublicUrl(path)
    console.log('Generated image URL:', data.publicUrl)
    return data.publicUrl
  }
  catch (error) {
    console.error('Error getting image URL:', error)
    return ''
  }
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
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `image/banner-${Date.now()}.${fileExt}`
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banner-image')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      uploading.value = false
      return
    }
    // Delete old image if exists
    if (banner.value?.image_url) {
      const { error: deleteError } = await supabase.storage
        .from('banner-image')
        .remove([banner.value.image_url])
      if (deleteError) {
        console.error('Error deleting old image:', deleteError)
      }
    }
    // Prepare data for upsert
    const bannerData = {
      image_url: fileName
    }
    // Add ID if updating existing banner
    if (banner.value?.id) {
      bannerData.id = banner.value.id
    }
    // Upsert banner record
    const { data: upsertData, error: upsertError } = await supabase
      .from('banner')
      .upsert([bannerData], {
        onConflict: 'id'
      })
      .select()
    if (upsertError) {
      console.error('Error saving banner:', upsertError)
      uploading.value = false
      return
    }
    // Update local state
    if (upsertData && upsertData.length > 0) {
      banner.value = upsertData[0]
      imagePreview.value = getImageUrl(upsertData[0].image_url)
    }
  } catch (error) {
    console.error('Error uploading image:', error)
  }
  uploading.value = false
}
// Remove banner
const removeBanner = async () => {
  if (!banner.value) return
  uploading.value = true
  try {
    // Delete image from storage
    if (banner.value.image_url) {
      await supabase.storage
        .from('banner-image')
        .remove([banner.value.image_url])
    }
    // Delete record from database
    const { error } = await supabase
      .from('banner')
      .delete()
      .eq('id', banner.value.id)
    if (error) {
      console.error('Error removing banner:', error)
    } else {
      banner.value = null
      imagePreview.value = ''
    }
  } catch (error) {
    console.error('Error removing banner:', error)
  }
  uploading.value = false
}
// Trigger file input
const triggerFileInput = () => {
  fileInput.value?.click()
}
onMounted(() => {
  loadBanner()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Banner Management</h1>
        <p class="text-sm text-muted-foreground">
          Kelola banner utama aplikasi Juru Tani
        </p>
      </div>
    </div>
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Memuat banner...</p>
    </div>
    <div v-else class="space-y-6">
      <!-- Current Banner Display -->
      <Card class="overflow-hidden">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <ImageIcon class="h-5 w-5" />
            Banner Saat Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="imagePreview" class="space-y-4">
            <!-- Image Preview -->
            <div class="relative rounded-lg overflow-hidden bg-muted">
              <img
                :src="imagePreview"
                alt="Banner"
                class="w-full h-64 object-cover"
                @error="() => { console.error('Image failed to load:', imagePreview); imagePreview = '' }"
                @load="() => console.log('Image loaded successfully:', imagePreview)"
              />
            </div>
            <!-- Image Actions -->
            <div class="flex gap-2">
              <Button
                class="flex-1"
                @click="triggerFileInput"
                :disabled="uploading"
              >
                <Upload class="h-4 w-4 mr-2" />
                {{ uploading ? 'Mengupload...' : 'Ganti Banner' }}
              </Button>
              <Button
                :disabled="uploading"
                variant="destructive"
                size="icon"
                @click="removeBanner"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <!-- No Banner State -->
          <div v-else class="text-center py-12">
            <div class="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon class="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-medium mb-2">Belum ada banner</h3>
            <p class="text-muted-foreground mb-4">
              Upload gambar untuk banner utama aplikasi
            </p>
            <Button
              :disabled="uploading"
              @click="triggerFileInput"
            >
              <Upload class="h-4 w-4 mr-2" />
              {{ uploading ? 'Mengupload...' : 'Upload Banner' }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
/* Custom styles if needed */
</style>