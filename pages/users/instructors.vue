<script setup lang="ts">
import { Eye, MoreHorizontal, Users2, UserCheck, Trash2, MapPin, Phone, Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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
import Dialog from '@/components/Dialog/FormInstructors.vue'
import ProvinceFilters from '@/components/Filters/ProvinceInstructors.vue'

const supabase = useSupabaseClient()
const router = useRouter()

// Reactive states
const refreshKey = ref(0)
const deleteDialogOpen = ref(false)
const addInstructorDialogOpen = ref(false)
const instructorToDelete = ref(null)

// Filter states
const statusFilter = ref('all') // 'all', 'active', 'deleted'
const provinceFilter = ref('all') // 'all', atau nama provinsi
const districtFilter = ref('all') // 'all', atau nama district/kabupaten

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
  // avatarPath expected: "id/filename.jpg"
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarPath)
  return data.publicUrl
}

// Fetch instructors with profiles
async function fetchInstructors() {
  try {
    let query = supabase
      .from('instructors')
      .select(`
        *,
        profiles!inner(
          id,
          full_name,
          email,
          avatar_url,
          phone,
          address,
          created_at,
          deleted_at
        )
      `)
      .order('created_at', { ascending: false })

    // Filter berdasarkan status instructor
    if (statusFilter.value === 'active') {
      query = query.is('deleted_at', null)
    } else if (statusFilter.value === 'deleted') {
      query = query.not('deleted_at', 'is', null)
    }

    // Filter berdasarkan provinsi
    if (provinceFilter.value !== 'all') {
      query = query.eq('provinces', provinceFilter.value)
    }

    // Filter berdasarkan district/kabupaten
    if (districtFilter.value !== 'all') {
      query = query.eq('district', districtFilter.value)
    }

    if (filterStartDate.value) {
      query = query.gte('created_at', filterStartDate.value)
    }
    if (filterEndDate.value) {
      query = query.lte('created_at', filterEndDate.value)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching instructors:', error)
      throw error
    }

    // Process data to include avatar URLs and flatten structure
    const processedData = (data || []).map(instructor => ({
      ...instructor,
      // Flatten profile data
      full_name: instructor.profiles.full_name,
      email: instructor.profiles.email || '',
      phone: instructor.profiles.phone || '',
      address: instructor.profiles.address || '',
      profile_created_at: instructor.profiles.created_at,
      profile_deleted_at: instructor.profiles.deleted_at,
      avatarUrl: getAvatarUrl(instructor.profiles.avatar_url),
      isActive: !instructor.deleted_at, // Status aktif instructor berdasarkan deleted_at instructor
      isProfileActive: !instructor.profiles.deleted_at, // Status aktif profile
    }))

    return processedData
  } catch (error) {
    console.error('Error in fetchInstructors:', error)
    throw error
  }
}

// Fetch instructor data
const { data: instructors, pending: instructorsPending, error: instructorsError, refresh: refreshInstructors } = await useAsyncData(
  `instructors-${refreshKey.value}`,
  fetchInstructors,
  {
    watch: [filterStartDate, filterEndDate, refreshKey, statusFilter, provinceFilter, districtFilter],
  },
)

// Computed values for stats
const allInstructors = computed(() => instructors.value || [])

const totalInstructorsCount = computed(() => {
  return allInstructors.value.filter(instructor => instructor.isActive && instructor.isProfileActive).length
})

const totalDeletedCount = computed(() => {
  return allInstructors.value.filter(instructor => !instructor.isActive || !instructor.isProfileActive).length
})

const totalAllCount = computed(() => {
  return allInstructors.value.length
})

// Pagination computed values
const totalPages = computed(() => {
  return Math.ceil(allInstructors.value.length / itemsPerPage)
})

const paginatedInstructors = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return allInstructors.value.slice(start, end)
})

const showingFrom = computed(() => {
  return (currentPage.value - 1) * itemsPerPage + 1
})

const showingTo = computed(() => {
  return Math.min(currentPage.value * itemsPerPage, allInstructors.value.length)
})

// Functions
function refreshAllData() {
  refreshKey.value++
  currentPage.value = 1
}

function setStatusFilter(status: string) {
  statusFilter.value = status
  currentPage.value = 1
}

function setProvinceFilter(province: string) {
  provinceFilter.value = province
  currentPage.value = 1
}

function setDistrictFilter(district: string) {
  districtFilter.value = district
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

function viewInstructorDetail(instructorId: string) {
  router.push(`/users/${instructorId}`)
}

function openAddInstructorDialog() {
  addInstructorDialogOpen.value = true
}

function confirmDelete(instructor: any) {
  instructorToDelete.value = instructor
  deleteDialogOpen.value = true
}

async function deleteInstructor() {
  if (!instructorToDelete.value) return

  try {
    const instructorId = instructorToDelete.value.id

    // Soft delete: update deleted_at di instructors
    const { error: instructorError } = await supabase
      .from('instructors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', instructorId)

    if (instructorError) {
      throw instructorError
    }

    toast({
      title: 'Berhasil',
      description: 'Instructor berhasil dihapus dari sistem (soft delete)',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error soft deleting instructor:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menghapus instructor',
      variant: 'destructive',
    })
  } finally {
    deleteDialogOpen.value = false
    instructorToDelete.value = null
  }
}

async function restoreInstructor(instructorId: string) {
  try {
    const { error } = await supabase
      .from('instructors')
      .update({ deleted_at: null })
      .eq('id', instructorId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Instructor berhasil dipulihkan',
    })

    refreshAllData()

  } catch (error) {
    console.error('Error restoring instructor:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memulihkan instructor',
      variant: 'destructive',
    })
  }
}

