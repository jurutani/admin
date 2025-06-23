<script setup lang="ts">
import { ArrowLeft, Edit, Trash2, UserCheck, MapPin, Phone, Mail, Calendar, User, Globe, FileText, RotateCcw } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// Get user ID from route params
const userId = route.params.id as string

// Reactive states
const deleteDialogOpen = ref(false)
const loading = ref(false)

// Function to get avatar URL from bucket
function getAvatarUrl(avatarPath: string | null) {
  if (!avatarPath) return null
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`/${avatarPath}`)
  
  return data.publicUrl
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

    // Process data to include avatar URL and status
    const processedData = {
      ...data,
      email: data.email || '',
      avatarUrl: getAvatarUrl(data.avatar_url),
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
  fetchUserDetail
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

function formatDateOnly(date: string | null) {
  if (!date) return 'Tidak tersedia'
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
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

// User actions
async function deleteUser() {
  if (!userDetail.value) return

  loading.value = true
  try {
    // Soft delete: update deleted_at
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Petani berhasil dihapus dari sistem (soft delete)',
    })

    // Refresh data
    await refreshUser()

  } catch (error) {
    console.error('Error deleting user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menghapus petani',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
    deleteDialogOpen.value = false
  }
}

async function restoreUser() {
  if (!userDetail.value) return

  loading.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', userId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Petani berhasil dipulihkan',
    })

    // Refresh data
    await refreshUser()

  } catch (error) {
    console.error('Error restoring user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat memulihkan petani',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

async function archiveUser() {
  if (!userDetail.value) return

  loading.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      throw error
    }

    toast({
      title: 'Berhasil',
      description: 'Petani berhasil diarsipkan',
    })

    // Refresh data
    await refreshUser()

  } catch (error) {
    console.error('Error archiving user:', error)
    toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat mengarsipkan petani',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

// Set page title
useHead({
  title: `Detail Petani - ${userDetail.value?.full_name || 'Loading...'}`
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
          <h1 class="text-2xl font-bold">Detail Petani</h1>
          <p class="text-sm text-gray-600">Informasi lengkap tentang petani</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <Button @click="refreshUser" variant="outline" :disabled="userPending">
          <RotateCcw class="h-4 w-4 mr-2" />
          {{ userPending ? 'Memuat...' : 'Refresh' }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="userPending" class="flex items-center justify-center p-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2">Memuat detail petani...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="userError" class="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
      <p class="text-red-600 font-medium">Terjadi kesalahan saat memuat data petani</p>
      <p class="text-red-500 text-sm mt-1">{{ userError.message }}</p>
      <Button @click="refreshUser" class="mt-4" variant="outline" size="sm">
        Coba Lagi
      </Button>
    </div>

    <!-- User Detail Content -->
    <div v-else-if="userDetail" class="grid gap-6 md:grid-cols-3">
      <!-- Profile Card -->
      <div class="md:col-span-1">
        <Card>
          <CardHeader class="text-center pb-4">
            <div class="flex justify-center mb-4">
              <Avatar class="h-24 w-24">
                <AvatarImage :src="userDetail.avatarUrl" :alt="userDetail.full_name" />
                <AvatarFallback class="bg-green-100 text-green-700 text-xl">
                  {{ getInitials(userDetail.full_name || 'User') }}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle class="text-xl">{{ userDetail.full_name || 'Nama tidak tersedia' }}</CardTitle>
            <CardDescription>{{ userDetail.username || 'Username tidak tersedia' }}</CardDescription>
            
            <!-- Status Badges -->
            <div class="flex flex-wrap justify-center gap-2 mt-4">
              <Badge 
                :variant="userDetail.isActive ? 'default' : 'secondary'" 
                :class="userDetail.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ userDetail.isActive ? 'Aktif' : 'Tidak Aktif' }}
              </Badge>
              
              <Badge variant="outline" class="bg-blue-50 text-blue-700">
                {{ userDetail.role || 'petani' }}
              </Badge>
              
              <Badge v-if="userDetail.is_admin" variant="outline" class="bg-purple-50 text-purple-700">
                Admin
              </Badge>
              
              <Badge v-if="userDetail.isArchived" variant="outline" class="bg-orange-50 text-orange-700">
                Diarsipkan
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <!-- Action Buttons -->
            <div class="flex flex-col gap-2">
              <Button variant="outline" class="w-full" disabled>
                <Edit class="h-4 w-4 mr-2" />
                Edit Profil
              </Button>
              
              <Button 
                v-if="!userDetail.isActive" 
                @click="restoreUser" 
                class="w-full bg-green-600 hover:bg-green-700"
                :disabled="loading"
              >
                <UserCheck class="h-4 w-4 mr-2" />
                {{ loading ? 'Memulihkan...' : 'Pulihkan Akun' }}
              </Button>
              
              <AlertDialog v-model:open="deleteDialogOpen">
                <AlertDialogTrigger as-child>
                  <Button 
                    v-if="userDetail.isActive" 
                    variant="destructive" 
                    class="w-full"
                    :disabled="loading"
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Hapus Petani
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                    <AlertDialogDescription>
                      Apakah Anda yakin ingin menghapus petani <strong>{{ userDetail.full_name }}</strong>? 
                      Tindakan ini akan menonaktifkan akun petani (soft delete).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction @click="deleteUser" class="bg-red-600 hover:bg-red-700">
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Information Cards -->
      <div class="md:col-span-2 space-y-6">
        <!-- Personal Information -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <User class="h-5 w-5" />
              Informasi Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-sm font-medium text-gray-500">Nama Lengkap</label>
                <p class="mt-1">{{ userDetail.full_name || 'Tidak tersedia' }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Username</label>
                <p class="mt-1">{{ userDetail.username || 'Tidak tersedia' }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Email</label>
                <p class="mt-1 flex items-center gap-2">
                  <Mail class="h-4 w-4 text-gray-400" />
                  {{ userDetail.email || 'Tidak tersedia' }}
                </p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">No. Telepon</label>
                <p class="mt-1 flex items-center gap-2">
                  <Phone class="h-4 w-4 text-gray-400" />
                  {{ userDetail.phone || 'Tidak tersedia' }}
                </p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Tanggal Lahir</label>
                <p class="mt-1 flex items-center gap-2">
                  <Calendar class="h-4 w-4 text-gray-400" />
                  {{ formatDateOnly(userDetail.birth_date) }}
                </p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Website</label>
                <p class="mt-1 flex items-center gap-2">
                  <Globe class="h-4 w-4 text-gray-400" />
                  {{ userDetail.website || 'Tidak tersedia' }}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <label class="text-sm font-medium text-gray-500">Alamat</label>
              <p class="mt-1 flex items-start gap-2">
                <MapPin class="h-4 w-4 text-gray-400 mt-0.5" />
                {{ userDetail.address || 'Tidak tersedia' }}
              </p>
            </div>
            
            <div>
              <label class="text-sm font-medium text-gray-500">Bio</label>
              <p class="mt-1 flex items-start gap-2">
                <FileText class="h-4 w-4 text-gray-400 mt-0.5" />
                {{ userDetail.bio || 'Tidak tersedia' }}
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Account Status -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <UserCheck class="h-5 w-5" />
              Status Akun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-sm font-medium text-gray-500">Status</label>
                <div class="mt-1">
                  <Badge 
                    :variant="userDetail.isActive ? 'default' : 'secondary'" 
                    :class="userDetail.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ userDetail.isActive ? 'Aktif' : 'Tidak Aktif' }}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Role</label>
                <div class="mt-1">
                  <Badge variant="outline" class="bg-blue-50 text-blue-700">
                    {{ userDetail.role || 'petani' }}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Admin</label>
                <div class="mt-1">
                  <Badge 
                    :variant="userDetail.is_admin ? 'default' : 'secondary'"
                    :class="userDetail.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'"
                  >
                    {{ userDetail.is_admin ? 'Ya' : 'Tidak' }}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Diarsipkan</label>
                <div class="mt-1">
                  <Badge 
                    :variant="userDetail.isArchived ? 'default' : 'secondary'"
                    :class="userDetail.isArchived ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'"
                  >
                    {{ userDetail.isArchived ? 'Ya' : 'Tidak' }}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Timestamps -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Calendar class="h-5 w-5" />
              Riwayat Waktu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-gray-500">Bergabung</label>
                <p class="mt-1 text-sm">{{ formatDate(userDetail.created_at) }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-500">Terakhir Diperbarui</label>
                <p class="mt-1 text-sm">{{ formatDate(userDetail.updated_at) }}</p>
              </div>
              
              <div v-if="userDetail.deleted_at">
                <label class="text-sm font-medium text-gray-500">Dihapus</label>
                <p class="mt-1 text-sm text-red-600">{{ formatDate(userDetail.deleted_at) }}</p>
              </div>
              
              <div v-if="userDetail.archived_at">
                <label class="text-sm font-medium text-gray-500">Diarsipkan</label>
                <p class="mt-1 text-sm text-orange-600">{{ formatDate(userDetail.archived_at) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Debug Information -->
        <details class="bg-gray-50 p-4 rounded-lg">
          <summary class="cursor-pointer font-medium text-gray-700 mb-2">
            Debug: Raw User Data
          </summary>
          <pre class="text-xs bg-white p-3 rounded border overflow-auto max-h-60">{{ JSON.stringify(userDetail, null, 2) }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>