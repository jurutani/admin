
<script setup lang="ts">
// Hapus impor toastStore
// import { toastStore } from '~/composables/useJuruTaniToast' 

// Tambahkan impor dan penggunaan useToast dari Shadcn
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
  User, 
  Trash2, 
  MessageSquare, 
  X, 
  Image, 
  Send 
} from 'lucide-vue-next'


const router = useRouter()
const route = useRoute()
const { toast } = useToast() // Inisialisasi composable toast

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
  isValidImageFile
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

// ... (Reactive states tetap sama)
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


const conversationId = computed(() => route.params.id as string)
// ... (Computed properties lainnya tetap sama)
const groupedMessages = computed(() => groupMessagesByDate(messages.value))
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
    // Ganti dengan toast Shadcn
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
    // Ganti dengan toast Shadcn
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
    
    // Ganti dengan toast Shadcn
    toast({
      title: 'Berhasil',
      description: 'Gambar berhasil dikirim.',
    })
  } catch (error) {
    console.error('Gagal mengirim gambar:', error)
    // Ganti dengan toast Shadcn
    toast({
      variant: 'destructive',
      title: 'Gagal Mengirim Gambar',
      description: 'Terjadi kesalahan. Silakan coba lagi nanti.',
    })
  }
}

// ... (resetImageState dan cancelImagePreview tetap sama)
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


// Message deletion methods
const confirmDeleteMessage = (messageId: string) => {
  messageToDelete.value = messageId
  showDeleteConfirm.value = true
}

const handleDeleteMessage = async () => {
  if (!messageToDelete.value) return
  
  try {
    await deleteMessage(messageToDelete.value)
    // Ganti dengan toast Shadcn
    toast({
      title: 'Berhasil',
      description: 'Pesan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Gagal menghapus pesan:', error)
    // Ganti dengan toast Shadcn
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
    // Ganti dengan toast Shadcn
    toast({
      title: 'Berhasil',
      description: 'Semua pesan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Gagal menghapus semua pesan:', error)
    // Ganti dengan toast Shadcn
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

// ... (goBack, watch, onMounted, onUnmounted tetap sama)
const goBack = () => router.push('/chat')

watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) scrollToBottom(messagesContainer.value)
}, { deep: true })

onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()
    if (conversationId.value) {
      await getMessages(conversationId.value)
      await markAsRead(conversationId.value)
      subscribeToMessages(conversationId.value)
      let conversationData = currentConversation.value
      if (!conversationData || conversationData.id !== conversationId.value) {
        conversationData = conversations.value.find(c => c.id === conversationId.value)
        if (!conversationData) {
          await getUserConversations()
          conversationData = conversations.value.find(c => c.id === conversationId.value)
        }
        if (conversationData) {
          currentConversation.value = conversationData
        }
      }
      await nextTick()
      if (messagesContainer.value) {
        scrollToBottom(messagesContainer.value, false)
      }
    } else {
      await getUserConversations()
    }
  } catch (error) {
    console.error('Gagal memuat data chat:', error)
    if (conversationId.value) router.push('/chat')
  }
})

onUnmounted(() => {
  unsubscribeFromMessages()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-background">
    <div class="bg-card shadow-sm border-b">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <Button
            variant="ghost"
            class="flex items-center gap-2"
            @click="goBack"
          >
            <ArrowLeft class="w-5 h-5" />
            <span class="font-medium">Kembali ke Room Chat</span>
          </Button>
          <div class="flex items-center gap-2 text-foreground">
            <Newspaper class="w-5 h-5" />
            <span class="font-semibold">JuruTani Room Chat</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="conversationId" class="flex flex-col h-full">
      <div class="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage :src="partnerInfo?.avatar_url" :alt="partnerInfo?.full_name" />
            <AvatarFallback>
              {{ getAvatarFallback(partnerInfo?.full_name || '') }}
            </AvatarFallback>
          </Avatar>
          <div>
            <p class="font-semibold text-foreground text-lg md:text-xl">{{ partnerInfo?.full_name }}</p>
            <p class="text-xs md:text-sm text-muted-foreground">Online</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex flex-col items-center gap-1">
            <GraduationCap v-if="partnerInfo?.role === 'pakar'" class="w-5 h-5 text-muted-foreground" />
            <Megaphone v-else-if="partnerInfo?.role === 'penyuluh'" class="w-5 h-5 text-muted-foreground" />
            <User v-else class="w-5 h-5 text-muted-foreground" />
            <Badge variant="secondary" size="sm">{{ partnerInfo?.role }}</Badge>
          </div>
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

      <div 
        ref="messagesContainer" 
        class="flex-1 overflow-y-auto p-4 bg-background space-y-4"
      >
        <div v-if="messages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-muted-foreground">
            <MessageSquare class="w-12 h-12 mx-auto mb-2" />
            <p>Belum ada pesan</p>
            <p class="text-sm">Mulai percakapan dengan mengirim pesan</p>
          </div>
        </div>

        <div v-for="(messagesGroup, date) in groupedMessages" :key="date" class="space-y-3">
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
                  class="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  @click="() => window.open(message.image_url, '_blank')"
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

    <div v-else class="flex flex-col h-full items-center justify-center">
      <div class="text-center text-muted-foreground">
        <MessageSquare class="w-16 h-16 mx-auto mb-4" />
        <h2 class="text-xl font-semibold mb-2">Belum ada Percakapan</h2>
        <p>Pilih percakapan dari daftar untuk mulai chat</p>
      </div>
    </div>
  </div>
</template>