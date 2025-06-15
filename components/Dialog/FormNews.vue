<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

const supabase = useSupabaseClient()
const { toast } = useToast()

const props = defineProps<{
  open: boolean
  newsItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const categories = ref<{ name: string; value: string }[]>([])
const loading = ref(false)
const uploading = ref(false)

const form = ref({
  title: '',
  sub_title: '',
  content: '',
  category: '',
  link: '',
  status_news: 'pending',
  image_file: null as File | null,
  attachment_file: null as File | null
})

const isEdit = computed(() => !!props.newsItem)

onMounted(async () => {
  await fetchCategories()
})

watch(() => props.newsItem, (newItem) => {
  if (newItem) {
    form.value = {
      title: newItem.title || '',
      sub_title: newItem.sub_title || '',
      content: newItem.content || '',
      category: newItem.category || '',
      link: newItem.link || '',
      status_news: newItem.status_news || 'pending',
      image_file: null,
      attachment_file: null
    }
  } else {
    resetForm()
  }
}, { immediate: true })

async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('category_news')
      .select('name, value')
      .order('name', { ascending: true })

    if (error) throw error
    categories.value = data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

async function uploadFile(file: File, bucket: string, folder: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    return filePath
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

async function handleSubmit() {
  if (!form.value.title || !form.value.category) {
    toast({
      title: "Error",
      description: "Title dan kategori harus diisi",
      variant: "destructive"
    })
    return
  }

  loading.value = true
  uploading.value = true

  try {
    let imageUrl = props.newsItem?.image_url || null
    let attachmentUrl = props.newsItem?.attachment_url || null

    // Upload image jika ada
    if (form.value.image_file) {
      const newsId = props.newsItem?.id || crypto.randomUUID()
      imageUrl = await uploadFile(form.value.image_file, 'news-images', `images/${newsId}`)
    }

    // Upload attachment jika ada
    if (form.value.attachment_file) {
      const newsId = props.newsItem?.id || crypto.randomUUID()
      attachmentUrl = await uploadFile(form.value.attachment_file, 'news-attachments', `attachments/${newsId}`)
    }

    const newsData = {
      title: form.value.title,
      sub_title: form.value.sub_title,
      content: form.value.content,
      category: form.value.category,
      link: form.value.link,
      status_news: form.value.status_news,
      image_url: imageUrl,
      attachment_url: attachmentUrl,
      updated_at: new Date().toISOString()
    }

    let result
    if (isEdit.value) {
      result = await supabase
        .from('news')
        .update(newsData)
        .eq('id', props.newsItem.id)
    } else {
      result = await supabase
        .from('news')
        .insert({
          ...newsData,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) throw result.error

    toast({
      title: "Berhasil",
      description: `Berita berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving news:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan berita",
      variant: "destructive"
    })
  } finally {
    loading.value = false
    uploading.value = false
  }
}

function resetForm() {
  form.value = {
    title: '',
    sub_title: '',
    content: '',
    category: '',
    link: '',
    status_news: 'pending',
    image_file: null,
    attachment_file: null
  }
}

function onImageChange(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.image_file = target.files?.[0] || null
}

function onAttachmentChange(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.attachment_file = target.files?.[0] || null
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Berita' : 'Tambah Berita Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="title">Judul *</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="Masukkan judul berita"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="sub_title">Sub Judul</Label>
          <Input
            id="sub_title"
            v-model="form.sub_title"
            placeholder="Masukkan sub judul"
          />
        </div>

        <div class="space-y-2">
          <Label for="category">Kategori *</Label>
          <Select v-model="form.category" required>
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="cat in categories"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="content">Konten</Label>
          <Textarea
            id="content"
            v-model="form.content"
            placeholder="Masukkan konten berita"
            rows="6"
          />
        </div>

        <div class="space-y-2">
          <Label for="link">Link</Label>
          <Input
            id="link"
            v-model="form.link"
            type="url"
            placeholder="https://example.com"
          />
        </div>

        <div class="space-y-2">
          <Label for="status">Status</Label>
          <Select v-model="form.status_news">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="image">Gambar</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            @change="onImageChange"
          />
        </div>

        <div class="space-y-2">
          <Label for="attachment">Lampiran</Label>
          <Input
            id="attachment"
            type="file"
            @change="onAttachmentChange"
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
          <Button type="submit" :disabled="loading">
            <span v-if="loading">
              {{ uploading ? 'Mengupload...' : 'Menyimpan...' }}
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