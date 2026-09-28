/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Cloudflare Worker API, e.g. https://menna-flow-api.<subdomain>.workers.dev */
  readonly VITE_API_URL?: string
}
