import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { applyDeviceClasses } from './lib/device'
import './styles.css'

// Stamp capability classes on <html> before the first React paint so the
// very first frame already renders at the right effect level (no heavy→light flash).
applyDeviceClasses()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
