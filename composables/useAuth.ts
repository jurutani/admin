import type { User, Session } from '@supabase/supabase-js'
import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'

interface UserProfile {
  id: string
  created_at: string
  updated_at: string
  username?: string
  full_name?: string
  avatar_url?: string
  website?: string
  phone?: string
  bio?: string
  is_admin: boolean
  role?: string
  birth_date?: string
  deleted_at?: string
  archived_at?: string
  address?: string
  email?: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
}

const authState = ref<AuthState>({
  user: null,
  profile: null,
  session: null,
  loading: true
})

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Computed properties
  const user = computed(() => authState.value.user)
  const profile = computed(() => authState.value.profile)
  const session = computed(() => authState.value.session)
  const loading = computed(() => authState.value.loading)
  const isAuthenticated = computed(() => !!authState.value.user)
  const isAdmin = computed(() => authState.value.profile?.is_admin === true)

  // Initialize auth state
  const initialize = async () => {
    try {
      authState.value.loading = true
      
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession()
      
      if (initialSession?.user) {
        authState.value.user = initialSession.user
        authState.value.session = initialSession
        await fetchProfile(initialSession.user.id)
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        authState.value.user = session?.user ?? null
        authState.value.session = session
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          authState.value.profile = null
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      authState.value.loading = false
    }
  }

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      authState.value.profile = profile
      return profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: 'Login Gagal',
          description: error.message === 'Invalid login credentials' 
            ? 'Email atau password salah' 
            : error.message,
          variant: 'destructive',
        })
        return null
      }

      if (!data.user) {
        toast({
          title: 'Login Gagal',
          description: 'Terjadi kesalahan saat login',
          variant: 'destructive',
        })
        return null
      }

      // Fetch profile to check admin status
      const profile = await fetchProfile(data.user.id)
      
      if (!profile) {
        toast({
          title: 'Login Gagal',
          description: 'Profile tidak ditemukan',
          variant: 'destructive',
        })
        await logout()
        return null
      }

      // Check if user is admin
      if (!profile.is_admin) {
        toast({
          title: 'Akses Ditolak',
          description: 'Hanya admin yang dapat mengakses sistem ini',
          variant: 'destructive',
        })
        await logout()
        return null
      }

      toast({
        title: 'Login Berhasil',
        description: `Selamat datang, ${profile.full_name || profile.username || 'Admin'}!`,
      })

      // Redirect to 
      await router.push('/')
      return { user: data.user, profile }
      
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: 'Login Gagal',
        description: 'Terjadi kesalahan sistem',
        variant: 'destructive',
      })
      return null
    }
  }

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        toast({
          title: 'Logout Gagal',
          description: error.message,
          variant: 'destructive',
        })
        return false
      }

      // Clear state
      authState.value.user = null
      authState.value.profile = null
      authState.value.session = null

      toast({
        title: 'Logout Berhasil',
        description: 'Anda telah berhasil keluar',
      })

      // Redirect to login
      await router.push('/login')
      return true
      
    } catch (error) {
      console.error('Logout error:', error)
      return false
    }
  }

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.value.user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', authState.value.user.id)
        .select()
        .single()

      if (error) {
        console.error('Update profile error:', error)
        toast({
          title: 'Update Gagal',
          description: error.message,
          variant: 'destructive',
        })
        return null
      }

      authState.value.profile = data
      toast({
        title: 'Update Berhasil',
        description: 'Profile berhasil diperbarui',
      })

      return data
    } catch (error) {
      console.error('Update profile error:', error)
      toast({
        title: 'Update Gagal',
        description: 'Terjadi kesalahan saat mengupdate profile',
        variant: 'destructive',
      })
      return null
    }
  }

  // Check admin middleware
  const requireAdmin = () => {
    if (!isAuthenticated.value) {
      router.push('/login')
      return false
    }

    if (!isAdmin.value) {
      toast({
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki akses admin',
        variant: 'destructive',
      })
      router.push('/login')
      return false
    }

    return true
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast({
          title: 'Reset Password Gagal',
          description: error.message,
          variant: 'destructive',
        })
        return false
      }

      toast({
        title: 'Email Terkirim',
        description: 'Link reset password telah dikirim ke email Anda',
      })

      return true
    } catch (error) {
      console.error('Reset password error:', error)
      return false
    }
  }

  return {
    // State
    user: readonly(user),
    profile: readonly(profile),
    session: readonly(session),
    loading: readonly(loading),
    isAuthenticated: readonly(isAuthenticated),
    isAdmin: readonly(isAdmin),

    // Methods
    initialize,
    login,
    logout,
    updateProfile,
    requireAdmin,
    resetPassword,
    fetchProfile,
  }
}