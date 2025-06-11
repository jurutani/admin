<script setup lang="ts">
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-vue-next'

import type { Ref } from 'vue'

// Page meta
definePageMeta({
  middleware: 'admin',
  layout: () => 'dashboard',
})

// News type
type News = {
  id: string
  title: string
  excerpt?: string
  content?: string
  category: string
  is_published: boolean
  created_at: string
}

// Use news composable
const {
  newsList,
  loading,
  error,
  currentCategory,
  categories,
  currentPage,
  totalPages,
  isEmpty,
  currentPageInfo,
  fetchNews,
  deleteNews,
  resetFilters,
  changeCategory,
  changePage,
} = useNews() as {
  newsList: Ref<News[]>
  loading: Ref<boolean>
  error: Ref<{ message: string } | null>
  currentCategory: Ref<string>
  categories: Ref<string[]>
  currentPage: Ref<number>
  totalPages: Ref<number>
  isEmpty: Ref<boolean>
  currentPageInfo: Ref<{ start: number; end: number; total: number }>
  fetchNews: () => void
  deleteNews: (id: string) => Promise<void>
  resetFilters: () => void
  changeCategory: (category: string) => void
  changePage: (page: number) => void
}

// Initialize
onMounted(function fetchOnMount() {
  fetchNews()
})

// Methods
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function viewNews(id: string) {
  navigateTo(`/dashboard/news/${id}`)
}

function editNews(id: string) {
  navigateTo(`/dashboard/news/${id}/edit`)
}

function confirmDelete(news: News) {
  if (window.confirm(`Yakin ingin menghapus berita "${news.title}"?`)) {
    deleteNews(news.id)
  }
}

function getPaginationRange() {
  const range = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)

  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  return range
}
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="items-center justify-between flex">
      <div>
        <h1 class="font-bold text-2xl">
          Manajemen Berita
        </h1>
        <p class="text-muted-foreground">
          Kelola semua berita website
        </p>
      </div>

      <Button @click="$router.push('/dashboard/news/create')">
        <Plus class="mr-2 h-4 w-4" />
        Tambah Berita
      </Button>
    </div>

    <!-- Filters -->
    <Card>
      <CardHeader>
        <CardTitle>Filter Berita</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex gap-2 flex-wrap">
          <Button
            v-for="category in categories"
            :key="category"
            :variant="currentCategory === category ? 'default' : 'outline'"
            size="sm"
            @click="changeCategory(category)"
          >
            {{ category }}
          </Button>
        </div>

        <div class="items-center justify-between mt-4 text-sm text-muted-foreground flex">
          <span>
            Menampilkan {{ currentPageInfo.start }}-{{ currentPageInfo.end }} dari {{ currentPageInfo.total }} berita
          </span>

          <Button variant="ghost" size="sm" @click="resetFilters">
            Reset Filter
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Loading State -->
    <div v-if="loading" class="items-center justify-center flex py-12">
      <div class="items-center flex space-x-2">
        <Loader2 class="animate-spin h-4 w-4" />
        <span>Memuat berita...</span>
      </div>
    </div>

    <!-- Error State -->
    <Alert v-else-if="error" variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <AlertTitle>Error!</AlertTitle>
      <AlertDescription>
        {{ error.message }}
      </AlertDescription>
    </Alert>

    <!-- Empty State -->
    <Card v-else-if="isEmpty">
      <CardContent class="py-12 text-center">
        <div class="space-y-4">
          <FileText class="mx-auto h-12 text-muted-foreground w-12" />
          <div>
            <h3 class="font-semibold text-lg">
              Belum ada berita
            </h3>
            <p class="text-muted-foreground">
              {{ currentCategory === 'Semua'
                ? 'Belum ada berita yang tersedia'
                : `Belum ada berita kategori ${currentCategory}`
              }}
            </p>
          </div>
          <Button @click="$router.push('/dashboard/news/create')">
            Buat Berita Pertama
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- News Table -->
    <Card v-else>
      <CardHeader>
        <CardTitle>Daftar Berita</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Judul
                </TableHead>
                <TableHead>
                  Kategori
                </TableHead>
                <TableHead>
                  Status
                </TableHead>
                <TableHead>
                  Tanggal
                </TableHead>
                <TableHead class="text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="news in newsList" :key="news.id">
                <TableCell>
                  <div class="space-y-1">
                    <div class="font-medium">
                      {{ news.title }}
                    </div>
                    <div class="line-clamp-2 text-muted-foreground text-sm">
                      {{ news.excerpt ? news.excerpt : (news.content ? news.content.substring(0, 100) + '...' : '') }}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="secondary">
                    {{ news.category }}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge :variant="news.is_published ? 'default' : 'outline'">
                    {{ news.is_published ? 'Published' : 'Draft' }}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div class="text-sm">
                    {{ formatDate(news.created_at) }}
                  </div>
                </TableCell>

                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="viewNews(news.id)">
                        <Eye class="mr-2 w-4 h-4" />
                        Lihat
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="editNews(news.id)">
                        <Edit class="mr-2 w-4 h-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        class="text-destructive"
                        @click="confirmDelete(news)"
                      >
                        <Trash2 class="mr-2 w-4 h-4" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="justify-center flex">
      <div class="items-center flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <ChevronLeft class="w-4 h-4" />
          Previous
        </Button>

        <div class="items-center flex space-x-1">
          <Button
            v-for="page in getPaginationRange()"
            :key="page"
            :variant="page === currentPage ? 'default' : 'outline'"
            size="sm"
            @click="changePage(page)"
          >
            {{ page }}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Next
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
</template>