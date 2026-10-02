import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { applyDeviceClasses } from './lib/device'
import './styles.css'

// Stamp capability classes on <html> before the first React paint so the
// very first frame already renders at the right effect level (no heavy→light flash).
applyDeviceClasses()

// Same idea for the colour theme: ThemeSwitch can only write `data-theme`
// after it mounts, which used to hand dark-mode visitors a frame of the light
// theme. Stamping it here also lets the hero choose the right rocket
// illustration on its first render instead of swapping images later.
const savedTheme = localStorage.getItem('mentorax-theme')
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
if (savedTheme ? savedTheme === 'dark' : prefersDark) {
  document.documentElement.setAttribute('data-theme', 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#08070d')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
