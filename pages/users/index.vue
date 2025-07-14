<script setup lang="ts">
import { Eye, MoreHorizontal, Users2, UserCheck, Trash2, MapPin, Phone, Calendar, Filter, RotateCcw, Plus, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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

const supabase = useSupabaseClient()
const router = useRouter()

// Reactive states
const refreshKey = ref(0)
const deleteDialogOpen = ref(false)
const addPetaniDialogOpen = ref(false)
const userToDelete = ref(null)

// Filter states
const statusFilter = ref('all') // 'all', 'active', 'deleted'

// Pagination states
const currentPage = ref(1)
const itemsPerPage = 20

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
  // Pastikan tidak ada slash di depan avatarPath
  const cleanPath = avatarPath.startsWith('/') ? avatarPath.slice(1) : avatarPath
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(cleanPath)
  return data.publicUrl
}

// Fetch petani users with profiles
async function fetchPetaniUsers() {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'petani')
      .order('created_at', { ascending: false })

    // Filter berdasarkan status
    if (statusFilter.value === 'active') {
      query = query.is('deleted_at', null)
    } else if (statusFilter.value === 'deleted') {
      query = query.not('deleted_at', 'is', null)
    }

    if (filterStartDate.value) {
      query = query.gte('created_at', filterStartDate.value)
    }
    if (filterEndDate.value) {
      query = query.lte('created_at', filterEndDate.value)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching petani users:', error)
      throw error
    }

    // Process data to include avatar URLs
    const processedData = (data || []).map(user => ({
      ...user,
      email: user.email || '',
      avatarUrl: getAvatarUrl(user.avatar_url),
      created_at: user.created_at,
      isActive: !user.deleted_at // Status aktif berdasarkan deleted_at
    }))

    return processedData
  } catch (error) {
    console.error('Error in fetchPetaniUsers:', error)
    throw error
  }
}

// Fetch petani data
const { data: petaniUsers, pending: petaniPending, error: petaniError, refresh: refreshPetani } = await useAsyncData(
  `petani-users-${refreshKey.value}`,
  fetchPetaniUsers,
  {
    watch: [filterStartDate, filterEndDate, refreshKey, statusFilter],
  },
)

// Computed values for stats
const allPetaniUsers = computed(() => petaniUsers.value || [])

const totalPetaniCount = computed(() => {
  return allPetaniUsers.value.filter(user => user.isActive).length
})

const totalDeletedCount = computed(() => {
  return allPetaniUsers.value.filter(user => !user.isActive).length
})

const totalAllCount = computed(() => {
  return allPetaniUsers.value.length
})

// Pagination computed values
const totalPages = computed(() => {
  return Math.ceil(allPetaniUsers.value.length / itemsPerPage)
})

const paginatedPetaniUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return allPetaniUsers.value.slice(start, end)
})

const showingFrom = computed(() => {
  return (currentPage.value - 1) * itemsPerPage + 1
})

const showingTo = computed(() => {
  return Math.min(currentPage.value * itemsPerPage, allPetaniUsers.value.length)
})

// Functions
function refreshAllData() {
  refreshKey.value++
  currentPage.value = 1
}

function resetFilters() {
  statusFilter.value = 'all'
  dateRange.value = null
  currentPage.value = 1
}

function setStatusFilter(status: string) {
  statusFilter.value = status
  currentPage.value = 1
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
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

function viewUserDetail(userId: string) {
  router.push(`/users/${userId}`)
}

function openAddPetaniDialog() {
  addPetaniDialogOpen.value = true
}

function confirmDelete(user: any) {
  userToDelete.value = user
  deleteDialogOpen.value = true
}

async function deleteUser() {
  if (!userToDelete.value) return

  try {
    const userId = userToDelete.value.id

    // Soft delete: update deleted_at di profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)

    if (profileError) {
      throw profileError
    }

    toast({
      title: 'Berhasil',
      description: 'Petani berhasil dihapus dari sistem (soft delete)',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error soft deleting user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menghapus petani',
      variant: 'destructive',
    })
  } finally {
    deleteDialogOpen.value = false
    userToDelete.value = null
  }
}

async function restoreUser(userId: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', userId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Petani berhasil dipulihkan',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error restoring user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memulihkan petani',
      variant: 'destructive',
    })
  }
}

function onPetaniAdded() {
  addPetaniDialogOpen.value = false
  refreshAllData()
}

