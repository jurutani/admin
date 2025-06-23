<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, Newspaper, Calendar, User } from 'lucide-vue-next'
import { ref, onMounted, watch, computed } from 'vue'
import FormNews from '~/components/Dialog/FormNews.vue'
import CategoryNews from '~/components/Filters/CategoryNew.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

const newsList = ref<any[]>([])
const allNews = ref<any[]>([])
const loading = ref(true)
const selectedCategory = ref('')
const selectedStatus = ref('all')
const showFormDialog = ref(false)
const editingNews = ref(null)
const deleteDialog = ref(false)
const deletingNews = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Status configuration
const statuses = [
  {
    key: 'all',
    label: 'Semua',
    icon: AlertCircle,
    color: 'blue',
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock,
    color: 'yellow',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    color: 'green',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'red',
  },
]

// Status counts
const statusCounts = computed(() => {
  const counts = {
    all: allNews.value.length,
    pending: 0,
    approved: 0,
    rejected: 0
  }
  
  allNews.value.forEach(news => {
    if (news.status_news === 'pending') counts.pending++
    else if (news.status_news === 'approved') counts.approved++
    else if (news.status_news === 'rejected') counts.rejected++
  })
  
  return counts
})

// Filtered news based on status and category
const filteredNews = computed(() => {
  let filtered = allNews.value
  
  // Filter by status
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(news => news.status_news === selectedStatus.value)
  }
  
  // Filter by category
  if (selectedCategory.value && selectedCategory.value !== '__all__') {
    filtered = filtered.filter(news => news.category === selectedCategory.value)
  }
  
  return filtered
})

// Paginated news
const paginatedNews = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredNews.value.slice(start, end)
})

// Pagination info
const totalPages = computed(() => {
  return Math.ceil(filteredNews.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredNews.value.length)
  return {
    start,
    end,
    total: filteredNews.value.length
  }
})

watch([selectedCategory, selectedStatus], async () => {
  currentPage.value = 1
})

onMounted(async () => {
  await fetchNews()
})

async function fetchNews() {
  loading.value = true
  try {
    let query = supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    allNews.value = data || []
    newsList.value = paginatedNews.value
  } catch (error) {
    console.error('Gagal memuat data:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat data berita',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

async function updateStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('news')
      .update({
        status_news: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    // Update local state
    const index = allNews.value.findIndex(item => item.id === id)
    if (index !== -1) {
      allNews.value[index].status_news = status
    }

    toast({
      title: 'Berhasil',
      description: 'Status berita berhasil diperbarui',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error updating status:', error)
    toast({
      title: 'Error',
      description: 'Gagal memperbarui status',
      variant: 'destructive',
      duration: 3000,
    })
  }
}

function openAddDialog() {
  editingNews.value = null
  showFormDialog.value = true
}

function openEditDialog(news: any) {
  editingNews.value = news
  showFormDialog.value = true
}

function openDeleteDialog(news: any) {
  deletingNews.value = news
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingNews.value) return
  try {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', deletingNews.value.id)
    if (error) throw error
    await fetchNews()
    deleteDialog.value = false
    deletingNews.value = null
    toast({
      title: 'Berhasil',
      description: 'Berita berhasil dihapus',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error deleting news:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus berita',
      variant: 'destructive',
    })
  }
}

function onFormSuccess() {
  fetchNews()
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

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'approved': return 'bg-green-100 text-green-800 border-green-300'
    case 'rejected': return 'bg-red-100 text-red-800 border-red-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function truncateText(text: string, maxLength: number = 100) {
  if (!text) return '-'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <Newspaper class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Data Berita</h1>
      </div>
      <Button @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Berita
      </Button>
    </div>
    
    <!-- Category Filter Component -->
    <CategoryNews v-model="selectedCategory" />
    
    <!-- Status Filter Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        v-for="status in statuses"
        :key="status.key"
        class="cursor-pointer transition-all hover:shadow-md border-l-4"
        :class="[
          selectedStatus === status.key
            ? `ring-2 ring-${status.color}-500`
            : '',
          `border-l-${status.color}-500`
        ]"
        @click="selectedStatus = status.key"
      >
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            {{ status.label }}
          </CardTitle>
          <component :is="status.icon" class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ statusCounts[status.key] }}
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
            <TableHead>Judul Berita</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Penulis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead>Diperbarui</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedNews.length === 0">
            <TableCell colspan="8" class="text-center py-8 text-muted-foreground">
              Tidak ada data berita
            </TableCell>
          </TableRow>
          <TableRow v-for="news in paginatedNews" :key="news.id">
            <TableCell class="font-medium">
              <div>
                <p class="font-semibold">{{ news.title }}</p>
                <p class="text-sm text-muted-foreground line-clamp-2">
                  {{ truncateText(news.sub_title || news.content) }}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{{ news.category }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <User class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm">{{ news.author || 'Admin' }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <Select
                  :model-value="news.status_news"
                  @update:model-value="updateStatus(news.id, $event)"
                >
                  <SelectTrigger
                    class="w-32 h-8"
                    :class="getStatusBadgeColor(news.status_news) + ' border rounded px-2 py-1 flex items-center justify-between'"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(news.created_at) }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(news.updated_at) }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="$router.push(`/news/${news.id}`)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(news)"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openDeleteDialog(news)"
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
    <FormNews
      :open="showFormDialog"
      :news-item="editingNews"
      @update:open="showFormDialog = $event"
      @success="onFormSuccess"
    />
    
    <!-- Delete Dialog -->
    <AlertDialog :open="deleteDialog" @update:open="deleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus berita "{{ deletingNews?.title }}"?
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>