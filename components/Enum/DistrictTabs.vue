<script setup lang="ts">
import { Plus, Trash2, Search } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'

const supabase = useSupabaseClient()

// Data refs
const districts = ref<any[]>([])
const provinces = ref<string[]>([])
const loading = ref(true)
const selectedProvince = ref('')
const searchQuery = ref('')

// Dialog states
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const currentItem = ref<any>(null)

// Form data
const formData = ref({
  name: '',
  province: '',
  newProvince: '',
  useExistingProvince: true
})

// Computed filtered districts
const filteredDistricts = computed(() => {
  let filtered = districts.value

  // Filter by province
  if (selectedProvince.value) {
    filtered = filtered.filter(district => district.province === selectedProvince.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(district => 
      district.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  return filtered
})

// Load districts data
const loadDistricts = async () => {
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .order('province', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading districts:', error)
    } else {
      districts.value = data || []
      
      // Extract unique provinces
      const uniqueProvinces = [...new Set(districts.value.map(d => d.province))]
      provinces.value = uniqueProvinces.sort()
      
      // Set default province to first one
      if (provinces.value.length > 0 && !selectedProvince.value) {
        selectedProvince.value = provinces.value[0]
      }
    }
  } catch (error) {
    console.error('Error loading districts:', error)
  }
  
  loading.value = false
}

// Open create dialog
const openCreateDialog = () => {
  formData.value = { 
    name: '', 
    province: selectedProvince.value || (provinces.value[0] || ''),
    newProvince: '',
    useExistingProvince: true
  }
  showCreateDialog.value = true
}

// Create new district
const createDistrict = async () => {
  const provinceToUse = formData.value.useExistingProvince 
    ? formData.value.province 
    : formData.value.newProvince

  if (!formData.value.name || !provinceToUse) return

  const { error } = await supabase
    .from('districts')
    .insert([{
      name: formData.value.name,
      province: provinceToUse
    }])

  if (error) {
    console.error('Error creating district:', error)
  } else {
    showCreateDialog.value = false
    await loadDistricts()
  }
}

// Open delete dialog
const openDeleteDialog = (item: any) => {
  currentItem.value = item
  showDeleteDialog.value = true
}

// Delete district
const deleteDistrict = async () => {
  if (!currentItem.value) return

  const { error } = await supabase
    .from('districts')
    .delete()
    .eq('id', currentItem.value.id)

  if (error) {
    console.error('Error deleting district:', error)
  } else {
    showDeleteDialog.value = false
    await loadDistricts()
  }
}

// Get districts count by province
const getDistrictCount = (province: string) => {
  return districts.value.filter(d => d.province === province).length
}

onMounted(() => {
  loadDistricts()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manajemen Kabupaten/Kota</h1>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Memuat data...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Search and Filter Controls -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Cari kabupaten/kota..."
            class="pl-10"
          />
        </div>
        <Button @click="openCreateDialog" size="default">
          <Plus class="h-4 w-4 mr-2" />
          Tambah Kabupaten/Kota
        </Button>
      </div>

      <!-- Province Selector -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Pilih Provinsi</h2>
          <div class="text-sm text-muted-foreground">
            Total: {{ provinces.length }} provinsi
          </div>
        </div>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <Button
            v-for="province in provinces"
            :key="province"
            @click="selectedProvince = province"
            :variant="selectedProvince === province ? 'default' : 'outline'"
            class="h-auto p-3 flex flex-col items-center justify-center text-center"
          >
            <div class="font-medium text-xs leading-tight mb-1">{{ province }}</div>
            <div class="text-xs opacity-70">({{ getDistrictCount(province) }})</div>
          </Button>
        </div>
      </div>

      <!-- Districts Display -->
      <div v-if="selectedProvince" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">Kabupaten/Kota di {{ selectedProvince }}</h3>
            <p class="text-sm text-muted-foreground">
              {{ filteredDistricts.length }} dari {{ getDistrictCount(selectedProvince) }} kabupaten/kota
              <span v-if="searchQuery"> yang sesuai pencarian "{{ searchQuery }}"</span>
            </p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Card
            v-for="district in filteredDistricts"
            :key="district.id"
            class="p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-sm">{{ district.name }}</h4>
                <p class="text-xs text-muted-foreground mt-1">{{ district.province }}</p>
              </div>
              <Button
                @click="openDeleteDialog(district)"
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
          </Card>
          
          <div v-if="filteredDistricts.length === 0" class="col-span-full text-center py-8">
            <p class="text-muted-foreground">
              <span v-if="searchQuery">
                Tidak ada kabupaten/kota yang sesuai pencarian "{{ searchQuery }}" di {{ selectedProvince }}
              </span>
              <span v-else>
                Belum ada data kabupaten/kota di {{ selectedProvince }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-muted-foreground">Pilih provinsi untuk melihat daftar kabupaten/kota</p>
      </div>
    </div>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Kabupaten/Kota</DialogTitle>
          <DialogDescription>
            Masukkan nama kabupaten/kota dan pilih atau buat provinsi
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <!-- Province Option Toggle -->
          <div class="space-y-3">
            <Label>Pilihan Provinsi</Label>
            <div class="flex flex-col space-y-2">
              <div class="flex items-center space-x-2">
                <input
                  id="existing"
                  type="radio"
                  :value="true"
                  v-model="formData.useExistingProvince"
                  class="h-4 w-4"
                />
                <Label for="existing" class="text-sm font-normal">
                  Gunakan provinsi yang sudah ada
                </Label>
              </div>
              <div class="flex items-center space-x-2">
                <input
                  id="new"
                  type="radio"
                  :value="false"
                  v-model="formData.useExistingProvince"
                  class="h-4 w-4"
                />
                <Label for="new" class="text-sm font-normal">
                  Buat provinsi baru
                </Label>
              </div>
            </div>
          </div>

          <!-- Existing Province Dropdown -->
          <div v-if="formData.useExistingProvince" class="space-y-2">
            <Label for="province">Provinsi</Label>
            <Select v-model="formData.province">
              <SelectTrigger>
                <SelectValue placeholder="Pilih provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="province in provinces" 
                  :key="province"
                  :value="province"
                >
                  {{ province }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- New Province Input -->
          <div v-else class="space-y-2">
            <Label for="newProvince">Nama Provinsi Baru</Label>
            <Input
              id="newProvince"
              v-model="formData.newProvince"
              placeholder="Masukkan nama provinsi baru"
            />
          </div>

          <!-- District Name -->
          <div class="space-y-2">
            <Label for="name">Nama Kabupaten/Kota</Label>
            <Input
              id="name"
              v-model="formData.name"
              placeholder="Masukkan nama kabupaten/kota"
            />
          </div>
        </div>
        <DialogFooter>
          <Button @click="showCreateDialog = false" variant="outline">
            Batal
          </Button>
          <Button 
            @click="createDistrict" 
            :disabled="!formData.name || (formData.useExistingProvince ? !formData.province : !formData.newProvince)"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Alert Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Kabupaten/Kota</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus "{{ currentItem?.name }}" dari {{ currentItem?.province }}?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction @click="deleteDistrict" class="bg-destructive hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>