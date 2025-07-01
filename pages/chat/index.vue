<!-- pages/chat/index.vue - Clean shadcn/ui Version -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, ArrowLeft, MessageCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'

// Composables
const router = useRouter()
const { toast } = useToast()

const { 
  conversations, 
  getUserConversations, 
  getOrCreateConversation,
  getCurrentUser,
  deleteConversation,
  loading 
} = useChat()

const { 
  formatLastMessageTime, 
  truncateMessage, 
  getConversationPartner,
  getAvatarFallback 
} = useChatUtils()

const { searchConversations, searchUsers: searchUsersUtil } = useChatSearch()

// Reactive data
const searchQuery = ref('')
const showNewChat = ref(false)
const userSearchQuery = ref('')
const searchResults = ref([])
const searchingUsers = ref(false)
const currentUser = ref(null)
const deletingConversationId = ref(null)

// Computed properties
const filteredConversations = computed(() => {
  if (!currentUser.value || !conversations.value) return []
  
  if (!searchQuery.value.trim()) {
    return conversations.value
  }
  
  return searchConversations(conversations.value, searchQuery.value.trim(), currentUser.value.id)
})

// Methods
const getPartner = (conversation) => {
  if (!currentUser.value) return null
  return getConversationPartner(conversation, currentUser.value.id)
}

const openChat = (conversationId: string) => {
  router.push(`/chat/${conversationId}`)
}

const handleNewChat = () => {
  showNewChat.value = true
}

const startChat = async (userId: string) => {
  try {
    const conversation = await getOrCreateConversation(userId)
    showNewChat.value = false
    userSearchQuery.value = ''
    searchResults.value = []
    
    toast({
      title: 'Berhasil',
      description: 'Chat baru telah dibuat',
    })
    
    router.push(`/chat/${conversation.id}`)
  } catch (error) {
    console.error('Failed to start chat:', error)
    toast({
      title: 'Error',
      description: 'Gagal membuat chat baru',
      variant: 'destructive',
    })
  }
}

const handleClearSearch = () => {
  searchQuery.value = ''
}

const updateSearchQuery = (value: string) => {
  searchQuery.value = value
}

// Handle delete conversation
const handleDeleteConversation = async (conversationId: string) => {
  try {
    deletingConversationId.value = conversationId
    
    await deleteConversation(conversationId)
    
    toast({
      title: 'Berhasil',
      description: 'Percakapan berhasil dihapus',
    })
    
    await getUserConversations()
  } catch (error) {
    console.error('Failed to delete conversation:', error)
    toast({
      title: 'Error',
      description: 'Gagal menghapus percakapan',
      variant: 'destructive',
    })
  } finally {
    deletingConversationId.value = null
  }
}

// Search users for new chat
const searchUsers = async (query: string) => {
  if (!query.trim()) {
    searchResults.value = []
    return
  }
  
  try {
    searchingUsers.value = true
    searchResults.value = await searchUsersUtil(query.trim())
  } catch (error) {
    console.error('Failed to search users:', error)
    toast({
      title: 'Error',
      description: 'Gagal mencari pengguna',
      variant: 'destructive',
    })
    searchResults.value = []
  } finally {
    searchingUsers.value = false
  }
}

// Watch for user search query changes
watch(userSearchQuery, (newQuery) => {
  searchUsers(newQuery)
}, { debounce: 500 })

// Lifecycle
onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()
    await getUserConversations()
  } catch (error) {
    console.error('Failed to load conversations:', error)
    toast({
      title: 'Error',
      description: 'Gagal memuat conversation',
      variant: 'destructive',
    })
  }
})

