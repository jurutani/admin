// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE,
    // Public keys (tersedia di client-side)
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },
  modules: [
    '@unocss/nuxt',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
  ],

  css: [
    '@unocss/reset/tailwind.css',
  ],

  colorMode: {
    classSuffix: '',
  },

  features: {
    // For UnoCSS
    inlineStyles: false,
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  routeRules: {
    '/components': { redirect: '/components/accordion' },
    '/settings': { redirect: '/settings/profile' },
  },

  imports: {
    dirs: [
      './lib',
    ],
  },

  compatibilityDate: '2024-12-14',
})
