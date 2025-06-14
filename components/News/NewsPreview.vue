<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {{ news.category }}
        </span>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ formatDate(news.created_at) }}
        </span>
      </div>
      
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ news.title }}
      </h1>
      
      <h2 v-if="news.sub_title" class="text-xl text-gray-600 dark:text-gray-300 mb-4">
        {{ news.sub_title }}
      </h2>
      
      <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
        <span>Status: 
          <span :class="statusClass">{{ statusText }}</span>
        </span>
        <span v-if="news.published_at">
          Dipublikasi: {{ formatDate(news.published_at) }}
        </span>
      </div>
    </div>

    <!-- Image -->
    <div v-if="news.image_url" class="mb-6">
      <img
        :src="news.image_url"
        :alt="news.title"
        class="w-full h-64 object-cover rounded-lg shadow-lg"
        @error="handleImageError"
      />
    </div>

    <!-- Content -->
    <div class="prose prose-lg dark:prose-invert max-w-none mb-6">
      <div class="whitespace-pre-wrap">{{ news.content }}</div>
    </div>

    <!-- Link -->
    <div v-if="news.link" class="mb-6">
      <a
        :href="news.link"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
      >
        <LinkIcon class="h-4 w-4 mr-2" />
        Baca Selengkapnya
        <ArrowTopRightOnSquareIcon class="h-4 w-4 ml-1" />
      </a>
    </div>

    <!-- Attachment -->
    <div v-if="news.attachment_url" class="mb-6">
      <div class="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <PaperClipIcon class="h-5 w-5 text-gray-400 mr-3" />
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            Lampiran
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ getFileName(news.attachment_url) }}
          </p>
        </div>
        <a
          :href="news.attachment_url"
          download
          class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <ArrowDownTrayIcon class="h-5 w-5" />
        </a>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        @click="$emit('close')"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Tutup
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  PaperClipIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import type { News } from '~/composables/useNews'

interface Props {
  news: News
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const statusText = computed(() => {
  switch (props.news.status_news) {
    case 'published':
      return 'Dipublikasi'
    case 'rejected':
      return 'Ditolak'
    default:
      return 'Draft'
  }
})

const statusClass = computed(() => {
  switch (props.news.status_news) {
    case 'published':
      return 'text-green-600 font-medium'
    case 'rejected':
      return 'text-red-600 font-medium'
    default:
      return 'text-yellow-600 font-medium'
  }
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getFileName = (url: string) => {
  return url.split('/').pop() || 'File'
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>