<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2 } from 'lucide-vue-next'
import { ref, onMounted, watch } from 'vue'
import FormNews from '~/components/Dialog/FormNews.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { useToast } from '~/components/ui/toast'
import CategoryNews from '~/components/Filter/CategoryNews.vue'

const supabase = useSupabaseClient()
const { toast } = useToast()

const newsList = ref<any[]>([])
const loading = ref(true)
const selectedCategory = ref('')
const showFormDialog = ref(false)
const editingNews = ref(null)
const deleteDialog = ref(false)
const deletingNews = ref(null)

watch(selectedCategory, async (val) => {
  await fetchNews(val)
})

onMounted(async () => {
  await fetchNews()
})

async function fetchNews(category = '') {
  loading.value = true
  try {
    let query = supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
    if (category && category !== '__all__') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error
    newsList.value = data || []
  } catch (error) {
    console.error('Gagal memuat data:', error)
    toast({
      title: "Error",
      description: "Gagal memuat data berita",
      variant: "destructive"
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
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    // Update local state
    const index = newsList.value.findIndex(item => item.id === id)
    if (index !== -1) {
      newsList.value[index].status_news = status
    }

    toast({
      title: "Berhasil",
      description: "Status berita berhasil diperbarui"
    })
  } catch (error) {
    console.error('Error updating status:', error)
    toast({
      title: "Error",
      description: "Gagal memperbarui status",
      variant: "destructive"
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
  if (!deletingNews.value) 
    return
  try {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', deletingNews.value.id)
    if (error) 
      throw error
    await fetchNews(selectedCategory.value)
    deleteDialog.value = false
    deletingNews.value = null

    toast({
      title: "Berhasil",
      description: "Berita berhasil dihapus"
    })
  } catch (error) {
    console.error('Error deleting news:', error)
    toast({
      title: "Error",
      description: "Gagal menghapus berita",
      variant: "destructive"
    })
  }
}

function onFormSuccess() {
  fetchNews(selectedCategory.value)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'approved': return 'default'
    case 'rejected': return 'destructive'
    case 'pending': return 'secondary'
    default: return 'outline'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    case 'pending': return 'Pending'
    default: return status
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Data Berita</h1>
      <Button @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Berita
      </Button>
    </div>

    <CategoryNews v-model="selectedCategory" />

    <div class="border rounded-lg">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader2 class="h-6 w-6 animate-spin mr-2" />
        Memuat data...
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Judul</TableHead>
            <TableHead>Sub Judul</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="newsList.length === 0">
            <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
              Tidak ada data berita
            </TableCell>
          </TableRow>
          <TableRow v-for="news in newsList" :key="news.id">
            <TableCell class="font-medium">
              {{ news.title }}
            </TableCell>
            <TableCell>
              {{ news.sub_title || '-' }}
            </TableCell>
            <TableCell>
              {{ news.category }}
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <Badge :variant="getStatusVariant(news.status_news)">
                  {{ getStatusLabel(news.status_news) }}
                </Badge>
                <Select
                  :model-value="news.status_news"
                  @update:model-value="updateStatus(news.id, $event)"
                >
                  <SelectTrigger class="w-32 h-8">
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
              {{ formatDate(news.created_at) }}
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