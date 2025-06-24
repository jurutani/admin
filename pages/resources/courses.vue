<script setup lang="ts">
import { Loader2, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight, BookOpen, Calendar, Archive, Filter, X, ArchiveX } from 'lucide-vue-next'
import { ref, onMounted, computed, watch } from 'vue'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { useToast } from '~/components/ui/toast'
import CategoryFilter from '~/components/Filters/Category.vue'
import FormCourse from '~/components/Dialog/FormCourse.vue'
import DetailCourse from '~/components/Dialog/DetailCourse.vue'

const supabase = useSupabaseClient()
const { toast } = useToast()

const allCourses = ref<any[]>([])
const loading = ref(true)

// Dialog states
const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const showArchiveDialog = ref(false)
const showDetailDialog = ref(false)
const selectedCourse = ref<any>(null)
const formMode = ref<'create' | 'edit'>('create')

// Filters
const selectedCategory = ref('')
const statusFilter = ref('all') // 'all', 'active', 'archived', 'deleted'

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Filtered courses based on all filters
const filteredCourses = computed(() => {
  let filtered = [...allCourses.value]
  
  // Filter by status
  if (statusFilter.value === 'active') {
    filtered = filtered.filter(course => !course.archived_at && !course.deleted_at)
  } else if (statusFilter.value === 'archived') {
    filtered = filtered.filter(course => course.archived_at && !course.deleted_at)
  } else if (statusFilter.value === 'deleted') {
    filtered = filtered.filter(course => course.deleted_at)
  } else if (statusFilter.value === 'all') {
    // Show only non-deleted courses by default
    filtered = filtered.filter(course => !course.deleted_at)
  }
  
  // Filter by category
  if (selectedCategory.value) {
    filtered = filtered.filter(course => course.category === selectedCategory.value)
  }
  
  return filtered
})

// Paginated courses
const paginatedCourses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCourses.value.slice(start, end)
})

// Pagination info
const totalPages = computed(() => {
  return Math.ceil(filteredCourses.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredCourses.value.length)
  return {
    start,
    end,
    total: filteredCourses.value.length
  }
})

// Watch for filter changes to reset pagination
watch([selectedCategory, statusFilter], () => {
  currentPage.value = 1
})

onMounted(async () => {
  await fetchCourses()
})

async function fetchCourses() {
  loading.value = true
  try {
    // Fetch all courses including deleted ones for admin view
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    allCourses.value = data || []
  } catch (error) {
    console.error('Gagal memuat data:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat data courses',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
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

function formatFiles(files: any) {
  if (!files) return '-'
  if (typeof files === 'string') {
    try {
      const parsed = JSON.parse(files)
      return Array.isArray(parsed) ? `${parsed.length} file(s)` : 'Invalid format'
    } catch {
      return 'Invalid JSON'
    }
  }
  if (Array.isArray(files)) {
    return `${files.length} file(s)`
  }
  return 'Unknown format'
}

function clearFilters() {
  selectedCategory.value = ''
  statusFilter.value = 'all'
}

function getCourseStatus(course: any) {
  if (course.deleted_at) return 'deleted'
  if (course.archived_at) return 'archived'
  return 'active'
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full'
    case 'archived':
      return 'px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full'
    case 'deleted':
      return 'px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full'
    default:
      return 'px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'archived':
      return 'Archived'
    case 'deleted':
      return 'Deleted'
    default:
      return 'Unknown'
  }
}

// Stats computed with proper filtering
const statsTotal = computed(() => {
  return allCourses.value.filter(course => !course.deleted_at).length
})

const statsToday = computed(() => {
  return allCourses.value.filter(course => 
    !course.deleted_at &&
    new Date(course.created_at).toDateString() === new Date().toDateString()
  ).length
})

const statsThisWeek = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return allCourses.value.filter(course => 
    !course.deleted_at &&
    new Date(course.created_at) >= weekAgo
  ).length
})

