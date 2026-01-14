import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[WebCanvas] Side Panel script loaded')

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('[WebCanvas] Root element not found!')
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found</div>'
} else {
  console.log('[WebCanvas] Mounting React app...')
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('[WebCanvas] React app mounted successfully')
  } catch (error) {
    console.error('[WebCanvas] React mount failed:', error)
    rootElement.innerHTML = `<div style="color: red; padding: 20px;">Error: React mount failed: ${error}</div>`
  }
}