function onInstructorAdded() {
  addInstructorDialogOpen.value = false
  refreshAllData()
}

// Watch for filter changes to reset pagination
watch([statusFilter, provinceFilter, districtFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <!-- Info Cards -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <!-- Card Semua Instructor -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Instructor</p>
            <p class="text-xl md:text-2xl font-bold text-gray-800">{{ totalAllCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Keseluruhan</p>
          </div>
          <Users2 class="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
        </div>
      </div>

      <!-- Card Instructor Aktif -->
      <div class="bg-white p-4 md:p-6 rounded-lg border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Aktif</p>
            <p class="text-xl md:text-2xl font-bold text-green-600">{{ totalInstructorsCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Status aktif</p>
          </div>
          <UserCheck class="h-6 w-6 md:h-8 md:w-8 text-green-600" />
        </div>
      </div>
      
      <!-- Card Instructor Dihapus -->
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
            <p class="text-xl md:text-2xl font-bold text-purple-600">{{ paginatedInstructors.length }}</p>
            <p class="text-xs text-gray-500 mt-1">Halaman ini</p>
          </div>
          <Calendar class="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Daftar Instructor</h1>
        
        <div class="flex items-center gap-2">
          <Button @click="openAddInstructorDialog" class="bg-green-600 hover:bg-green-700">
            <Plus class="h-4 w-4 mr-2" />
            Tambah Instructor
          </Button>
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
          
          <Button @click="refreshAllData" variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Province and District Filters Side by Side -->
        <div class="flex gap-4 flex-1">
          <div class="flex-1">
            <ProvinceFilters 
              :selected-province="provinceFilter"
              :selected-district="districtFilter"
              @province-changed="setProvinceFilter"
              @district-changed="setDistrictFilter"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="instructorsPending" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat data instructor...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="instructorsError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <p class="text-red-600">Terjadi kesalahan saat memuat data instructor</p>
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
              <TableHead class="w-[300px]">Instructor</TableHead>
              <TableHead>Provinsi</TableHead>
              <TableHead>Kabupaten</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead>Dihapus</TableHead>
              <TableHead class="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!paginatedInstructors || paginatedInstructors.length === 0">
              <TableCell colspan="8" class="text-center text-gray-500 py-8">
                <div class="flex flex-col items-center gap-2">
                  <Users2 class="h-12 w-12 text-gray-400" />
                  <p>
                    {{ statusFilter === 'deleted' ? 'Tidak ada instructor yang dihapus' : 
                       statusFilter === 'active' ? 'Tidak ada instructor aktif' :
                       'Belum ada instructor terdaftar dalam sistem' }}
                  </p>
                </div>
              </TableCell>
            </TableRow>
            
            <TableRow v-for="instructor in paginatedInstructors" :key="instructor.id" class="hover:bg-gray-50">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar class="h-10 w-10">
                    <AvatarImage :src="instructor.avatarUrl" :alt="instructor.full_name" />
                    <AvatarFallback class="bg-blue-100 text-blue-700">
                      {{ getInitials(instructor.full_name || 'Instructor') }}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="font-medium">{{ instructor.full_name || 'Nama tidak tersedia' }}</div>
                    <div class="text-sm text-gray-500">{{ instructor.email }}</div>
                    <div v-if="instructor.note" class="text-xs text-gray-400 mt-1 max-w-xs truncate">
                      {{ instructor.note }}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="bg-blue-50 text-blue-700 border-blue-200">
                  <MapPin class="h-3 w-3 mr-1" />
                  {{ instructor.provinces || 'Tidak diisi' }}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="bg-green-50 text-green-700 border-green-200">
                  {{ instructor.district || 'Tidak diisi' }}
                </Badge>
              </TableCell>

              <TableCell>
                <div class="text-sm">
                  {{ instructor.phone || 'Belum diisi' }}
                </div>
              </TableCell>

              <TableCell>
                <Badge 
                  :variant="(instructor.isActive && instructor.isProfileActive) ? 'default' : 'secondary'" 
                  :class="(instructor.isActive && instructor.isProfileActive) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                >
                  {{ (instructor.isActive && instructor.isProfileActive) ? 'Aktif' : 'Tidak Aktif' }}
                </Badge>
              </TableCell>

              <TableCell>
                <div class="text-sm">{{ formatDate(instructor.created_at) }}</div>
              </TableCell>

              <TableCell>
                <div class="text-sm">
                  {{ instructor.deleted_at ? formatDate(instructor.deleted_at) : '-' }}
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
                      @click="viewInstructorDetail(instructor.user_id)"
                    >
                      <Eye class="h-4 w-4" />
                      Lihat Detail
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      v-if="!instructor.isActive"
                      class="flex cursor-pointer items-center gap-2 text-green-600 focus:text-green-600"
                      @click="restoreInstructor(instructor.id)"
                    >
                      <UserCheck class="h-4 w-4" />
                      Pulihkan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      v-if="instructor.isActive"
                      class="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
                      @click="confirmDelete(instructor)"
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

    <!-- Add Instructor Dialog -->
    <Dialog 
      v-model:open="addInstructorDialogOpen"
      @instructor-added="onInstructorAdded"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus instructor <strong>{{ instructorToDelete?.full_name }}</strong>? 
            Tindakan ini akan menonaktifkan akun instructor (soft delete).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="deleteInstructor" class="bg-red-600 hover:bg-red-700">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>