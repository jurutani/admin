<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Calendar, Upload, X, ExternalLink, FileText, Trash2, Image as ImageIcon, Loader2 } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

// Types
interface AttachmentItem {
  name: string
  url: string
  size?: number
  type?: string
}

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

// Loading states
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

// File handling
const imageFile = ref<File | null>(null)
const attachmentFiles = ref<File[]>([])
const existingAttachments = ref<AttachmentItem[]>([])
const attachmentsToDelete = ref<AttachmentItem[]>([])

const isEdit = computed(() => !!props.meetingItem)

// Accepted document types
const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]

const DOCUMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
  '.txt', '.csv', '.rtf', '.odt', '.ods', '.odp'
]

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

// File validation functions
function isValidDocumentType(file: File): boolean {
  // Check by MIME type
  if (ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
    return true
  }
  
  // Fallback: check by file extension
  const fileName = file.name.toLowerCase()
  return DOCUMENT_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

function getFileIcon(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  const iconMap: Record<string, string> = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '📋',
    'pptx': '📋',
    'txt': '📃',
    'csv': '📊',
    'rtf': '📝'
  }
  return iconMap[ext || ''] || '📄'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Load existing attachments from JSONB
async function loadExistingAttachments(meetingId: string) {
  try {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('attachments')
      .eq('id', meetingId)
      .single()

    if (error) throw error

    // Parse JSONB attachments array
    const attachments = meeting?.attachments || []
    existingAttachments.value = attachments.map((attachment: any) => {
      // Handle both old string format and new object format
      if (typeof attachment === 'string') {
        return {
          name: attachment,
          url: getAttachmentUrlFromName(meetingId, attachment),
          type: 'document'
        }
      }
      return {
        name: attachment.name || attachment.fileName || 'unknown',
        url: attachment.url || getAttachmentUrlFromName(meetingId, attachment.name),
        size: attachment.size,
        type: attachment.type || 'document'
      }
    })
  } catch (error) {
    console.error('Error loading attachments:', error)
    existingAttachments.value = []
  }
}

// Generate attachment URL from name
function getAttachmentUrlFromName(meetingId: string, fileName: string): string {
  const { data } = supabase.storage
    .from('meetings')
    .getPublicUrl(`${meetingId}/attachments/${fileName}`)
  return data.publicUrl
}

// Image handling
function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.type.startsWith('image/')) {
      if (isValidFileSize(file)) {
        imageFile.value = file
      } else {
        toast({
          title: "Error",
          description: `Ukuran file terlalu besar. Maksimal ${formatFileSize(MAX_FILE_SIZE)}`,
          variant: "destructive"
        })
      }
    } else {
      toast({
        title: "Error",
        description: "Hanya file gambar yang diizinkan untuk gambar utama",
        variant: "destructive"
      })
    }
    target.value = ''
  }
}

// Document attachment handling
function handleAttachmentSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files)
    const validFiles: File[] = []
    const errors: string[] = []
    
    newFiles.forEach(file => {
      // Check file type
      if (!isValidDocumentType(file)) {
        errors.push(`${file.name}: Format file tidak didukung`)
        return
      }
      
      // Check file size
      if (!isValidFileSize(file)) {
        errors.push(`${file.name}: Ukuran file terlalu besar (maksimal ${formatFileSize(MAX_FILE_SIZE)})`)
        return
      }
      
      // Check for duplicates
      const isDuplicate = attachmentFiles.value.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      )
      
      if (isDuplicate) {
        errors.push(`${file.name}: File sudah dipilih sebelumnya`)
        return
      }
      
      validFiles.push(file)
    })
    
    if (errors.length > 0) {
      toast({
        title: "Peringatan",
        description: errors.join('\n'),
        variant: "destructive"
      })
    }
    
    if (validFiles.length > 0) {
      attachmentFiles.value = [...attachmentFiles.value, ...validFiles]
      toast({
        title: "Berhasil",
        description: `${validFiles.length} file berhasil ditambahkan`
      })
    }
    
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

function removeExistingAttachment(attachment: AttachmentItem) {
  attachmentsToDelete.value.push(attachment)
  existingAttachments.value = existingAttachments.value.filter(a => a.name !== attachment.name)
}

function restoreExistingAttachment(attachment: AttachmentItem) {
  attachmentsToDelete.value = attachmentsToDelete.value.filter(a => a.name !== attachment.name)
  existingAttachments.value.push(attachment)
}

// Upload functions
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

