<script setup lang="ts">
import { ArrowLeft, ExternalLink, Download, Play, BookOpen } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const course = ref<any>(null)
const loading = ref(true)
const imageUrl = ref<string | null>(null)

onMounted(async () => {
  await fetchCourse()
})

async function fetchCourse() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', route.params.id)
      .single()

    if (error) throw error
    
    course.value = data
    
    if (data.image_url) {
      const { data: imageData } = await supabase.storage
        .from('course-images')
        .getPublicUrl(data.image_url)
      imageUrl.value = imageData.publicUrl
    }
    
  } catch (error) {
    console.error('Error fetching course:', error)
    router.push('/courses')
  } finally {
    loading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function openYouTube() {
  if (course.value?.link_youtube) {
    window.open(course.value.link_youtube, '_blank')
  }
}

function openDrive() {
  if (course.value?.link_drive) {
    window.open(course.value.link_drive, '_blank')
  }
}

function downloadFiles() {
  if (course.value?.files) {
    const { data } = supabase.storage
      .from('course-files')
      .getPublicUrl(course.value.files)
    window.open(data.publicUrl, '_blank')
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <Button 
      variant="ghost" 
      @click="router.push('/courses')"
      class="mb-6"
    >
      <ArrowLeft class="h-4 w-4 mr-2" />
      Kembali
    </Button>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Memuat...</p>
    </div>

    <!-- Course Detail -->
    <Card v-else-if="course">
      <CardHeader>
        <CardTitle class="text-2xl">{{ course.title }}</CardTitle>
        <p class="text-sm text-muted-foreground">
          {{ course.category }} • {{ formatDate(course.created_at) }}
        </p>
      </CardHeader>
      
      <CardContent class="space-y-6">
        <!-- Image -->
        <img 
          v-if="imageUrl" 
          :src="imageUrl" 
          :alt="course.title"
          class="w-full h-64 object-cover rounded-lg"
        />

        <!-- Description -->
        <div v-if="course.description">
          <h3 class="font-semibold mb-2">Deskripsi</h3>
          <p class="text-muted-foreground whitespace-pre-wrap">{{ course.description }}</p>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <h3 class="font-semibold">Materi</h3>
          
          <div class="flex flex-col gap-2">
            <Button 
              v-if="course.link_youtube"
              variant="outline" 
              @click="openYouTube"
              class="justify-start"
            >
              <Play class="h-4 w-4 mr-2 text-red-500" />
              Video YouTube
            </Button>

            <Button 
              v-if="course.link_drive"
              variant="outline" 
              @click="openDrive"
              class="justify-start"
            >
              <BookOpen class="h-4 w-4 mr-2 text-blue-500" />
              Google Drive
            </Button>

            <Button 
              v-if="course.files"
              variant="outline" 
              @click="downloadFiles"
              class="justify-start"
            >
              <Download class="h-4 w-4 mr-2 text-green-500" />
              Download File
            </Button>
          </div>

          <p v-if="!course.link_youtube && !course.link_drive && !course.files" 
             class="text-muted-foreground text-sm">
            Belum ada materi tersedia
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <h2 class="text-xl font-bold mb-2">Kursus tidak ditemukan</h2>
      <Button @click="router.push('/courses')">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Kembali
      </Button>
    </div>
  </div>
</template>