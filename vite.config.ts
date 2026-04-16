import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 211 National Data Platform Search API — dev CORS proxy
      '/api-211': {
        target: 'https://api.211.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-211/, ''),
      },
    },
  },
})
