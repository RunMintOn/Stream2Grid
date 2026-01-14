// ========== WebCanvas Background Service Worker ==========

console.log('[WebCanvas] Background service worker started')

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// ========== Message Handlers ==========

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    handleImageDownload(request.url, request.projectId, request.sourceUrl)
      .then(sendResponse)
      .catch((error) => {
        console.error('[WebCanvas] Image download failed:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true // Async response
  }

  if (request.action === 'getFavicon') {
    const domain = new URL(request.url).hostname
    sendResponse({
      success: true,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    })
    return false
  }
})

// ========== Image Download Handler ==========

async function handleImageDownload(
  imageUrl: string,
  projectId: number,
  sourceUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[WebCanvas] Downloading image:', imageUrl)

    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const blob = await response.blob()
    const contentType = response.headers.get('content-type') || 'image/png'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png'
    const fileName = `image-${Date.now()}.${ext}`

    // Send blob back to side panel for storage
    // Note: We can't directly access IndexedDB from service worker in all cases,
    // so we send it via message to the side panel
    
    // Convert blob to base64 for message passing
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    
    const base64 = await base64Promise

    // Broadcast to all extension contexts
    chrome.runtime.sendMessage({
      action: 'imageDownloaded',
      projectId,
      fileName,
      base64,
      sourceUrl,
    })

    return { success: true }
  } catch (error) {
    console.error('[WebCanvas] Download error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ========== Extension Installation Handler ==========

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[WebCanvas] Extension installed:', details.reason)
})