// Meta
useHead({
  title: 'Chat - Konsultasi',
  meta: [
    { name: 'description', content: 'Konsultasi langsung dengan ahli dan penyuluh terpercaya' }
  ]
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Header -->
    <Card class="rounded-none border-l-0 border-r-0 border-t-0">
      <CardContent class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            @click="router.push('/discussions')"
            aria-label="Kembali"
          >
            <ArrowLeft class="h-4 w-4" />
          </Button>
          <div>
            <h1 class="text-lg font-semibold">Chat</h1>
            <p class="text-sm text-muted-foreground">Konsultasi dengan ahli</p>
          </div>
        </div>
        
        <Button @click="handleNewChat">
          <Plus class="w-4 h-4 mr-2" />
          Chat Baru
        </Button>
      </CardContent>
    </Card>

    <!-- Search -->
    <Card class="rounded-none border-l-0 border-r-0 border-t-0">
      <CardContent class="p-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            :model-value="searchQuery"
            placeholder="Cari conversation..."
            class="pl-10"
            @update:model-value="updateSearchQuery"
          />
        </div>
        
        <div v-if="searchQuery.trim()" class="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{{ filteredConversations.length }} conversation ditemukan</span>
          <Button variant="ghost" size="sm" @click="handleClearSearch">
            Bersihkan
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-muted-foreground">Memuat conversations...</p>
      </div>
    </div>

    <!-- Conversation List -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="divide-y">
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
          @click="openChat(conversation.id)"
        >
          <div class="flex items-center gap-3">
            <Avatar>
              <AvatarImage 
                :src="getPartner(conversation)?.avatar_url" 
                :alt="getPartner(conversation)?.full_name" 
              />
              <AvatarFallback>
                {{ getAvatarFallback(getPartner(conversation)?.full_name || '') }}
              </AvatarFallback>
            </Avatar>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="font-medium truncate">
                  {{ getPartner(conversation)?.full_name }}
                </p>
                <Badge 
                  v-if="getPartner(conversation)?.role === 'pakar'"
                  variant="secondary"
                  class="text-xs"
                >
                  Pakar
                </Badge>
                <Badge 
                  v-else-if="getPartner(conversation)?.role === 'penyuluh'"
                  variant="secondary"
                  class="text-xs"
                >
                  Penyuluh
                </Badge>
                <Badge 
                  v-else-if="getPartner(conversation)?.role === 'admin'"
                  variant="secondary"
                  class="text-xs"
                >
                  Admin
                </Badge>
              </div>
              
              <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground truncate">
                  {{ truncateMessage(conversation.last_message || 'Belum ada pesan', 50) }}
                </p>
                <span class="text-xs text-muted-foreground ml-2">
                  {{ formatLastMessageTime(conversation.last_message_at) }}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              class="text-destructive hover:text-destructive"
              :disabled="deletingConversationId === conversation.id"
              @click.stop="handleDeleteConversation(conversation.id)"
            >
              {{ deletingConversationId === conversation.id ? 'Menghapus...' : 'Hapus' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && filteredConversations.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <MessageCircle class="w-12 h-12 mb-4 text-muted-foreground" />
        <h3 class="text-lg font-semibold mb-2">Belum ada percakapan</h3>
        <p class="text-muted-foreground mb-4">Mulai chat baru untuk berkonsultasi</p>
        <Button @click="handleNewChat">
          <Plus class="w-4 h-4 mr-2" />
          Mulai Chat
        </Button>
      </div>
    </div>

    <!-- New Chat Modal -->
    <Dialog v-model:open="showNewChat">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mulai Chat Baru</DialogTitle>
        </DialogHeader>

        <div class="space-y-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              v-model="userSearchQuery"
              placeholder="Cari pengguna..."
              class="pl-10"
            />
          </div>

          <Separator />

          <!-- Search Results -->
          <div class="max-h-64 overflow-y-auto space-y-2">
            <!-- Loading -->
            <div v-if="searchingUsers" class="text-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p class="text-sm text-muted-foreground">Mencari pengguna...</p>
            </div>

            <!-- Results -->
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
              @click="startChat(user.id)"
            >
              <Avatar>
                <AvatarImage :src="user.avatar_url" :alt="user.full_name" />
                <AvatarFallback>
                  {{ getAvatarFallback(user.full_name) }}
                </AvatarFallback>
              </Avatar>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="font-medium truncate">{{ user.full_name }}</p>
                  <Badge 
                    v-if="user.role === 'pakar'"
                    variant="secondary"
                    class="text-xs"
                  >
                    Pakar
                  </Badge>
                  <Badge 
                    v-else-if="user.role === 'penyuluh'"
                    variant="secondary"
                    class="text-xs"
                  >
                    Penyuluh
                  </Badge>
                  <Badge 
                    v-else-if="user.role === 'admin'"
                    variant="secondary"
                    class="text-xs"
                  >
                    Admin
                  </Badge>
                  <Badge 
                    v-else
                    variant="outline"
                    class="text-xs"
                  >
                    Petani
                  </Badge>
                </div>
                <p class="text-sm text-muted-foreground truncate">{{ user.email }}</p>
              </div>
            </div>

            <!-- No Results -->
            <div v-if="userSearchQuery && !searchingUsers && searchResults.length === 0" 
                 class="text-center py-8">
              <MessageCircle class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p class="font-medium">Tidak ada pengguna ditemukan</p>
              <p class="text-sm text-muted-foreground">Coba kata kunci yang berbeda</p>
            </div>

            <!-- Initial State -->
            <div v-if="!userSearchQuery" class="text-center py-8">
              <Search class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p class="font-medium">Cari Pengguna</p>
              <p class="text-sm text-muted-foreground">Masukkan nama, email, atau role</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>