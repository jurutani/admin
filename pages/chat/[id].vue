<script setup lang="ts">
// Import Shadcn-Vue components dan composables
import { useToast } from '@/components/ui/toast'
import { useChat } from '~/composables/useChat'
import { useChatUtils } from '~/composables/useChatUtils'
import { useChatSearch } from '~/composables/useChatSearch'

// Import Shadcn-Vue components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

// Import icons from lucide-vue-next
import { 
  ArrowLeft, 
  Newspaper, 
  GraduationCap, 
  Megaphone,
  UserCheck,
  User, 
  Trash2, 
  MessageSquare, 
  X, 
  Image, 
  Send,
  Download,
  ExternalLink
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()

// Chat composables
const {
  conversations,
  getUserConversations,
  getOrCreateConversation,
  getCurrentUser,
  loading,
  messages,
  currentConversation,
  getMessages,
  sendMessage: sendChatMessage,
  sendImageMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
  markAsRead,
  deleteMessage,
  clearConversationMessages,
  uploadingImage,
  isValidImageFile,
  setCurrentConversation
} = useChat()

const {
  formatMessageTime,
  groupMessagesByDate,
  isOwnMessage,
  isValidMessage,
  scrollToBottom,
  formatLastMessageTime,
  truncateMessage,
  getConversationPartner,
  getAvatarFallback
} = useChatUtils()

// Reactive states
const newMessage = ref('')
const messagesContainer = ref<HTMLElement>()
const currentUser = ref(null)
const imageInput = ref<HTMLInputElement>()
const selectedImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const imageCaption = ref('')
const showImagePreview = ref(false)
const showDeleteConfirm = ref(false)
const messageToDelete = ref<string | null>(null)
const showClearConfirm = ref(false)

// New states for image preview dialog
const showImageViewDialog = ref(false)
const viewImageUrl = ref<string | null>(null)
const viewImageCaption = ref('')

// Computed properties
const conversationId = computed(() => route.params.id as string)
const groupedMessages = computed(() => groupMessagesByDate(messages.value))

// Fix untuk partnerInfo - pastikan currentUser sudah diset
const partnerInfo = computed(() => {
  if (!currentConversation.value || !currentUser.value) return null
  return getConversationPartner(currentConversation.value, currentUser.value.id)
})

// Methods
const sendMessage = async () => {
  if (!isValidMessage(newMessage.value) || loading.value) return

  try {
    const content = newMessage.value.trim()
    newMessage.value = ''
    await sendChatMessage(conversationId.value, content)

    await nextTick()
    if (messagesContainer.value) scrollToBottom(messagesContainer.value)
  } catch (error) {
    console.error('Gagal mengirim pesan:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal Mengirim Pesan',
      description: 'Terjadi kesalahan. Silakan coba lagi nanti.',
    })
  }
}

// Image handling methods
const triggerImageUpload = () => {
  imageInput.value?.click()
}

const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  if (!isValidImageFile(file)) {
    toast({
      variant: 'destructive',
      title: 'File Tidak Valid',
      description: 'File harus berupa gambar (JPEG, PNG, GIF, WebP) dan maksimal 10MB.',
    })
    return
  }
  
  selectedImage.value = file
  imageCaption.value = ''
  
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
    showImagePreview.value = true
  }
  reader.readAsDataURL(file)
}

const sendImageMessageChat = async () => {
  if (!selectedImage.value || uploadingImage.value) return
  
  try {
    await sendImageMessage(conversationId.value, selectedImage.value, imageCaption.value)
    resetImageState()
    
    await nextTick()
    if (messagesContainer.value) scrollToBottom(messagesContainer.value)
    
    toast({
      title: 'Berhasil',
      description: 'Gambar berhasil dikirim.',
    })
  } catch (error) {
    console.error('Gagal mengirim gambar:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal Mengirim Gambar',
      description: 'Terjadi kesalahan. Silakan coba lagi nanti.',
    })
  }
}

