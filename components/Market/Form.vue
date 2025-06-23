<script setup lang="ts">
interface Market {
  id: string
  name: string
  description: string
  price: number
  price_range: string | null
  attachments: string
  links: {
    shopee_link: string
    tiktok_link: string
    tokopedia_link: string
  }
  category: string
  seller: string
  contact_seller: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  archived_at: string | null
}

interface CreateMarketData {
  name: string
  description: string
  price: number
  price_range: string | null
  attachments: string
  links: {
    shopee_link: string
    tiktok_link: string
    tokopedia_link: string
  }
  category: string
  seller: string
  contact_seller: string
}

interface UpdateMarketData extends CreateMarketData {
  id: string
}

interface Props {
  market?: Market | null
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: CreateMarketData | UpdateMarketData): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  market: null,
  loading: false
})

const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.market)

const form = reactive<CreateMarketData>({
  name: '',
  description: '',
  price: 0,
  price_range: null,
  attachments: '',
  links: {
    shopee_link: '',
    tiktok_link: '',
    tokopedia_link: ''
  },
  category: '',
  seller: '',
  contact_seller: ''
})

// Initialize form with market data if editing
watch(() => props.market, (market) => {
  if (market) {
    Object.assign(form, {
      name: market.name,
      description: market.description,
      price: market.price,
      price_range: market.price_range,
      attachments: market.attachments,
      links: {
        shopee_link: market.links.shopee_link || '',
        tiktok_link: market.links.tiktok_link || '',
        tokopedia_link: market.links.tokopedia_link || ''
      },
      category: market.category,
      seller: market.seller,
      contact_seller: market.contact_seller
    })
  }
}, { immediate: true })

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // In a real app, you would upload the file to storage
    // For now, we'll create a JSON string similar to the example data
    const attachmentData = {
      url_image: `markets/${crypto.randomUUID()}/${Date.now()}_${file.name}`
    }
    form.attachments = JSON.stringify(attachmentData)
  }
}

const handleSubmit = () => {
  if (isEdit.value && props.market) {
    emit('submit', {
      id: props.market.id,
      ...form
    } as UpdateMarketData)
  } else {
    emit('submit', form as CreateMarketData)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Product Name -->
      <div class="md:col-span-2">
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nama Produk *
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan nama produk"
        />
      </div>

      <!-- Category -->
      <div>
        <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kategori *
        </label>
        <select
          id="category"
          v-model="form.category"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">Pilih Kategori</option>
          <option value="Hasil Pertanian">Hasil Pertanian</option>
          <option value="Peralatan Pertanian">Peralatan Pertanian</option>
          <option value="Pupuk & Pestisida">Pupuk & Pestisida</option>
          <option value="Bibit & Benih">Bibit & Benih</option>
          <option value="Produk Olahan">Produk Olahan</option>
        </select>
      </div>

      <!-- Seller Name -->
      <div>
        <label for="seller" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nama Penjual *
        </label>
        <input
          id="seller"
          v-model="form.seller"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan nama penjual"
        />
      </div>

      <!-- Price -->
      <div>
        <label for="price" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Harga *
        </label>
        <input
          id="price"
          v-model="form.price"
          type="number"
          required
          min="0"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan harga produk"
        />
      </div>

      <!-- Price Range -->
      <div>
        <label for="price_range" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rentang Harga
        </label>
        <input
          id="price_range"
          v-model="form.price_range"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Contoh: 100.000 - 500.000"
        />
      </div>

      <!-- Contact Seller -->
      <div>
        <label for="contact_seller" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kontak Penjual *
        </label>
        <input
          id="contact_seller"
          v-model="form.contact_seller"
          type="tel"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan nomor telepon/WA"
        />
      </div>
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Deskripsi Produk *
      </label>
      <textarea
        id="description"
        v-model="form.description"
        required
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
        placeholder="Masukkan deskripsi produk"
      ></textarea>
    </div>

    <!-- Marketplace Links -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Link Marketplace</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Shopee Link -->
        <div>
          <label for="shopee_link" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link Shopee
          </label>
          <input
            id="shopee_link"
            v-model="form.links.shopee_link"
            type="url"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="https://shopee.co.id/..."
          />
        </div>

        <!-- Tokopedia Link -->
        <div>
          <label for="tokopedia_link" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link Tokopedia
          </label>
          <input
            id="tokopedia_link"
            v-model="form.links.tokopedia_link"
            type="url"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="https://tokopedia.com/..."
          />
        </div>

        <!-- TikTok Link -->
        <div>
          <label for="tiktok_link" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link TikTok Shop
          </label>
          <input
            id="tiktok_link"
            v-model="form.links.tiktok_link"
            type="url"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="https://tiktok.com/..."
          />
        </div>
      </div>
    </div>

    <!-- Image Upload -->
    <div>
      <label for="image" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Gambar Produk
      </label>
      <input
        id="image"
        type="file"
        accept="image/*"
        @change="handleImageUpload"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Upload gambar produk untuk menarik perhatian pembeli
      </p>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        @click="$emit('close')"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Batal
      </button>
      
      <button
        type="submit"
        :disabled="loading"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading" class="inline-flex items-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isEdit ? 'Mengupdate...' : 'Menyimpan...' }}
        </span>
        <span v-else>{{ isEdit ? 'Update' : 'Simpan' }}</span>
      </button>
    </div>
  </form>
</template>

