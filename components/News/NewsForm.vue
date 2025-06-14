<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Title -->
      <div class="md:col-span-2">
        <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Judul Berita *
        </label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan judul berita"
        />
      </div>

      <!-- Sub Title -->
      <div class="md:col-span-2">
        <label for="sub_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sub Judul
        </label>
        <input
          id="sub_title"
          v-model="form.sub_title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan sub judul berita"
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
          <option value="Pertanian">Pertanian</option>
          <option value="Teknologi">Teknologi</option>
          <option value="Edukasi">Edukasi</option>
          <option value="Berita Umum">Berita Umum</option>
        </select>
      </div>

      <!-- Link -->
      <div>
        <label for="link" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Link
        </label>
        <input
          id="link"
          v-model="form.link"
          type="url"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="https://example.com"
        />
      </div>
    </div>

    <!-- Content -->
    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Konten *
      </label>
      <textarea
        id="content"
        v-model="form.content"
        required
        rows="6"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
        placeholder="Masukkan konten berita"
      ></textarea>
    </div>

    <!-- File Uploads -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Image Upload -->
      <div>
        <label for="image" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Gambar
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          @change="handleImageUpload"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <!-- Attachment Upload -->
      <div>
        <label for="attachment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lampiran
        </label>
        <input
          id="attachment"
          type="file"
          @change="handleAttachmentUpload"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
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

<script setup lang="ts">
import type { News, CreateNewsData, UpdateNewsData } from '~/composables/useNews'

interface Props {
  news?: News | null
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: CreateNewsData | UpdateNewsData): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  news: null,
  loading: false
})

const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.news)

const form = reactive<CreateNewsData>({
  title: '',
  sub_title: '',
  content: '',
  category: '',
  link: '',
  image_url: '',
  attachment_url: ''
})

// Initialize form with news data if editing
watch(() => props.news, (news) => {
  if (news) {
    Object.assign(form, {
      title: news.title,
      sub_title: news.sub_title,
      content: news.content,
      category: news.category,
      link: news.link,
      image_url: news.image_url || '',
      attachment_url: news.attachment_url || ''
    })
  }
}, { immediate: true })

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // In a real app, you would upload the file to storage
    // For now, we'll just store the file name
    form.image_url = `images/${Date.now()}_${file.name}`
  }
}

const handleAttachmentUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // In a real app, you would upload the file to storage
    // For now, we'll just store the file name
    form.attachment_url = `attachments/${Date.now()}_${file.name}`
  }
}

const handleSubmit = () => {
  if (isEdit.value && props.news) {
    emit('submit', {
      id: props.news.id,
      ...form
    } as UpdateNewsData)
  } else {
    emit('submit', form as CreateNewsData)
  }
}
</script>