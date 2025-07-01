// composables/useChatUtils.ts
import type { Message, Conversation } from './useChat'

export const useChatUtils = () => {
  
  // Format waktu untuk message
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Jika hari ini
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    // Jika kemarin
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate()) {
      return 'Kemarin'
    }
    
    // Jika minggu ini
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('id-ID', { weekday: 'short' })
    }
    
    // Jika lebih dari seminggu
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Format waktu untuk conversation list (last message)
  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Jika dalam 1 menit
    if (diff < 60 * 1000) {
      return 'Baru saja'
    }
    
    // Jika dalam 1 jam
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}m`
    }
    
    // Jika hari ini
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    // Jika kemarin
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate()) {
      return 'Kemarin'
    }
    
    // Jika minggu ini
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('id-ID', { weekday: 'short' })
    }
    
    // Jika lebih dari seminggu
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Truncate message untuk preview
  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength).trim() + '...'
  }

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at)
      const dateKey = date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    
    return groups
  }

  // Check if message is from current user
  const isOwnMessage = (message: Message, currentUserId: string) => {
    return message.sender_id === currentUserId
  }

  // Get conversation partner
  const getConversationPartner = (conversation: Conversation, currentUserId: string) => {
    return conversation.participant1_id === currentUserId 
      ? conversation.participant2 
      : conversation.participant1
  }

  // Count unread messages in conversation
  const countUnreadMessages = (messages: Message[], currentUserId: string) => {
    return messages.filter(msg => 
      !msg.is_read && msg.sender_id !== currentUserId
    ).length
  }

  // Get avatar fallback (first letter of full_name)
  const getAvatarFallback = (full_name: string) => {
    return full_name ? full_name.charAt(0).toUpperCase() : '?'
  }

  // Validate message content (updated to match useChat validation)
  const isValidMessage = (content: string, hasImage: boolean = false) => {
    // Allow empty content if there's an image
    if (hasImage) return true
    return content && content.trim().length > 0 && content.trim().length <= 1000
  }

  // Get conversation title
  const getConversationTitle = (conversation: Conversation, currentUserId: string) => {
    const partner = getConversationPartner(conversation, currentUserId)
    return partner?.full_name || 'Unknown User'
  }

  // Scroll to bottom helper
  const scrollToBottom = (element: HTMLElement, smooth: boolean = true) => {
    if (!element) return
    
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }

  // NEW UTILITIES TO COMPLEMENT useChat

  // Check if image file is valid (mirrors useChat validation)
  const isValidImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize
  }

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get message status text
  const getMessageStatus = (message: Message, currentUserId: string) => {
    if (message.sender_id !== currentUserId) return null
    
    return message.is_read ? 'Dibaca' : 'Terkirim'
  }

  // Check if conversation has unread messages
  const hasUnreadMessages = (conversation: Conversation, messages: Message[], currentUserId: string) => {
    const conversationMessages = messages.filter(m => m.conversation_id === conversation.id)
    return countUnreadMessages(conversationMessages, currentUserId) > 0
  }

  // Get last message preview for conversation
  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.last_message) return 'Belum ada pesan'
    
    // Handle image messages
    if (conversation.last_message === '📷 Image') {
      return '📷 Gambar'
    }
    
    return truncateMessage(conversation.last_message, 30)
  }

  // Check if message has image
  const hasImage = (message: Message): boolean => {
    return Boolean(message.image_url)
  }

  // Extract image filename from URL
  const getImageFilename = (imageUrl: string): string => {
    try {
      const url = new URL(imageUrl)
      const pathname = url.pathname
      return pathname.split('/').pop() || 'image'
    } catch {
      return 'image'
    }
  }

  // Check if two messages are from same sender and close in time
  const shouldGroupMessage = (currentMessage: Message, previousMessage: Message | null): boolean => {
    if (!previousMessage) return false
    
    const isSameSender = currentMessage.sender_id === previousMessage.sender_id
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime()
    const isCloseInTime = timeDiff < 5 * 60 * 1000 // 5 minutes
    
    return isSameSender && isCloseInTime
  }

  // Get conversation summary
  const getConversationSummary = (conversation: Conversation, currentUserId: string) => {
    const partner = getConversationPartner(conversation, currentUserId)
    
    return {
      id: conversation.id,
      title: partner?.full_name || 'Unknown User',
      avatar: partner?.avatar_url,
      avatarFallback: getAvatarFallback(partner?.full_name || ''),
      lastMessage: getLastMessagePreview(conversation),
      lastMessageTime: conversation.last_message_at ? formatLastMessageTime(conversation.last_message_at) : '',
      partnerRole: partner?.role,
      isOnline: false // You can implement online status if needed
    }
  }

  // Search messages
  const searchMessages = (messages: Message[], query: string): Message[] => {
    if (!query.trim()) return messages
    
    const searchTerm = query.toLowerCase().trim()
    return messages.filter(message => 
      message.content.toLowerCase().includes(searchTerm) ||
      message.sender?.full_name?.toLowerCase().includes(searchTerm)
    )
  }

  // Filter conversations
  const filterConversations = (conversations: Conversation[], query: string, currentUserId: string): Conversation[] => {
    if (!query.trim()) return conversations
    
    const searchTerm = query.toLowerCase().trim()
    return conversations.filter(conversation => {
      const partner = getConversationPartner(conversation, currentUserId)
      return (
        partner?.full_name?.toLowerCase().includes(searchTerm) ||
        conversation.last_message?.toLowerCase().includes(searchTerm)
      )
    })
  }

  // Sort conversations by last message time
  const sortConversationsByLastMessage = (conversations: Conversation[]): Conversation[] => {
    return [...conversations].sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return timeB - timeA
    })
  }

  // Debounce function for search
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(null, args), wait)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    }
  }

  // Generate unique ID (for temporary messages)
  const generateTempId = (): string => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    // Original utilities
    formatMessageTime,
    formatLastMessageTime,
    truncateMessage,
    groupMessagesByDate,
    isOwnMessage,
    getConversationPartner,
    countUnreadMessages,
    getAvatarFallback,
    isValidMessage,
    getConversationTitle,
    scrollToBottom,
    
    // Enhanced utilities
    isValidImageFile,
    formatFileSize,
    getMessageStatus,
    hasUnreadMessages,
    getLastMessagePreview,
    hasImage,
    getImageFilename,
    shouldGroupMessage,
    getConversationSummary,
    searchMessages,
    filterConversations,
    sortConversationsByLastMessage,
    debounce,
    copyToClipboard,
    generateTempId
  }
}