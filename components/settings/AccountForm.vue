<script setup lang="ts">
import { ref, computed } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from '~/components/ui/toast'
import { useAuth } from '~/composables/useAuth'

// Auth composable
const { user, updatePassword } = useAuth()

// Local loading state
const isUpdating = ref(false)

// Show/hide password states
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Password form schema
const passwordFormSchema = toTypedSchema(z.object({
  current_password: z
    .string()
    .min(1, { message: 'Password saat ini harus diisi' }),
  new_password: z
    .string()
    .min(8, { message: 'Password baru harus minimal 8 karakter' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password harus mengandung huruf kecil, huruf besar, dan angka'
    }),
  confirm_password: z
    .string()
    .min(1, { message: 'Konfirmasi password harus diisi' })
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirm_password']
}))

// Form setup
const { handleSubmit, resetForm, values } = useForm({
  validationSchema: passwordFormSchema,
  initialValues: {
    current_password: '',
    new_password: '',
    confirm_password: ''
  }
})

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
    isUpdating.value = true

    // Update password using auth composable
    const result = await updatePassword({
      currentPassword: values.current_password,
      newPassword: values.new_password
    })

    if (result.success) {
      // Reset form on success
      resetForm()
      
      // Hide all password fields
      showCurrentPassword.value = false
      showNewPassword.value = false
      showConfirmPassword.value = false

      toast({
        title: 'Berhasil!',
        description: 'Password berhasil diperbarui',
      })
    } else {
      toast({
        title: 'Gagal',
        description: result.error || 'Terjadi kesalahan saat memperbarui password',
        variant: 'destructive',
      })
    }
  } catch (error) {
    console.error('Error updating password:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memperbarui password',
      variant: 'destructive',
    })
  } finally {
    isUpdating.value = false
  }
})

// Reset form
const handleReset = () => {
  resetForm()
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

// Password strength indicator
const passwordStrength = computed(() => {
  const password = values.new_password || ''
  let score = 0
  
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++
  
  if (score < 2) return { text: 'Lemah', color: 'text-red-500', width: '20%' }
  if (score < 4) return { text: 'Sedang', color: 'text-yellow-500', width: '60%' }
  return { text: 'Kuat', color: 'text-green-500', width: '100%' }
})
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="space-y-6">
      <!-- Header -->
      <div class="text-center">
        <h3 class="text-lg font-semibold">Ubah Password</h3>
        <p class="text-sm text-muted-foreground">
          Pastikan password baru Anda aman dan mudah diingat
        </p>
      </div>

      <!-- Form -->
      <form @submit="onSubmit" class="space-y-4">
        <!-- Current Password -->
        <FormField v-slot="{ componentField }" name="current_password">
          <FormItem>
            <FormLabel>Password Saat Ini</FormLabel>
            <FormControl>
              <div class="relative">
                <Input 
                  :type="showCurrentPassword ? 'text' : 'password'"
                  placeholder="Masukkan password saat ini" 
                  v-bind="componentField" 
                  :disabled="isUpdating"
                  class="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  @click="showCurrentPassword = !showCurrentPassword"
                  :disabled="isUpdating"
                >
                  <Icon 
                    :name="showCurrentPassword ? 'lucide:eye-off' : 'lucide:eye'" 
                    class="h-4 w-4 text-muted-foreground" 
                  />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- New Password -->
        <FormField v-slot="{ componentField }" name="new_password">
          <FormItem>
            <FormLabel>Password Baru</FormLabel>
            <FormControl>
              <div class="relative">
                <Input 
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Masukkan password baru" 
                  v-bind="componentField" 
                  :disabled="isUpdating"
                  class="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  @click="showNewPassword = !showNewPassword"
                  :disabled="isUpdating"
                >
                  <Icon 
                    :name="showNewPassword ? 'lucide:eye-off' : 'lucide:eye'" 
                    class="h-4 w-4 text-muted-foreground" 
                  />
                </Button>
              </div>
            </FormControl>
            
            <!-- Password Strength Indicator -->
            <div v-if="values.new_password" class="mt-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-muted-foreground">Kekuatan Password:</span>
                <span :class="passwordStrength.color">{{ passwordStrength.text }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="{
                    'bg-red-500': passwordStrength.text === 'Lemah',
                    'bg-yellow-500': passwordStrength.text === 'Sedang',
                    'bg-green-500': passwordStrength.text === 'Kuat'
                  }"
                  :style="{ width: passwordStrength.width }"
                ></div>
              </div>
            </div>
            
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Confirm Password -->
        <FormField v-slot="{ componentField }" name="confirm_password">
          <FormItem>
            <FormLabel>Konfirmasi Password Baru</FormLabel>
            <FormControl>
              <div class="relative">
                <Input 
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Konfirmasi password baru" 
                  v-bind="componentField" 
                  :disabled="isUpdating"
                  class="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  @click="showConfirmPassword = !showConfirmPassword"
                  :disabled="isUpdating"
                >
                  <Icon 
                    :name="showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'" 
                    class="h-4 w-4 text-muted-foreground" 
                  />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Password Requirements -->
        <div class="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p class="font-medium mb-1">Password harus memenuhi:</p>
          <ul class="space-y-1">
            <li class="flex items-center gap-2">
              <Icon 
                name="lucide:check" 
                class="h-3 w-3"
                :class="values.new_password && values.new_password.length >= 8 ? 'text-green-500' : 'text-gray-400'"
              />
              Minimal 8 karakter
            </li>
            <li class="flex items-center gap-2">
              <Icon 
                name="lucide:check" 
                class="h-3 w-3"
                :class="values.new_password && /[a-z]/.test(values.new_password) ? 'text-green-500' : 'text-gray-400'"
              />
              Mengandung huruf kecil
            </li>
            <li class="flex items-center gap-2">
              <Icon 
                name="lucide:check" 
                class="h-3 w-3"
                :class="values.new_password && /[A-Z]/.test(values.new_password) ? 'text-green-500' : 'text-gray-400'"
              />
              Mengandung huruf besar
            </li>
            <li class="flex items-center gap-2">
              <Icon 
                name="lucide:check" 
                class="h-3 w-3"
                :class="values.new_password && /\d/.test(values.new_password) ? 'text-green-500' : 'text-gray-400'"
              />
              Mengandung angka
            </li>
          </ul>
        </div>

        <!-- Form Actions -->
        <div class="flex gap-2 pt-2">
          <Button 
            type="submit" 
            :disabled="isUpdating"
            class="flex-1"
          >
            <div v-if="isUpdating" class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>Memperbarui...</span>
            </div>
            <span v-else>Ubah Password</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            @click="handleReset"
            :disabled="isUpdating"
          >
            Reset
          </Button>
        </div>
      </form>

      <!-- Security Tips -->
      <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="flex items-start gap-3">
          <Icon name="lucide:shield-check" class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm">
            <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">Tips Keamanan:</p>
            <ul class="text-blue-700 dark:text-blue-200 space-y-1">
              <li>• Gunakan kombinasi huruf, angka, dan simbol</li>
              <li>• Jangan gunakan informasi pribadi</li>
              <li>• Gunakan password yang berbeda untuk setiap akun</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>