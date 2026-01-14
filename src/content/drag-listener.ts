// ========== WebCanvas Content Script - Drag Listener ==========

console.log('[WebCanvas] Content script loaded on:', window.location.href)

// Listen for drag start events to enhance drag data
document.addEventListener('dragstart', (event) => {
  const target = event.target as HTMLElement
  
  // Construct standard payload
  const payload = {
    sourceUrl: window.location.href,
    sourceTitle: document.title,
    type: 'unknown' as 'text' | 'image' | 'link' | 'unknown',
    content: null as string | null,
  }

  // Detect drag target type
  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement
    payload.type = 'image'
    payload.content = img.src
    console.log('[WebCanvas] Dragging image:', img.src)
  } else if (target.tagName === 'A') {
    const anchor = target as HTMLAnchorElement
    payload.type = 'link'
    payload.content = anchor.href
    console.log('[WebCanvas] Dragging link:', anchor.href)
  } else {
    // Check for selected text
    const selection = window.getSelection()?.toString()
    if (selection && selection.trim()) {
      payload.type = 'text'
      payload.content = selection.trim()
      console.log('[WebCanvas] Dragging text:', selection.substring(0, 50) + '...')
    }
  }

  // Set custom MIME type for our extension
  if (payload.type !== 'unknown' && payload.content) {
    try {
      event.dataTransfer?.setData(
        'application/webcanvas-payload',
        JSON.stringify(payload)
      )
    } catch (e) {
      // Some sites may block custom data types
      console.warn('[WebCanvas] Could not set custom drag data:', e)
    }
  }
})

// Also listen for dragend to clean up if needed
document.addEventListener('dragend', () => {
  // Cleanup if needed
})
