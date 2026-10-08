import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The iOS app (vite build --mode app) has no analytics: drop the Cloudflare
// tag from index.html and build into www/ for Capacitor.
const ANALYTICS = /<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->/

function noAnalytics(): Plugin {
  return {
    name: 'no-analytics',
    transformIndexHtml(html) {
      const out = html.replace(ANALYTICS, '')
      if (out.includes('cloudflareinsights')) throw new Error('Remove analytics from the app build')
      return out
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: mode === 'app' ? [react(), noAnalytics()] : [react()],
  base: './',
  build: mode === 'app' ? { outDir: 'www' } : {},
}))
