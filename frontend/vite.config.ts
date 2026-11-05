import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin calls in dev, so the backend doesn't need CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
