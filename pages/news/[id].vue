<script setup lang="ts">
import { ArrowLeft, ExternalLink, Download, Calendar, User, Tag } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const news = ref<any>(null)
const loading = ref(true)
const imageUrl = ref<string | null>(null)
const attachmentUrl = ref<string | null>(null)

onMounted(async () => {
  await fetchNews()
})

async function fetchNews() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', route.params.id)
      .single()

    if (error)
      throw error
    news.value = data
    // Get image URL if exists
    if (data.image_url) {
      const { data: imageData } = await supabase.storage
        .from('news-images')
        .getPublicUrl(data.image_url)
      imageUrl.value = imageData.publicUrl
    }
    
    // Get attachment URL if exists
    if (data.attachment_url) {
      const { data: attachmentData } = await supabase.storage
        .from('news-attachments')
        .getPublicUrl(data.attachment_url)
      attachmentUrl.value = attachmentData.publicUrl
    }
    
  } catch (error) {
    console.error('Error fetching news:', error)
    // Redirect to 404 or news list if not found
    router.push('/news')
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'approved': return 'default'
    case 'rejected': return 'destructive'
    case 'pending': return 'secondary'
    default: return 'outline'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    case 'pending': return 'Pending'
    default: return status
  }
}

function downloadAttachment() {
  if (attachmentUrl.value) {
    window.open(attachmentUrl.value, '_blank')
  }
}

function openLink() {
  if (news.value?.link) {
    window.open(news.value.link, '_blank')
  }
}

function getAttachmentFileName() {
  if (!news.value?.attachment_url) return ''
  const parts = news.value.attachment_url.split('/')
  const fileName = parts[parts.length - 1]
  return fileName.split('_').slice(1).join('_') // Remove timestamp prefix
}
</script>

<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4 py-6">
      <!-- Header -->
      <div class="mb-6">
        <Button 
          variant="ghost" 
          @click="router.push('/news')"
          class="mb-4"
        >
          <ArrowLeft class="h-4 w-4 mr-2" />
          Kembali ke Daftar Berita
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p class="text-muted-foreground">Memuat detail berita...</p>
        </div>
      </div>

      <!-- News Content -->
      <div v-else-if="news" class="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div class="flex justify-between items-start mb-4">
              <Badge :variant="getStatusVariant(news.status_news)">
                {{ getStatusLabel(news.status_news) }}
              </Badge>
              <div class="flex items-center text-sm text-muted-foreground">
                <Calendar class="h-4 w-4 mr-1" />
                {{ formatDate(news.created_at) }}
              </div>
            </div>
            
            <CardTitle class="text-3xl font-bold mb-2">
              {{ news.title }}
            </CardTitle>
            
            <p v-if="news.sub_title" class="text-xl text-muted-foreground">
              {{ news.sub_title }}
            </p>
            
            <div class="flex items-center gap-4 mt-4">
              <div class="flex items-center text-sm text-muted-foreground">
                <Tag class="h-4 w-4 mr-1" />
                {{ news.category }}
              </div>
              <div v-if="news.published_at" class="flex items-center text-sm text-muted-foreground">
                <Calendar class="h-4 w-4 mr-1" />
                Dipublikasi: {{ formatDate(news.published_at) }}
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="space-y-6">
            <!-- Image -->
            <div v-if="imageUrl" class="w-full">
              <img 
                :src="imageUrl" 
                :alt="news.title"
                class="w-full h-auto rounded-lg shadow-lg"
                @error="imageUrl = null"
              />
            </div>

            <!-- Content -->
            <div v-if="news.content" class="prose prose-lg max-w-none">
              <div class="whitespace-pre-wrap leading-relaxed">
                {{ news.content }}
              </div>
            </div>

            <Separator />

            <!-- Additional Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Link -->
              <div v-if="news.link">
                <h4 class="font-semibold mb-2">Link Terkait</h4>
                <Button 
                  variant="outline" 
                  @click="openLink"
                  class="w-full justify-start"
                >
                  <ExternalLink class="h-4 w-4 mr-2" />
                  Buka Link
                </Button>
              </div>

              <!-- Attachment -->
              <div v-if="news.attachment_url">
                <h4 class="font-semibold mb-2">Lampiran</h4>
                <Button 
                  variant="outline" 
                  @click="downloadAttachment"
                  class="w-full justify-start"
                >
                  <Download class="h-4 w-4 mr-2" />
                  {{ getAttachmentFileName() || 'Download Lampiran' }}
                </Button>
              </div>
            </div>

            <!-- Metadata -->
            <Separator />
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <strong>Dibuat:</strong><br>
                {{ formatDate(news.created_at) }}
              </div>
              <div v-if="news.updated_at && news.updated_at !== news.created_at">
                <strong>Diperbarui:</strong><br>
                {{ formatDate(news.updated_at) }}
              </div>
              <div>
                <strong>ID:</strong><br>
                <code class="text-xs">{{ news.id }}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Error State -->
      <div v-else class="flex justify-center items-center py-20">
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-2">Berita Tidak Ditemukan</h2>
          <p class="text-muted-foreground mb-4">Berita yang Anda cari tidak dapat ditemukan.</p>
          <Button @click="router.push('/news')">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Kembali ke Daftar Berita
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
