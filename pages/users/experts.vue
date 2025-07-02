<script setup lang="ts">
import { Eye, MoreHorizontal, Users2, UserCheck, Trash2, MapPin, Phone, Calendar, Filter, RotateCcw, Plus } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Dialog from '@/components/Dialog/FormExperts.vue'
import CategoryFilters from '@/components/Filters/CategoryExperts.vue'

const supabase = useSupabaseClient()
const router = useRouter()

// Reactive states
const refreshKey = ref(0)
const deleteDialogOpen = ref(false)
const addExpertDialogOpen = ref(false)
const expertToDelete = ref(null)

// Filter states
const statusFilter = ref('all') // 'all', 'active', 'deleted'
const categoryFilter = ref('all') // 'all', 'Penyuluhan', 'Pemasaran', etc.

// Date range filtering
const dateRange = ref<DateRange | null>(null)

const filterStartDate = computed(() => {
  if (!dateRange.value?.start) 
    return null
  return dateRange.value.start.toDate('UTC').toISOString()
})

const filterEndDate = computed(() => {
  if (!dateRange.value?.end)
    return null
  return dateRange.value.end.toDate('UTC').toISOString()
})

// Function to get avatar URL from bucket
function getAvatarUrl(avatarPath: string | null) {
  if (!avatarPath) return null
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`/${avatarPath}`)
  return data.publicUrl
}

// Fetch experts with profiles
async function fetchExperts() {
  try {
    let query = supabase
      .from('experts')
      .select(`
        *,
        profiles!inner(
          id,
          full_name,
          email,
          avatar_url,
          phone,
          phone,
          address,
          created_at,
          deleted_at
        )
      `)
      .order('created_at', { ascending: false })

    // Filter berdasarkan status expert
    if (statusFilter.value === 'active') {
      query = query.is('deleted_at', null)
    } else if (statusFilter.value === 'deleted') {
      query = query.not('deleted_at', 'is', null)
    }

    // Filter berdasarkan kategori
    if (categoryFilter.value !== 'all') {
      query = query.eq('category', categoryFilter.value)
    }

    if (filterStartDate.value) {
      query = query.gte('created_at', filterStartDate.value)
    }
    if (filterEndDate.value) {
      query = query.lte('created_at', filterEndDate.value)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching experts:', error)
      throw error
    }

    // Process data to include avatar URLs and flatten structure
    const processedData = (data || []).map(expert => ({
      ...expert,
      // Flatten profile data
      full_name: expert.profiles.full_name,
      email: expert.profiles.email || '',
      phone: expert.profiles.phone || expert.profiles.phone,
      profile_created_at: expert.profiles.created_at,
      profile_deleted_at: expert.profiles.deleted_at,
      avatarUrl: getAvatarUrl(expert.profiles.avatar_url),
      isActive: !expert.deleted_at, // Status aktif expert berdasarkan deleted_at expert
      isProfileActive: !expert.profiles.deleted_at, // Status aktif profile
    }))

    return processedData
  } catch (error) {
    console.error('Error in fetchExperts:', error)
    throw error
  }
}

// Fetch expert data
const { data: experts, pending: expertsPending, error: expertsError, refresh: refreshExperts } = await useAsyncData(
  `experts-${refreshKey.value}`,
  fetchExperts,
  {
    watch: [filterStartDate, filterEndDate, refreshKey, statusFilter, categoryFilter],
  },
)

// Computed values for stats
const allExperts = computed(() => experts.value || [])

const totalExpertsCount = computed(() => {
  return allExperts.value.filter(expert => expert.isActive && expert.isProfileActive).length
})

const totalDeletedCount = computed(() => {
  return allExperts.value.filter(expert => !expert.isActive || !expert.isProfileActive).length
})

const totalAllCount = computed(() => {
  return allExperts.value.length
})

const filteredCount = computed(() => {
  if (statusFilter.value === 'active') return totalExpertsCount.value
  if (statusFilter.value === 'deleted') return totalDeletedCount.value
  return totalAllCount.value
})

// Get unique categories for filter
const availableCategories = computed(() => {
  const categories = allExperts.value.map(expert => expert.category).filter(Boolean)
  return [...new Set(categories)]
})

// Functions
function refreshAllData() {
  refreshKey.value++
}

function resetFilters() {
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
  dateRange.value = null
}

function setStatusFilter(status: string) {
  statusFilter.value = status
}

