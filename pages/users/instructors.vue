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

const filteredCount = computed(() => {
  if (statusFilter.value === 'active') return totalInstructorsCount.value
  if (statusFilter.value === 'deleted') return totalDeletedCount.value
  return totalAllCount.value
})

// Get unique provinces and districts for filter - Not needed anymore since we use districts table
// const availableProvinces = computed(() => {
//   const provinces = allInstructors.value.map(instructor => instructor.provinces).filter(Boolean)
//   return [...new Set(provinces)]
// })

// const availableDistricts = computed(() => {
//   const districts = allInstructors.value.map(instructor => instructor.district).filter(Boolean)
//   return [...new Set(districts)]
// })

// Functions
function refreshAllData() {
  refreshKey.value++
}

function resetFilters() {
  statusFilter.value = 'all'
  provinceFilter.value = 'all'
  districtFilter.value = 'all'
  dateRange.value = null
}

function setStatusFilter(status: string) {
  statusFilter.value = status
}

function setProvinceFilter(province: string) {
  provinceFilter.value = province
}

function setDistrictFilter(district: string) {
  districtFilter.value = district
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
</script>

<template>
  <div class="space-y-6">
    <!-- Filter Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Card Semua Instructor -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'"
        @click="setStatusFilter('all')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Semua Instructor</p>
            <p class="text-2xl font-bold text-gray-800">{{ totalAllCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Total keseluruhan</p>
          </div>
          <Users2 class="h-8 w-8 text-gray-600" />
        </div>
        <div v-if="statusFilter === 'all'" class="mt-2">
          <Badge variant="default" class="bg-blue-100 text-blue-700">Filter Aktif</Badge>
        </div>
      </div>

      <!-- Card Instructor Aktif -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'active' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:border-green-300'"
        @click="setStatusFilter('active')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Instructor Aktif</p>
            <p class="text-2xl font-bold text-green-600">{{ totalInstructorsCount }}</p>
            <p class="text-xs text-gray-500 mt-1">Status aktif</p>
          </div>
          <UserCheck class="h-8 w-8 text-green-600" />
        </div>
        <div v-if="statusFilter === 'active'" class="mt-2">
          <Badge variant="default" class="bg-green-100 text-green-700">Filter Aktif</Badge>
        </div>
      </div>
      
      <!-- Card Instructor Dihapus -->
      <div 
        class="bg-white p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
        :class="statusFilter === 'deleted' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:border-red-300'"
        @click="setStatusFilter('deleted')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Instructor Dihapus</p>
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

    <!-- Province Filters Component -->
    <ProvinceFilters 
      :selected-province="provinceFilter"
      :selected-district="districtFilter"
      @province-changed="setProvinceFilter"
      @district-changed="setDistrictFilter"
    />

    <!-- Controls -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold">Daftar Instructor</h1>
        
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

          <!-- Province Filter Badge -->
          <Badge 
            v-if="provinceFilter !== 'all'"
            variant="outline"
            class="bg-blue-50 text-blue-700 border-blue-200"
          >
            <MapPin class="h-3 w-3 mr-1" />
            {{ provinceFilter }}
          </Badge>

          <!-- District Filter Badge -->
          <Badge 
            v-if="districtFilter !== 'all'"
            variant="outline"
            class="bg-green-50 text-green-700 border-green-200"
          >
            {{ districtFilter }}
          </Badge>
          
          <!-- Reset Filter Button -->
          <Button 
            v-if="statusFilter !== 'all' || provinceFilter !== 'all' || districtFilter !== 'all'" 
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
        <!-- Add Instructor Button -->
        <Button @click="openAddInstructorDialog" class="bg-green-600 hover:bg-green-700">
          <Plus class="h-4 w-4 mr-2" />
          Tambah Instructor
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

        <!-- Province Filter Dropdown - Now using districts table data -->
        <Select v-model="provinceFilter">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Filter Provinsi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Provinsi</SelectItem>
            <!-- Provinces will be loaded from districts table via ProvinceFilters component -->
          </SelectContent>
        </Select>

        <!-- District Filter Dropdown - Now using districts table data -->
        <Select v-model="districtFilter">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Filter Kabupaten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kabupaten</SelectItem>
            <!-- Districts will be loaded from districts table via ProvinceFilters component -->
          </SelectContent>
        </Select>
        
        <Button @click="refreshAllData" variant="outline">
          Refresh Data
        </Button>
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
    <div v-else class="bg-white rounded-lg border">
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
          <TableRow v-if="!instructors || instructors.length === 0">
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
          
          <TableRow v-for="instructor in instructors" :key="instructor.id" class="hover:bg-gray-50">
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