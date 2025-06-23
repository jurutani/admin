<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, Store, ExternalLink, Phone } from 'lucide-vue-next'
import { ref, onMounted, watch, computed } from 'vue'
import FormMarket from '~/components/Dialog/FormMarket.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

const marketsList = ref<any[]>([])
const allMarkets = ref<any[]>([])
const loading = ref(true)
const selectedCategory = ref('')
const selectedStatus = ref('all')
const showFormDialog = ref(false)
const editingMarket = ref(null)
const deleteDialog = ref(false)
const deletingMarket = ref(null)

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

// Categories for markets
const categories = [
  'Hasil Pertanian',
  'Peralatan Pertanian',
  'Pupuk & Pestisida',
  'Bibit & Benih',
  'Produk Olahan',
  'Lainnya'
]

// Status counts
const statusCounts = computed(() => {
  const counts = {
    all: allMarkets.value.length,
    pending: 0,
    approved: 0,
    rejected: 0
  }
  
  allMarkets.value.forEach(market => {
    if (market.status === 'Pending') counts.pending++
    else if (market.status === 'Approved') counts.approved++
    else if (market.status === 'Rejected') counts.rejected++
  })
  
  return counts
})

// Filtered markets based on status and category
const filteredMarkets = computed(() => {
  let filtered = allMarkets.value
  
  // Filter by status
  if (selectedStatus.value !== 'all') {
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected'
    }
    filtered = filtered.filter(market => market.status === statusMap[selectedStatus.value])
  }
  
  // Filter by category
  if (selectedCategory.value && selectedCategory.value !== '__all__') {
    filtered = filtered.filter(market => market.category === selectedCategory.value)
  }
  
  return filtered
})

// Paginated markets
const paginatedMarkets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredMarkets.value.slice(start, end)
})

// Pagination info
const totalPages = computed(() => {
  return Math.ceil(filteredMarkets.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredMarkets.value.length)
  return {
    start,
    end,
    total: filteredMarkets.value.length
  }
})

watch([selectedCategory, selectedStatus], async () => {
  currentPage.value = 1
})

onMounted(async () => {
  await fetchMarkets()
})

async function fetchMarkets() {
  loading.value = true
  try {
    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    allMarkets.value = data || []
    marketsList.value = paginatedMarkets.value
  } catch (error) {
    console.error('Gagal memuat data:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat data pasar',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

async function updateStatus(id: string, status: string) {
  try {
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected'
    }
    
    const { error } = await supabase
      .from('markets')
      .update({
        status: statusMap[status],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    // Update local state
    const index = allMarkets.value.findIndex(item => item.id === id)
    if (index !== -1) {
      allMarkets.value[index].status = statusMap[status]
    }

    toast({
      title: 'Berhasil',
      description: 'Status produk berhasil diperbarui',
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
  editingMarket.value = null
  showFormDialog.value = true
}

function openEditDialog(market: any) {
  editingMarket.value = market
  showFormDialog.value = true
}

function openDeleteDialog(market: any) {
  deletingMarket.value = market
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingMarket.value) return
  try {
    const { error } = await supabase
      .from('markets')
      .delete()
      .eq('id', deletingMarket.value.id)
    if (error) throw error
    await fetchMarkets()
    deleteDialog.value = false
    deletingMarket.value = null
    toast({
      title: 'Berhasil',
      description: 'Produk berhasil dihapus',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error deleting market:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus produk',
      variant: 'destructive',
    })
  }
}

function onFormSuccess() {
  fetchMarkets()
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

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price)
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'Approved': return 'bg-green-100 text-green-800 border-green-300'
    case 'Rejected': return 'bg-red-100 text-red-800 border-red-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getImage(attachments: any) {
  try {
    if (typeof attachments === 'string') {
      const parsed = JSON.parse(attachments)
      return parsed.url_image || '/placeholder-image.jpg'
    }
    return attachments?.url_image || '/placeholder-image.jpg'
  } catch {
    return '/placeholder-image.jpg'
  }
}

function hasLinks(links: any) {
  if (!links) return false
  return links.shopee_link || links.tiktok_link || links.tokopedia_link
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <Store class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Data Pasar</h1>
      </div>
      <Button @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Produk
      </Button>
    </div>
    
    <!-- Category Filter -->
    <div class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        :class="selectedCategory === '' ? 'bg-primary text-primary-foreground' : ''"
        @click="selectedCategory = ''"
      >
        Semua Kategori
      </Button>
      <Button
        v-for="category in categories"
        :key="category"
        variant="outline"
        size="sm"
        :class="selectedCategory === category ? 'bg-primary text-primary-foreground' : ''"
        @click="selectedCategory = category"
      >
        {{ category }}
      </Button>
    </div>
    
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
            <TableHead>Gambar</TableHead>
            <TableHead>Nama Produk</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Penjual</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Link Toko</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedMarkets.length === 0">
            <TableCell colspan="9" class="text-center py-8 text-muted-foreground">
              Tidak ada data produk
            </TableCell>
          </TableRow>
          <TableRow v-for="market in paginatedMarkets" :key="market.id">
            <TableCell>
              <img
                :src="getImage(market.attachments)"
                :alt="market.name"
                class="w-12 h-12 object-cover rounded-md"
                @error="$event.target.src = '/placeholder-image.jpg'"
              />
            </TableCell>
            <TableCell class="font-medium">
              <div>
                <p class="font-semibold">{{ market.name }}</p>
                <p class="text-sm text-muted-foreground line-clamp-2">{{ market.description }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="font-medium">
                {{ formatPrice(market.price) }}
              </div>
              <div v-if="market.price_range" class="text-sm text-muted-foreground">
                Range: {{ market.price_range }}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{{ market.category }}</Badge>
            </TableCell>
            <TableCell>
              <div>
                <p class="font-medium">{{ market.seller }}</p>
                <div class="flex items-center text-sm text-muted-foreground">
                  <Phone class="h-3 w-3 mr-1" />
                  {{ market.contact_seller }}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-2">
                <Select
                  :model-value="market.status?.toLowerCase() || 'pending'"
                  @update:model-value="updateStatus(market.id, $event)"
                >
                  <SelectTrigger
                    class="w-32 h-8"
                    :class="getStatusBadgeColor(market.status) + ' border rounded px-2 py-1 flex items-center justify-between'"
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
              <div v-if="hasLinks(market.links)" class="flex space-x-1">
                <Button
                  v-if="market.links?.shopee_link"
                  variant="outline"
                  size="sm"
                  @click="window.open(market.links.shopee_link, '_blank')"
                >
                  <ExternalLink class="h-3 w-3" />
                  Shopee
                </Button>
                <Button
                  v-if="market.links?.tokopedia_link"
                  variant="outline"
                  size="sm"
                  @click="window.open(market.links.tokopedia_link, '_blank')"
                >
                  <ExternalLink class="h-3 w-3" />
                  Tokopedia
                </Button>
                <Button
                  v-if="market.links?.tiktok_link"
                  variant="outline"
                  size="sm"
                  @click="window.open(market.links.tiktok_link, '_blank')"
                >
                  <ExternalLink class="h-3 w-3" />
                  TikTok
                </Button>
              </div>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              {{ formatDate(market.created_at) }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="$router.push(`/markets/${market.id}`)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(market)"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openDeleteDialog(market)"
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
    <FormMarket
      :open="showFormDialog"
      :market-item="editingMarket"
      @update:open="showFormDialog = $event"
      @success="onFormSuccess"
    />
    <!-- Delete Dialog -->
    <AlertDialog :open="deleteDialog" @update:open="deleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus produk "{{ deletingMarket?.name }}"?
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