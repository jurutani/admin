<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  editMode: {
    type: Boolean,
    default: false,
  },
  newsData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  title: '',
  sub_title: '',
  content: '',
  category: '',
  link: '',
  status_news: 'pending',
  attachments: '[]',
})

watch(() => props.newsData, (val) => {
  if (props.editMode && val) {
    form.value = {
      ...form.value,
      ...val,
      attachments: JSON.stringify(val.attachments || []),
    }
  }
}, { immediate: true })

function submitForm() {
  const formData = { ...form.value }
  try {
    formData.attachments = JSON.parse(formData.attachments)
  }
  catch {
    console.error('Invalid JSON format for attachments')
    return
  }

  emit('submit', formData)
  emit('close')
}
</script>

<template>
  <Card>
    <CardContent class="card-border-none">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label for="title">Judul</Label>
          <Input id="title" v-model="form.title" placeholder="Judul berita" />
        </div>

        <div>
          <Label for="sub_title">Sub Judul</Label>
          <Input id="sub_title" v-model="form.sub_title" placeholder="Sub judul (opsional)" />
        </div>
      </div>

      <div>
        <Label for="content">Konten</Label>
        <Textarea id="content" v-model="form.content" rows="" placeholder="Konten berita" />
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label for="category">Kategori</Label>
          <Input id="category" v-model="form.category" placeholder="Kategori berita" />
        </div>

        <div>
          <Label for="link">Link Referensi</Label>
          <Input id="link" v-model="form.link" placeholder="URL referensi (opsional)" />
        </div>
      </div>

      <div>
        <Label for="status_news">Status</Label>
        <select
          id="status_news"
          v-model="form.status_news"
          class="w-full border border-input rounded bg-background p-2"
        >
          <option value="pending">
            Pending
          </option>
          <option value="approved">
            Approved
          </option>
          <option value="rejected">
            Rejected
          </option>
        </select>
      </div>

      <div>
        <Label for="attachments">Lampiran (JSON)</Label>
        <Textarea
          id="attachments"
          v-model="form.attachments"
          rows="3"
          placeholder="[{&quot;name&quot;:&quot;file.pdf&quot;,&quot;url&quot;:&quot;#&quot;}]"
        />
        <p class="mt-1 text-xs text-muted-foreground">
          Format: [{"name":"nama_file","url":"url_file"}]
        </p>
      </div>
    </CardContent>

    <CardFooter class="flex justify-end gap-2">
      <Button variant="outline" @click="emit('close')">
        Batal
      </Button>
      <Button type="button" @click="submitForm">
        Simpan
      </Button>
    </CardFooter>
  </Card>
</template>
