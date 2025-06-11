<script setup lang="ts">
import Form from '@/components/Announcement/Modal/Form.vue'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { Edit, Eye, MoreHorizontal, Trash2, Archive } from 'lucide-vue-next'

const open = ref(false)
const editAnnouncementId = ref<number | null>(null)
const deleteConfirmOpen = ref(false)
const deleteAnnouncementId = ref<number | null>(null)
const archiveConfirmOpen = ref(false)
const archiveAnnouncementId = ref<number | null>(null)

interface Announcement {
  id: number
  title: string
  content: string
  link?: string
  attachments?: any[]
  organization: string
  category: string
  created_at: Date
  updated_at?: Date
  deleted_at?: Date
  archived_at?: Date
  author_id?: string
}

const announcementList = ref<Announcement[]>([
  {
    id: 1,
    title: 'Seminar Teknologi AI',
    content: 'Seminar mengenai teknologi AI terbaru dan implementasinya dalam bisnis',
    link: 'https://zoom.us/j/123456789',
    attachments: [{ name: 'seminar-ai.pdf', url: '/files/seminar-ai.pdf' }],
    organization: 'Fakultas Ilmu Komputer',
    category: 'Seminar',
    created_at: new Date('2025-04-10'),
    updated_at: new Date('2025-04-12')
  },
  {
    id: 2,
    title: 'Pelatihan Leadership untuk Mahasiswa',
    content: 'Workshop kepemimpinan untuk pengembangan soft skill mahasiswa',
    link: 'https://meet.google.com/abc-defg-hij',
    attachments: [],
    organization: 'Badan Eksekutif Mahasiswa',
    category: 'Workshop',
    created_at: new Date('2025-04-15'),
    updated_at: new Date('2025-04-15')
  }
])

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('id-ID')
}

function openEditModal(id: number) {
  editAnnouncementId.value = id
  open.value = true
}

function confirmDelete(id: number) {
  deleteAnnouncementId.value = id
  deleteConfirmOpen.value = true
}

function confirmArchive(id: number) {
  archiveAnnouncementId.value = id
  archiveConfirmOpen.value = true
}

function deleteAnnouncement() {
  if (deleteAnnouncementId.value) {
    // In a real application, this would be a soft delete by setting deleted_at
    const index = announcementList.value.findIndex(item => item.id === deleteAnnouncementId.value)
    if (index !== -1) {
      announcementList.value[index].deleted_at = new Date()
      // For demonstration purposes, we're removing it from the list
      announcementList.value = announcementList.value.filter(item => item.id !== deleteAnnouncementId.value)
    }
    
    toast({
      title: 'Pengumuman dihapus',
      description: 'Pengumuman telah berhasil dihapus',
    })
    deleteConfirmOpen.value = false
    deleteAnnouncementId.value = null
  }
}

function archiveAnnouncement() {
  if (archiveAnnouncementId.value) {
    const index = announcementList.value.findIndex(item => item.id === archiveAnnouncementId.value)
    if (index !== -1) {
      announcementList.value[index].archived_at = new Date()
    }
    
    toast({
      title: 'Pengumuman diarsipkan',
      description: 'Pengumuman telah berhasil diarsipkan',
    })
    archiveConfirmOpen.value = false
    archiveAnnouncementId.value = null
  }
}

function closeForm() {
  open.value = false
  editAnnouncementId.value = null
}

function hasAttachments(attachments: any[] | undefined) {
  return attachments && attachments.length > 0
}
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Manajemen Pengumuman
      </h1>
      <Button @click="open = true">
        + Tambah Pengumuman
      </Button>
    </div>

    <div class="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[300px]">
              Judul
            </TableHead>
            <TableHead>Organisasi</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Lampiran</TableHead>
            <TableHead>Tanggal Dibuat</TableHead>
            <TableHead class="text-right">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in announcementList" :key="item.id">
            <TableCell class="font-medium">
              {{ item.title }}
            </TableCell>
            <TableCell>{{ item.organization }}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {{ item.category }}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge v-if="hasAttachments(item.attachments)" variant="secondary">
                {{ item.attachments?.length }} file
              </Badge>
              <span v-else class="text-gray-500 text-sm">Tidak ada</span>
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
                    <NuxtLink :to="`/announcement/${item.id}`" class="flex cursor-pointer items-center gap-2">
                      <Eye class="h-4 w-4" />
                      Lihat
                    </NuxtLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem class="flex cursor-pointer items-center gap-2" @click="openEditModal(item.id)">
                    <Edit class="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem class="flex cursor-pointer items-center gap-2" @click="confirmArchive(item.id)">
                    <Archive class="h-4 w-4" />
                    Arsipkan
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

    <!-- Modal Tambah/Edit Pengumuman -->
    <Dialog v-model:open="open">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ editAnnouncementId ? 'Edit Pengumuman' : 'Tambah Pengumuman' }}</DialogTitle>
          <DialogDescription>{{ editAnnouncementId ? 'Perbarui informasi pengumuman' : 'Isi form pengumuman baru di bawah ini' }}</DialogDescription>
        </DialogHeader>
        <Form :edit-id="editAnnouncementId" @close="closeForm" />
      </DialogContent>
    </Dialog>

    <!-- Modal Konfirmasi Hapus -->
    <Dialog v-model:open="deleteConfirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus</DialogTitle>
          <DialogDescription>Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <div class="mt-4 flex justify-end gap-3">
          <Button variant="outline" @click="deleteConfirmOpen = false">
            Batal
          </Button>
          <Button variant="destructive" @click="deleteAnnouncement">
            Hapus
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Modal Konfirmasi Arsip -->
    <Dialog v-model:open="archiveConfirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Arsip</DialogTitle>
          <DialogDescription>Apakah Anda yakin ingin mengarsipkan pengumuman ini? Pengumuman yang diarsipkan tidak akan ditampilkan pada daftar utama.</DialogDescription>
        </DialogHeader>
        <div class="mt-4 flex justify-end gap-3">
          <Button variant="outline" @click="archiveConfirmOpen = false">
            Batal
          </Button>
          <Button variant="default" @click="archiveAnnouncement">
            Arsipkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>