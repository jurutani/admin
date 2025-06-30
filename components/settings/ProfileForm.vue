<script setup lang="ts">
import { cn } from '@/lib/utils'
import { toTypedSchema } from '@vee-validate/zod'
import { FieldArray, useForm } from 'vee-validate'
import { h, ref, onMounted, computed, watch } from 'vue'
import * as z from 'zod'
import { toast } from '~/components/ui/toast'
import { useAuth } from '~/composables/useAuth'

// Auth composable
const { user, profile, updateProfile, loading: authLoading } = useAuth()

// Local loading state
const isSubmitting = ref(false)

// Verified emails (bisa diganti dengan data dari database)
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

// Profile form schema - disesuaikan dengan struktur UserProfile
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
    urls: [],
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
      urls: newProfile.website ? [{ value: newProfile.website }] : [],
    })
  }
}, { immediate: true })

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
      urls: profile.value.website ? [{ value: profile.value.website }] : [],
    })
  }
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="authLoading" class="flex items-center justify-center py-8">
      <div class="flex items-center space-x-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span class="text-sm text-muted-foreground">Memuat profile...</span>
      </div>
    </div>

    <!-- Form -->
    <form v-else class="space-y-2" @submit="onSubmit">
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
      <div class="flex justify-start gap-2">
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
</template>