import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), 'northstar-vite-cache'),
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
