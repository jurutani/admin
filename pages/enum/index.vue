<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()

// Data refs
const categoryMarket = ref<any[]>([])
const categoryNews = ref<any[]>([])
const categoryExpert = ref<any[]>([])
const loading = ref(true)

// Dialog states
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const currentTable = ref('')
const currentItem = ref<any>(null)

// Form data
const formData = ref({
  name: '',
  value: ''
})

// Load data from all tables
const loadData = async () => {
  loading.value = true
  
  try {
    const [marketRes, newsRes, expertRes] = await Promise.all([
      supabase.from('category_markets').select('*').order('created_at', { ascending: false }),
      supabase.from('category_news').select('*').order('created_at', { ascending: false }),
      supabase.from('category_expert').select('*').order('created_at', { ascending: false })
    ])

    if (marketRes.error) console.error('Error loading category_markets:', marketRes.error)
    else categoryMarket.value = marketRes.data || []

    if (newsRes.error) console.error('Error loading category_news:', newsRes.error)
    else categoryNews.value = newsRes.data || []

    if (expertRes.error) console.error('Error loading category_expert:', expertRes.error)
    else categoryExpert.value = expertRes.data || []

  } catch (error) {
    console.error('Error loading data:', error)
  }
  
  loading.value = false
}

// Open create dialog
const openCreateDialog = (table: string) => {
  currentTable.value = table
  formData.value = { name: '', value: '' }
  showCreateDialog.value = true
}

// Create new item
const createItem = async () => {
  if (!formData.value.name || !formData.value.value) return

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

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="p-6 space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manajemen Kategori</h1>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Memuat data...</p>
    </div>

    <div v-else class="space-y-8">
      <!-- Category Market -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Category Market</h2>
          <Button @click="openCreateDialog('category_markets')" size="sm">
            <Plus class="h-4 w-4 mr-2" />
            Tambah Market
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="item in categoryMarket"
            :key="item.id"
            variant="secondary"
            class="flex items-center gap-2 px-3 py-1.5"
          >
            <span>{{ item.name }} - {{ item.value }}</span>
            <Button
              @click="openDeleteDialog('category_markets', item)"
              variant="ghost"
              size="sm"
              class="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </Badge>
          <div v-if="categoryMarket.length === 0" class="text-muted-foreground text-sm">
            Belum ada data category market
          </div>
        </div>
      </div>

      <!-- Category News -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Category News</h2>
          <Button @click="openCreateDialog('category_news')" size="sm">
            <Plus class="h-4 w-4 mr-2" />
            Tambah News
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="item in categoryNews"
            :key="item.id"
            variant="secondary"
            class="flex items-center gap-2 px-3 py-1.5"
          >
            <span>{{ item.name }} - {{ item.value }}</span>
            <Button
              @click="openDeleteDialog('category_news', item)"
              variant="ghost"
              size="sm"
              class="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </Badge>
          <div v-if="categoryNews.length === 0" class="text-muted-foreground text-sm">
            Belum ada data category news
          </div>
        </div>
      </div>

      <!-- Category Expert -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Category Expert</h2>
          <Button @click="openCreateDialog('category_expert')" size="sm">
            <Plus class="h-4 w-4 mr-2" />
            Tambah Expert
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="item in categoryExpert"
            :key="item.id"
            variant="secondary"
            class="flex items-center gap-2 px-3 py-1.5"
          >
            <span>{{ item.name }} - {{ item.value }}</span>
            <Button
              @click="openDeleteDialog('category_expert', item)"
              variant="ghost"
              size="sm"
              class="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </Badge>
          <div v-if="categoryExpert.length === 0" class="text-muted-foreground text-sm">
            Belum ada data category expert
          </div>
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah {{ currentTable.replace('category_', '').replace('_', ' ') }}</DialogTitle>
          <DialogDescription>
            Masukkan nama dan nilai untuk kategori baru
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
          <div class="space-y-2">
            <Label for="value">Nilai</Label>
            <Input
              id="value"
              v-model="formData.value"
              placeholder="Masukkan nilai kategori"
            />
          </div>
        </div>
        <DialogFooter>
          <Button @click="showCreateDialog = false" variant="outline">
            Batal
          </Button>
          <Button @click="createItem" :disabled="!formData.name || !formData.value">
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
            Apakah Anda yakin ingin menghapus "{{ currentItem?.name }}" dari {{ currentTable.replace('category_', '').replace('_', ' ') }}?
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