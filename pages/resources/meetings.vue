<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Users, Calendar, FileText, Archive, User } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import FormMeeting from '~/components/Dialog/FormMeeting.vue'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { useToast } from '~/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

const meetingList = ref<any[]>([])
const allMeetings = ref<any[]>([])
const loading = ref(true)
const showFormDialog = ref(false)
const editingMeeting = ref(null)
const deleteDialog = ref(false)
const deletingMeeting = ref(null)
const archiveDialog = ref(false)
const archivingMeeting = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Paginated meetings
const paginatedMeetings = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return allMeetings.value.slice(start, end)
})

// Pagination info
const totalPages = computed(() => {
  return Math.ceil(allMeetings.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, allMeetings.value.length)
  return {
    start,
    end,
    total: allMeetings.value.length
  }
})

onMounted(async () => {
  await fetchMeetings()
})

async function fetchMeetings() {
  loading.value = true
  try {
    let query = supabase
      .from('meetings')
      .select(`
        *,
        author:author_id(full_name, email)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    allMeetings.value = data || []
    meetingList.value = paginatedMeetings.value
  } catch (error) {
    console.error('Gagal memuat data:', error)
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

async function confirmDelete() {
  if (!deletingMeeting.value) return
  try {
    // Soft delete
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
    const updateData = {
      archived_at: isArchived ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('meetings')
      .update(updateData)
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
  // Implement download logic for attachments from bucket
  const bucketPath = `meetings/${meetingId}/${filename}`
  // This would typically use Supabase storage download
  console.log('Download attachment:', bucketPath)
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
</script>

<template>
  <div class="p-6 space-y-6">
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
    
    <!-- Stats Card -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Total Meeting</CardTitle>
          <Users class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ allMeetings.length }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Hari Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ allMeetings.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length }}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Aktif</CardTitle>
          <FileText class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ allMeetings.filter(m => !m.archived_at).length }}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Meeting Arsip</CardTitle>
          <Archive class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ allMeetings.filter(m => m.archived_at).length }}
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
            <TableHead>Judul Meeting</TableHead>
            <TableHead>Konten</TableHead>
            <TableHead>Organisasi</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Penulis</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Lampiran</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedMeetings.length === 0">
            <TableCell colspan="10" class="text-center py-8 text-muted-foreground">
              Tidak ada data meeting
            </TableCell>
          </TableRow>
          <TableRow v-for="meeting in paginatedMeetings" :key="meeting.id">
            <TableCell class="font-medium">
              <p class="font-semibold">{{ meeting.title }}</p>
            </TableCell>
            <TableCell>
              <p class="text-sm text-muted-foreground">
                {{ truncateText(meeting.content) }}
              </p>
            </TableCell>
            <TableCell>
              <p class="text-sm">{{ meeting.organization || '-' }}</p>
            </TableCell>
            <TableCell>
              <Badge :variant="getCategoryBadgeVariant(meeting.category)">
                {{ meeting.category || 'Regular' }}
              </Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <User class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm">{{ meeting.author?.name || 'Unknown' }}</span>
              </div>
            </TableCell>
            <TableCell>
              <Button
                v-if="meeting.link"
                variant="ghost"
                size="sm"
                @click="openLink(meeting.link)"
                class="text-blue-600 hover:text-blue-700"
              >
                <Eye class="h-4 w-4 mr-1" />
                Buka Link
              </Button>
              <span v-else class="text-muted-foreground text-sm">-</span>
            </TableCell>
            <TableCell>
              <div v-if="meeting.attachments && meeting.attachments.length > 0" class="space-y-1">
                <Button
                  v-for="attachment in meeting.attachments.slice(0, 2)"
                  :key="attachment"
                  variant="ghost"
                  size="sm"
                  @click="downloadAttachment(meeting.id, attachment)"
                  class="text-xs p-1 h-auto"
                >
                  <FileText class="h-3 w-3 mr-1" />
                  {{ attachment.length > 15 ? attachment.substring(0, 15) + '...' : attachment }}
                </Button>
                <p v-if="meeting.attachments.length > 2" class="text-xs text-muted-foreground">
                  +{{ meeting.attachments.length - 2 }} lainnya
                </p>
              </div>
              <span v-else class="text-muted-foreground text-sm">-</span>
            </TableCell>
            <TableCell>
              <div class="space-y-1">
                <Badge v-if="meeting.archived_at" variant="secondary">
                  <Archive class="h-3 w-3 mr-1" />
                  Arsip
                </Badge>
                <Badge v-else variant="default">
                  Aktif
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(meeting.created_at) }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="openLink(meeting.link)"
                  :disabled="!meeting.link"
                >
                  <Eye class="h-4 w-4" />
                </Button>
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
    <FormMeeting
      :open="showFormDialog"
      :meeting-item="editingMeeting"
      @update:open="showFormDialog = $event"
      @success="onFormSuccess"
    />
    
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