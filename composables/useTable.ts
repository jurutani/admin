// composables/useTable.ts
export interface TableColumn {
  key: string
  title: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => string
}

export interface TableOptions {
  columns: TableColumn[]
  data: any[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const useTable = (initialOptions: Partial<TableOptions> = {}) => {
  const options = ref<TableOptions>({
    columns: [],
    data: [],
    loading: false,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
    },
    sortBy: '',
    sortOrder: 'asc',
    ...initialOptions,
  })

  const setData = (data: any[]) => {
    options.value.data = data
    if (options.value.pagination) {
      options.value.pagination.total = data.length
    }
  }

  const setLoading = (loading: boolean) => {
    options.value.loading = loading
  }

  const setColumns = (columns: TableColumn[]) => {
    options.value.columns = columns
  }

  const setPagination = (pagination: Partial<TableOptions['pagination']>) => {
    if (options.value.pagination) {
      options.value.pagination = {
        ...options.value.pagination,
        ...pagination,
      }
    }
  }

  const setSorting = (sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    options.value.sortBy = sortBy
    options.value.sortOrder = sortOrder
  }

  const sortData = (key: string) => {
    const currentOrder = options.value.sortBy === key && options.value.sortOrder === 'asc' ? 'desc' : 'asc'
    setSorting(key, currentOrder)
    options.value.data.sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      if (aVal < bVal)
        return currentOrder === 'asc' ? -1 : 1
      if (aVal > bVal)
        return currentOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const paginatedData = computed(() => {
    if (!options.value.pagination)
      return options.value.data
    const { page, pageSize } = options.value.pagination
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return options.value.data.slice(start, end)
  })

  const totalPages = computed(() => {
    if (!options.value.pagination)
      return 1
    return Math.ceil(options.value.pagination.total / options.value.pagination.pageSize)
  })

  const goToPage = (page: number) => {
    if (options.value.pagination) {
      options.value.pagination.page = page
    }
  }

  const nextPage = () => {
    if (options.value.pagination && options.value.pagination.page < totalPages.value) {
      options.value.pagination.page++
    }
  }

  const prevPage = () => {
    if (options.value.pagination && options.value.pagination.page > 1) {
      options.value.pagination.page--
    }
  }

  return {
    options: readonly(options),
    paginatedData,
    totalPages,
    setData,
    setLoading,
    setColumns,
    setPagination,
    setSorting,
    sortData,
    goToPage,
    nextPage,
    prevPage,
  }
}
