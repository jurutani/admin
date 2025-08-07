<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Upload, FileText, Image, X, Loader2, Trash2 } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const { toast } = useToast()

const props = defineProps<{
  open: boolean
  courseItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const categories = ref<{ id: string; name: string }[]>([])
const loading = ref(false)
const uploading = ref(false)

const form = ref({
  title: '',
  description: '',
  category: '',
  link_drive: '',
  link_youtube: '',
  image_file: null as File | null,
  course_files: [] as File[]
})

// Add refs for existing files display
const existingImageUrl = ref<string | null>(null)
const existingFiles = ref<string[]>([])
const filesToDelete = ref<string[]>([])
const imageToDelete = ref<boolean>(false)

const isEdit = computed(() => !!props.courseItem)

onMounted(async () => {
  await fetchCategories()
})

watch(() => props.courseItem, (newItem) => {
  if (newItem) {
    form.value = {
      title: newItem.title || '',
      description: newItem.description || '',
      category: newItem.category || '',
      link_drive: newItem.link_drive || '',
      link_youtube: newItem.link_youtube || '',
      image_file: null,
      course_files: []
    }
    
    // Set existing media
    existingImageUrl.value = newItem.image_url || null
    existingFiles.value = newItem.files ? JSON.parse(newItem.files) : []
    filesToDelete.value = []
    imageToDelete.value = false
  } else {
    resetForm()
  }
}, { immediate: true })

async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('category')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) throw error
    categories.value = data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
    toast({
      title: "Error",
      description: "Gagal memuat kategori",
      variant: "destructive"
    })
  }
}

