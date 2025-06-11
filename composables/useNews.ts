// composables/useNews.ts
export const useNews = () => {
  const supabase = useSupabaseClient()
  
  // Reactive data
  const newsList = ref([])
  const loading = ref(true)
  const error = ref(null)
  
  // Filter and pagination
  const currentCategory = ref('Semua')
  const categories = ['Semua', 'Pertanian', 'Teknologi', 'Prestasi', 'Peternakan', 'Lainya']
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalPages = ref(1)
  const totalItems = ref(0)
  
  // Fetch news with filters
  const fetchNews = async () => {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('news')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(
          (currentPage.value - 1) * pageSize.value, 
          currentPage.value * pageSize.value - 1
        )
      
      // Apply category filter if not 'Semua'
      if (currentCategory.value !== 'Semua') {
        query = query.eq('category', currentCategory.value)
      }
      
      const { data, error: fetchError, count } = await query
      
      if (fetchError) {
        console.error('Fetch news error:', fetchError)
        error.value = fetchError
        
        // Show error toast
        const { toast } = await import('vue-sonner')
        toast.error('Gagal memuat berita', {
          description: fetchError.message
        })
        
        return
      }
      
      newsList.value = data || []
      totalItems.value = count || 0
      totalPages.value = Math.ceil((count || 0) / pageSize.value)
      
    } catch (err) {
      console.error('News fetch error:', err)
      error.value = err
      
      const { toast } = await import('vue-sonner')
      toast.error('Terjadi kesalahan', {
        description: 'Gagal memuat data berita'
      })
    } finally {
      loading.value = false
    }
  }
  
  // Get single news by ID
  const getNewsById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Get news by ID error:', error)
        throw error
      }
      
      return data
    } catch (err) {
      console.error('Error getting news by ID:', err)
      throw err
    }
  }
  
  // Create new news
  const createNews = async (newsData: any) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .insert(newsData)
        .select()
        .single()
      
      if (error) {
        console.error('Create news error:', error)
        throw error
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Berita berhasil dibuat')
      
      // Refresh list
      await fetchNews()
      
      return data
    } catch (err) {
      console.error('Error creating news:', err)
      
      const { toast } = await import('vue-sonner')
      toast.error('Gagal membuat berita', {
        description: err.message
      })
      
      throw err
    }
  }
  
  // Update news
  const updateNews = async (id: string, newsData: any) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .update(newsData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Update news error:', error)
        throw error
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Berita berhasil diupdate')
      
      // Refresh list
      await fetchNews()
      
      return data
    } catch (err) {
      console.error('Error updating news:', err)
      
      const { toast } = await import('vue-sonner')
      toast.error('Gagal mengupdate berita', {
        description: err.message
      })
      
      throw err
    }
  }
  
  // Delete news
  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Delete news error:', error)
        throw error
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Berita berhasil dihapus')
      
      // Refresh list
      await fetchNews()
      
      return true
    } catch (err) {
      console.error('Error deleting news:', err)
      
      const { toast } = await import('vue-sonner')
      toast.error('Gagal menghapus berita', {
        description: err.message
      })
      
      throw err
    }
  }
  
  // Reset filters
  const resetFilters = () => {
    currentCategory.value = 'Semua'
    currentPage.value = 1
    fetchNews()
  }
  
  // Change category
  const changeCategory = (category: string) => {
    currentCategory.value = category
    currentPage.value = 1 // Reset to first page
    fetchNews()
  }
  
  // Change page
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
      fetchNews()
    }
  }
  
  // Computed properties
  const hasNews = computed(() => newsList.value.length > 0)
  const isEmpty = computed(() => !loading.value && newsList.value.length === 0)
  const currentPageInfo = computed(() => ({
    start: (currentPage.value - 1) * pageSize.value + 1,
    end: Math.min(currentPage.value * pageSize.value, totalItems.value),
    total: totalItems.value
  }))
  
  // Watch for category changes
  watch(currentCategory, () => {
    currentPage.value = 1
    fetchNews()
  })
  
  // Watch for page changes
  watch(currentPage, () => {
    fetchNews()
  })
  
  return {
    // Data
    newsList: readonly(newsList),
    loading: readonly(loading),
    error: readonly(error),
    
    // Filters & Pagination
    currentCategory,
    categories,
    currentPage,
    pageSize,
    totalPages: readonly(totalPages),
    totalItems: readonly(totalItems),
    
    // Computed
    hasNews,
    isEmpty,
    currentPageInfo,
    
    // Methods
    fetchNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews,
    resetFilters,
    changeCategory,
    changePage
  }
}