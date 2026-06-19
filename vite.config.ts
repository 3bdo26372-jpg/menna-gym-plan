import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/menna-gym-plan/',
  plugins: [react()],
})
