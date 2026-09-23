import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base:'/',
  plugins: [
    tailwindcss(),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      // Uploaded files (profile/gallery photos, resource files) are served
      // directly by the backend, not through /api — in production server.cjs
      // serves everything from one origin, but the Vite dev server needs
      // these proxied explicitly or they 404 into the SPA fallback instead.
      '/profile-photos': 'http://127.0.0.1:3000',
      '/gallery-photos': 'http://127.0.0.1:3000',
      '/posters': 'http://127.0.0.1:3000',
    },
  },
})
