<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Video, Calendar, Play } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import FormVideo from '~/components/Dialog/FormVideo.vue'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

const videoList = ref<any[]>([])
const allVideos = ref<any[]>([])
const loading = ref(true)
const showFormDialog = ref(false)
const editingVideo = ref(null)
const deleteDialog = ref(false)
const deletingVideo = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Paginated videos
const paginatedVideos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return allVideos.value.slice(start, end)
})

// Pagination info
const totalPages = computed(() => {
  return Math.ceil(allVideos.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, allVideos.value.length)
  return {
    start,
    end,
    total: allVideos.value.length
  }
})

onMounted(async () => {
  await fetchVideos()
})

async function fetchVideos() {
  loading.value = true
  try {
    let query = supabase
      .from('videos')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    allVideos.value = data || []
    videoList.value = paginatedVideos.value
  } catch (error) {
    console.error('Gagal memuat data:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat data video',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  editingVideo.value = null
  showFormDialog.value = true
}

function openEditDialog(video: any) {
  editingVideo.value = video
  showFormDialog.value = true
}

function openDeleteDialog(video: any) {
  deletingVideo.value = video
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingVideo.value) return
  try {
    // Soft delete
    const { error } = await supabase
      .from('videos')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', deletingVideo.value.id)
      
    if (error) throw error
    
    await fetchVideos()
    deleteDialog.value = false
    deletingVideo.value = null
    toast({
      title: 'Berhasil',
      description: 'Video berhasil dihapus',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error deleting video:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus video',
      variant: 'destructive',
    })
  }
}

function onFormSuccess() {
  fetchVideos()
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function truncateText(text: string, maxLength: number = 100) {
  if (!text) return '-'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function getYouTubeVideoId(url: string) {
  if (!url) return null
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[7].length === 11) ? match[7] : null
}

function getYouTubeThumbnail(url: string) {
  const videoId = getYouTubeVideoId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null
}

function openYouTubeVideo(url: string) {
  if (url) {
    window.open(url, '_blank')
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <Video class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Data Video</h1>
      </div>
      <Button @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Video
      </Button>
    </div>
    
    <!-- Stats Card -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Total Video</CardTitle>
          <Video class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ allVideos.length }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Video Hari Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ allVideos.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length }}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Video Minggu Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ allVideos.filter(v => {
              const videoDate = new Date(v.created_at)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return videoDate >= weekAgo
            }).length }}
          </p>
        </CardContent>
      </Card>
    </div>
    
    <div class="border rounded-lg">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader2 class="h-6 w-6 animate-spin mr-2" />
        Memuat data...
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Thumbnail</TableHead>
            <TableHead>Judul Video</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Link YouTube</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead>Diperbarui</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedVideos.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
              Tidak ada data video
            </TableCell>
          </TableRow>
          <TableRow v-for="video in paginatedVideos" :key="video.id">
            <TableCell>
              <div class="w-20 h-12 bg-gray-100 rounded overflow-hidden">
                <img
                  v-if="getYouTubeThumbnail(video.link_yt)"
                  :src="getYouTubeThumbnail(video.link_yt)"
                  :alt="video.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Video class="h-6 w-6 text-gray-400" />
                </div>
              </div>
            </TableCell>
            <TableCell class="font-medium">
              <p class="font-semibold">{{ video.title }}</p>
            </TableCell>
            <TableCell>
              <p class="text-sm text-muted-foreground">
                {{ truncateText(video.description) }}
              </p>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="openYouTubeVideo(video.link_yt)"
                  class="text-red-600 hover:text-red-700"
                >
                  <Play class="h-4 w-4 mr-1" />
                  Tonton
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(video.created_at) }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(video.updated_at) }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="openYouTubeVideo(video.link_yt)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(video)"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openDeleteDialog(video)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t">
        <div class="text-sm text-gray-700">
          Menampilkan {{ paginationInfo.start }} - {{ paginationInfo.end }} dari {{ paginationInfo.total }} data
        </div>
        
        <div class="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
            Sebelumnya
          </Button>
          
          <div class="flex space-x-1">
            <Button
              v-for="page in Math.min(totalPages, 5)"
              :key="page"
              variant="outline"
              size="sm"
              :class="currentPage === page ? 'bg-primary text-primary-foreground' : ''"
              @click="goToPage(page)"
            >
              {{ page }}
            </Button>
            <span v-if="totalPages > 5" class="px-2 py-1 text-sm text-gray-500">
              ...
            </span>
            <Button
              v-if="totalPages > 5 && currentPage < totalPages - 2"
              variant="outline"
              size="sm"
              @click="goToPage(totalPages)"
            >
              {{ totalPages }}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Selanjutnya
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Form Dialog -->
    <FormVideo
      :open="showFormDialog"
      :video-item="editingVideo"
      @update:open="showFormDialog = $event"
      @success="onFormSuccess"
    />
    
    <!-- Delete Dialog -->
    <AlertDialog :open="deleteDialog" @update:open="deleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus video "{{ deletingVideo?.title }}"?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>