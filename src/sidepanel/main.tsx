import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[Cascade] Side Panel script loaded')

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('[Cascade] Root element not found!')
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found</div>'
} else {
  console.log('[Cascade] Mounting React app...')
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('[Cascade] React app mounted successfully')
  } catch (error) {
    console.error('[Cascade] React mount failed:', error)
    // 尝试打印更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    rootElement.innerHTML = `<div style="color: red; padding: 20px;">
      <h2>Something went wrong</h2>
      <pre>${errorMessage}</pre>
    </div>`
  }
}

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Cascade] Unhandled promise rejection:', event.reason)
  const errorMessage = event.reason instanceof Error ? event.reason.message : JSON.stringify(event.reason)
  if (document.getElementById('root')) {
    document.getElementById('root')!.innerHTML += `<div style="color: red; padding: 20px; border-top: 1px solid #ccc;">
      <h3>Unhandled Rejection</h3>
      <pre>${errorMessage}</pre>
    </div>`
  }
})
