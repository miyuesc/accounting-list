// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
  ],
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-app',
    jwtSecret: process.env.JWT_SECRET || 'your-default-secret-key',
    public: {
      apiBase: '/api'
    }
  },
  nitro: {
    plugins: ['~/server/index.ts']
  },
  tailwindcss: {
    exposeConfig: true,
    viewer: true,
    configPath: '~/tailwind.config.js',
  },
  alias: {
    '#tailwind-config': '~/tailwind.config.js'
  },
  ui: {
    notifications: {
      position: 'top-right'
    }
  }
})
