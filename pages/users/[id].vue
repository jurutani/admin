<script setup lang="ts">
import { ArrowLeft, Save, RotateCcw, User, Mail, Phone, MapPin, Calendar, Globe, FileText, Camera, Upload } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// Get user ID from route params
const userId = route.params.id as string

// Reactive states
const loading = ref(false)
const saving = ref(false)
const isUploading = ref(false)
const isRemoving = ref(false)

// File input ref
const fileInput = ref<HTMLInputElement>()

// Form data
const formData = ref({
  full_name: '',
  username: '',
  email: '',
  phone: '',
  address: '',
  bio: '',
  website: '',
  birth_date: '',
  avatar_url: ''
})

// Current avatar URL
const currentAvatar = computed(() => formData.value.avatar_url || '')

// Avatar upload handler
const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast({
      title: 'Error',
      description: 'File harus berupa gambar',
      variant: 'destructive',
    })
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast({
      title: 'Error',
      description: 'Ukuran file maksimal 5MB',
      variant: 'destructive',
    })
    return
  }

  try {
    isUploading.value = true

    // Get file extension
    const fileExtension = file.name.split('.').pop() || 'jpg'
    
    // Create bucket path: avatars/{user_id}.{extension}
    const bucketPath = `avatars/${userId}.${fileExtension}`

    // Upload directly to storage bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(bucketPath, file, {
        cacheControl: '3600',
        upsert: true // Replace if exists
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(bucketPath)

    const avatarUrl = urlData.publicUrl

    // Update form data with new avatar URL
    formData.value.avatar_url = avatarUrl

    toast({
      title: 'Berhasil!',
      description: 'Avatar berhasil diperbarui',
    })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat mengupload avatar',
      variant: 'destructive',
    })
  } finally {
    isUploading.value = false
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Remove avatar
const handleRemoveAvatar = async () => {
  if (!currentAvatar.value) return

  try {
    isRemoving.value = true

    // Remove from storage bucket
    const currentPath = `avatars/${userId}`
    
    // Remove file from bucket (try common extensions)
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    for (const ext of extensions) {
      try {
        await supabase.storage
          .from('avatars')
          .remove([`${currentPath}.${ext}`])
      } catch (e) {
        // Ignore errors, file might not exist with this extension
      }
    }

    // Update form data to remove avatar
    formData.value.avatar_url = ''

    toast({
      title: 'Berhasil!',
      description: 'Avatar berhasil dihapus',
    })
  } catch (error) {
    console.error('Error removing avatar:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menghapus avatar',
      variant: 'destructive',
    })
  } finally {
    isRemoving.value = false
  }
}

// Trigger file input
const triggerUpload = () => {
  fileInput.value?.click()
}

// Fetch user detail
async function fetchUserDetail() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user detail:', error)
      throw error
    }

    if (!data) {
      throw new Error('User not found')
    }

    // Set form data
    formData.value = {
      full_name: data.full_name || '',
      username: data.username || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      bio: data.bio || '',
      website: data.website || '',
      birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
      avatar_url: data.avatar_url || ''
    }

    // Process data to include status
    const processedData = {
      ...data,
      isActive: !data.deleted_at,
      isArchived: !!data.archived_at
    }

    return processedData
  } catch (error) {
    console.error('Error in fetchUserDetail:', error)
    throw error
  }
}

// Fetch user data
const { data: userDetail, pending: userPending, error: userError, refresh: refreshUser } = await useAsyncData(
  `user-detail-${userId}`,
  fetchUserDetail,
)

// Redirect if user not found
if (userError.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'User not found'
  })
}

