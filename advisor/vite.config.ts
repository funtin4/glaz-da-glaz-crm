import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/select/',
  server: { port: 5173, allowedHosts: true },
  preview: { port: 4173, host: true, allowedHosts: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
