// composables/useNews.ts
export interface News {
  id: string
  title: string
  sub_title: string
  content: string
  category: string
  link: string
  status_news: 'rejected' | 'approved' | 'pending'
  created_at: string
  updated_at: string
  published_at: string | null
  deleted_at: string | null
  user_id: string
  image_url: string | null
  attachment_url: string | null
}

export interface UpsertNewsData {
  id?: string // Optional untuk upsert
  title: string
  sub_title: string
  content: string
  category: string
  link: string
  image_url?: string
  attachment_url?: string
  status_news?: 'draft' | 'published' | 'rejected' | 'approved' | 'pending'
}

export const useNews = () => {
  const supabase = useSupabaseClient()
  const { showToast } = useToast()

  // Fetch all news
  const fetchNews = async (): Promise<News[]> => {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      showToast({
        title: 'Error',
        description: 'Gagal mengambil data berita',
        type: 'error',
      })
      throw error
    }

    return data || []
  }

  // Fetch single news
  const fetchNewsById = async (id: string): Promise<News | null> => {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      showToast({
        title: 'Error',
        description: 'Gagal mengambil data berita',
        type: 'error',
      })
      throw error
    }

    return data
  }

  // Upsert news (create or update)
  const upsertNews = async (newsData: UpsertNewsData): Promise<News> => {
    const isUpdate = !!newsData.id
    const upsertData = {
      ...newsData,
      status_news: newsData.status_news || 'draft',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('news')
      .upsert(upsertData, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) {
      showToast({
        title: 'Error',
        description: isUpdate ? 'Gagal mengupdate berita' : 'Gagal membuat berita baru',
        type: 'error',
      })
      throw error
    }

    showToast({
      title: 'Berhasil',
      description: isUpdate ? 'Berita berhasil diupdate' : 'Berita berhasil dibuat',
      type: 'success',
    })

    return data
  }

  // Update news status
  const updateStatus = async (
    id: string,
    status: 'rejected' | 'approved' | 'pending' | 'published' | 'draft',
  ): Promise<News> => {
    const updateData: any = {
      status_news: status,
      updated_at: new Date().toISOString(),
    }

    // Set published_at when status is approved or published
    if (status === 'approved' || status === 'published') {
      updateData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      showToast({
        title: 'Error',
        description: 'Gagal mengupdate status berita',
        type: 'error',
      })
      throw error
    }

    const statusMessages = {
      rejected: 'Berita berhasil ditolak',
      approved: 'Berita berhasil disetujui',
      pending: 'Berita berhasil diubah ke pending',
      published: 'Berita berhasil dipublikasi',
      draft: 'Berita berhasil diubah ke draft',
    }

    showToast({
      title: 'Berhasil',
      description: statusMessages[status],
      type: 'success',
    })

    return data
  }

  // Publish news (wrapper for updateStatus)
  const publishNews = async (id: string): Promise<News> => {
    return await updateStatus(id, 'published')
  }

  // Soft delete news
  const deleteNews = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('news')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      showToast({
        title: 'Error',
        description: 'Gagal menghapus berita',
        type: 'error',
      })
      throw error
    }

    showToast({
      title: 'Berhasil',
      description: 'Berita berhasil dihapus',
      type: 'success',
    })
  }

  return {
    fetchNews,
    fetchNewsById,
    upsertNews,
    updateStatus,
    publishNews, // kept for backward compatibility
    deleteNews,
  }
}