const statsArchived = computed(() => {
  return allCourses.value.filter(course => course.archived_at && !course.deleted_at).length
})

const hasActiveFilters = computed(() => {
  return selectedCategory.value !== '' || statusFilter.value !== 'all'
})

// Dialog functions
function openCreateDialog() {
  formMode.value = 'create'
  selectedCourse.value = null
  showFormDialog.value = true
}

function openEditDialog(course: any) {
  formMode.value = 'edit'
  selectedCourse.value = course
  showFormDialog.value = true
}

function openDeleteDialog(course: any) {
  selectedCourse.value = course
  showDeleteDialog.value = true
}

function openArchiveDialog(course: any) {
  selectedCourse.value = course
  showArchiveDialog.value = true
}

function openDetailDialog(course: any) {
  selectedCourse.value = course
  showDetailDialog.value = true
}

function viewCourse(course: any) {
  // Open detail dialog instead of navigation
  openDetailDialog(course)
}

async function handleFormSuccess() {
  await fetchCourses()
  showFormDialog.value = false
}

async function confirmDelete() {
  if (!selectedCourse.value) return
  
  try {
    const { error } = await supabase
      .from('courses')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedCourse.value.id)

    if (error) throw error

    toast({
      title: 'Berhasil',
      description: 'Course berhasil dihapus',
    })

    await fetchCourses()
    showDeleteDialog.value = false
  } catch (error) {
    console.error('Error deleting course:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus course',
      variant: 'destructive',
    })
  }
}

