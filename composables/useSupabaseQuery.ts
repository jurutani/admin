// Helper untuk database operations dengan error handling
export const useSupabaseQuery = () => {
  const supabase = useSupabaseClient()
  
  const handleError = (error: any, operation: string) => {
    console.error(`Supabase ${operation} error:`, error)
    
    // Optional: Show toast notification
    const showToast = async (message: string, description?: string) => {
      const { toast } = await import('vue-sonner')
      toast.error(message, { description })
    }
    
    showToast(`${operation} gagal`, error.message)
    throw error
  }

  const select = async (table: string, query?: string, filters?: any) => {
    try {
      let queryBuilder = supabase.from(table)
      
      if (query) {
        queryBuilder = queryBuilder.select(query)
      } else {
        queryBuilder = queryBuilder.select('*')
      }
      
      if (filters) {
        Object.keys(filters).forEach(key => {
          queryBuilder = queryBuilder.eq(key, filters[key])
        })
      }
      
      const { data, error } = await queryBuilder
      
      if (error) {
        handleError(error, 'Select')
      }
      
      return data
    } catch (err) {
      handleError(err, 'Select')
    }
  }

  const insert = async (table: string, data: any) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
      
      if (error) {
        handleError(error, 'Insert')
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Data berhasil ditambahkan')
      
      return result
    } catch (err) {
      handleError(err, 'Insert')
    }
  }

  const update = async (table: string, id: string, data: any) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
      
      if (error) {
        handleError(error, 'Update')
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Data berhasil diupdate')
      
      return result
    } catch (err) {
      handleError(err, 'Update')
    }
  }

  const remove = async (table: string, id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
      
      if (error) {
        handleError(error, 'Delete')
      }
      
      const { toast } = await import('vue-sonner')
      toast.success('Data berhasil dihapus')
      
      return true
    } catch (err) {
      handleError(err, 'Delete')
      return false
    }
  }

  return {
    select,
    insert,
    update,
    remove
  }
}