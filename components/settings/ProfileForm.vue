<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cn } from '@/lib/utils'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from '~/components/ui/toast'
import { useAuth } from '~/composables/useAuth'

// Auth composable
const { user, profile, updateProfile, loading: authLoading } = useAuth()

// Local loading states
const isUploading = ref(false)
const isRemoving = ref(false)
const isSubmitting = ref(false)

// File input ref
const fileInput = ref<HTMLInputElement>()

// Current avatar URL
const currentAvatar = computed(() => profile.value?.avatar_url || '')

// Get user initials for default avatar
const userInitials = computed(() => {
  const name = profile.value?.full_name || profile.value?.username || user.value?.email || 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Verified emails
const verifiedEmails = computed(() => {
  const emails = []
  if (user.value?.email) {
    emails.push(user.value.email)
  }
  if (profile.value?.email && profile.value.email !== user.value?.email) {
    emails.push(profile.value.email)
  }
  return emails
})

// Profile form schema
const profileFormSchema = toTypedSchema(z.object({
  username: z
    .string()
    .min(2, {
      message: 'Username harus minimal 2 karakter.',
    })
    .max(30, {
      message: 'Username tidak boleh lebih dari 30 karakter.',
    })
    .optional(),
  full_name: z
    .string()
    .min(2, {
      message: 'Nama lengkap harus minimal 2 karakter.',
    })
    .max(100, {
      message: 'Nama lengkap tidak boleh lebih dari 100 karakter.',
    })
    .optional(),
  email: z
    .string({
      required_error: 'Silakan pilih email untuk ditampilkan.',
    })
    .email()
    .optional(),
  bio: z
    .string()
    .max(500, { message: 'Bio tidak boleh lebih dari 500 karakter.' })
    .optional(),
  phone: z
    .string()
    .optional(),
  website: z
    .string()
    .url({ message: 'Silakan masukkan URL yang valid.' })
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .optional(),
}))

// Form setup
const { handleSubmit, resetForm, setValues, values } = useForm({
  validationSchema: profileFormSchema,
  initialValues: {
    username: '',
    full_name: '',
    email: '',
    bio: '',
    phone: '',
    website: '',
    address: '',
  },
})

// Load profile data into form when profile is available
watch(profile, (newProfile) => {
  if (newProfile) {
    setValues({
      username: newProfile.username || '',
      full_name: newProfile.full_name || '',
      email: newProfile.email || user.value?.email || '',
      bio: newProfile.bio || '',
      phone: newProfile.phone || '',
      website: newProfile.website || '',
      address: newProfile.address || '',
    })
  }
}, { immediate: true })

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

  if (!user.value?.id) {
    toast({
      title: 'Error',
      description: 'User ID tidak ditemukan',
      variant: 'destructive',
    })
    return
  }

  try {
    isUploading.value = true

    // Get file extension
    const fileExtension = file.name.split('.').pop() || 'jpg'
    
    // Create bucket path: avatars/{user_id}.{extension}
    const bucketPath = `avatars/${user.value.id}.${fileExtension}`

    // Upload directly to storage bucket (Supabase Storage example)
    const { data, error } = await $supabase.storage
      .from('profiles') // bucket name
      .upload(bucketPath, file, {
        cacheControl: '3600',
        upsert: true // Replace if exists
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = $supabase.storage
      .from('profiles')
      .getPublicUrl(bucketPath)

    const avatarUrl = urlData.publicUrl

    // Update profile with new avatar URL
    await updateProfile({ avatar_url: avatarUrl })

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
  if (!currentAvatar.value || !user.value?.id) return

  try {
    isRemoving.value = true

    // Remove from storage bucket
    // Extract path from current avatar URL if needed
    const currentPath = `avatars/${user.value.id}`
    
    // Remove file from bucket (try common extensions)
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    for (const ext of extensions) {
      try {
        await $supabase.storage
          .from('profiles')
          .remove([`${currentPath}.${ext}`])
      } catch (e) {
        // Ignore errors, file might not exist with this extension
      }
    }

    // Update profile to remove avatar
    await updateProfile({ avatar_url: null })

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

// Submit handler
const onSubmit = handleSubmit(async (values) => {
  if (!user.value) {
    toast({
      title: 'Error',
      description: 'Anda harus login terlebih dahulu',
      variant: 'destructive',
    })
    return
  }

  try {
    isSubmitting.value = true

    // Prepare update data
    const updateData = {
      username: values.username || null,
      full_name: values.full_name || null,
      email: values.email || null,
      bio: values.bio || null,
      phone: values.phone || null,
      website: values.website || null,
      address: values.address || null,
    }

    // Remove empty strings and convert to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null
      }
    })

    const result = await updateProfile(updateData)

    if (result) {
      toast({
        title: 'Berhasil!',
        description: 'Profile berhasil diperbarui',
      })
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memperbarui profile',
      variant: 'destructive',
    })
  } finally {
    isSubmitting.value = false
  }
})

// Reset form to current profile values
const handleReset = () => {
  if (profile.value) {
    setValues({
      username: profile.value.username || '',
      full_name: profile.value.full_name || '',
      email: profile.value.email || user.value?.email || '',
      bio: profile.value.bio || '',
      phone: profile.value.phone || '',
      website: profile.value.website || '',
      address: profile.value.address || '',
    })
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Loading state -->
    <div v-if="authLoading" class="flex items-center justify-center py-8">
      <div class="flex items-center space-x-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span class="text-sm text-muted-foreground">Memuat profile...</span>
      </div>
    </div>

    <div v-else class="space-y-8">
      <!-- Avatar Section -->
      <div class="border-b pb-6">
        <h3 class="text-lg font-medium mb-4">Foto Profile</h3>
        <div class="flex flex-col items-center space-y-4">
          <!-- Avatar Display -->
          <div class="relative">
            <!-- Avatar Image or Initials -->
            <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
              <img 
                v-if="currentAvatar" 
                :src="currentAvatar" 
                :alt="profile?.full_name || 'Avatar'"
                class="w-full h-full object-cover"
                @error="() => {}"
              />
              <div 
                v-else 
                class="text-2xl font-semibold text-gray-600"
              >
                {{ userInitials }}
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
      </div>

      <!-- Profile Form Section -->
      <div>
        <h3 class="text-lg font-medium mb-4">Informasi Profile</h3>
        <form class="space-y-4" @submit="onSubmit">
          <!-- Full Name -->
          <FormField v-slot="{ componentField }" name="full_name">
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="Masukkan nama lengkap" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Username -->
          <FormField v-slot="{ componentField }" name="username">
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="username" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Email -->
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Select v-bind="componentField" :disabled="isSubmitting">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih email" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="email in verifiedEmails" :key="email" :value="email">
                      {{ email }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Phone -->
          <FormField v-slot="{ componentField }" name="phone">
            <FormItem>
              <FormLabel>Nomor Telepon</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="+62 812 3456 7890" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Bio -->
          <FormField v-slot="{ componentField }" name="bio">
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Ceritakan sedikit tentang diri Anda" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Website -->
          <FormField v-slot="{ componentField }" name="website">
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input 
                  type="url" 
                  placeholder="https://example.com" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Address -->
          <FormField v-slot="{ componentField }" name="address">
            <FormItem>
              <FormLabel>Alamat</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Masukkan alamat Anda" 
                  v-bind="componentField" 
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Form Actions -->
          <div class="flex justify-start gap-2 pt-4">
            <Button 
              type="submit" 
              :disabled="isSubmitting || authLoading"
              class="min-w-32"
            >
              <div v-if="isSubmitting" class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Memperbarui...</span>
              </div>
              <span v-else>Perbarui Profile</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              @click="handleReset"
              :disabled="isSubmitting || authLoading"
            >
              Reset
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>