async function confirmArchive() {
  if (!selectedCourse.value) return
  
  try {
    const isCurrentlyArchived = !!selectedCourse.value.archived_at
    
    const { error } = await supabase
      .from('courses')
      .update({ 
        archived_at: isCurrentlyArchived ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedCourse.value.id)

    if (error) throw error

    toast({
      title: 'Berhasil',
      description: `Course berhasil ${isCurrentlyArchived ? 'dibatalkan dari arsip' : 'diarsipkan'}`,
    })

    await fetchCourses()
    showArchiveDialog.value = false
  } catch (error) {
    console.error('Error archiving course:', error)
    toast({
      title: 'Error',
      description: 'Gagal mengubah status arsip course',
      variant: 'destructive',
    })
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <BookOpen class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Data Courses</h1>
      </div>
      <Button @click="openCreateDialog">
        <Plus class="h-4 w-4 mr-2" />
        Tambah Course
      </Button>
    </div>
    
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Total Courses</CardTitle>
          <BookOpen class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsTotal }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Courses Hari Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsToday }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Courses Minggu Ini</CardTitle>
          <Calendar class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsThisWeek }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">Archived</CardTitle>
          <Archive class="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ statsArchived }}</p>
        </CardContent>
      </Card>
    </div>
    
    <!-- Filters -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Filter class="h-4 w-4" />
            <CardTitle class="text-lg">Filter</CardTitle>
          </div>
          <Button 
            v-if="hasActiveFilters"
            variant="outline" 
            size="sm"
            @click="clearFilters"
          >
            <X class="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Category Filter -->
        <div>
          <label class="text-sm font-medium mb-2 block">Kategori</label>
          <CategoryFilter v-model="selectedCategory" />
        </div>
        
        <!-- Status Filter -->
        <div>
          <label class="text-sm font-medium mb-2 block">Status</label>
          <Select v-model="statusFilter">
            <SelectTrigger class="w-48">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua (Kecuali Deleted)</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <!-- Filter Summary -->
        <div v-if="hasActiveFilters" class="text-sm text-muted-foreground">
          Menampilkan {{ filteredCourses.length }} dari {{ statsTotal }} courses
          <span v-if="selectedCategory"> dengan kategori "{{ selectedCategory }}"</span>
          <span v-if="statusFilter !== 'all'"> dengan status "{{ statusFilter }}"</span>
        </div>
      </CardContent>
    </Card>
    
    <div class="border rounded-lg">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader2 class="h-6 w-6 animate-spin mr-2" />
        Memuat data...
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Drive Link</TableHead>
            <TableHead>YouTube Link</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="paginatedCourses.length === 0">
            <TableCell colspan="11" class="text-center py-8 text-muted-foreground">
              <div v-if="hasActiveFilters">
                Tidak ada data courses yang sesuai dengan filter
              </div>
              <div v-else>
                Tidak ada data courses
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-for="course in paginatedCourses" :key="course.id">
            <TableCell>
              <div class="w-16 h-12 bg-gray-100 rounded overflow-hidden">
                <img
                  v-if="course.image_url"
                  :src="course.image_url"
                  :alt="course.title"
                  class="w-full h-full object-cover"
                  @error="$event.target.style.display = 'none'"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <BookOpen class="h-6 w-6 text-gray-400" />
                </div>
              </div>
            </TableCell>
            <TableCell class="font-medium">
              <p class="font-semibold">{{ course.title || '-' }}</p>
            </TableCell>
            <TableCell>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {{ course.category || 'Uncategorized' }}
              </span>
            </TableCell>
            <TableCell>
              <p class="text-sm text-muted-foreground">
                {{ truncateText(course.description) }}
              </p>
            </TableCell>
            <TableCell>
              <span class="text-sm">{{ formatFiles(course.files) }}</span>
            </TableCell>
            <TableCell>
              <Button
                v-if="course.link_drive"
                variant="ghost"
                size="sm"
                @click="openLink(course.link_drive)"
                class="text-green-600 hover:text-green-700"
              >
                <Eye class="h-4 w-4 mr-1" />
                Drive
              </Button>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <Button
                v-if="course.link_youtube"
                variant="ghost"
                size="sm"
                @click="openLink(course.link_youtube)"
                class="text-red-600 hover:text-red-700"
              >
                <Eye class="h-4 w-4 mr-1" />
                YouTube
              </Button>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(course.created_at) }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Calendar class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ formatDate(course.updated_at) }}</span>
              </div>
            </TableCell>
            <TableCell>
              <span :class="getStatusBadgeClass(getCourseStatus(course))">
                {{ getStatusLabel(getCourseStatus(course)) }}
              </span>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="viewCourse(course)"
                  :disabled="getCourseStatus(course) === 'deleted'"
                  title="View Details"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(course)"
                  :disabled="getCourseStatus(course) === 'deleted'"
                  title="Edit Course"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openArchiveDialog(course)"
                  :disabled="getCourseStatus(course) === 'deleted'"
                  :title="course.archived_at ? 'Unarchive Course' : 'Archive Course'"
                >
                  <ArchiveX v-if="course.archived_at" class="h-4 w-4" />
                  <Archive v-else class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="openDeleteDialog(course)"
                  :disabled="getCourseStatus(course) === 'deleted'"
                  title="Delete Course"
                  class="text-red-600 hover:text-red-700"
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
    <FormCourse 
      :open="showFormDialog"
      :course-item="selectedCourse"
      @update:open="showFormDialog = $event"
      @success="handleFormSuccess"
    />

    <!-- Detail Dialog -->
    <DetailCourse 
      :open="showDetailDialog"
      :course-item="selectedCourse"
      @update:open="showDetailDialog = $event"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Course</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus course "{{ selectedCourse?.title }}"? 
            Course yang dihapus masih dapat dipulihkan dari status deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete" class="bg-red-600 hover:bg-red-700">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Archive Confirmation Dialog -->
    <AlertDialog :open="showArchiveDialog" @update:open="showArchiveDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ selectedCourse?.archived_at ? 'Batalkan Arsip' : 'Arsipkan' }} Course
          </AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin {{ selectedCourse?.archived_at ? 'membatalkan arsip' : 'mengarsipkan' }} 
            course "{{ selectedCourse?.title }}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmArchive">
            {{ selectedCourse?.archived_at ? 'Batalkan Arsip' : 'Arsipkan' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