function setCategoryFilter(category: string) {
  categoryFilter.value = category
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function viewExpertDetail(expertId: string) {
  router.push(`/users/${expertId}`)
}

function openAddExpertDialog() {
  addExpertDialogOpen.value = true
}

function confirmDelete(expert: any) {
  expertToDelete.value = expert
  deleteDialogOpen.value = true
}

async function deleteExpert() {
  if (!expertToDelete.value) return

  try {
    const expertId = expertToDelete.value.id

    // Soft delete: update deleted_at di experts
    const { error: expertError } = await supabase
      .from('experts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', expertId)

    if (expertError) {
      throw expertError
    }

    toast({
      title: 'Berhasil',
      description: 'Expert berhasil dihapus dari sistem (soft delete)',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error soft deleting expert:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menghapus expert',
      variant: 'destructive',
    })
  } finally {
    deleteDialogOpen.value = false
    expertToDelete.value = null
  }
}

async function restoreExpert(expertId: string) {
  try {
    const { error } = await supabase
      .from('experts')
      .update({ deleted_at: null })
      .eq('id', expertId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Expert berhasil dipulihkan',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error restoring expert:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memulihkan expert',
      variant: 'destructive',
    })
  }
}

function onExpertAdded() {
  addExpertDialogOpen.value = false
  refreshAllData()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Filter Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Card Semua Expert -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'"
        @click="setStatusFilter('all')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Semua Expert</p>
            <p class="text-2xl font-bold text-gray-800">{{ totalAllCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Total keseluruhan</p>
          </div>
          <Users2 class="h-8 w-8 text-gray-600" />
        </div>
        <div v-if="statusFilter === 'all'" class="mt-2">
          <Badge variant="default" class="bg-blue-100 text-blue-700">Filter Aktif</Badge>
        </div>
      </div>

      <!-- Card Expert Aktif -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'active' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:border-green-300'"
        @click="setStatusFilter('active')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Expert Aktif</p>
            <p class="text-2xl font-bold text-green-600">{{ totalExpertsCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Status aktif</p>
          </div>
          <UserCheck class="h-8 w-8 text-green-600" />
        </div>
        <div v-if="statusFilter === 'active'" class="mt-2">
          <Badge variant="default" class="bg-green-100 text-green-700">Filter Aktif</Badge>
        </div>
      </div>
      
      <!-- Card Expert Dihapus -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'deleted' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:border-red-300'"
        @click="setStatusFilter('deleted')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Expert Dihapus</p>
            <p class="text-2xl font-bold text-red-600">{{ totalDeletedCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Status tidak aktif</p>
          </div>
          <Trash2 class="h-8 w-8 text-red-600" />
        </div>
        <div v-if="statusFilter === 'deleted'" class="mt-2">
          <Badge variant="default" class="bg-red-100 text-red-700">Filter Aktif</Badge>
        </div>
      </div>

      <!-- Card Filter Status -->
      <div class="bg-white p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Data Ditampilkan</p>
            <p class="text-2xl font-bold text-purple-600">{{ filteredCount }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ statusFilter === 'all' ? 'Semua data' : 
                 statusFilter === 'active' ? 'Hanya aktif' : 'Hanya dihapus' }}
            </p>
          </div>
          <Filter class="h-8 w-8 text-purple-600" />
        </div>
      </div>
    </div>

    <!-- Category Filters Component -->
    <CategoryFilters 
      :categories="availableCategories"
      :selected-category="categoryFilter"
      @category-changed="setCategoryFilter"
    />

    <!-- Controls -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold">Daftar Expert</h1>
        
        <!-- Status Filter Badge -->
        <div class="flex items-center gap-2">
          <Badge 
            :variant="statusFilter === 'all' ? 'default' : 'secondary'"
            :class="statusFilter === 'all' ? 'bg-blue-100 text-blue-700' :
                   statusFilter === 'active' ? 'bg-green-100 text-green-700' :
                   'bg-red-100 text-red-700'"
          >
            {{ statusFilter === 'all' ? 'Semua Data' : 
               statusFilter === 'active' ? 'Hanya Aktif' : 'Hanya Dihapus' }}
          </Badge>

          <!-- Category Filter Badge -->
          <Badge 
            v-if="categoryFilter !== 'all'"
            variant="outline"
            class="bg-orange-50 text-orange-700 border-orange-200"
          >
            {{ categoryFilter }}
          </Badge>
          
          <!-- Reset Filter Button -->
          <Button 
            v-if="statusFilter !== 'all' || categoryFilter !== 'all'" 
            @click="resetFilters" 
            variant="ghost" 
            size="sm"
            class="text-gray-500 hover:text-gray-700"
          >
            <RotateCcw class="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Add Expert Button -->
        <Button @click="openAddExpertDialog" class="bg-green-600 hover:bg-green-700">
          <Plus class="h-4 w-4 mr-2" />
          Tambah Expert
        </Button>

        <!-- Status Filter Dropdown -->
        <Select v-model="statusFilter">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Hanya Aktif</SelectItem>
            <SelectItem value="deleted">Hanya Dihapus</SelectItem>
          </SelectContent>
        </Select>

        <!-- Category Filter Dropdown -->
        <Select v-model="categoryFilter">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Filter Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem v-for="category in availableCategories" :key="category" :value="category">
              {{ category }}
            </SelectItem>
          </SelectContent>
        </Select>
        
        <Button @click="refreshAllData" variant="outline">
          Refresh Data
        </Button>
      </div>
    </div>
    <!-- Loading State -->
    <div v-if="expertsPending" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat data expert...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="expertsError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <p class="text-red-600">Terjadi kesalahan saat memuat data expert</p>
      <Button @click="refreshAllData" class="mt-2" variant="outline" size="sm">
        Coba Lagi
      </Button>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[300px]">Expert</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>No. Telepon</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bergabung</TableHead>
            <TableHead>Dihapus</TableHead>
            <TableHead class="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!experts || experts.length === 0">
            <TableCell colspan="8" class="text-center text-gray-500 py-8">
              <div class="flex flex-col items-center gap-2">
                <Users2 class="h-12 w-12 text-gray-400" />
                <p>
                  {{ statusFilter === 'deleted' ? 'Tidak ada expert yang dihapus' : 
                     statusFilter === 'active' ? 'Tidak ada expert aktif' :
                     'Belum ada expert terdaftar dalam sistem' }}
                </p>
              </div>
            </TableCell>
          </TableRow>
          
          <TableRow v-for="expert in experts" :key="expert.id" class="hover:bg-gray-50">
            <TableCell>
              <div class="flex items-center gap-3">
                <Avatar class="h-10 w-10">
                  <AvatarImage :src="expert.avatarUrl" :alt="expert.full_name" />
                  <AvatarFallback class="bg-blue-100 text-blue-700">
                    {{ getInitials(expert.full_name || 'Expert') }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div class="font-medium">{{ expert.full_name || 'Nama tidak tersedia' }}</div>
                  <div class="text-sm text-gray-500">{{ expert.email }}</div>
                  <div v-if="expert.note" class="text-xs text-gray-400 mt-1 max-w-xs truncate">
                    {{ expert.note }}
                  </div>
                </div>
              </div>
            </TableCell>

            <TableCell>
              <Badge variant="outline" class="bg-orange-50 text-orange-700 border-orange-200">
                {{ expert.category || 'Tidak dikategorikan' }}
              </Badge>
            </TableCell>
            <TableCell>
              <div class="text-sm">
                {{ expert.phone || 'Belum diisi' }}
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                :variant="(expert.isActive && expert.isProfileActive) ? 'default' : 'secondary'" 
                :class="(expert.isActive && expert.isProfileActive) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ (expert.isActive && expert.isProfileActive) ? 'Aktif' : 'Tidak Aktif' }}
              </Badge>
            </TableCell>
            <TableCell>
              <div class="text-sm">{{ formatDate(expert.created_at) }}</div>
            </TableCell>
            <TableCell>
              <div class="text-sm">
                {{ expert.deleted_at ? formatDate(expert.deleted_at) : '-' }}
              </div>
            </TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    class="flex cursor-pointer items-center gap-2"
                    @click="viewExpertDetail(expert.user_id)"
                  >
                    <Eye class="h-4 w-4" />
                    Lihat Detail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="!expert.isActive"
                    class="flex cursor-pointer items-center gap-2 text-green-600 focus:text-green-600"
                    @click="restoreExpert(expert.id)"
                  >
                    <UserCheck class="h-4 w-4" />
                    Pulihkan
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="expert.isActive"
                    class="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
                    @click="confirmDelete(expert)"
                  >
                    <Trash2 class="h-4 w-4" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Add Expert Dialog -->
    <Dialog 
      v-model:open="addExpertDialogOpen"
      @expert-added="onExpertAdded"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus expert <strong>{{ expertToDelete?.full_name }}</strong>? 
            Tindakan ini akan menonaktifkan akun expert (soft delete).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="deleteExpert" class="bg-red-600 hover:bg-red-700">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>