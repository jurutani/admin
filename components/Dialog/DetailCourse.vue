<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  BookOpen, 
  Calendar, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon,
  Archive,
  Trash2,
  Eye,
  Download
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  courseItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const course = computed(() => props.courseItem || {})

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getCourseStatus = (course: any) => {
  if (course.deleted_at) return 'deleted'
  if (course.archived_at) return 'archived'
  return 'active'
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'default'
    case 'archived':
      return 'secondary'
    case 'deleted':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'archived':
      return 'Archived'
    case 'deleted':
      return 'Deleted'
    default:
      return 'Unknown'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return BookOpen
    case 'archived':
      return Archive
    case 'deleted':
      return Trash2
    default:
      return BookOpen
  }
}

const courseFiles = computed(() => {
  if (!course.value.files) return []
  try {
    const parsed = JSON.parse(course.value.files)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

const openLink = (url: string) => {
  if (url) {
    window.open(url, '_blank')
  }
}

const downloadFile = (url: string, filename?: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'file'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const getFileNameFromUrl = (url: string) => {
  try {
    const urlParts = url.split('/')
    return urlParts[urlParts.length - 1] || 'file'
  } catch {
    return 'file'
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <BookOpen class="h-5 w-5" />
          <span>Detail Course</span>
        </DialogTitle>
      </DialogHeader>

      <div v-if="course" class="space-y-6">
        <!-- Header with Image and Basic Info -->
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Course Image -->
          <div class="flex-shrink-0">
            <div class="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden border">
              <img
                v-if="course.image_url"
                :src="course.image_url"
                :alt="course.title"
                class="w-full h-full object-cover"
                @error="$event.target.style.display = 'none'"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <ImageIcon class="h-12 w-12 text-gray-400" />
              </div>
            </div>
          </div>

          <!-- Basic Info -->
          <div class="flex-1 space-y-4">
            <div>
              <h2 class="text-2xl font-bold mb-2">{{ course.title || 'Untitled Course' }}</h2>
              <div class="flex items-center space-x-3">
                <Badge :variant="getStatusBadgeVariant(getCourseStatus(course))">
                  <component :is="getStatusIcon(getCourseStatus(course))" class="h-3 w-3 mr-1" />
                  {{ getStatusLabel(getCourseStatus(course)) }}
                </Badge>
                <Badge variant="outline">
                  {{ course.category || 'Uncategorized' }}
                </Badge>
              </div>
            </div>

            <div v-if="course.description" class="space-y-2">
              <h3 class="text-sm font-medium text-gray-700">Deskripsi</h3>
              <p class="text-sm text-gray-600 leading-relaxed">{{ course.description }}</p>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Links Section -->
        <div v-if="course.link_drive || course.link_youtube" class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center">
            <ExternalLink class="h-5 w-5 mr-2" />
            Link Resources
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Google Drive Link -->
            <div v-if="course.link_drive" class="p-4 border rounded-lg bg-green-50">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-green-800">Google Drive</h4>
                  <p class="text-sm text-green-600 truncate">{{ course.link_drive }}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openLink(course.link_drive)"
                  class="text-green-600 hover:text-green-700 border-green-200"
                >
                  <Eye class="h-4 w-4 mr-1" />
                  Buka
                </Button>
              </div>
            </div>

            <!-- YouTube Link -->
            <div v-if="course.link_youtube" class="p-4 border rounded-lg bg-red-50">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-red-800">YouTube</h4>
                  <p class="text-sm text-red-600 truncate">{{ course.link_youtube }}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openLink(course.link_youtube)"
                  class="text-red-600 hover:text-red-700 border-red-200"
                >
                  <Eye class="h-4 w-4 mr-1" />
                  Tonton
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator v-if="course.link_drive || course.link_youtube" />

        <!-- Files Section -->
        <div v-if="courseFiles.length > 0" class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center">
            <FileText class="h-5 w-5 mr-2" />
            File Course ({{ courseFiles.length }} file)
          </h3>
          
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="(fileUrl, index) in courseFiles"
              :key="index"
              class="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <FileText class="h-5 w-5 text-blue-500" />
                  <div>
                    <p class="font-medium text-sm">{{ getFileNameFromUrl(fileUrl) }}</p>
                    <p class="text-xs text-gray-500 truncate max-w-md">{{ fileUrl }}</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="openLink(fileUrl)"
                  >
                    <Eye class="h-4 w-4 mr-1" />
                    Lihat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="downloadFile(fileUrl, getFileNameFromUrl(fileUrl))"
                  >
                    <Download class="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <FileText class="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>Tidak ada file yang tersedia</p>
        </div>

        <Separator />

        <!-- Metadata Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center">
            <Calendar class="h-5 w-5 mr-2" />
            Informasi Tambahan
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Created Info -->
            <div class="space-y-3">
              <h4 class="font-medium text-gray-700">Dibuat</h4>
              <div class="text-sm space-y-1">
                <div class="flex items-center space-x-2">
                  <Calendar class="h-4 w-4 text-gray-400" />
                  <span>{{ formatDate(course.created_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Updated Info -->
            <div class="space-y-3">
              <h4 class="font-medium text-gray-700">Terakhir Diupdate</h4>
              <div class="text-sm space-y-1">
                <div class="flex items-center space-x-2">
                  <Calendar class="h-4 w-4 text-gray-400" />
                  <span>{{ formatDate(course.updated_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Archive Info -->
            <div v-if="course.archived_at" class="space-y-3">
              <h4 class="font-medium text-gray-700">Diarsipkan</h4>
              <div class="text-sm space-y-1">
                <div class="flex items-center space-x-2">
                  <Archive class="h-4 w-4 text-yellow-500" />
                  <span>{{ formatDate(course.archived_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Delete Info -->
            <div v-if="course.deleted_at" class="space-y-3">
              <h4 class="font-medium text-gray-700">Dihapus</h4>
              <div class="text-sm space-y-1">
                <div class="flex items-center space-x-2">
                  <Trash2 class="h-4 w-4 text-red-500" />
                  <span>{{ formatDate(course.deleted_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Course ID -->
            <div class="space-y-3">
              <h4 class="font-medium text-gray-700">ID Course</h4>
              <div class="text-sm">
                <code class="px-2 py-1 bg-gray-100 rounded text-xs">{{ course.id }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end pt-6 border-t">
          <Button @click="emit('update:open', false)">
            Tutup
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else class="flex justify-center items-center py-8">
        <div class="text-center">
          <BookOpen class="h-12 w-12 mx-auto mb-2 text-gray-400 animate-pulse" />
          <p class="text-gray-500">Memuat detail course...</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>