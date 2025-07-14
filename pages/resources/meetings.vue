<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Users, Calendar, FileText, Archive, User, Image, Download } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import FormMeeting from '~/components/Dialog/FormMeeting.vue'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { useToast } from '~/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

// Data refs
const allMeetings = ref<any[]>([])
const loading = ref(true)
const showFormDialog = ref(false)
const editingMeeting = ref(null)
const deleteDialog = ref(false)
const deletingMeeting = ref(null)
const archiveDialog = ref(false)
const archivingMeeting = ref(null)

// Preview dialogs
const imagePreviewDialog = ref(false)
const previewImageUrl = ref('')
const attachmentsDialog = ref(false)
const selectedAttachments = ref<string[]>([])
const selectedMeetingId = ref('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed properties
const paginatedMeetings = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return allMeetings.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(allMeetings.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, allMeetings.value.length)
  return { start, end, total: allMeetings.value.length }
})

const statsData = computed(() => {
  const today = new Date().toDateString()
  return {
    total: allMeetings.value.length,
    today: allMeetings.value.filter(m => new Date(m.created_at).toDateString() === today).length,
    active: allMeetings.value.filter(m => !m.archived_at).length,
    archived: allMeetings.value.filter(m => m.archived_at).length
  }
})

// Methods
onMounted(async () => {
  await fetchMeetings()
})

