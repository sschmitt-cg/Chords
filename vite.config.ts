import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When building for GitHub Pages, assets must be served from /Chords/.
// The GITHUB_PAGES env var is set in the deploy workflow.
const base = process.env.GITHUB_PAGES ? '/Chords/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    rollupOptions: {
      input: 'v2.html',
    },
  },
})
