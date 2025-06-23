// composables/useAuth.ts
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'
import { useToast } from '@/components/ui/toast'
import type { UserData } from '@/types/user' // pastikan kamu punya tipe UserData seperti yang kamu buat

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { showToast } = useToast()

  // Fungsi Login
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showToast({
        title: 'Login Gagal',
        description: error.message,
        variant: 'destructive',
      })
      return null
    }

    const user: User | null = data.user

    if (!user) {
      showToast({
        title: 'Login Gagal',
        description: 'User tidak ditemukan.',
        variant: 'destructive',
      })
      return null
    }

    // Ambil data dari tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      showToast({
        title: 'Login Gagal',
        description: 'Data profil tidak ditemukan.',
        variant: 'destructive',
      })
      return null
    }

    // Cek apakah is_admin true
    if (!profile.is_admin) {
      showToast({
        title: 'Akses Ditolak',
        description: 'Akun Anda tidak memiliki akses admin.',
        variant: 'destructive',
      })
      // Logout langsung
      await supabase.auth.signOut()
      return null
    }

    showToast({
      title: 'Login Berhasil',
      description: `Selamat datang, ${profile.full_name ?? 'Admin'}!`,
    })

    // Redirect ke dashboard atau halaman utama
    await router.push('/')

    // Return data user + profile
    return {
      user,
      profile: profile as UserData & { is_admin: boolean },
    }
  }

  // Fungsi Logout
  const logout = async () => {
    await supabase.auth.signOut()
    showToast({
      title: 'Logout Berhasil',
      description: 'Anda telah keluar.',
    })
    await router.push('/login')
  }

  return {
    login,
    logout,
  }
}