async function fetchMeetings() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        author:author_id(full_name, email)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    allMeetings.value = data || []
  } catch (error) {
    console.error('Error fetching meetings:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat data meeting',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  editingMeeting.value = null
  showFormDialog.value = true
}

function openEditDialog(meeting: any) {
  editingMeeting.value = meeting
  showFormDialog.value = true
}

function openDeleteDialog(meeting: any) {
  deletingMeeting.value = meeting
  deleteDialog.value = true
}

function openArchiveDialog(meeting: any) {
  archivingMeeting.value = meeting
  archiveDialog.value = true
}

function openImagePreview(imageUrl: string) {
  previewImageUrl.value = imageUrl
  imagePreviewDialog.value = true
}

function openAttachmentsDialog(meetingId: string, attachments: string[]) {
  selectedMeetingId.value = meetingId
  selectedAttachments.value = attachments
  attachmentsDialog.value = true
}

async function confirmDelete() {
  if (!deletingMeeting.value) return
  try {
    const { error } = await supabase
      .from('meetings')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', deletingMeeting.value.id)
      
    if (error) throw error
    
    await fetchMeetings()
    deleteDialog.value = false
    deletingMeeting.value = null
    toast({
      title: 'Berhasil',
      description: 'Meeting berhasil dihapus',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error deleting meeting:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus meeting',
      variant: 'destructive',
    })
  }
}

async function confirmArchive() {
  if (!archivingMeeting.value) return
  try {
    const isArchived = archivingMeeting.value.archived_at
    const { error } = await supabase
      .from('meetings')
      .update({
        archived_at: isArchived ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', archivingMeeting.value.id)
      
    if (error) throw error
    
    await fetchMeetings()
    archiveDialog.value = false
    archivingMeeting.value = null
    toast({
      title: 'Berhasil',
      description: `Meeting berhasil ${isArchived ? 'dipulihkan dari arsip' : 'diarsipkan'}`,
      duration: 3000,
    })
  } catch (error) {
    console.error('Error archiving meeting:', error)
    toast({
      title: 'Error',
      description: 'Gagal mengarsipkan meeting',
      variant: 'destructive',
    })
  }
}

function onFormSuccess() {
  fetchMeetings()
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

function openLink(url: string) {
  if (url) {
    window.open(url, '_blank')
  }
}

function downloadAttachment(meetingId: string, filename: string) {
  const bucketPath = `meetings/${meetingId}/${filename}`
  // Download logic using Supabase storage
  supabase.storage
    .from('meetings')
    .download(`${meetingId}/${filename}`)
    .then(({ data, error }) => {
      if (error) {
        console.error('Download error:', error)
        toast({
          title: 'Error',
          description: 'Gagal mendownload file',
          variant: 'destructive',
        })
      } else {
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    })
}

function getCategoryBadgeVariant(category: string) {
  const variants: Record<string, string> = {
    'regular': 'default',
    'urgent': 'destructive',
    'important': 'secondary',
    'planning': 'outline'
  }
  return variants[category] || 'default'
}

function getImageUrl(meetingId: string, imageName: string) {
  return supabase.storage
    .from('meetings')
    .getPublicUrl(`${meetingId}/${imageName}`)
    .data.publicUrl
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <Users class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Data Meeting</h1>
      </div>
      <Button @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Meeting
      </Button>
    </div>
    
    <!-- Stats Cards - 2x2 layout on mobile -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Total Meeting</CardTitle>
          <Users class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsData.total }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Hari Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsData.today }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Aktif</CardTitle>
          <FileText class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsData.active }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Arsip</CardTitle>
          <Archive class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsData.archived }}</p>
        </CardContent>
      </Card>
    </div>
    
    <!-- Table -->
    <div class="border rounded-lg">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader2 class="h-6 w-6 animate-spin mr-2" />
        Memuat data...
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Meeting</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Penulis</TableHead>
            <TableHead>Media</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedMeetings.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
              Tidak ada data meeting
            </TableCell>
          </TableRow>
          <TableRow v-for="meeting in paginatedMeetings" :key="meeting.id">
            <TableCell class="font-medium">
              <div class="space-y-1">
                <p class="font-semibold">{{ meeting.title }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ truncateText(meeting.content) }}
                </p>
                <p class="text-xs text-muted-foreground">{{ meeting.organization || '-' }}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="getCategoryBadgeVariant(meeting.category)">
                {{ meeting.category || 'Regular' }}
              </Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <User class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm">{{ meeting.author?.full_name || 'Unknown' }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex space-x-2">
                <Button
                  v-if="meeting.image_url"
                  variant="ghost"
                  size="sm"
                  @click="openImagePreview(getImageUrl(meeting.id, meeting.image_url))"
                >
                  <Image class="h-4 w-4" />
                </Button>
                <Button
                  v-if="meeting.attachments && meeting.attachments.length > 0"
                  variant="ghost"
                  size="sm"
                  @click="openAttachmentsDialog(meeting.id, meeting.attachments)"
                >
                  <FileText class="h-4 w-4" />
                  <span class="text-xs">{{ meeting.attachments.length }}</span>
                </Button>
                <Button
                  v-if="meeting.link"
                  variant="ghost"
                  size="sm"
                  @click="openLink(meeting.link)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <Badge v-if="meeting.archived_at" variant="secondary">
                <Archive class="h-3 w-3 mr-1" />
                Arsip
              </Badge>
              <Badge v-else variant="default">
                Aktif
              </Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(meeting.created_at) }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(meeting)"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openArchiveDialog(meeting)"
                  :title="meeting.archived_at ? 'Pulihkan dari Arsip' : 'Arsipkan'"
                >
                  <Archive class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openDeleteDialog(meeting)"
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
    <FormMeeting
      :open="showFormDialog"
      :meeting-item="editingMeeting"
      @update:open="showFormDialog = $event"
      @success="onFormSuccess"
    />
    
    <!-- Image Preview Dialog -->
    <Dialog :open="imagePreviewDialog" @update:open="imagePreviewDialog = $event">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview Gambar</DialogTitle>
        </DialogHeader>
        <div class="flex justify-center">
          <img :src="previewImageUrl" alt="Preview" class="max-w-full max-h-96 object-contain" />
        </div>
      </DialogContent>
    </Dialog>
    
    <!-- Attachments Dialog -->
    <Dialog :open="attachmentsDialog" @update:open="attachmentsDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lampiran</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <div
            v-for="attachment in selectedAttachments"
            :key="attachment"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <FileText class="h-5 w-5 text-muted-foreground" />
              <span class="text-sm">{{ attachment }}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              @click="downloadAttachment(selectedMeetingId, attachment)"
            >
              <Download class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <!-- Delete Dialog -->
    <AlertDialog :open="deleteDialog" @update:open="deleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus meeting "{{ deletingMeeting?.title }}"?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Archive Dialog -->
    <AlertDialog :open="archiveDialog" @update:open="archiveDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ archivingMeeting?.archived_at ? 'Pulihkan dari Arsip' : 'Arsipkan Meeting' }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span v-if="archivingMeeting?.archived_at">
              Apakah Anda yakin ingin memulihkan meeting "{{ archivingMeeting?.title }}" dari arsip?
            </span>
            <span v-else>
              Apakah Anda yakin ingin mengarsipkan meeting "{{ archivingMeeting?.title }}"?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmArchive">
            {{ archivingMeeting?.archived_at ? 'Pulihkan' : 'Arsipkan' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>