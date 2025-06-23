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
  marketItem?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const categories = ref<{ name: string; value: string }[]>([])
const loading = ref(false)
const uploading = ref(false)

const form = ref({
  name: '',
  description: '',
  price: '',
  price_range: '',
  category: '',
  seller: '',
  contact_seller: '',
  shopee_link: '',
  tiktok_link: '',
  tokopedia_link: '',
  status: 'Pending',
  image_file: null as File | null
})

const isEdit = computed(() => !!props.marketItem)

onMounted(async () => {
  await fetchCategories()
})

watch(() => props.marketItem, (newItem) => {
  if (newItem) {
    form.value = {
      name: newItem.name || '',
      description: newItem.description || '',
      price: newItem.price?.toString() || '',
      price_range: newItem.price_range || '',
      category: newItem.category || '',
      seller: newItem.seller || '',
      contact_seller: newItem.contact_seller || '',
      shopee_link: newItem.links?.shopee_link || '',
      tiktok_link: newItem.links?.tiktok_link || '',
      tokopedia_link: newItem.links?.tokopedia_link || '',
      status: newItem.status || 'Pending',
      image_file: null
    }
  } else {
    resetForm()
  }
}, { immediate: true })

async function fetchCategories() {
  try {
    // Menggunakan kategori default untuk market, atau fetch dari database jika ada table category_market
    categories.value = [
      { name: 'Hasil Pertanian', value: 'Hasil Pertanian' },
      { name: 'Peralatan Pertanian', value: 'Peralatan Pertanian' },
      { name: 'Pupuk & Pestisida', value: 'Pupuk & Pestisida' },
      { name: 'Benih & Bibit', value: 'Benih & Bibit' },
      { name: 'Produk Olahan', value: 'Produk Olahan' },
      { name: 'Lainnya', value: 'Lainnya' }
    ]
    
    // Jika ada table category_market, uncomment code dibawah ini:
    /*
    const { data, error } = await supabase
      .from('category_market')
      .select('name, value')
      .order('name', { ascending: true })

    if (error) throw error
    categories.value = data || []
    */
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
  if (!form.value.name || !form.value.category || !form.value.seller) {
    toast({
      title: "Error",
      description: "Nama produk, kategori, dan nama penjual harus diisi",
      variant: "destructive"
    })
    return
  }

  loading.value = true
  uploading.value = true

  try {
    let imageUrl = null
    let existingAttachments = null

    // Parse existing attachments jika edit mode
    if (props.marketItem?.attachments) {
      try {
        existingAttachments = typeof props.marketItem.attachments === 'string' 
          ? JSON.parse(props.marketItem.attachments) 
          : props.marketItem.attachments
        imageUrl = existingAttachments?.url_image || null
      } catch (e) {
        console.error('Error parsing attachments:', e)
      }
    }

    // Upload image jika ada
    if (form.value.image_file) {
      const marketId = props.marketItem?.id || crypto.randomUUID()
      const uploadedPath = await uploadFile(form.value.image_file, 'market-images', `markets/${marketId}`)
      if (uploadedPath) {
        imageUrl = uploadedPath
      }
    }

    const marketData = {
      name: form.value.name,
      description: form.value.description,
      price: form.value.price ? parseInt(form.value.price) : null,
      price_range: form.value.price_range || null,
      category: form.value.category,
      seller: form.value.seller,
      contact_seller: form.value.contact_seller,
      links: {
        shopee_link: form.value.shopee_link || null,
        tiktok_link: form.value.tiktok_link || null,
        tokopedia_link: form.value.tokopedia_link || null
      },
      attachments: imageUrl ? JSON.stringify({ url_image: imageUrl }) : null,
      status: form.value.status,
      updated_at: new Date().toISOString()
    }

    let result
    if (isEdit.value) {
      result = await supabase
        .from('markets')
        .update(marketData)
        .eq('id', props.marketItem.id)
    } else {
      result = await supabase
        .from('markets')
        .insert({
          ...marketData,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) throw result.error

    toast({
      title: "Berhasil",
      description: `Produk berhasil ${isEdit.value ? 'diperbarui' : 'dibuat'}`
    })

    emit('success')
    emit('update:open', false)
    resetForm()

  } catch (error) {
    console.error('Error saving market:', error)
    toast({
      title: "Error",
      description: "Gagal menyimpan produk",
      variant: "destructive"
    })
  } finally {
    loading.value = false
    uploading.value = false
  }
}

function resetForm() {
  form.value = {
    name: '',
    description: '',
    price: '',
    price_range: '',
    category: '',
    seller: '',
    contact_seller: '',
    shopee_link: '',
    tiktok_link: '',
    tokopedia_link: '',
    status: 'Pending',
    image_file: null
  }
}

function onImageChange(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.image_file = target.files?.[0] || null
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEdit ? 'Edit Produk' : 'Tambah Produk Baru' }}
        </DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="name">Nama Produk *</Label>
          <Input
            id="name"
            v-model="form.name"
            placeholder="Masukkan nama produk"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="description">Deskripsi</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Masukkan deskripsi produk"
            rows="4"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="price">Harga</Label>
            <Input
              id="price"
              v-model="form.price"
              type="number"
              placeholder="500000"
            />
          </div>

          <div class="space-y-2">
            <Label for="price_range">Rentang Harga</Label>
            <Input
              id="price_range"
              v-model="form.price_range"
              placeholder="500000 - 1000000"
            />
          </div>
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

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="seller">Nama Penjual *</Label>
            <Input
              id="seller"
              v-model="form.seller"
              placeholder="Masukkan nama penjual"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="contact_seller">Kontak Penjual</Label>
            <Input
              id="contact_seller"
              v-model="form.contact_seller"
              placeholder="08xxxxxxxxxx"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label>Link Marketplace</Label>
          <div class="space-y-2">
            <Input
              v-model="form.shopee_link"
              placeholder="Link Shopee"
              type="url"
            />
            <Input
              v-model="form.tiktok_link"
              placeholder="Link TikTok Shop"
              type="url"
            />
            <Input
              v-model="form.tokopedia_link"
              placeholder="Link Tokopedia"
              type="url"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="status">Status</Label>
          <Select v-model="form.status">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="image">Gambar Produk</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            @change="onImageChange"
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