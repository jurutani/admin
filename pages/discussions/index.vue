<script setup lang="ts">
import Form from '@/components/News/Modal/Form.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast' // Update the path to the correct location
import { Edit, Eye, MoreHorizontal, Trash2 } from 'lucide-vue-next'

const open = ref(false)
const editNewsId = ref<number | null>(null)
const deleteConfirmOpen = ref(false)
const deleteNewsId = ref<number | null>(null)

interface News {
  id: number
  title: string
  sub_title?: string
  content: string
  category: string
  attachments?: any[]
  link?: string
  status_news: 'pending' | 'approved' | 'rejected'
  created_at: Date
  updated_at?: Date
  published_at?: Date
  deleted_at?: Date
  author_id?: string
}

const newsList = ref<News[]>([
  {
    id: 1,
    title: 'Berita Pertama',
    content: 'Konten berita pertama',
    category: 'Umum',
    status_news: 'approved',
    created_at: new Date(),
  },
  {
    id: 2,
    title: 'Berita Kedua',
    content: 'Konten berita kedua',
    category: 'Pendidikan',
    status_news: 'pending',
    created_at: new Date(),
  },
  {
    id: 3,
    title: 'Berita Ketiga',
    content: 'Konten berita ketiga',
    category: 'Teknologi',
    status_news: 'rejected',
    created_at: new Date(),
  },
])

function statusColor(status: string) {
  switch (status) {
    case 'approved': return 'default' // Changed from 'success' to 'default'
    case 'pending': return 'secondary'
    case 'rejected': return 'destructive'
    default: return 'outline'
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('id-ID')
}

function openEditModal(id: number) {
  editNewsId.value = id
  open.value = true
}

function confirmDelete(id: number) {
  deleteNewsId.value = id
  deleteConfirmOpen.value = true
}

function deleteNews() {
  if (deleteNewsId.value) {
    newsList.value = newsList.value.filter(news => news.id !== deleteNewsId.value)
    toast({
      title: 'Berita dihapus',
      description: 'Berita telah berhasil dihapus',
    })
    deleteConfirmOpen.value = false
    deleteNewsId.value = null
  }
}

function updateStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
  const newsIndex = newsList.value.findIndex(news => news.id === id)
  if (newsIndex !== -1) {
    newsList.value[newsIndex].status_news = status
    toast({
      title: 'Status diperbarui',
      description: `Status berita telah diubah menjadi "${status}"`,
    })
  }
}

function closeForm() {
  open.value = false
  editNewsId.value = null
}
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Manajemen Berita
      </h1>
      <Button @click="open = true">
        + Tambah Berita
      </Button>
    </div>

    <div class="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[300px]">
              Judul
            </TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead class="text-right">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in newsList" :key="item.id">
            <TableCell class="font-medium">
              {{ item.title }}
            </TableCell>
            <TableCell>{{ item.category }}</TableCell>
            <TableCell>
              <Select :value="item.status_news" @update:value="(v: string) => updateStatus(item.id, v as 'approved' | 'pending' | 'rejected')">
                <SelectTrigger class="w-32">
                  <SelectValue>
                    <div class="flex items-center gap-2">
                      <Badge :variant="statusColor(item.status_news)">
                        {{ item.status_news }}
                      </Badge>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div class="flex items-center gap-2">
                      <Badge variant="secondary">
                        pending
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div class="flex items-center gap-2">
                      <Badge variant="default">
                        approved
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div class="flex items-center gap-2">
                      <Badge variant="destructive">
                        rejected
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>{{ formatDate(item.created_at) }}</TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem as-child>
                    <NuxtLink :to="`/news/${item.id}`" class="flex cursor-pointer items-center gap-2">
                      <Eye class="h-4 w-4" />
                      Lihat
                    </NuxtLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem class="flex cursor-pointer items-center gap-2" @click="openEditModal(item.id)">
                    <Edit class="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem class="flex cursor-pointer items-center gap-2 text-destructive" @click="confirmDelete(item.id)">
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

    <!-- Modal Tambah/Edit Berita -->
    <Dialog v-model:open="open">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ editNewsId ? 'Edit Berita' : 'Tambah Berita' }}</DialogTitle>
          <DialogDescription>{{ editNewsId ? 'Perbarui informasi berita' : 'Isi form berita baru di bawah ini' }}</DialogDescription>
        </DialogHeader>
        <Form :edit-id="editNewsId" @close="closeForm" />
      </DialogContent>
    </Dialog>

    <!-- Modal Konfirmasi Hapus -->
    <Dialog v-model:open="deleteConfirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus</DialogTitle>
          <DialogDescription>Apakah Anda yakin ingin menghapus berita ini? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <div class="mt-4 flex justify-end gap-3">
          <Button variant="outline" @click="deleteConfirmOpen = false">
            Batal
          </Button>
          <Button variant="destructive" @click="deleteNews">
            Hapus
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
