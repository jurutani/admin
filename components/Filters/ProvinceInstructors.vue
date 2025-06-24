<script setup lang="ts">
import { MapPin, Building2, Filter, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface District {
  id: string
  name: string
  province: string
}

interface Props {
  selectedProvince?: string
  selectedDistrict?: string
}

interface Emits {
  (e: 'province-changed', province: string): void
  (e: 'district-changed', district: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedProvince: 'all',
  selectedDistrict: 'all'
})

const emit = defineEmits<Emits>()

const supabase = useSupabaseClient()

// Fetch districts data
async function fetchDistricts() {
  try {
    const { data, error } = await supabase
      .from('districts')
      .select('id, name, province')
      .order('province', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching districts:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchDistricts:', error)
    return []
  }
}

// Fetch districts data with reactive updates
const { data: districts, pending: districtsPending, error: districtsError } = await useAsyncData(
  'districts-for-filters',
  fetchDistricts
)

// Computed values for filter options
const allDistricts = computed(() => districts.value || [])

const availableProvinces = computed(() => {
  const provinces = allDistricts.value.map(district => district.province).filter(Boolean)
  return [...new Set(provinces)].sort()
})

const availableDistricts = computed(() => {
  if (props.selectedProvince === 'all') {
    return allDistricts.value
  }
  return allDistricts.value.filter(district => district.province === props.selectedProvince)
})

const availableDistrictNames = computed(() => {
  return availableDistricts.value.map(district => district.name).sort()
})

// Computed for displaying active filters count
const activeFiltersCount = computed(() => {
  let count = 0
  if (props.selectedProvince !== 'all') count++
  if (props.selectedDistrict !== 'all') count++
  return count
})

// Methods
function handleProvinceChange(province: string) {
  emit('province-changed', province)
  // Reset district filter when province changes
  if (province === 'all') {
    emit('district-changed', 'all')
  } else {
    // Check if current district is still valid for the new province
    const isDistrictValid = availableDistricts.value.some(
      district => district.name === props.selectedDistrict
    )
    if (!isDistrictValid) {
      emit('district-changed', 'all')
    }
  }
}

function handleDistrictChange(district: string) {
  emit('district-changed', district)
}

function resetFilters() {
  emit('province-changed', 'all')
  emit('district-changed', 'all')
}

// Get province stats
const provinceStats = computed(() => {
  const stats = availableProvinces.value.map(province => {
    const count = allDistricts.value.filter(district => district.province === province).length
    return { province, count }
  })
  return stats
})

// Get district count for selected province
const selectedProvinceDistrictCount = computed(() => {
  if (props.selectedProvince === 'all') return allDistricts.value.length
  return availableDistricts.value.length
})
</script>

<template>
  <div class="space-y-4">
    <!-- Filter Header -->
    <div class="flex items-center justify-between bg-white p-4 rounded-lg border">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <Filter class="h-5 w-5 text-gray-600" />
          <h3 class="font-semibold text-gray-800">Filter Geografis</h3>
        </div>
        
        <!-- Active Filters Indicator -->
        <Badge 
          v-if="activeFiltersCount > 0" 
          variant="secondary" 
          class="bg-blue-100 text-blue-700"
        >
          {{ activeFiltersCount }} filter aktif
        </Badge>
      </div>

      <!-- Reset Button -->
      <Button
        v-if="activeFiltersCount > 0"
        @click="resetFilters"
        variant="ghost"
        size="sm"
        class="text-gray-500 hover:text-gray-700"
      >
        <X class="h-4 w-4 mr-1" />
        Reset Filter
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="districtsPending" class="bg-white p-4 rounded-lg border">
      <div class="flex items-center justify-center gap-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span class="text-sm text-gray-500">Memuat data wilayah...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="districtsError" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-600 text-sm">Gagal memuat data wilayah</p>
    </div>

    <!-- Filter Controls -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <!-- Province Filter -->
      <div class="bg-white p-4 rounded-lg border space-y-3">
        <div class="flex items-center gap-2">
          <MapPin class="h-4 w-4 text-blue-600" />
          <label class="text-sm font-medium text-gray-700">Filter Provinsi</label>
        </div>
        
        <Select :model-value="selectedProvince" @update:model-value="handleProvinceChange">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Pilih Provinsi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" class="font-medium">
              <div class="flex items-center justify-between w-full">
                <span>Semua Provinsi</span>
                <Badge variant="outline" class="ml-2 text-xs">
                  {{ availableProvinces.length }}
                </Badge>
              </div>
            </SelectItem>
            <SelectItem 
              v-for="province in availableProvinces" 
              :key="province" 
              :value="province"
            >
              <div class="flex items-center justify-between w-full">
                <span>{{ province }}</span>
                <Badge variant="outline" class="ml-2 text-xs">
                  {{ provinceStats.find(s => s.province === province)?.count || 0 }}
                </Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Province Selection Info -->
        <div class="text-xs text-gray-500">
          <span v-if="selectedProvince === 'all'">
            Menampilkan semua {{ availableProvinces.length }} provinsi
          </span>
          <span v-else>
            Provinsi: {{ selectedProvince }} ({{ selectedProvinceDistrictCount }} kabupaten/kota)
          </span>
        </div>
      </div>

      <!-- District Filter -->
      <div class="bg-white p-4 rounded-lg border space-y-3">
        <div class="flex items-center gap-2">
          <Building2 class="h-4 w-4 text-green-600" />
          <label class="text-sm font-medium text-gray-700">Filter Kabupaten/Kota</label>
        </div>
        
        <Select 
          :model-value="selectedDistrict" 
          @update:model-value="handleDistrictChange"
          :disabled="selectedProvince !== 'all' && availableDistrictNames.length === 0"
        >
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Pilih Kabupaten/Kota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" class="font-medium">
              <div class="flex items-center justify-between w-full">
                <span>Semua Kabupaten/Kota</span>
                <Badge variant="outline" class="ml-2 text-xs">
                  {{ availableDistrictNames.length }}
                </Badge>
              </div>
            </SelectItem>
            <SelectItem 
              v-for="districtName in availableDistrictNames" 
              :key="districtName" 
              :value="districtName"
            >
              {{ districtName }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- District Selection Info -->
        <div class="text-xs text-gray-500">
          <span v-if="selectedDistrict === 'all'">
            Menampilkan semua {{ availableDistrictNames.length }} kabupaten/kota
            {{ selectedProvince !== 'all' ? `di ${selectedProvince}` : '' }}
          </span>
          <span v-else>
            Kabupaten/Kota: {{ selectedDistrict }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Filter Buttons -->
    <div v-if="!districtsPending && !districtsError" class="bg-white p-4 rounded-lg border">
      <div class="space-y-3">
        <h4 class="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Filter class="h-4 w-4" />
          Filter Cepat Provinsi
        </h4>
        
        <div class="flex flex-wrap gap-2">
          <!-- All Provinces Button -->
          <Button
            @click="handleProvinceChange('all')"
            :variant="selectedProvince === 'all' ? 'default' : 'outline'"
            size="sm"
            class="text-xs"
          >
            Semua ({{ availableProvinces.length }})
          </Button>

          <!-- Top Provinces (first 8) -->
          <Button
            v-for="province in availableProvinces.slice(0, 8)"
            :key="province"
            @click="handleProvinceChange(province)"
            :variant="selectedProvince === province ? 'default' : 'outline'"
            size="sm"
            class="text-xs"
          >
            {{ province }} ({{ provinceStats.find(s => s.province === province)?.count || 0 }})
          </Button>

          <!-- Show More Indicator -->
          <Badge 
            v-if="availableProvinces.length > 8" 
            variant="secondary" 
            class="text-xs"
          >
            +{{ availableProvinces.length - 8 }} lainnya
          </Badge>
        </div>
      </div>
    </div>

    <!-- Current Selection Summary -->
    <div 
      v-if="activeFiltersCount > 0 && !districtsPending && !districtsError" 
      class="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Filter class="h-4 w-4" />
          Filter Aktif
        </h4>
        
        <div class="flex flex-wrap gap-2">
          <Badge 
            v-if="selectedProvince !== 'all'" 
            variant="default" 
            class="bg-blue-100 text-blue-700"
          >
            <MapPin class="h-3 w-3 mr-1" />
            {{ selectedProvince }}
          </Badge>
          
          <Badge 
            v-if="selectedDistrict !== 'all'" 
            variant="default"
            class="bg-green-100 text-green-700"
          >
            <Building2 class="h-3 w-3 mr-1" />
            {{ selectedDistrict }}
          </Badge>
        </div>
        
        <p class="text-xs text-blue-600">
          Filter menampilkan data instructor dari 
          {{ selectedProvince === 'all' ? 'semua provinsi' : selectedProvince }}
          {{ selectedDistrict !== 'all' ? ` - ${selectedDistrict}` : '' }}
        </p>
      </div>
    </div>
  </div>
</template>