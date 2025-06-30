<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/composables/useAuth'
import { Loader2 } from 'lucide-vue-next'
import PasswordInput from '~/components/PasswordInput.vue'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)

const { login, loginWithGoogle } = useAuth()
const { toast } = useToast()

async function onSubmit(event: Event) {
  event.preventDefault()
  
  if (!email.value || !password.value) {
    toast({
      title: 'Form tidak lengkap',
      description: 'Email dan password wajib diisi.',
      variant: 'destructive',
    })
    return
  }

  isLoading.value = true

  try {
    const result = await login(email.value, password.value)

    if (result) {
      // Login berhasil, reset form
      email.value = ''
      password.value = ''
    }
  } catch (error) {
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleLogin() {
  isGoogleLoading.value = true
  
  try {
    await loginWithGoogle()
  } catch (error) {
    console.error('Google login error:', error)
    toast({
      title: 'Login Gagal',
      description: 'Terjadi kesalahan saat login dengan Google',
      variant: 'destructive',
    })
  } finally {
    isGoogleLoading.value = false
  }
}

// Computed untuk disabled state
const isFormDisabled = computed(() => isLoading.value || isGoogleLoading.value)
</script>

<template>
  <form class="grid gap-6" @submit="onSubmit">
    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        v-model="email"
        type="email"
        placeholder="name@example.com"
        :disabled="isFormDisabled"
        autocapitalize="none"
        autocomplete="email"
        autocorrect="off"
        required
      />
    </div>
    
    <div class="grid gap-2">
      <div class="flex items-center">
        <Label for="password">Password</Label>
      </div>
      <PasswordInput 
        id="password" 
        v-model="password" 
        :disabled="isFormDisabled"
        required
      />
    </div>
    
    <Button 
      type="submit" 
      class="w-full" 
      :disabled="isFormDisabled"
    >
      <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
      {{ isLoading ? 'Signing in...' : 'Sign In' }}
    </Button>
  </form>
</template>