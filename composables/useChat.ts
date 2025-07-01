// composables/useChat.ts
import { ref, computed, readonly, onUnmounted } from 'vue'
import { useToast } from '@/components/ui/toast'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  image_url?: string
  created_at: string
  is_read: boolean
  sender?: {
    id: string
    full_name: string
    avatar_url?: string
    role?: string
  }
}

export interface Conversation {
  id: string
  participant1_id: string
  participant2_id: string
  last_message?: string
  last_message_at?: string
  created_at: string
  updated_at: string
  participant1?: {
    id: string
    full_name: string
    avatar_url?: string
    role?: string
  }
  participant2?: {
    id: string
    full_name: string
    avatar_url?: string
    role?: string
  }
}

interface ChatState {
  messages: Message[]
  conversations: Conversation[]
  currentConversation: Conversation | null
  loading: boolean
  uploadingImage: boolean
  error: string | null
}

const chatState = ref<ChatState>({
  messages: [],
  conversations: [],
  currentConversation: null,
  loading: false,
  uploadingImage: false,
  error: null
})

let messageSubscription: any = null

export const useChat = () => {
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  // Computed properties
  const messages = computed(() => chatState.value.messages)
  const conversations = computed(() => chatState.value.conversations)
  const currentConversation = computed(() => chatState.value.currentConversation)
  const loading = computed(() => chatState.value.loading)
  const uploadingImage = computed(() => chatState.value.uploadingImage)
  const error = computed(() => chatState.value.error)

  // Clear error helper
  const clearError = () => {
    chatState.value.error = null
  }

  // Get current user
  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (err) {
      console.error('Error getting current user:', err)
      return null
    }
  }

  // Compress image function
  const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Cannot get canvas context'))
        return
      }

      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            'image/jpeg',
            quality
          )
        } catch (err) {
          reject(err)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    try {
      chatState.value.uploadingImage = true
      clearError()
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Compress image before upload
      const compressedFile = await compressImage(file)

      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`
      
      const { data, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, compressedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Upload Gagal',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    } finally {
      chatState.value.uploadingImage = false
    }
  }

  // Get atau create conversation antara 2 user
  const getOrCreateConversation = async (otherUserId: string) => {
    try {
      chatState.value.loading = true
      clearError()
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Cek apakah conversation sudah ada
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url, role),
          participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url, role)
        `)
        .or(`and(participant1_id.eq.${currentUser.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${currentUser.id})`)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingConversation) {
        chatState.value.currentConversation = existingConversation
        return existingConversation
      }

      // Buat conversation baru
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: currentUser.id,
          participant2_id: otherUserId
        })
        .select(`
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url, role),
          participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url, role)
        `)
        .single()

      if (createError) throw createError

      chatState.value.currentConversation = newConversation
      return newConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get conversation'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Conversation Gagal',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    } finally {
      chatState.value.loading = false
    }
  }

  // Get semua conversations untuk user
  const getUserConversations = async () => {
    try {
      chatState.value.loading = true
      clearError()
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url, role),
          participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url, role)
        `)
        .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      chatState.value.conversations = data || []
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gagal Memuat Percakapan',
        description: errorMessage,
        variant: 'destructive'
      })
      
      return []
    } finally {
      chatState.value.loading = false
    }
  }

  // Get messages dalam conversation
  const getMessages = async (conversationId: string) => {
    try {
      chatState.value.loading = true
      clearError()
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      chatState.value.messages = data || []
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gagal Memuat Pesan',
        description: errorMessage,
        variant: 'destructive'
      })
      
      return []
    } finally {
      chatState.value.loading = false
    }
  }

  // Kirim message
  const sendMessage = async (conversationId: string, content: string, imageFile?: File) => {
    try {
      clearError()
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      if (!content.trim() && !imageFile) {
        throw new Error('Message content or image is required')
      }

      let imageUrl = null
      if (imageFile) {
        if (!isValidImageFile(imageFile)) {
          throw new Error('Invalid image file. Please select a valid image (JPEG, PNG, GIF, WebP) under 10MB.')
        }
        imageUrl = await uploadImage(imageFile)
      }

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: content.trim(),
          image_url: imageUrl,
          is_read: false
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)
        `)
        .single()

      if (sendError) throw sendError

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({
          last_message: content.trim() || (imageUrl ? '📷 Image' : ''),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Pesan Gagal Dikirim',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    }
  }

  // Send image message with caption
  const sendImageMessage = async (conversationId: string, imageFile: File, caption?: string) => {
    try {
      clearError()
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      if (!isValidImageFile(imageFile)) {
        throw new Error('Invalid image file. Please select a valid image (JPEG, PNG, GIF, WebP) under 10MB.')
      }

      // Upload image first
      const imageUrl = await uploadImage(imageFile)

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: caption?.trim() || '',
          image_url: imageUrl,
          is_read: false
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)
        `)
        .single()

      if (sendError) throw sendError

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({
          last_message: caption?.trim() || '📷 Image',
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send image'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gambar Gagal Dikirim',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    }
  }

  // Delete conversation (enhanced with image cleanup)
  const deleteConversation = async (conversationId: string) => {
    try {
      chatState.value.loading = true
      clearError()
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Verify user has permission to delete this conversation
      const { data: conversation, error: conversationCheckError } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

      if (conversationCheckError) throw conversationCheckError
      if (!conversation) throw new Error('Conversation not found')

      const isParticipant = conversation.participant1_id === currentUser.id || 
                           conversation.participant2_id === currentUser.id
      
      if (!isParticipant) {
        throw new Error('You do not have permission to delete this conversation')
      }

      // Get all messages with images for cleanup
      const { data: messagesWithImages, error: messagesQueryError } = await supabase
        .from('messages')
        .select('image_url')
        .eq('conversation_id', conversationId)
        .not('image_url', 'is', null)

      if (messagesQueryError) {
        console.warn('Failed to fetch messages with images:', messagesQueryError)
      }

      // Delete messages first (child records)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (messagesError) throw messagesError

      // Then delete the conversation (parent record)
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)

      if (conversationError) throw conversationError

      // Clean up images from storage (do this after DB operations succeed)
      if (messagesWithImages && messagesWithImages.length > 0) {
        const imageCleanupPromises = messagesWithImages
          .map(msg => msg.image_url)
          .filter(Boolean)
          .map(async (imageUrl) => {
            try {
              // Extract file path from public URL
              const urlParts = imageUrl.split('/chat-images/')
              if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0] // Remove query parameters if any
                const { error: storageError } = await supabase.storage
                  .from('chat-images')
                  .remove([filePath])
                
                if (storageError) {
                  console.warn(`Failed to delete image ${filePath}:`, storageError)
                }
              }
            } catch (imgError) {
              console.warn('Failed to delete image:', imgError)
            }
          })

        // Run all image deletions in parallel, but don't wait for them to complete
        Promise.allSettled(imageCleanupPromises).then((results) => {
          const failures = results.filter(result => result.status === 'rejected')
          if (failures.length > 0) {
            console.warn(`Failed to delete ${failures.length} images from storage`)
          }
        })
      }

      // Update local state
      chatState.value.conversations = chatState.value.conversations.filter(c => c.id !== conversationId)
      
      // Clear current conversation if it was the deleted one
      if (chatState.value.currentConversation?.id === conversationId) {
        chatState.value.currentConversation = null
        chatState.value.messages = []
      }

      toast({
        title: 'Percakapan Dihapus',
        description: 'Percakapan berhasil dihapus',
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gagal Menghapus Percakapan',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    } finally {
      chatState.value.loading = false
    }
  }

  // Delete single message (enhanced with image cleanup)
  const deleteMessage = async (messageId: string) => {
    try {
      clearError()
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // First get the message to check if it has an image and verify ownership
      const { data: messageToDelete, error: fetchError } = await supabase
        .from('messages')
        .select('image_url')
        .eq('id', messageId)
        .eq('sender_id', currentUser.id)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!messageToDelete) {
        throw new Error('Message not found or you do not have permission to delete it')
      }

      // Delete image from storage if exists
      if (messageToDelete.image_url) {
        try {
          const urlParts = messageToDelete.image_url.split('/chat-images/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1].split('?')[0]
            await supabase.storage.from('chat-images').remove([filePath])
          }
        } catch (imgError) {
          console.warn('Failed to delete image:', imgError)
        }
      }

      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUser.id)

      if (deleteError) throw deleteError

      // Remove from local state
      chatState.value.messages = chatState.value.messages.filter(m => m.id !== messageId)

      toast({
        title: 'Pesan Dihapus',
        description: 'Pesan berhasil dihapus',
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gagal Menghapus Pesan',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    }
  }

  // Clear all messages in a conversation (keep conversation)
  const clearConversationMessages = async (conversationId: string) => {
    try {
      chatState.value.loading = true
      clearError()
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Get all messages with images to delete from storage
      const { data: messagesWithImages } = await supabase
        .from('messages')
        .select('image_url')
        .eq('conversation_id', conversationId)
        .not('image_url', 'is', null)

      // Delete images from storage
      if (messagesWithImages && messagesWithImages.length > 0) {
        const imageUrls = messagesWithImages.map(msg => msg.image_url).filter(Boolean)
        for (const imageUrl of imageUrls) {
          try {
            const urlParts = imageUrl.split('/chat-images/')
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split('?')[0]
              await supabase.storage.from('chat-images').remove([filePath])
            }
          } catch (imgError) {
            console.warn('Failed to delete image:', imgError)
          }
        }
      }

      // Delete all messages
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (deleteError) throw deleteError

      // Update conversation to clear last message
      await supabase
        .from('conversations')
        .update({
          last_message: null,
          last_message_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      // Clear local messages
      chatState.value.messages = []

      toast({
        title: 'Pesan Dibersihkan',
        description: 'Semua pesan berhasil dihapus',
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear messages'
      chatState.value.error = errorMessage
      
      toast({
        title: 'Gagal Membersihkan Pesan',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw new Error(errorMessage)
    } finally {
      chatState.value.loading = false
    }
  }

  // Mark messages as read
  const markAsRead = async (conversationId: string) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false)
    } catch (err) {
      console.error('Failed to mark messages as read:', err)
    }
  }

  // Subscribe ke realtime messages
  const subscribeToMessages = (conversationId: string) => {
    if (messageSubscription) {
      messageSubscription.unsubscribe()
    }

    messageSubscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch message dengan sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            chatState.value.messages.push(data)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          chatState.value.messages = chatState.value.messages.filter(m => m.id !== payload.old.id)
        }
      )
      .subscribe()
  }

  // Unsubscribe dari realtime
  const unsubscribeFromMessages = () => {
    if (messageSubscription) {
      messageSubscription.unsubscribe()
      messageSubscription = null
    }
  }

  // Get other participant dalam conversation
  const getOtherParticipant = async () => {
    if (!chatState.value.currentConversation) return null

    const currentUser = await getCurrentUser()
    if (!currentUser) return null

    const conv = chatState.value.currentConversation
    return conv.participant1_id === currentUser.id 
      ? conv.participant2 
      : conv.participant1
  }

  // Get unread message count for a conversation
  const getUnreadCount = computed(() => {
    return async (conversationId: string) => {
      const currentUser = await getCurrentUser()
      if (!currentUser) return 0

      return chatState.value.messages.filter(m => 
        m.conversation_id === conversationId && 
        !m.is_read && 
        m.sender_id !== currentUser.id
      ).length
    }
  })

  // Check if file is valid image
  const isValidImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize
  }

  // Set current conversation
  const setCurrentConversation = (conversation: Conversation | null) => {
    chatState.value.currentConversation = conversation
  }

  // Clear messages
  const clearMessages = () => {
    chatState.value.messages = []
  }

  // Cleanup
  onUnmounted(() => {
    unsubscribeFromMessages()
  })

  return {
    // State (readonly)
    messages: readonly(messages),
    conversations: readonly(conversations),
    currentConversation: readonly(currentConversation),
    loading: readonly(loading),
    uploadingImage: readonly(uploadingImage),
    error: readonly(error),

    // Methods
    getOrCreateConversation,
    getUserConversations,
    getMessages,
    sendMessage,
    sendImageMessage,
    uploadImage,
    compressImage,
    deleteConversation,
    deleteMessage,
    clearConversationMessages,
    markAsRead,
    subscribeToMessages,
    unsubscribeFromMessages,
    getOtherParticipant,
    getCurrentUser,
    isValidImageFile,
    setCurrentConversation,
    clearMessages,
    clearError,

    // Computed
    getUnreadCount
  }
}