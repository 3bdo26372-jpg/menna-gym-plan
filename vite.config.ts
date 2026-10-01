import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Starts the connection to the API while the app's code is still downloading. */
function apiPreconnect(apiUrl: string | undefined): Plugin {
  return {
    name: 'api-preconnect',
    transformIndexHtml() {
      if (!apiUrl) return []
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: new URL(apiUrl).origin, crossorigin: '' }, injectTo: 'head' }]
    },
  }
}

function readApiUrl(mode: string) {
  const fromEnv = loadEnv(mode, process.cwd()).VITE_API_URL?.trim()
  if (fromEnv) return fromEnv
  try {
    return (JSON.parse(readFileSync('public/api-config.json', 'utf8')) as { apiUrl?: string }).apiUrl?.trim() || undefined
  } catch {
    return undefined
  }
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), apiPreconnect(readApiUrl(mode))],
}))
