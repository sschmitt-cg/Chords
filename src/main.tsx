import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { hydrateFromUrl } from './hooks/useUrlSync'

// Hydrate tonal state from URL params before first render so the initial
// React pass already reflects the shared/bookmarked state.
hydrateFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
