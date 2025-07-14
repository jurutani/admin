<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Calendar, Upload, X, ExternalLink, FileImage, Trash2, Image as ImageIcon } from 'lucide-vue-next'
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
const uploadingImage = ref(false)
const uploadingAttachments = ref(false)

const form = ref({
  title: '',
  content: '',
  link: '',
  organization: '',
  category: 'offline',
  image_url: ''
})

const imageFile = ref<File | null>(null)
const attachmentFiles = ref<File[]>([])
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
      category: newItem.category || 'offline',
      image_url: newItem.image_url || ''
    }
    
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

// URL validation
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
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('attachments')
      .eq('id', meetingId)
      .single()

    if (error) throw error

    // attachments is now JSONB array
    existingAttachments.value = meeting?.attachments || []
  } catch (error) {
    console.error('Error loading attachments:', error)
  }
}

function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.type.startsWith('image/')) {
      imageFile.value = file
    } else {
      toast({
        title: "Error",
        description: "Hanya file gambar yang diizinkan",
        variant: "destructive"
      })
    }
    target.value = ''
  }
}

function handleAttachmentSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files).filter(file => file.type.startsWith('image/'))
    
    if (newFiles.length !== target.files.length) {
      toast({
        title: "Peringatan",
        description: "Hanya file gambar yang diizinkan",
        variant: "destructive"
      })
    }
    
    attachmentFiles.value = [...attachmentFiles.value, ...newFiles]
    target.value = ''
  }
}

function removeImage() {
  imageFile.value = null
  form.value.image_url = ''
}

function removeAttachment(index: number) {
  attachmentFiles.value.splice(index, 1)
}

function removeExistingAttachment(attachment: any) {
  attachmentsToDelete.value.push(attachment)
  existingAttachments.value = existingAttachments.value.filter(a => {
    if (typeof a === 'string' && typeof attachment === 'string') {
      return a !== attachment
    } else if (typeof a === 'object' && typeof attachment === 'object') {
      return a.name !== attachment.name
    }
    return true
  })
}

function restoreExistingAttachment(attachment: any) {
  attachmentsToDelete.value = attachmentsToDelete.value.filter(a => {
    if (typeof a === 'string' && typeof attachment === 'string') {
      return a !== attachment
    } else if (typeof a === 'object' && typeof attachment === 'object') {
      return a.name !== attachment.name
    }
    return true
  })
  existingAttachments.value.push(attachment)
}

