<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Calendar, Upload, X, ExternalLink, FileImage, Trash2 } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const supabase = useSupabaseClient()
const { user } = useAuth()
const { toast } = useToast()

const props = defineProps<{
  open: boolean
  meetingItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)
const uploadingImages = ref(false)

const form = ref({
  title: '',
  content: '',
  link: '',
  organization: '',
  category: 'offline'
})

const attachments = ref<File[]>([])
const existingAttachments = ref<string[]>([])
const attachmentsToDelete = ref<string[]>([])

const isEdit = computed(() => !!props.meetingItem)

// Watch for changes in meetingItem
watch(() => props.meetingItem, async (newItem) => {
  if (newItem) {
    form.value = {
      title: newItem.title || '',
      content: newItem.content || '',
      link: newItem.link || '',
      organization: newItem.organization || '',
      category: newItem.category || 'offline'
    }
    
    // Load existing attachments
    if (newItem.id) {
      await loadExistingAttachments(newItem.id)
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const categoryOptions = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' }
]

// Meeting URL validation
const isValidMeetingUrl = computed(() => {
  if (!form.value.link || form.value.category === 'offline') return true
  
  try {
    new URL(form.value.link)
    return true
  } catch {
    return false
  }
})

async function loadExistingAttachments(meetingId: string) {
  try {
    const { data, error } = await supabase.storage
      .from('meetings')
      .list(`${meetingId}/`, {
        limit: 100
      })

    if (error) throw error

    existingAttachments.value = data?.map(file => file.name) || []
  } catch (error) {
    console.error('Error loading attachments:', error)
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files).filter(file => {
      // Only allow image files
      return file.type.startsWith('image/')
    })
    
    if (newFiles.length !== target.files.length) {
      toast({
        title: "Peringatan",
        description: "Hanya file gambar yang diizinkan",
        variant: "destructive"
      })
    }
    
    attachments.value = [...attachments.value, ...newFiles]
    target.value = '' // Reset input
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

function removeExistingAttachment(filename: string) {
  attachmentsToDelete.value.push(filename)
  existingAttachments.value = existingAttachments.value.filter(f => f !== filename)
}

function restoreExistingAttachment(filename: string) {
  attachmentsToDelete.value = attachmentsToDelete.value.filter(f => f !== filename)
  existingAttachments.value.push(filename)
}

async function uploadAttachments(meetingId: string) {
  if (attachments.value.length === 0) return []

  uploadingImages.value = true
  const uploadedFiles: string[] = []

  try {
    for (const file of attachments.value) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${meetingId}/${fileName}`

      const { error } = await supabase.storage
        .from('meetings')
        .upload(filePath, file)

      if (error) throw error
      uploadedFiles.push(fileName)
    }

    return uploadedFiles
  } catch (error) {
    console.error('Error uploading attachments:', error)
    throw error
  } finally {
    uploadingImages.value = false
  }
}

async function deleteAttachments(meetingId: string, filenames: string[]) {
  if (filenames.length === 0) return

  try {
    const filePaths = filenames.map(name => `${meetingId}/${name}`)
    const { error } = await supabase.storage
      .from('meetings')
      .remove(filePaths)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting attachments:', error)
    throw error
  }
}

function getAttachmentUrl(meetingId: string, filename: string) {
  const { data } = supabase.storage
    .from('meetings')
    .getPublicUrl(`${meetingId}/${filename}`)
  
  return data.publicUrl
}

async function handleSubmit() {
  // Check if user is authenticated
  if (!user.value) {
    toast({
      title: "Error",
      description: "Anda harus login terlebih dahulu",
      variant: "destructive"
    })
    return
  }

  if (!form.value.title) {
    toast({
      title: "Error",
      description: "Judul harus diisi",
      variant: "destructive"
    })
    return
  }

  if (form.value.category === 'online' && form.value.link && !isValidMeetingUrl.value) {
    toast({
      title: "Error",
      description: "Format URL tidak valid",
      variant: "destructive"
    })
    return
  }

  if (form.value.category === 'online' && !form.value.link) {
    toast({
      title: "Error",
      description: "Link harus diisi untuk meeting online",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    let meetingId = props.meetingItem?.id

    const meetingData = {
      title: form.value.title,
      content: form.value.content || null,
      link: form.value.link || null,
      organization: form.value.organization || null,
      category: form.value.category,
      author_id: user.value.id,
      updated_at: new Date().toISOString()
    }

    let result
    if (isEdit.value) {
      result = await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', meetingId)
        .select()
    } else {
      result = await supabase
        .from('meetings')
        .insert({
          ...meetingData,
          created_at: new Date().toISOString()
        })
        .select()
      
      if (result.data && result.data[0]) {
        meetingId = result.data[0].id
      }
    }

    if (result.error) throw result.error

    // Handle file uploads and deletions
    if (meetingId) {
      // Delete removed attachments
      if (attachmentsToDelete.value.length > 0) {
        await deleteAttachments(meetingId, attachmentsToDelete.value)
      }

      // Upload new attachments
      let uploadedFiles: string[] = []
      if (attachments.value.length > 0) {
        uploadedFiles = await uploadAttachments(meetingId)
      }

      // Update attachments field in database
      const allAttachments = [
        ...existingAttachments.value,
        ...uploadedFiles
      ]

      if (allAttachments.length > 0 || attachmentsToDelete.value.length > 0) {
        await supabase
          .from('meetings')
          .update({ attachments: allAttachments })
          .eq('id', meetingId)
      }
    }

    toast({
      title: "Berhasil",
      description: `Meeting berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving meeting:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan meeting",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    title: '',
    content: '',
    link: '',
    organization: '',
    category: 'offline'
  }
  attachments.value = []
  existingAttachments.value = []
  attachmentsToDelete.value = []
}

function openMeetingLink() {
  if (form.value.link && isValidMeetingUrl.value) {
    window.open(form.value.link, '_blank')
  }
}

function formatMeetingUrl() {
  let url = form.value.link.trim()
  
  if (url && !url.startsWith('http')) {
    url = 'https://' + url
    form.value.link = url
  }
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <Calendar class="h-5 w-5" />
          <span>{{ isEdit ? 'Edit Meeting' : 'Tambah Meeting Baru' }}</span>
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Title -->
        <div class="space-y-2">
          <Label for="title">Judul Meeting *</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="Masukkan judul meeting"
            required
            :disabled="loading || uploadingImages"
          />
        </div>

        <!-- Category and Organization -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="category">Kategori *</Label>
            <Select v-model="form.category" :disabled="loading || uploadingImages">
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in categoryOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="organization">Organisasi</Label>
            <Input
              id="organization"
              v-model="form.organization"
              placeholder="Nama organisasi/instansi"
              :disabled="loading || uploadingImages"
            />
          </div>
        </div>

        <!-- Meeting Link (for online category) -->
        <div v-if="form.category === 'online'" class="space-y-2">
          <Label for="link">Link Meeting *</Label>
          <div class="flex space-x-2">
            <Input
              id="link"
              v-model="form.link"
              type="url"
              placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
              required
              :disabled="loading || uploadingImages"
              @blur="formatMeetingUrl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="!form.link || !isValidMeetingUrl || loading || uploadingImages"
              @click="openMeetingLink"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="form.link && !isValidMeetingUrl" class="text-sm text-red-600">
            Format URL tidak valid
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-2">
          <Label for="content">Konten Meeting</Label>
          <Textarea
            id="content"
            v-model="form.content"
            placeholder="Deskripsi, agenda, atau konten meeting"
            rows="6"
            :disabled="loading || uploadingImages"
          />
        </div>

        <!-- Attachments Upload -->
        <div class="space-y-2">
          <Label>Lampiran Gambar</Label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div class="text-center">
              <FileImage class="mx-auto h-12 w-12 text-gray-400" />
              <div class="mt-2">
                <label for="file-upload" class="cursor-pointer">
                  <span class="mt-2 block text-sm font-medium text-gray-900">
                    Klik untuk upload gambar
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    class="sr-only"
                    :disabled="loading || uploadingImages"
                    @change="handleFileSelect"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Existing Attachments (Edit Mode) -->
        <div v-if="existingAttachments.length > 0" class="space-y-2">
          <Label>Lampiran Saat Ini</Label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="filename in existingAttachments"
              :key="filename"
              class="flex items-center justify-between p-2 border rounded-lg"
            >
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <img
                  :src="getAttachmentUrl(props.meetingItem?.id, filename)"
                  :alt="filename"
                  class="w-10 h-10 object-cover rounded"
                />
                <span class="text-sm truncate">{{ filename }}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || uploadingImages"
                @click="removeExistingAttachment(filename)"
                class="text-red-600 hover:text-red-800"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Files to Delete (Edit Mode) -->
        <div v-if="attachmentsToDelete.length > 0" class="space-y-2">
          <Label class="text-red-600">File yang Akan Dihapus</Label>
          <div class="space-y-1">
            <div
              v-for="filename in attachmentsToDelete"
              :key="filename"
              class="flex items-center justify-between p-2 border border-red-200 rounded-lg bg-red-50"
            >
              <span class="text-sm text-red-800">{{ filename }}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || uploadingImages"
                @click="restoreExistingAttachment(filename)"
                class="text-green-600 hover:text-green-800"
              >
                Batalkan
              </Button>
            </div>
          </div>
        </div>

        <!-- New Attachments Preview -->
        <div v-if="attachments.length > 0" class="space-y-2">
          <Label>File Baru yang Akan Diupload</Label>
          <div class="space-y-2">
            <div
              v-for="(file, index) in attachments"
              :key="index"
              class="flex items-center justify-between p-2 border rounded-lg"
            >
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                  <FileImage class="h-5 w-5 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || uploadingImages"
                @click="removeAttachment(index)"
                class="text-red-600 hover:text-red-800"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Meeting Preview -->
        <div v-if="form.title" class="space-y-2">
          <Label>Preview Meeting</Label>
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="space-y-2">
              <h3 class="font-medium">{{ form.title }}</h3>
              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {{ categoryOptions.find(c => c.value === form.category)?.label }}
                </span>
                <span v-if="form.organization">{{ form.organization }}</span>
              </div>
              <div v-if="form.link && form.category === 'online'" class="text-sm text-blue-600">
                Link: {{ form.link }}
              </div>
              <div v-if="form.content" class="text-sm text-gray-700 line-clamp-3">
                {{ form.content }}
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            :disabled="loading || uploadingImages"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            :disabled="loading || uploadingImages || !isValidMeetingUrl || !user"
          >
            <span v-if="loading || uploadingImages">
              <Upload class="h-4 w-4 mr-2 animate-spin" />
              {{ uploadingImages ? 'Mengupload...' : 'Menyimpan...' }}
            </span>
            <span v-else>
              {{ isEdit ? 'Update' : 'Simpan' }}
            </span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>