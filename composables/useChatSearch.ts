import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'

interface SearchUser {
  id: string
  full_name?: string
  avatar_url?: string
  role?: string
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

interface Conversation {
  id: string
  participant1_id: string
  participant2_id: string
  participant1?: SearchUser
  participant2?: SearchUser
  last_message?: string
  updated_at: string
}

interface SearchState {
  loading: boolean
  searchQuery: string
  searchResults: SearchUser[]
  filteredConversations: Conversation[]
  filteredMessages: Message[]
}

const searchState = ref<SearchState>({
  loading: false,
  searchQuery: '',
  searchResults: [],
  filteredConversations: [],
  filteredMessages: []
})

export const useChatSearch = () => {
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  // Computed properties
  const loading = computed(() => searchState.value.loading)
  const searchQuery = computed(() => searchState.value.searchQuery)
  const searchResults = computed(() => searchState.value.searchResults)
  const filteredConversations = computed(() => searchState.value.filteredConversations)
  const filteredMessages = computed(() => searchState.value.filteredMessages)
  const hasSearchQuery = computed(() => searchState.value.searchQuery.trim().length > 0)

  // Set search query
  const setSearchQuery = (query: string) => {
    searchState.value.searchQuery = query
  }

  // Clear search
  const clearSearch = () => {
    searchState.value.searchQuery = ''
    searchState.value.searchResults = []
    searchState.value.filteredConversations = []
    searchState.value.filteredMessages = []
  }

  // Search users
  const searchUsers = async (query?: string, excludeUserId?: string) => {
    const searchTerm = query || searchState.value.searchQuery
    
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        searchState.value.searchResults = []
        return []
      }

      searchState.value.loading = true

      let searchQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .ilike('full_name', `%${searchTerm.trim()}%`)
        .limit(10)

      if (excludeUserId) {
        searchQuery = searchQuery.neq('id', excludeUserId)
      }

      const { data, error } = await searchQuery

      if (error) {
        console.error('Error searching users:', error)
        toast({
          title: 'Pencarian Gagal',
          description: 'Terjadi kesalahan saat mencari pengguna',
          variant: 'destructive',
        })
        return []
      }

      const results = data || []
      searchState.value.searchResults = results
      return results

    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: 'Pencarian Gagal',
        description: 'Terjadi kesalahan sistem saat mencari pengguna',
        variant: 'destructive',
      })
      return []
    } finally {
      searchState.value.loading = false
    }
  }

  // Search conversations
  const searchConversations = (conversations: Conversation[], query?: string, currentUserId?: string) => {
    const searchTerm = query || searchState.value.searchQuery
    
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        searchState.value.filteredConversations = conversations
        return conversations
      }

      const searchTermLower = searchTerm.toLowerCase().trim()

      const filtered = conversations.filter(conversation => {
        const partner = conversation.participant1_id === currentUserId 
          ? conversation.participant2 
          : conversation.participant1

        const partnerName = partner?.full_name?.toLowerCase() || ''
        const lastMessage = conversation.last_message?.toLowerCase() || ''

        return partnerName.includes(searchTermLower) || lastMessage.includes(searchTermLower)
      })

      searchState.value.filteredConversations = filtered
      return filtered

    } catch (error) {
      console.error('Error filtering conversations:', error)
      toast({
        title: 'Filter Gagal',
        description: 'Terjadi kesalahan saat memfilter percakapan',
        variant: 'destructive',
      })
      return conversations
    }
  }

  // Search messages
  const searchMessages = (messages: Message[], query?: string) => {
    const searchTerm = query || searchState.value.searchQuery
    
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        searchState.value.filteredMessages = messages
        return messages
      }

      const searchTermLower = searchTerm.toLowerCase().trim()

      const filtered = messages.filter(message => 
        message.content.toLowerCase().includes(searchTermLower)
      )

      searchState.value.filteredMessages = filtered
      return filtered

    } catch (error) {
      console.error('Error filtering messages:', error)
      toast({
        title: 'Pencarian Pesan Gagal',
        description: 'Terjadi kesalahan saat mencari pesan',
        variant: 'destructive',
      })
      return messages
    }
  }

  // Advanced user search with multiple criteria
  const advancedUserSearch = async (criteria: {
    query?: string
    role?: string
    excludeUserIds?: string[]
    limit?: number
  }) => {
    try {
      searchState.value.loading = true

      let searchQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, username')

      if (criteria.query && criteria.query.trim().length >= 2) {
        searchQuery = searchQuery.ilike('full_name', `%${criteria.query.trim()}%`)
      }

      if (criteria.role) {
        searchQuery = searchQuery.eq('role', criteria.role)
      }

      if (criteria.excludeUserIds && criteria.excludeUserIds.length > 0) {
        searchQuery = searchQuery.not('id', 'in', `(${criteria.excludeUserIds.join(',')})`)
      }

      searchQuery = searchQuery.limit(criteria.limit || 10)

      const { data, error } = await searchQuery

      if (error) {
        console.error('Error in advanced user search:', error)
        toast({
          title: 'Pencarian Lanjutan Gagal',
          description: 'Terjadi kesalahan saat pencarian lanjutan',
          variant: 'destructive',
        })
        return []
      }

      const results = data || []
      searchState.value.searchResults = results
      return results

    } catch (error) {
      console.error('Error in advanced user search:', error)
      toast({
        title: 'Pencarian Lanjutan Gagal',
        description: 'Terjadi kesalahan sistem saat pencarian lanjutan',
        variant: 'destructive',
      })
      return []
    } finally {
      searchState.value.loading = false
    }
  }

  // Get recent conversations for a user
  const getRecentConversations = async (userId: string, limit: number = 20) => {
    try {
      searchState.value.loading = true

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant1_id,
          participant2_id,
          last_message,
          updated_at,
          participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url, role),
          participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url, role)
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent conversations:', error)
        toast({
          title: 'Gagal Memuat Percakapan',
          description: 'Terjadi kesalahan saat memuat percakapan terbaru',
          variant: 'destructive',
        })
        return []
      }

      return data || []

    } catch (error) {
      console.error('Error fetching recent conversations:', error)
      toast({
        title: 'Gagal Memuat Percakapan',
        description: 'Terjadi kesalahan sistem saat memuat percakapan',
        variant: 'destructive',
      })
      return []
    } finally {
      searchState.value.loading = false
    }
  }

  return {
    // State
    loading: readonly(loading),
    searchQuery: readonly(searchQuery),
    searchResults: readonly(searchResults),
    filteredConversations: readonly(filteredConversations),
    filteredMessages: readonly(filteredMessages),
    hasSearchQuery: readonly(hasSearchQuery),

    // Methods
    setSearchQuery,
    clearSearch,
    searchUsers,
    searchConversations,
    searchMessages,
    advancedUserSearch,
    getRecentConversations,
  }
}