// Watch for filter changes to reset pagination
watch([statusFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <!-- Info Cards -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <!-- Card Total Petani -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Petani</p>
            <p class="text-xl md:text-2xl font-bold text-gray-800">{{ totalAllCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Keseluruhan</p>
          </div>
          <Users2 class="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
        </div>
      </div>

      <!-- Card Petani Aktif -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Aktif</p>
            <p class="text-xl md:text-2xl font-bold text-green-600">{{ totalPetaniCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Status aktif</p>
          </div>
          <UserCheck class="h-6 w-6 md:h-8 md:w-8 text-green-600" />
        </div>
      </div>
      
      <!-- Card Petani Dihapus -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Dihapus</p>
            <p class="text-xl md:text-2xl font-bold text-red-600">{{ totalDeletedCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Non-aktif</p>
          </div>
          <Trash2 class="h-6 w-6 md:h-8 md:w-8 text-red-600" />
        </div>
      </div>

      <!-- Card Data Ditampilkan -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Ditampilkan</p>
            <p class="text-xl md:text-2xl font-bold text-purple-600">{{ paginatedPetaniUsers.length }}</p>
            <p class="text-xs text-gray-500 mt-1">Halaman ini</p>
          </div>
          <Filter class="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">Daftar Petani</h1>
          
          <!-- Filter Status Badge -->
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
            
            <!-- Reset Filter Button -->
            <Button 
              v-if="statusFilter !== 'all'" 
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

      </div>

      <!-- Filters Row -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex gap-4 flex-1">
          <!-- Status Filter -->
          <Select v-model="statusFilter">
            <SelectTrigger class="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Hanya Aktif</SelectItem>
              <SelectItem value="deleted">Hanya Dihapus</SelectItem>
            </SelectContent>
          </Select>
                  
          <div class="flex items-center gap-2">
            <Button @click="refreshAllData" variant="outline">
              Refresh Data
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="petaniPending" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat data petani...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="petaniError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <p class="text-red-600">Terjadi kesalahan saat memuat data petani</p>
      <Button @click="refreshAllData" class="mt-2" variant="outline" size="sm">
        Coba Lagi
      </Button>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-lg border overflow-hidden">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[300px]">Petani</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead>Dihapus</TableHead>
              <TableHead class="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!paginatedPetaniUsers || paginatedPetaniUsers.length === 0">
              <TableCell colspan="7" class="text-center text-gray-500 py-8">
                <div class="flex flex-col items-center gap-2">
                  <Users2 class="h-12 w-12 text-gray-400" />
                  <p>
                    {{ statusFilter === 'deleted' ? 'Tidak ada petani yang dihapus' : 
                       statusFilter === 'active' ? 'Tidak ada petani aktif' :
                       'Belum ada petani terdaftar dalam sistem' }}
                  </p>
                </div>
              </TableCell>
            </TableRow>
            
            <TableRow v-for="petani in paginatedPetaniUsers" :key="petani.id" class="hover:bg-gray-50">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar class="h-10 w-10">
                    <AvatarImage :src="petani.avatarUrl" :alt="petani.full_name" />
                    <AvatarFallback class="bg-green-100 text-green-700">
                      {{ getInitials(petani.full_name || 'User') }}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="font-medium">{{ petani.full_name || 'Nama tidak tersedia' }}</div>
                    <div class="text-sm text-gray-500">{{ petani.email }}</div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div class="text-sm">
                  {{ petani.location || petani.address || 'Belum ditentukan' }}
                </div>
              </TableCell>
              
              <TableCell>
                <div class="text-sm">
                  {{ petani.phone_number || petani.phone || 'Belum diisi' }}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge 
                  :variant="petani.isActive ? 'default' : 'secondary'" 
                  :class="petani.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                >
                  {{ petani.isActive ? 'Aktif' : 'Tidak Aktif' }}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div class="text-sm">{{ formatDate(petani.created_at) }}</div>
              </TableCell>
              
              <TableCell>
                <div class="text-sm">
                  {{ petani.deleted_at ? formatDate(petani.deleted_at) : '-' }}
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
                      @click="viewUserDetail(petani.id)"
                    >
                      <Eye class="h-4 w-4" />
                      Lihat Detail
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      v-if="!petani.isActive"
                      class="flex cursor-pointer items-center gap-2 text-green-600 focus:text-green-600"
                      @click="restoreUser(petani.id)"
                    >
                      <UserCheck class="h-4 w-4" />
                      Pulihkan
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      v-if="petani.isActive"
                      class="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
                      @click="confirmDelete(petani)"
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

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t">
        <div class="text-sm text-gray-500">
          Menampilkan {{ showingFrom }} sampai {{ showingTo }} dari {{ totalAllCount }} data
        </div>
        
        <div class="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            @click="previousPage"
            :disabled="currentPage === 1"
          >
            <ChevronLeft class="h-4 w-4" />
            Sebelumnya
          </Button>
          
          <div class="flex items-center gap-1">
            <template v-for="page in Math.min(totalPages, 5)" :key="page">
              <Button
                v-if="page <= totalPages"
                :variant="currentPage === page ? 'default' : 'outline'"
                size="sm"
                @click="goToPage(page)"
                class="w-8"
              >
                {{ page }}
              </Button>
            </template>
            
            <span v-if="totalPages > 5" class="text-sm text-gray-500 px-2">
              ... {{ totalPages }}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            @click="nextPage"
            :disabled="currentPage === totalPages"
          >
            Selanjutnya
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus petani <strong>{{ userToDelete?.full_name }}</strong>? 
            Tindakan ini akan menonaktifkan akun petani (soft delete).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="deleteUser" class="bg-red-600 hover:bg-red-700">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>