async function uploadImage(meetingId: string) {
  if (!imageFile.value) return null

  uploadingImage.value = true
  try {
    const fileExt = imageFile.value.name.split('.').pop()
    const fileName = `image.${fileExt}`
    const filePath = `${meetingId}/${fileName}`

    const { error } = await supabase.storage
      .from('meetings')
      .upload(filePath, imageFile.value, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage
      .from('meetings')
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  } finally {
    uploadingImage.value = false
  }
}

async function uploadAttachments(meetingId: string) {
  if (attachmentFiles.value.length === 0) return []

  uploadingAttachments.value = true
  const uploadedFiles: { name: string; url: string }[] = []

  try {
    for (const file of attachmentFiles.value) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${meetingId}/attachments/${fileName}`

      const { error } = await supabase.storage
        .from('meetings')
        .upload(filePath, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('meetings')
        .getPublicUrl(filePath)

      uploadedFiles.push({
        name: fileName,
        url: data.publicUrl
      })
    }

    return uploadedFiles
  } catch (error) {
    console.error('Error uploading attachments:', error)
    throw error
  } finally {
    uploadingAttachments.value = false
  }
}

async function deleteAttachments(meetingId: string, attachmentsToDelete: any[]) {
  if (attachmentsToDelete.length === 0) return

  try {
    // Delete from storage
    const filePaths = attachmentsToDelete.map(attachment => {
      if (typeof attachment === 'string') {
        return `${meetingId}/attachments/${attachment}`
      } else {
        return `${meetingId}/attachments/${attachment.name}`
      }
    })
    
    const { error } = await supabase.storage
      .from('meetings')
      .remove(filePaths)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting attachments:', error)
    throw error
  }
}

function getAttachmentUrl(attachment: any) {
  if (typeof attachment === 'string') {
    // Legacy format - try to construct URL
    const { data } = supabase.storage
      .from('meetings')
      .getPublicUrl(`${props.meetingItem?.id}/attachments/${attachment}`)
    return data.publicUrl
  } else {
    // New format with URL
    return attachment.url
  }
}

async function handleSubmit() {
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

  if (form.value.category === 'online' && !form.value.link) {
    toast({
      title: "Error",
      description: "Link harus diisi untuk meeting online",
      variant: "destructive"
    })
    return
  }

  if (form.value.category === 'online' && !isValidMeetingUrl.value) {
    toast({
      title: "Error",
      description: "Format URL tidak valid",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    let meetingId = props.meetingItem?.id
    let imageUrl = form.value.image_url

    // Upload image if new one is selected
    if (imageFile.value) {
      if (!meetingId) {
        // Create temporary ID for new meeting
        meetingId = crypto.randomUUID()
      }
      imageUrl = await uploadImage(meetingId)
    }

    const meetingData = {
      title: form.value.title,
      content: form.value.content || null,
      link: form.value.link || null,
      organization: form.value.organization || null,
      category: form.value.category,
      image_url: imageUrl || null,
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
          id: meetingId,
          created_at: new Date().toISOString()
        })
        .select()
    }

    if (result.error) throw result.error

    // Handle attachments
    if (meetingId) {
      // Delete removed attachments
      if (attachmentsToDelete.value.length > 0) {
        await deleteAttachments(meetingId, attachmentsToDelete.value)
      }

      // Upload new attachments
      let uploadedFiles: string[] = []
      if (attachmentFiles.value.length > 0) {
        uploadedFiles = await uploadAttachments(meetingId)
      }

      // Update attachments field
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
    category: 'offline',
    image_url: ''
  }
  imageFile.value = null
  attachmentFiles.value = []
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

const isUploading = computed(() => uploadingImage.value || uploadingAttachments.value)

// Helper function to create object URL safely
function createObjectURL(file: File): string {
  if (typeof window !== 'undefined' && window.URL) {
    return window.URL.createObjectURL(file)
  }
  return ''
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <Calendar class="h-5 w-5" />
          <span>{{ isEdit ? 'Edit Meeting' : 'Tambah Meeting Baru' }}</span>
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Title -->
        <div class="space-y-2">
          <Label for="title">Judul Meeting *</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="Masukkan judul meeting"
            required
            :disabled="loading || isUploading"
          />
        </div>

        <!-- Category and Organization (Side by Side) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="category">Kategori *</Label>
            <Select v-model="form.category" :disabled="loading || isUploading">
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
            <Label for="organization">Instansi</Label>
            <Input
              id="organization"
              v-model="form.organization"
              placeholder="Nama instansi/organisasi"
              :disabled="loading || isUploading"
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
              :disabled="loading || isUploading"
              @blur="formatMeetingUrl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="!form.link || !isValidMeetingUrl || loading || isUploading"
              @click="openMeetingLink"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="form.link && !isValidMeetingUrl" class="text-sm text-red-600">
            Format URL tidak valid
          </div>
        </div>

        <!-- Image Upload -->
        <div class="space-y-2">
          <Label>Gambar Utama</Label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div v-if="imageFile || form.image_url" class="space-y-2">
              <div class="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  :src="imageFile ? createObjectURL(imageFile) : form.image_url"
                  alt="Preview"
                  class="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="loading || isUploading"
                  @click="removeImage"
                  class="absolute top-2 right-2 bg-red-500 text-white hover:bg-red-600"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div v-else class="text-center">
              <ImageIcon class="mx-auto h-12 w-12 text-gray-400" />
              <div class="mt-2">
                <label for="image-upload" class="cursor-pointer">
                  <span class="mt-2 block text-sm font-medium text-gray-900">
                    Klik untuk upload gambar utama
                  </span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    class="sr-only"
                    :disabled="loading || isUploading"
                    @change="handleImageSelect"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-2">
          <Label for="content">Konten Meeting</Label>
          <Textarea
            id="content"
            v-model="form.content"
            placeholder="Deskripsi, agenda, atau konten meeting"
            rows="5"
            :disabled="loading || isUploading"
          />
        </div>

        <!-- Attachments Upload -->
        <div class="space-y-2">
          <Label>Lampiran Tambahan</Label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div class="text-center">
              <FileImage class="mx-auto h-10 w-10 text-gray-400" />
              <div class="mt-2">
                <label for="attachments-upload" class="cursor-pointer">
                  <span class="mt-2 block text-sm font-medium text-gray-900">
                    Klik untuk upload lampiran
                  </span>
                  <input
                    id="attachments-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    class="sr-only"
                    :disabled="loading || isUploading"
                    @change="handleAttachmentSelect"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Existing Attachments -->
        <div v-if="existingAttachments.length > 0" class="space-y-2">
          <Label>Lampiran Saat Ini</Label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div
              v-for="attachment in existingAttachments"
              :key="typeof attachment === 'string' ? attachment : attachment.name"
              class="relative group"
            >
              <img
                :src="getAttachmentUrl(attachment)"
                :alt="typeof attachment === 'string' ? attachment : attachment.name"
                class="w-full h-20 object-cover rounded border"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || isUploading"
                @click="removeExistingAttachment(attachment)"
                class="absolute top-1 right-1 bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <!-- New Attachments Preview -->
        <div v-if="attachmentFiles.length > 0" class="space-y-2">
          <Label>Lampiran Baru</Label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div
              v-for="(file, index) in attachmentFiles"
              :key="index"
              class="relative group"
            >
              <img
                :src="createObjectURL(file)"
                :alt="file.name"
                class="w-full h-20 object-cover rounded border"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || isUploading"
                @click="removeAttachment(index)"
                class="absolute top-1 right-1 bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X class="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Files to Delete -->
        <div v-if="attachmentsToDelete.length > 0" class="space-y-2">
          <Label class="text-red-600">File yang Akan Dihapus</Label>
          <div class="space-y-1">
            <div
              v-for="attachment in attachmentsToDelete"
              :key="typeof attachment === 'string' ? attachment : attachment.name"
              class="flex items-center justify-between p-2 border border-red-200 rounded bg-red-50"
            >
              <span class="text-sm text-red-800">
                {{ typeof attachment === 'string' ? attachment : attachment.name }}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                :disabled="loading || isUploading"
                @click="restoreExistingAttachment(attachment)"
                class="text-green-600 hover:text-green-800"
              >
                Batalkan
              </Button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            :disabled="loading || isUploading"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            :disabled="loading || isUploading || !isValidMeetingUrl || !user"
          >
            <span v-if="loading || isUploading">
              <Upload class="h-4 w-4 mr-2 animate-spin" />
              {{ isUploading ? 'Mengupload...' : 'Menyimpan...' }}
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
