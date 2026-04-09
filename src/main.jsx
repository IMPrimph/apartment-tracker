import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

let isUpdating = false

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Prevent multiple prompts
    if (isUpdating) return
    isUpdating = true

    // Automatically reload when new version is available
    const shouldUpdate = window.confirm('New version available! Reload to update?')
    if (shouldUpdate) {
      updateSW(true).then(() => {
        window.location.reload()
      })
    } else {
      isUpdating = false
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check for updates every 5 minutes
      setInterval(() => {
        if (!isUpdating) {
          registration.update().catch(() => {})
        }
      }, 5 * 60 * 1000)
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
