<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Link as LinkIcon, Paperclip, Tag, Clock } from 'lucide-vue-next'

const route = useRoute();
const id = Number(route.params.id);

interface Attachment {
  name: string;
  url: string;
}

interface News {
  id: number;
  title: string;
  sub_title?: string;
  content: string;
  category: string;
  attachments: Attachment[];
  link?: string;
  status_news: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  updated_at?: Date;
  published_at?: Date;
  deleted_at?: Date;
  author_id?: string;
}

const dummyNewsList: News[] = [
  {
    id: 1,
    title: 'Berita Pertama',
    sub_title: 'Subjudul berita pertama',
    content: '<p>Ini adalah isi berita pertama...</p>',
    category: 'Umum',
    attachments: [
      { name: 'Dokumen.pdf', url: '#' },
      { name: 'Lampiran-Data.xlsx', url: '#' }
    ],
    link: 'https://example.com',
    status_news: 'approved',
    created_at: new Date('2025-02-15T08:30:00'),
    updated_at: new Date('2025-02-16T10:15:00'),
    published_at: new Date('2025-02-17T09:00:00'),
  },
  {
    id: 2,
    title: 'Berita Kedua',
    sub_title: 'Subjudul berita kedua',
    content: '<p>Ini adalah isi berita kedua...</p>',
    category: 'Pendidikan',
    attachments: [],
    link: '',
    status_news: 'pending',
    created_at: new Date('2025-03-10T14:20:00'),
    published_at: null,
  },
];

const news = computed(() => dummyNewsList.find((n) => n.id === id) || dummyNewsList[0]);

function formatDate(date: Date | string | null) {
  if (!date) return 'Belum diterbitkan';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function statusColor(status: string) {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'secondary';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
}

function statusText(status: string) {
  switch (status) {
    case 'approved': return 'Disetujui';
    case 'pending': return 'Menunggu';
    case 'rejected': return 'Ditolak';
    default: return status;
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <NuxtLink to="/news" class="flex items-center gap-2 text-blue-600 hover:underline">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" />
        </svg>
        Kembali ke Daftar Berita
      </NuxtLink>

      <Badge :variant="statusColor(news.status_news)" class="text-sm py-1 px-3">
        {{ statusText(news.status_news) }}
      </Badge>
    </div>

    <div class="rounded-lg shadow-md overflow-hidden">
      <div class="p-6">
        <h1 class="text-3xl font-bold">{{ news.title }}</h1>
        <p v-if="news.sub_title" class="text-xl mt-2">{{ news.sub_title }}</p>

        <div class="flex flex-wrap gap-4 mt-4 text-sm">
          <div class="flex items-center gap-1">
            <Tag class="h-4 w-4" />
            <span>{{ news.category }}</span>
          </div>

          <div class="flex items-center gap-1">
            <Calendar class="h-4 w-4" />
            <span>Diterbitkan: {{ formatDate(news.published_at) }}</span>
          </div>

          <div v-if="news.created_at" class="flex items-center gap-1">
            <Clock class="h-4 w-4" />
            <span>Dibuat: {{ formatDate(news.created_at) }}</span>
          </div>

          <div v-if="news.updated_at" class="flex items-center gap-1">
            <Clock class="h-4 w-4" />
            <span>Diperbarui: {{ formatDate(news.updated_at) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200"></div>

      <div class="p-6">
        <article class="prose max-w-none" v-html="news.content"></article>
      </div>

      <div v-if="news.attachments.length || news.link" class="border-t border-gray-200 p-6 ">
        <div v-if="news.attachments.length" class="mb-4">
          <h3 class="font-medium flex items-center gap-2 mb-2">
            <Paperclip class="h-4 w-4" />
            Lampiran
          </h3>
          <ul class="space-y-2 ml-6">
            <li v-for="(file, i) in news.attachments" :key="i" class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <a :href="file.url" target="_blank" class="text-blue-600 hover:underline">{{ file.name }}</a>
            </li>
          </ul>
        </div>

        <div v-if="news.link" class="flex items-center gap-2">
          <h3 class="font-medium flex items-center gap-2">
            <LinkIcon class="h-4 w-4" />
            Link Terkait:
          </h3>
          <a :href="news.link" target="_blank" class="text-blue-600 hover:underline">{{ news.link }}</a>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button variant="outline" as-child>
        <NuxtLink to="/news">Kembali</NuxtLink>
      </Button>
      <Button variant="default" as-child>
        <NuxtLink :to="`/news/edit/${news.id}`">Edit Berita</NuxtLink>
      </Button>
    </div>
  </div>
</template>
