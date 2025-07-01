<!-- components/chat/ConversationItem.vue - shadcn/ui Version -->
<script setup lang="ts">
import { ref } from 'vue'
import { Trash2, ChevronRight, GraduationCap, Megaphone, User, ExclamationTriangle, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'

interface Partner {
  id: string
  full_name: string
  avatar_url?: string
  role?: string
  specialization?: string
}

interface Conversation {
  id: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

interface Props {
  conversation: Conversation
  partner: Partner | null
  formatLastMessageTime: (time: string) => string
  truncateMessage: (message: string, length: number) => string
  getAvatarFallback: (name: string) => string
  isDeleting?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['openChat', 'deleteConversation'])

const showDeleteConfirm = ref(false)
const isHovered = ref(false)

// JuruTani specific role handling
const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'pakar':
    case 'expert':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100'
    case 'penyuluh':
    case 'instructor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
    case 'admin':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
  }
}

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'pakar':
    case 'expert':
      return 'Ahli JuruTani'
    case 'penyuluh':
    case 'instructor':
      return 'Penyuluh JuruTani'
    case 'admin':
      return 'Admin'
    default:
      return role
  }
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'pakar':
    case 'expert':
      return GraduationCap
    case 'penyuluh':
    case 'instructor':
      return Megaphone
    default:
      return User
  }
}

const handleDeleteClick = (e: Event) => {
  e.stopPropagation()
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  emit('deleteConversation', props.conversation.id)
  showDeleteConfirm.value = false
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
}
</script>

<template>
  <div
    class="flex items-center gap-4 p-4 
           hover:bg-green-25 dark:hover:bg-green-900/20 
           cursor-pointer transition-all duration-200 group 
           border-l-4 border-transparent 
           hover:border-green-400 dark:hover:border-green-500
           dark:bg-gray-800 bg-white relative"
    @click="emit('openChat', conversation.id)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Avatar with JuruTani styling -->
    <div class="relative">
      <Avatar 
        class="w-12 h-12 ring-3 ring-green-100 dark:ring-green-800 
               group-hover:ring-green-200 dark:group-hover:ring-green-700 
               transition-all duration-200"
      >
        <AvatarImage :src="partner?.avatar_url" :alt="partner?.full_name" />
        <AvatarFallback class="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 font-semibold text-lg">
          {{ getAvatarFallback(partner?.full_name || '') }}
        </AvatarFallback>
      </Avatar>
      
      <!-- Online Status -->
      <div
        class="absolute -bottom-1 -right-1 w-5 h-5 
                  bg-green-400 dark:bg-green-500 
                  border-3 border-white dark:border-gray-800 
                  rounded-full shadow-sm" />
    </div>
    
    <!-- Conversation Info -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1 min-w-0">
          <h3
            class="font-bold text-lg 
                    text-gray-900 dark:text-gray-100 
                    truncate 
                    group-hover:text-green-700 dark:group-hover:text-green-400 
                    transition-colors leading-tight">
            {{ partner?.full_name }}
          </h3>
          
          <!-- Role Badge for JuruTani experts, now below the name -->
          <Badge
            variant="secondary"
            :class="getRoleBadgeVariant(partner?.role || '')"
            class="mt-1"
          >
            {{ getRoleDisplayName(partner?.role || '') }}
          </Badge>
          
          <p
            v-if="partner?.specialization" 
             class="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
            {{ partner.specialization }}
          </p>
        </div>
        
        <div class="flex flex-col items-end gap-1 ml-3">
          <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {{ conversation.last_message_at ? formatLastMessageTime(conversation.last_message_at) : '' }}
          </span>
          
          <!-- Unread Badge -->
          <Badge 
            v-if="conversation.unread_count && conversation.unread_count > 0"
            class="bg-green-600 text-white flex-shrink-0 shadow-sm animate-pulse"
          >
            {{ conversation.unread_count > 99 ? '99+' : conversation.unread_count }}
          </Badge>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <p
          class="text-sm text-gray-600 dark:text-gray-300 
                 truncate pr-2 leading-relaxed">
          {{ truncateMessage(conversation.last_message || 'Belum ada pesan...', 65) }}
        </p>
      </div>
    </div>
    
    <!-- Actions Container -->
    <div class="flex items-center gap-2">
      <!-- Delete Button - only shown on hover -->
      <Button
        v-if="isHovered && !isDeleting"
        variant="ghost"
        size="sm"
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 hover:bg-red-50"
        @click="handleDeleteClick"
      >
        <Trash2 class="w-4 h-4" />
      </Button>
      
      <!-- Loading spinner when deleting -->
      <Loader2
        v-if="isDeleting"
        class="w-5 h-5 text-gray-400 animate-spin"
      />
      
      <!-- Chevron with agricultural icon -->
      <div class="flex flex-col items-center gap-1">
        <ChevronRight 
          class="w-5 h-5 text-green-400 dark:text-green-500 
                 group-hover:text-green-600 dark:group-hover:text-green-400 
                 transition-colors flex-shrink-0"
        />
        <component 
          :is="getRoleIcon(partner?.role || '')"
          class="w-3 h-3"
          :class="{
            'text-green-500 dark:text-green-400': partner?.role === 'pakar',
            'text-blue-500 dark:text-blue-400': partner?.role === 'penyuluh',
            'text-gray-400 dark:text-gray-500': !partner?.role || (partner?.role !== 'pakar' && partner?.role !== 'penyuluh')
          }"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-3">
            <ExclamationTriangle class="w-6 h-6 text-red-500" />
            <span class="text-gray-900 dark:text-gray-100">Hapus Percakapan</span>
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            Apakah Anda yakin ingin menghapus percakapan dengan 
            <span class="font-semibold text-green-600 dark:text-green-400">
              {{ partner?.full_name }}
            </span>?
          </p>
          
          <Card class="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent class="p-3">
              <div class="flex items-start gap-2">
                <ExclamationTriangle class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div class="text-sm text-red-700 dark:text-red-300">
                  <p class="font-medium mb-1">Tindakan ini tidak dapat dibatalkan!</p>
                  <p>Semua pesan dan lampiran gambar dalam percakapan ini akan dihapus secara permanen.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="cancelDelete"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            <Trash2 v-if="!isDeleting" class="w-4 h-4 mr-2" />
            <Loader2 v-if="isDeleting" class="w-4 h-4 mr-2 animate-spin" />
            Hapus Percakapan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>