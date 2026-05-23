/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Strict Content Security Policy applied only to production builds.
// Dev is left untouched so Vite HMR (WebSocket, dynamic style injection) keeps working.
// `'unsafe-inline'` is required for style-src because the app uses 53+ inline `style={{...}}`
// React props for dynamic CSS custom properties (pitch-class colors, fret markers, etc.).
function cspPlugin() {
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')

  return {
    name: 'inject-csp',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
    },
  }
}

// Custom domain (tonalexplorer.com) serves from the root, so base is always '/'.
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: '/',
  build: {
    rollupOptions: {
      input: 'index.html',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