const resetImageState = () => {
  selectedImage.value = null
  imagePreview.value = null
  imageCaption.value = ''
  showImagePreview.value = false
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

const cancelImagePreview = () => resetImageState()

// New method for viewing image in dialog
const viewImage = (imageUrl: string, caption: string = '') => {
  viewImageUrl.value = imageUrl
  viewImageCaption.value = caption
  showImageViewDialog.value = true
}

const closeImageView = () => {
  showImageViewDialog.value = false
  viewImageUrl.value = null
  viewImageCaption.value = ''
}

const downloadImage = () => {
  if (!viewImageUrl.value) return
  
  try {
    const link = document.createElement('a')
    link.href = viewImageUrl.value
    link.download = `image_${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Gagal mendownload gambar:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal Download',
      description: 'Tidak dapat mendownload gambar.',
    })
  }
}

const openImageInNewTab = () => {
  if (viewImageUrl.value) {
    window.open(viewImageUrl.value, '_blank')
  }
}

// Message deletion methods
const confirmDeleteMessage = (messageId: string) => {
  messageToDelete.value = messageId
  showDeleteConfirm.value = true
}

const handleDeleteMessage = async () => {
  if (!messageToDelete.value) return
  
  try {
    await deleteMessage(messageToDelete.value)
    toast({
      title: 'Berhasil',
      description: 'Pesan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Gagal menghapus pesan:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal',
      description: 'Gagal menghapus pesan.',
    })
  } finally {
    showDeleteConfirm.value = false
    messageToDelete.value = null
  }
}

const cancelDeleteMessage = () => {
  showDeleteConfirm.value = false
  messageToDelete.value = null
}

// Clear conversation methods
const confirmClearConversation = () => {
  showClearConfirm.value = true
}

const handleClearConversation = async () => {
  try {
    await clearConversationMessages(conversationId.value)
    toast({
      title: 'Berhasil',
      description: 'Semua pesan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Gagal menghapus semua pesan:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal',
      description: 'Gagal menghapus semua pesan.',
    })
  } finally {
    showClearConfirm.value = false
  }
}

const cancelClearConversation = () => {
  showClearConfirm.value = false
}

// Navigation
const goBack = () => router.push('/chat')

// Fix untuk mendapatkan conversation data
const loadConversationData = async () => {
  try {
    // Pertama dapatkan current user
    const user = await getCurrentUser()
    if (!user) {
      console.error('User tidak authenticated')
      router.push('/auth/login')
      return
    }
    currentUser.value = user

    // Cari conversation di state lokal dulu
    let conversationData = conversations.value.find(c => c.id === conversationId.value)
    
    // Jika tidak ada, load semua conversations
    if (!conversationData) {
      await getUserConversations()
      conversationData = conversations.value.find(c => c.id === conversationId.value)
    }
    
    // Jika masih tidak ada, berarti conversation tidak valid
    if (!conversationData) {
      console.error('Conversation tidak ditemukan')
      router.push('/chat')
      return
    }
    
    // Set current conversation
    setCurrentConversation(conversationData)
    
    // Load messages
    await getMessages(conversationId.value)
    await markAsRead(conversationId.value)
    
    // Subscribe to realtime updates
    subscribeToMessages(conversationId.value)
    
    // Scroll to bottom
    await nextTick()
    if (messagesContainer.value) {
      scrollToBottom(messagesContainer.value, false)
    }
    
  } catch (error) {
    console.error('Gagal memuat data chat:', error)
    toast({
      variant: 'destructive',
      title: 'Gagal Memuat Chat',
      description: 'Terjadi kesalahan saat memuat data chat.',
    })
    router.push('/chat')
  }
}

// Watch untuk perubahan messages
watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) scrollToBottom(messagesContainer.value)
}, { deep: true })

// Watch untuk perubahan conversationId (jika user navigasi ke conversation lain)
watch(conversationId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // Unsubscribe dari conversation sebelumnya
    unsubscribeFromMessages()
    // Load data conversation baru
    await loadConversationData()
  }
})

// Lifecycle hooks
onMounted(async () => {
  if (conversationId.value) {
    await loadConversationData()
  } else {
    // Jika tidak ada conversationId, redirect ke halaman chat
    router.push('/chat')
  }
})

onUnmounted(() => {
  unsubscribeFromMessages()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-background">
    <!-- Header -->
    <div class="bg-card shadow-sm border-b">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <Button
            variant="ghost"
            class="flex items-center gap-2"
            @click="goBack"
          >
            <ArrowLeft class="w-5 h-5" />
            <span class="font-medium">Kembali ke Chat</span>
          </Button>
          <div class="flex items-center gap-2 text-foreground">
            <Newspaper class="w-5 h-5" />
            <span class="font-semibold">JuruTani Room Chat</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Chat Content -->
    <div v-if="conversationId && currentConversation" class="flex flex-col h-full">
      <!-- Chat Header -->
      <div class="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <Avatar>
            <AvatarImage :src="partnerInfo?.avatar_url" :alt="partnerInfo?.full_name" />
            <AvatarFallback>
              {{ getAvatarFallback(partnerInfo?.full_name || '') }}
            </AvatarFallback>
          </Avatar>
          <div>
            <p class="font-semibold text-foreground text-lg md:text-xl">
              {{ partnerInfo?.full_name || 'Loading...' }}
            </p>
            <p class="text-xs md:text-sm text-muted-foreground">Online</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <Badge variant="secondary" class="flex items-center gap-1 px-2 py-1">
            <GraduationCap v-if="partnerInfo?.role === 'pakar'" class="h-4 w-4 text-muted-foreground" />
            <Megaphone v-else-if="partnerInfo?.role === 'penyuluh'" class="h-4 w-4 text-muted-foreground" />
            <UserCheck v-else-if="partnerInfo?.role === 'admin'" class="h-4 w-4 text-muted-foreground" />
            <User v-else class="h-4 w-4 text-muted-foreground" />
            <span class="capitalize">{{ partnerInfo?.role || 'user' }}</span>
          </Badge>
          
          <Button
            variant="destructive"
            size="sm"
            :disabled="messages.length === 0 || loading"
            @click="confirmClearConversation"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            Hapus Semua
          </Button>
        </div>
      </div>

      <!-- Messages Container -->
      <div 
        ref="messagesContainer" 
        class="flex-1 overflow-y-auto p-4 bg-background space-y-4"
      >
        <!-- Loading State -->
        <div v-if="loading && messages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-muted-foreground">
            <MessageSquare class="w-12 h-12 mx-auto mb-2 animate-pulse" />
            <p>Memuat pesan...</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-muted-foreground">
            <MessageSquare class="w-12 h-12 mx-auto mb-2" />
            <p>Belum ada pesan</p>
            <p class="text-sm">Mulai percakapan dengan mengirim pesan</p>
          </div>
        </div>

        <!-- Messages -->
        <div v-else v-for="(messagesGroup, date) in groupedMessages" :key="date" class="space-y-3">
          <div class="flex justify-center">
            <Badge variant="outline" class="px-3 py-1 text-sm">
              {{ date }}
            </Badge>
          </div>
          
          <div 
            v-for="message in messagesGroup" 
            :key="message.id"
            :class="[
              'flex items-start gap-2 group',
              isOwnMessage(message, currentUser?.id) ? 'justify-end' : 'justify-start'
            ]"
          >
            <Button
              v-if="isOwnMessage(message, currentUser?.id)"
              variant="ghost"
              size="icon"
              class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              @click="confirmDeleteMessage(message.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>

            <div 
              :class="[
                'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-2xl shadow-sm',
                isOwnMessage(message, currentUser?.id) 
                  ? 'bg-primary text-primary-foreground rounded-br-lg' 
                  : 'bg-muted text-foreground rounded-bl-lg'
              ]"
            >
              <div v-if="message.image_url" class="mb-2">
                <img 
                  :src="message.image_url" 
                  :alt="message.content || 'Gambar'"
                  class="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-border/50"
                  @click="viewImage(message.image_url, message.content || '')"
                >
              </div>
              
              <p v-if="message.content" class="text-sm leading-relaxed whitespace-pre-wrap">{{ message.content }}</p>
              
              <p class="text-xs mt-1 text-right text-muted-foreground/80">
                {{ formatMessageTime(message.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 border-t bg-card mb-16">
        <div class="flex gap-3 items-center">
          <input
            ref="imageInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleImageSelect"
          >
          
          <Button
            variant="ghost"
            size="icon"
            :disabled="uploadingImage"
            @click="triggerImageUpload"
          >
            <Image class="w-5 h-5" />
          </Button>
          
          <Input
            v-model="newMessage"
            placeholder="Ketik pesan..."
            :disabled="loading || uploadingImage"
            class="flex-1"
            autocomplete="off"
            @keypress.enter.prevent="sendMessage"
          />
          
          <Button
            :disabled="(!isValidMessage(newMessage)) || loading || uploadingImage"
            :loading="loading"
            @click="sendMessage"
          >
            <Send class="w-4 h-4 mr-2" />
            Kirim
          </Button>
        </div>
      </div>
    </div>

    <!-- No Conversation Selected -->
    <div v-else class="flex flex-col h-full items-center justify-center">
      <div class="text-center text-muted-foreground">
        <MessageSquare class="w-16 h-16 mx-auto mb-4" />
        <h2 class="text-xl font-semibold mb-2">Memuat Percakapan...</h2>
        <p>Harap tunggu sebentar</p>
      </div>
    </div>

    <!-- Dialogs -->
    <!-- Image Upload Preview Dialog -->
    <Dialog :open="showImagePreview" @update:open="(isOpen) => { if (!isOpen) cancelImagePreview(); }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview Gambar</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div v-if="imagePreview" class="flex justify-center">
            <img 
              :src="imagePreview" 
              alt="Preview"
              class="max-w-full max-h-64 object-contain rounded-lg"
            >
          </div>
          <Textarea
            v-model="imageCaption"
            placeholder="Tambahkan keterangan (opsional)..."
            :rows="3"
          />
        </div>
        <DialogFooter class="gap-2 sm:justify-end">
          <DialogClose as-child>
            <Button type="button" variant="secondary" :disabled="uploadingImage" @click="cancelImagePreview">
              Batal
            </Button>
          </DialogClose>
          <Button :loading="uploadingImage" :disabled="!selectedImage" @click="sendImageMessageChat">
            Kirim Gambar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Image View Dialog -->
    <Dialog :open="showImageViewDialog" @update:open="(isOpen) => { if (!isOpen) closeImageView(); }">
      <DialogContent class="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Preview Gambar</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div v-if="viewImageUrl" class="flex justify-center">
            <img 
              :src="viewImageUrl" 
              alt="Full size preview"
              class="max-w-full max-h-[60vh] object-contain rounded-lg"
            >
          </div>
          <div v-if="viewImageCaption" class="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p class="whitespace-pre-wrap">{{ viewImageCaption }}</p>
          </div>
        </div>
        <DialogFooter class="gap-2 sm:justify-end">
          <Button variant="outline" @click="downloadImage">
            <Download class="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" @click="openImageInNewTab">
            <ExternalLink class="w-4 h-4 mr-2" />
            Buka di Tab Baru
          </Button>
          <DialogClose as-child>
            <Button type="button" variant="secondary" @click="closeImageView">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <!-- Delete Message Dialog -->
    <Dialog :open="showDeleteConfirm" @update:open="(isOpen) => { if (!isOpen) cancelDeleteMessage(); }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Pesan</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:justify-end">
          <DialogClose as-child>
            <Button type="button" variant="secondary" @click="cancelDeleteMessage">
              Batal
            </Button>
          </DialogClose>
          <Button variant="destructive" @click="handleDeleteMessage">
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <!-- Clear All Messages Dialog -->
    <Dialog :open="showClearConfirm" @update:open="(isOpen) => { if (!isOpen) cancelClearConversation(); }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Semua Pesan</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus semua pesan dalam percakapan ini? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:justify-end">
          <DialogClose as-child>
            <Button type="button" variant="secondary" @click="cancelClearConversation">
              Batal
            </Button>
          </DialogClose>
          <Button variant="destructive" :loading="loading" @click="handleClearConversation">
            Hapus Semua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