async function uploadAttachments(meetingId: string): Promise<AttachmentItem[]> {
  if (attachmentFiles.value.length === 0) return []

  uploadingAttachments.value = true
  const uploadedFiles: AttachmentItem[] = []

  try {
    for (const file of attachmentFiles.value) {
      const fileExt = file.name.split('.').pop() || 'pdf'
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const originalName = file.name.replace(/\.[^/.]+$/, "")
      const fileName = `${timestamp}-${randomId}-${originalName}.${fileExt}`
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
        url: data.publicUrl,
        size: file.size,
        type: file.type
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

async function deleteAttachments(meetingId: string, attachmentsToDelete: AttachmentItem[]) {
  if (attachmentsToDelete.length === 0) return

  try {
    const filePaths = attachmentsToDelete.map(attachment => 
      `${meetingId}/attachments/${attachment.name}`
    )
    
    const { error } = await supabase.storage
      .from('meetings')
      .remove(filePaths)

    if (error) {
      console.warn('Some files might not exist in storage:', error)
      // Don't throw error if files don't exist
    }
  } catch (error) {
    console.error('Error deleting attachments:', error)
    // Continue execution, don't block the update
  }
}

// Form submission
async function handleSubmit() {
  if (!user.value) {
    toast({
      title: "Error",
      description: "Anda harus login terlebih dahulu",
      variant: "destructive"
    })
    return
  }

  if (!form.value.title.trim()) {
    toast({
      title: "Error",
      description: "Judul harus diisi",
      variant: "destructive"
    })
    return
  }

  if (form.value.category === 'online' && !form.value.link.trim()) {
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

    // Generate ID for new meeting if needed
    if (!meetingId && (imageFile.value || attachmentFiles.value.length > 0)) {
      meetingId = crypto.randomUUID()
    }

    // Upload image if new one is selected
    if (imageFile.value && meetingId) {
      imageUrl = await uploadImage(meetingId)
    }

    // Prepare meeting data
    const meetingData = {
      title: form.value.title.trim(),
      content: form.value.content.trim() || null,
      link: form.value.link.trim() || null,
      organization: form.value.organization.trim() || null,
      category: form.value.category,
      image_url: imageUrl || null,
      author_id: user.value.id,
      updated_at: new Date().toISOString()
    }

    // Save meeting
    let result
    if (isEdit.value && props.meetingItem?.id) {
      result = await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', props.meetingItem.id)
        .select()
      meetingId = props.meetingItem.id
    } else {
      const finalMeetingId = meetingId || crypto.randomUUID()
      result = await supabase
        .from('meetings')
        .insert({
          ...meetingData,
          id: finalMeetingId,
          created_at: new Date().toISOString()
        })
        .select()
      meetingId = finalMeetingId
    }

    if (result.error) throw result.error

    // Handle attachments if meeting was saved successfully
    if (meetingId && result.data?.[0]) {
      // Delete removed attachments from storage
      if (attachmentsToDelete.value.length > 0) {
        await deleteAttachments(meetingId, attachmentsToDelete.value)
      }

      // Upload new attachments
      let uploadedFiles: AttachmentItem[] = []
      if (attachmentFiles.value.length > 0) {
        uploadedFiles = await uploadAttachments(meetingId)
      }

      // Combine existing and new attachments for JSONB
      const finalAttachments: AttachmentItem[] = [
        ...existingAttachments.value,
        ...uploadedFiles
      ]

      // Update attachments in database (JSONB format)
      if (finalAttachments.length > 0 || attachmentsToDelete.value.length > 0) {
        const { error: attachmentError } = await supabase
          .from('meetings')
          .update({ 
            attachments: finalAttachments.length > 0 ? finalAttachments : null 
          })
          .eq('id', meetingId)

        if (attachmentError) {
          console.error('Error updating attachments:', attachmentError)
          // Don't throw error, meeting is already saved
        }
      }
    }

    toast({
      title: "Berhasil",
      description: `Meeting berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error: any) {
    console.error('Error saving meeting:', error)
    toast({
      title: "Error",
      description: error?.message || "Gagal menyimpan meeting",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

// Utility functions
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

// Computed properties
const isUploading = computed(() => uploadingImage.value || uploadingAttachments.value)

const isFormValid = computed(() => {
  return form.value.title.trim() && 
         (form.value.category === 'offline' || 
          (form.value.category === 'online' && form.value.link.trim() && isValidMeetingUrl.value))
})

// Helper function to create object URL safely
function createObjectURL(file: File): string {
  if (typeof window !== 'undefined' && window.URL) {
    return window.URL.createObjectURL(file)
  }
  return ''
}

// Get display name for attachment
function getAttachmentDisplayName(attachment: AttachmentItem): string {
  // Extract original filename from stored name
  const parts = attachment.name.split('-')
  if (parts.length >= 3) {
    // Remove timestamp and random ID parts, keep the original name
    return parts.slice(2).join('-')
  }
  return attachment.name
}

// Get accepted file types string for input
const acceptedFileTypes = computed(() => {
  return DOCUMENT_EXTENSIONS.join(',')
})
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
            class="w-full"
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
              class="flex-1"
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
                  :disabled="loading || uploadingImage"
                  @click="removeImage"
                  class="absolute top-2 right-2 bg-red-500 text-white hover:bg-red-600"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
              <div v-if="uploadingImage" class="flex items-center justify-center py-2">
                <Loader2 class="h-4 w-4 animate-spin mr-2" />
                <span class="text-sm text-gray-600">Mengupload gambar...</span>
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
                <p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF hingga {{ formatFileSize(MAX_FILE_SIZE) }}</p>
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
            class="resize-none"
          />
        </div>

        <!-- Document Attachments Upload -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Lampiran Dokumen</Label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div class="text-center">
                <FileText class="mx-auto h-10 w-10 text-gray-400" />
                <div class="mt-2">
                  <label for="attachments-upload" class="cursor-pointer">
                    <span class="mt-2 block text-sm font-medium text-gray-900">
                      Klik untuk upload dokumen
                    </span>
                    <input
                      id="attachments-upload"
                      type="file"
                      :accept="acceptedFileTypes"
                      multiple
                      class="sr-only"
                      :disabled="loading || isUploading"
                      @change="handleAttachmentSelect"
                    />
                  </label>
                  <p class="mt-1 text-xs text-gray-500">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, RTF, ODT, ODS, ODP
                  </p>
                  <p class="mt-1 text-xs text-gray-500">
                    Maksimal {{ formatFileSize(MAX_FILE_SIZE) }} per file
                  </p>
                </div>
              </div>
            </div>
            
            <div v-if="uploadingAttachments" class="flex items-center justify-center py-2">
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
              <span class="text-sm text-gray-600">Mengupload dokumen...</span>
            </div>
          </div>

          <!-- Existing Attachments -->
          <div v-if="existingAttachments.length > 0" class="space-y-2">
            <Label class="text-sm font-medium text-gray-700">Dokumen Saat Ini ({{ existingAttachments.length }})</Label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="attachment in existingAttachments"
                :key="attachment.name"
                class="relative group flex items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div class="flex-shrink-0 mr-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span class="text-lg">{{ getFileIcon(attachment.name) }}</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate" :title="getAttachmentDisplayName(attachment)">
                    {{ getAttachmentDisplayName(attachment) }}
                  </div>
                  <div v-if="attachment.size" class="text-xs text-gray-500">
                    {{ formatFileSize(attachment.size) }}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="loading || isUploading"
                  @click="removeExistingAttachment(attachment)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- New Attachments Preview -->
          <div v-if="attachmentFiles.length > 0" class="space-y-2">
            <Label class="text-sm font-medium text-green-700">Dokumen Baru ({{ attachmentFiles.length }})</Label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="(file, index) in attachmentFiles"
                :key="`new-${index}`"
                class="relative group flex items-center p-3 border-2 border-green-200 rounded-lg bg-green-50 hover:bg-green-100"
              >
                <div class="flex-shrink-0 mr-3">
                  <div class="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                    <span class="text-lg">{{ getFileIcon(file.name) }}</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-green-800 truncate" :title="file.name">
                    {{ file.name }}
                  </div>
                  <div class="text-xs text-green-600">
                    {{ formatFileSize(file.size) }}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="loading || isUploading"
                  @click="removeAttachment(index)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Files to Delete -->
          <div v-if="attachmentsToDelete.length > 0" class="space-y-2">
            <Label class="text-sm font-medium text-red-600">Dokumen yang Akan Dihapus ({{ attachmentsToDelete.length }})</Label>
            <div class="space-y-2">
              <div
                v-for="attachment in attachmentsToDelete"
                :key="`delete-${attachment.name}`"
                class="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-red-200 rounded flex items-center justify-center flex-shrink-0">
                    <span class="text-sm">{{ getFileIcon(attachment.name) }}</span>
                  </div>
                  <div class="min-w-0">
                    <span class="text-sm text-red-800 font-medium truncate block">
                      {{ getAttachmentDisplayName(attachment) }}
                    </span>
                    <div v-if="attachment.size" class="text-xs text-red-600">
                      {{ formatFileSize(attachment.size) }}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="loading || isUploading"
                  @click="restoreExistingAttachment(attachment)"
                  class="text-green-600 hover:text-green-800 hover:bg-green-100 flex-shrink-0"
                >
                  Batalkan
                </Button>
              </div>
            </div>
          </div>

          <!-- File Validation Info -->
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
            :disabled="loading || isUploading || !isFormValid"
            class="min-w-[100px]"
          >
            <div v-if="loading || isUploading" class="flex items-center">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              <span>
                {{ uploadingImage ? 'Upload Gambar...' : 
                   uploadingAttachments ? 'Upload Dokumen...' : 
                   'Menyimpan...' }}
              </span>
            </div>
            <span v-else>
              {{ isEdit ? 'Update' : 'Simpan' }}
            </span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>