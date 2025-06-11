export function useAuth() {
  const supabase = useSupabaseClient();
  const user = useSupabaseService(); // Dari Nuxt Supabase module

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Gunakan toast dari shadcn-vue
        const { toast } = await import('vue-sonner');
        toast.error('Login gagal', {
          description: error.message,
        });
        throw error;
      }

      // Success toast
      const { toast } = await import('vue-sonner');
      toast.success('Login berhasil', {
        description: 'Selamat datang kembali!',
      });

      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        const { toast } = await import('vue-sonner');
        toast.error('Logout gagal', {
          description: error.message,
        });
        throw error;
      }

      // Success toast
      const { toast } = await import('vue-sonner');
      toast.success('Logout berhasil', {
        description: 'Sampai jumpa lagi!',
      });

      // Redirect ke login page
      await navigateTo('/login');
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        const { toast } = await import('vue-sonner');
        toast.error('Registrasi gagal', {
          description: error.message,
        });
        throw error;
      }

      const { toast } = await import('vue-sonner');
      toast.success('Registrasi berhasil', {
        description: 'Silakan cek email untuk verifikasi',
      });

      return data;
    } catch (err) {
      console.error('SignUp error:', err);
      throw err;
    }
  };

  return {
    user: readonly(user), // Reactive user dari Nuxt Supabase
    login,
    logout,
    signUp,
  };
}