async function uploadFile(file: File, bucket: string, folder: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

async function uploadMultipleFiles(files: File[], courseId: string): Promise<string[]> {
  const uploadPromises = files.map(file => 
    uploadFile(file, 'courses', `files/${courseId}`)
  )
  
  const results = await Promise.all(uploadPromises)
  return results.filter(url => url !== null) as string[]
}

async function handleSubmit() {
  if (!form.value.title || !form.value.category) {
    toast({
      title: "Error",
      description: "Judul dan kategori harus diisi",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    let imageUrl = props.courseItem?.image_url || null
    let filesUrls: string[] = existingFiles.value || []

    // Handle image deletion
    if (imageToDelete.value) {
      imageUrl = null
    }

    // Handle files deletion
    if (filesToDelete.value.length > 0) {
      filesUrls = filesUrls.filter(url => !filesToDelete.value.includes(url))
    }

    // Generate course ID for new courses or use existing ID
    const courseId = props.courseItem?.id || crypto.randomUUID()

    // Upload image if provided
    if (form.value.image_file) {
      uploading.value = true
      imageUrl = await uploadFile(form.value.image_file, 'courses', `image/${courseId}`)
      uploading.value = false
    }

    // Upload course files if provided
    if (form.value.course_files.length > 0) {
      uploading.value = true
      const newFilesUrls = await uploadMultipleFiles(form.value.course_files, courseId)
      filesUrls = [...filesUrls, ...newFilesUrls]
      uploading.value = false
    }

    // Prepare course data
    const courseData = {
      title: form.value.title,
      description: form.value.description || null,
      category: form.value.category,
      link_drive: form.value.link_drive || null,
      link_youtube: form.value.link_youtube || null,
      image_url: imageUrl,
      files: filesUrls.length > 0 ? JSON.stringify(filesUrls) : null,
      updated_at: new Date().toISOString()
    }

    let result
    if (isEdit.value) {
      result = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', props.courseItem.id)
    } else {
      result = await supabase
        .from('courses')
        .insert({
          id: courseId,
          ...courseData,
          created_at: new Date().toISOString(),
          deleted_at: null,
          archived_at: null
        })
    }

    if (result.error) throw result.error

    toast({
      title: "Berhasil",
      description: `Course berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving course:', error)
    toast({
      title: "Error", 
      description: "Gagal menyimpan course",
      variant: "destructive"
    })
  } finally {
    loading.value = false
    uploading.value = false
  }
}

function resetForm() {
  form.value = {
    title: '',
    description: '',
    category: '',
    link_drive: '',
    link_youtube: '',
    image_file: null,
    course_files: []
  }
  existingImageUrl.value = null
  existingFiles.value = []
  filesToDelete.value = []
  imageToDelete.value = false
}

function onImageChange(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.image_file = target.files?.[0] || null
}

function onFilesChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    form.value.course_files = Array.from(target.files)
  }
}

function removeFile(index: number) {
  form.value.course_files.splice(index, 1)
}

function removeImage() {
  form.value.image_file = null
  // Reset the file input
  const imageInput = document.getElementById('image') as HTMLInputElement
  if (imageInput) imageInput.value = ''
}

function removeExistingImage() {
  if (confirm('Apakah Anda yakin ingin menghapus gambar ini? Gambar akan dihapus saat course disimpan.')) {
    imageToDelete.value = true
    existingImageUrl.value = null
  }
}

function removeExistingFile(fileUrl: string, fileName: string) {
  if (confirm(`Apakah Anda yakin ingin menghapus file "${fileName}"? File akan dihapus saat course disimpan.`)) {
    filesToDelete.value.push(fileUrl)
    existingFiles.value = existingFiles.value.filter(url => url !== fileUrl)
  }
}

function getFileNameFromUrl(url: string): string {
  try {
    const urlParts = url.split('/')
    return urlParts[urlParts.length - 1] || 'Unknown file'
  } catch {
    return 'Unknown file'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function validateYouTubeUrl(url: string): boolean {
  if (!url) return true
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
  return youtubeRegex.test(url)
}

function validateDriveUrl(url: string): boolean {
  if (!url) return true
  const driveRegex = /^https:\/\/drive\.google\.com\/.+$/
  return driveRegex.test(url)
}

const isFormValid = computed(() => {
  return form.value.title.trim() !== '' && 
         form.value.category !== '' &&
         validateYouTubeUrl(form.value.link_youtube) &&
         validateDriveUrl(form.value.link_drive)
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Course' : 'Tambah Course Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Basic Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Informasi Dasar</h3>
          
          <div class="space-y-2">
            <Label for="title">Judul Course *</Label>
            <Input
              id="title"
              v-model="form.title"
              placeholder="Masukkan judul course"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="category">Kategori *</Label>
            <Select v-model="form.category" required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="cat in categories"
                  :key="cat.id"
                  :value="cat.name"
                >
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="description">Deskripsi</Label>
            <Textarea
              id="description"
              v-model="form.description"
              placeholder="Masukkan deskripsi course"
              rows="4"
            />
          </div>
        </div>

        <!-- Links -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Link Resources</h3>
          
          <div class="space-y-2">
            <Label for="link_drive">Google Drive Link</Label>
            <Input
              id="link_drive"
              v-model="form.link_drive"
              type="url"
              placeholder="https://drive.google.com/..."
              :class="form.link_drive && !validateDriveUrl(form.link_drive) ? 'border-red-500' : ''"
            />
            <p v-if="form.link_drive && !validateDriveUrl(form.link_drive)" class="text-sm text-red-500">
              URL Google Drive tidak valid
            </p>
          </div>

          <div class="space-y-2">
            <Label for="link_youtube">YouTube Link</Label>
            <Input
              id="link_youtube"
              v-model="form.link_youtube"
              type="url"
              placeholder="https://youtube.com/... atau https://youtu.be/..."
              :class="form.link_youtube && !validateYouTubeUrl(form.link_youtube) ? 'border-red-500' : ''"
            />
            <p v-if="form.link_youtube && !validateYouTubeUrl(form.link_youtube)" class="text-sm text-red-500">
              URL YouTube tidak valid
            </p>
          </div>
        </div>

        <!-- File Uploads -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Media & Files</h3>
          
          <!-- Existing Image Display -->
          <div v-if="existingImageUrl && isEdit" class="space-y-2">
            <Label>Gambar Course Saat Ini</Label>
            <div class="p-3 border rounded-lg bg-blue-50">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <Image class="h-4 w-4 text-blue-500" />
                  <span class="text-sm font-medium text-blue-700">Gambar yang sudah ada</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="removeExistingImage"
                  class="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
              <img 
                :src="existingImageUrl" 
                alt="Course image" 
                class="w-32 h-24 object-cover rounded border"
              />
            </div>
          </div>
          
          <!-- Image Upload -->
          <div class="space-y-2">
            <Label for="image">{{ existingImageUrl && isEdit ? 'Upload Gambar Baru (Opsional)' : 'Gambar Course' }}</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              @change="onImageChange"
            />
            
            <!-- New Image Preview -->
            <div v-if="form.image_file" class="mt-2 p-3 border rounded-lg bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <Image class="h-4 w-4 text-blue-500" />
                  <span class="text-sm font-medium">{{ form.image_file.name }}</span>
                  <span class="text-xs text-gray-500">({{ formatFileSize(form.image_file.size) }})</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="removeImage"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <p class="text-xs text-gray-500">
              Format yang didukung: JPG, PNG, GIF (Max: 5MB)
            </p>
          </div>

          <!-- Deleted Image Info -->
          <div v-if="imageToDelete && isEdit" class="space-y-2">
            <Label>Status Gambar</Label>
            <div class="p-3 border rounded-lg bg-red-50 border-red-200">
              <div class="flex items-center space-x-2">
                <Trash2 class="h-4 w-4 text-red-500" />
                <span class="text-sm font-medium text-red-700">
                  Gambar akan dihapus saat course disimpan
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="imageToDelete = false; existingImageUrl = courseItem?.image_url || null"
                  class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 ml-auto"
                >
                  Batal Hapus
                </Button>
              </div>
            </div>
          </div>

          <!-- Deleted Files Info -->
          <div v-if="filesToDelete.length > 0 && isEdit" class="space-y-2">
            <Label>File yang Akan Dihapus</Label>
            <div class="space-y-2">
              <div
                v-for="(fileUrl, index) in filesToDelete"
                :key="index"
                class="p-3 border rounded-lg bg-red-50 border-red-200"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <Trash2 class="h-4 w-4 text-red-500" />
                    <span class="text-sm font-medium text-red-700">
                      {{ getFileNameFromUrl(fileUrl) }} - akan dihapus
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="filesToDelete = filesToDelete.filter(url => url !== fileUrl); existingFiles.push(fileUrl)"
                    class="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Batal Hapus
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="existingFiles.length > 0 && isEdit" class="space-y-2">
            <Label>File Course Saat Ini</Label>
            <div class="space-y-2">
              <div
                v-for="(fileUrl, index) in existingFiles"
                :key="index"
                class="p-3 border rounded-lg bg-blue-50"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <FileText class="h-4 w-4 text-blue-500" />
                    <span class="text-sm font-medium text-blue-700">
                      {{ getFileNameFromUrl(fileUrl) }}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="removeExistingFile(fileUrl, getFileNameFromUrl(fileUrl))"
                    class="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Files Upload -->
          <div class="space-y-2">
            <Label for="files">{{ existingFiles.length > 0 && isEdit ? 'Upload File Tambahan (Opsional)' : 'File Course' }}</Label>
            <Input
              id="files"
              type="file"
              multiple
              @change="onFilesChange"
            />
            
            <!-- New Files Preview -->
            <div v-if="form.course_files.length > 0" class="mt-2 space-y-2">
              <div
                v-for="(file, index) in form.course_files"
                :key="index"
                class="p-3 border rounded-lg bg-gray-50"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <FileText class="h-4 w-4 text-green-500" />
                    <span class="text-sm font-medium">{{ file.name }}</span>
                    <span class="text-xs text-gray-500">({{ formatFileSize(file.size) }})</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="removeFile(index)"
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <p class="text-xs text-gray-500">
              Anda dapat memilih multiple file sekaligus (PDF, DOC, PPT, dll)
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            :disabled="loading"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            :disabled="loading || !isFormValid"
          >
            <Loader2 v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
            <Upload v-else-if="uploading" class="h-4 w-4 mr-2" />
            <span v-if="loading">
              {{ uploading ? 'Mengupload...' : 'Menyimpan...' }}
            </span>
            <span v-else>
              {{ isEdit ? 'Update Course' : 'Simpan Course' }}
            </span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>