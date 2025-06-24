<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Video, ExternalLink } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const { toast } = useToast()

const props = defineProps<{
  open: boolean
  videoItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)

const form = ref({
  title: '',
  description: '',
  link_yt: ''
})

const isEdit = computed(() => !!props.videoItem)

// Watch for changes in videoItem
watch(() => props.videoItem, (newItem) => {
  if (newItem) {
    form.value = {
      title: newItem.title || '',
      description: newItem.description || '',
      link_yt: newItem.link_yt || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// YouTube URL validation and preview
const isValidYouTubeUrl = computed(() => {
  if (!form.value.link_yt) return false
  const youtubeRegex = /^(https?:\/\/)?(www\.)?((youtube\.com\/(watch\?v=|embed\/))|(youtu\.be\/))([a-zA-Z0-9_-]{11})/
  return youtubeRegex.test(form.value.link_yt)
})

const youtubeVideoId = computed(() => {
  if (!isValidYouTubeUrl.value) return null
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = form.value.link_yt.match(regExp)
  return (match && match[7].length === 11) ? match[7] : null
})

const youtubeThumbnail = computed(() => {
  return youtubeVideoId.value ? `https://img.youtube.com/vi/${youtubeVideoId.value}/mqdefault.jpg` : null
})

async function handleSubmit() {
  if (!form.value.title || !form.value.link_yt) {
    toast({
      title: "Error",
      description: "Judul dan Link YouTube harus diisi",
      variant: "destructive"
    })
    return
  }

  if (!isValidYouTubeUrl.value) {
    toast({
      title: "Error",
      description: "Format URL YouTube tidak valid",
      variant: "destructive"
    })
    return
  }

  loading.value = true

  try {
    const videoData = {
      title: form.value.title,
      description: form.value.description || null,
      link_yt: form.value.link_yt,
      updated_at: new Date().toISOString()
    }

    let result
    if (isEdit.value) {
      result = await supabase
        .from('videos')
        .update(videoData)
        .eq('id', props.videoItem.id)
    } else {
      result = await supabase
        .from('videos')
        .insert({
          ...videoData,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) throw result.error

    toast({
      title: "Berhasil",
      description: `Video berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving video:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan video",
      variant: "destructive"
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    title: '',
    description: '',
    link_yt: ''
  }
}

function openYouTubeVideo() {
  if (form.value.link_yt) {
    window.open(form.value.link_yt, '_blank')
  }
}

function formatYouTubeUrl() {
  // Auto-format common YouTube URL patterns
  let url = form.value.link_yt.trim()
  
  if (url && !url.startsWith('http')) {
    // Handle youtu.be short links
    if (url.includes('youtu.be/')) {
      url = 'https://' + url
    }
    // Handle youtube.com links
    else if (url.includes('youtube.com/')) {
      url = 'https://' + url
    }
    // Handle bare video IDs
    else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      url = `https://www.youtube.com/watch?v=${url}`
    }
    
    form.value.link_yt = url
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <Video class="h-5 w-5" />
          <span>{{ isEdit ? 'Edit Video' : 'Tambah Video Baru' }}</span>
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="title">Judul Video *</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="Masukkan judul video"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="link_yt">Link YouTube *</Label>
          <div class="flex space-x-2">
            <Input
              id="link_yt"
              v-model="form.link_yt"
              type="url"
              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              required
              @blur="formatYouTubeUrl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="!form.link_yt"
              @click="openYouTubeVideo"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="form.link_yt && !isValidYouTubeUrl" class="text-sm text-red-600">
            Format URL YouTube tidak valid
          </div>
        </div>

        <!-- YouTube Preview -->
        <div v-if="youtubeThumbnail" class="space-y-2">
          <Label>Preview</Label>
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="flex items-start space-x-4">
              <img
                :src="youtubeThumbnail"
                :alt="form.title || 'Video thumbnail'"
                class="w-32 h-24 object-cover rounded"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">{{ form.title || 'Judul belum diisi' }}</p>
                <p class="text-xs text-gray-500 mt-1">Video ID: {{ youtubeVideoId }}</p>
                <div class="flex items-center space-x-1 mt-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span class="text-xs text-green-600">URL YouTube valid</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="description">Deskripsi</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Masukkan deskripsi video (opsional)"
            rows="4"
          />
        </div>

        <div class="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            :disabled="loading"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            :disabled="loading || !isValidYouTubeUrl"
          >
            <span v-if="loading">
              Menyimpan...
            </span>
            <span v-else>
              {{ isEdit ? 'Update' : 'Simpan' }}
            </span>
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>