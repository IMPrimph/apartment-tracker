import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Automatically reload when new version is available
    if (window.confirm('New version available! Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check for updates every 60 seconds instead of 1 hour
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 1000)
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