// Helper functions
function formatDate(date: string | null) {
  if (!date) return 'Tidak tersedia'
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function goBack() {
  router.back()
}

// Update user function
async function updateUser() {
  if (!userDetail.value) return

  saving.value = true
  try {
    const updateData = {
      full_name: formData.value.full_name,
      username: formData.value.username,
      email: formData.value.email,
      phone: formData.value.phone,
      address: formData.value.address,
      bio: formData.value.bio,
      website: formData.value.website,
      birth_date: formData.value.birth_date || null,
      avatar_url: formData.value.avatar_url,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Data user berhasil diperbarui',
    })

    // Refresh data
    await refreshUser()

  } catch (error) {
    console.error('Error updating user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memperbarui data user',
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

// Set page title
useHead({
  title: `Detail User - ${userDetail.value?.full_name || 'Loading...'}`
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button @click="goBack" variant="ghost" size="icon">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold">Detail User</h1>
          <p class="text-sm text-gray-600">Edit informasi user</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <Button @click="refreshUser" variant="outline" :disabled="userPending">
          <RotateCcw class="h-4 w-4 mr-2" />
          {{ userPending ? 'Memuat...' : 'Refresh' }}
        </Button>
        <Button @click="updateUser" :disabled="saving || userPending || isUploading || isRemoving">
          <Save class="h-4 w-4 mr-2" />
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="userPending" class="flex items-center justify-center p-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat detail user...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="userError" class="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
      <p class="text-red-600 font-medium">Terjadi kesalahan saat memuat data user</p>
      <p class="text-red-500 text-sm mt-1">{{ userError.message }}</p>
      <Button @click="refreshUser" class="mt-4" variant="outline" size="sm">
        Coba Lagi
      </Button>
    </div>

    <!-- User Detail Form -->
    <div v-else-if="userDetail" class="grid gap-6 md:grid-cols-4">
      <!-- Profile Card -->
      <div class="md:col-span-1">
        <Card>
          <CardHeader class="text-center pb-4">
            <h3 class="text-lg font-medium mb-4">Foto Profile</h3>
            <div class="flex flex-col items-center space-y-4">
              <!-- Avatar Display -->
              <div class="relative">
                <!-- Avatar Image or Initials -->
                <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                  <img 
                    v-if="currentAvatar" 
                    :src="currentAvatar" 
                    :alt="userDetail.full_name || 'Avatar'"
                    class="w-full h-full object-cover"
                    @error="() => {}"
                  />
                  <div 
                    v-else 
                    class="text-2xl font-semibold text-gray-600"
                  >
                    {{ getInitials(userDetail.full_name || 'User') }}
                  </div>
                </div>

                <!-- Loading Overlay -->
                <div 
                  v-if="isUploading || isRemoving"
                  class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
                >
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2">
                <Button
                  @click="triggerUpload"
                  :disabled="isUploading || isRemoving"
                  size="sm"
                >
                  <div v-if="isUploading" class="flex items-center space-x-2">
                    <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Mengupload...</span>
                  </div>
                  <span v-else>
                    {{ currentAvatar ? 'Ganti Avatar' : 'Upload Avatar' }}
                  </span>
                </Button>

                <Button
                  v-if="currentAvatar"
                  @click="handleRemoveAvatar"
                  :disabled="isUploading || isRemoving"
                  variant="outline"
                  size="sm"
                >
                  <div v-if="isRemoving" class="flex items-center space-x-2">
                    <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                    <span>Menghapus...</span>
                  </div>
                  <span v-else>Hapus</span>
                </Button>
              </div>

              <!-- Hidden File Input -->
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleAvatarUpload"
              />

              <!-- Upload Info -->
              <p class="text-xs text-gray-500 text-center max-w-xs">
                Upload gambar JPG, PNG, atau GIF. Maksimal 5MB.
              </p>
            </div>
            
            <!-- Status Badges -->
            <div class="flex flex-wrap justify-center gap-2 mt-6">
              <Badge 
                :variant="userDetail.isActive ? 'default' : 'secondary'" 
                :class="userDetail.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ userDetail.isActive ? 'Aktif' : 'Tidak Aktif' }}
              </Badge>
              
              <Badge v-if="userDetail.isArchived" variant="outline" class="bg-orange-50 text-orange-700">
                Diarsipkan
              </Badge>
            </div>
            
            <!-- Role Badge -->
            <div class="flex justify-center mt-3">
              <Badge 
                variant="outline" 
                :class="{
                  'bg-purple-50 text-purple-700 border-purple-200': userDetail.role === 'admin',
                  'bg-blue-50 text-blue-700 border-blue-200': userDetail.role === 'user',
                  'bg-emerald-50 text-emerald-700 border-emerald-200': userDetail.role === 'moderator',
                  'bg-gray-50 text-gray-700 border-gray-200': !['admin', 'user', 'moderator'].includes(userDetail.role)
                }"
              >
                {{ userDetail.role?.charAt(0).toUpperCase() + userDetail.role?.slice(1) || 'User' }}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <!-- Timestamps -->
            <div class="text-sm space-y-2">
              <div>
                <label class="font-medium text-gray-500">Bergabung</label>
                <p class="text-xs">{{ formatDate(userDetail.created_at) }}</p>
              </div>
              
              <div>
                <label class="font-medium text-gray-500">Terakhir Diperbarui</label>
                <p class="text-xs">{{ formatDate(userDetail.updated_at) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Form -->
      <div class="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <User class="h-5 w-5" />
              Informasi User
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Basic Information -->
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  v-model="formData.full_name"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="username">Username</Label>
                <Input
                  id="username"
                  v-model="formData.username"
                  placeholder="Masukkan username"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  v-model="formData.email"
                  type="email"
                  placeholder="Masukkan email"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="phone">No. Telepon</Label>
                <Input
                  id="phone"
                  v-model="formData.phone"
                  placeholder="Masukkan no. telepon"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="birth_date">Tanggal Lahir</Label>
                <Input
                  id="birth_date"
                  v-model="formData.birth_date"
                  type="date"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="website">Website</Label>
                <Input
                  id="website"
                  v-model="formData.website"
                  placeholder="Masukkan website"
                />
              </div>
            </div>
            
            <!-- Address -->
            <div class="space-y-2">
              <Label for="address">Alamat</Label>
              <Textarea
                id="address"
                v-model="formData.address"
                placeholder="Masukkan alamat lengkap"
                rows="3"
              />
            </div>
            
            <!-- Bio -->
            <div class="space-y-2">
              <Label for="bio">Bio</Label>
              <Textarea
                id="bio"
                v-model="formData.bio"
                placeholder="Masukkan bio"
                rows="3"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>