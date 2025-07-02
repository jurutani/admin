<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()

// Data refs
const categoryMarket = ref<any[]>([])
const categoryNews = ref<any[]>([])
const categoryExpert = ref<any[]>([])
const category = ref<any[]>([])
const loading = ref(true)

// Dialog states
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const currentTable = ref('')
const currentItem = ref<any>(null)

// Form data
const formData = ref({
  name: ''
})

// Load data from all tables
const loadData = async () => {
  loading.value = true
  
  try {
    const [marketRes, newsRes, expertRes, categoryRes] = await Promise.all([
      supabase.from('category_markets').select('*').order('created_at', { ascending: false }),
      supabase.from('category_news').select('*').order('created_at', { ascending: false }),
      supabase.from('category_expert').select('*').order('created_at', { ascending: false }),
      supabase.from('category').select('*').order('created_at', { ascending: false })
    ])

    if (marketRes.error) console.error('Error loading category_markets:', marketRes.error)
    else categoryMarket.value = marketRes.data || []

    if (newsRes.error) console.error('Error loading category_news:', newsRes.error)
    else categoryNews.value = newsRes.data || []

    if (expertRes.error) console.error('Error loading category_expert:', expertRes.error)
    else categoryExpert.value = expertRes.data || []
    
    if (categoryRes.error) console.error('Error loading category:', categoryRes.error)
    else category.value = categoryRes.data || []

  } catch (error) {
    console.error('Error loading data:', error)
  }
  
  loading.value = false
}

// Open create dialog
const openCreateDialog = (table: string) => {
  currentTable.value = table
  formData.value = { name: '' }
  showCreateDialog.value = true
}

// Create new item
const createItem = async () => {
  if (!formData.value.name) return

  const { error } = await supabase
    .from(currentTable.value)
    .insert([formData.value])

  if (error) {
    console.error('Error creating item:', error)
  } else {
    showCreateDialog.value = false
    await loadData()
  }
}

// Open delete dialog
const openDeleteDialog = (table: string, item: any) => {
  currentTable.value = table
  currentItem.value = item
  showDeleteDialog.value = true
}

// Delete item
const deleteItem = async () => {
  if (!currentItem.value) return

  const { error } = await supabase
    .from(currentTable.value)
    .delete()
    .eq('id', currentItem.value.id)

  if (error) {
    console.error('Error deleting item:', error)
  } else {
    showDeleteDialog.value = false
    await loadData()
  }
}

// Get table display name
const getTableDisplayName = (tableName: string) => {
  const names: { [key: string]: string } = {
    'category_markets': 'Market',
    'category_news': 'News', 
    'category_expert': 'Expert',
    'category': 'Category'
  }
  return names[tableName] || tableName
}

// Get button text
const getButtonText = (tableName: string) => {
  const texts: { [key: string]: string } = {
    'category_markets': 'Tambah Market',
    'category_news': 'Tambah News',
    'category_expert': 'Tambah Expert',
    'category': 'Tambah Category'
  }
  return texts[tableName] || 'Tambah Item'
}

// Get empty state text
const getEmptyText = (tableName: string) => {
  const texts: { [key: string]: string } = {
    'category_markets': 'Belum ada data category market',
    'category_news': 'Belum ada data category news',
    'category_expert': 'Belum ada data category expert',
    'category': 'Belum ada data category'
  }
  return texts[tableName] || 'Belum ada data'
}

// Get data by table name
const getDataByTable = (tableName: string) => {
  const dataMap: { [key: string]: any[] } = {
    'category_markets': categoryMarket.value,
    'category_news': categoryNews.value,
    'category_expert': categoryExpert.value,
    'category': category.value
  }
  return dataMap[tableName] || []
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manajemen Kategori</h1>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Memuat data...</p>
    </div>

    <Tabs v-else default-value="category_markets" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="category_markets">Market</TabsTrigger>
        <TabsTrigger value="category_news">News</TabsTrigger>
        <TabsTrigger value="category_expert">Expert</TabsTrigger>
        <TabsTrigger value="category">Category</TabsTrigger>
      </TabsList>

      <TabsContent 
        v-for="table in ['category_markets', 'category_news', 'category_expert', 'category']"
        :key="table"
        :value="table"
        class="space-y-4"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ getTableDisplayName(table) }}</h2>
          <Button @click="openCreateDialog(table)" size="sm">
            <Plus class="h-4 w-4 mr-2" />
            {{ getButtonText(table) }}
          </Button>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="item in getDataByTable(table)"
            :key="item.id"
            variant="secondary"
            class="flex items-center gap-2 px-3 py-1.5"
          >
            <span>{{ item.name }}</span>
            <Button
              @click="openDeleteDialog(table, item)"
              variant="ghost"
              size="sm"
              class="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </Badge>
          <div v-if="getDataByTable(table).length === 0" class="text-muted-foreground text-sm">
            {{ getEmptyText(table) }}
          </div>
        </div>
      </TabsContent>
    </Tabs>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah {{ getTableDisplayName(currentTable) }}</DialogTitle>
          <DialogDescription>
            Masukkan nama untuk kategori baru
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="name">Nama</Label>
            <Input
              id="name"
              v-model="formData.name"
              placeholder="Masukkan nama kategori"
            />
          </div>
        </div>
        <DialogFooter>
          <Button @click="showCreateDialog = false" variant="outline">
            Batal
          </Button>
          <Button @click="createItem" :disabled="!formData.name">
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Alert Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Item</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus "{{ currentItem?.name }}" dari {{ getTableDisplayName(currentTable) }}?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction @click="deleteItem" class="bg-destructive hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>