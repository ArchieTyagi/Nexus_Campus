import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Always use 5173. The backend only accepts this port, so if it is busy,
  // stop with an error instead of moving to 5174.
  server: {
    port: 5173,
    strictPort: true,
  },
})
