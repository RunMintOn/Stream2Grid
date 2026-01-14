// ========== WebCanvas Background Service Worker ==========
// ========== Image Download Handler ==========
// Fixed: Proper base64 conversion using Promise wrapper

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
      const error = `HTTP error: ${response.status}`
      console.error('[WebCanvas] Image download failed:', error)
      return { success: false, error }
    }

    const blob = await response.blob()
    const contentType = response.headers.get('content-type') || 'image/png'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png'
    const fileName = `image-${Date.now()}.${ext}`

    console.log('[WebCanvas] Image downloaded, converting to base64:', fileName, blob.size, 'bytes')
    
    // ✅ FIX: Properly convert blob to base64 with correct Promise handling
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event: ProgressEvent<FileReader>) => {
        // FileReader.onload is called when readAsDataURL completes
        const result = (event.target as FileReader).result
        if (result && typeof result === 'string') {
          resolve(result)
        } else {
          reject(new Error('FileReader did not return valid base64 string'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('FileReader failed to read blob'))
      }
      
      reader.readAsDataURL(blob)
    })

    if (base64) {
      console.log('[WebCanvas] Base64 conversion successful, length:', base64.length)
    } else {
      console.error('[WebCanvas] Base64 conversion failed: result is undefined')
      return { success: false, error: 'Base64 conversion failed' }
    }

    // Send blob back to side panel for storage
    // Note: We can't directly access IndexedDB from service worker in all cases,
    // so we send it via message to the side panel
    chrome.runtime.sendMessage({
      action: 'imageDownloaded',
      projectId,
      fileName,
      base64,
      sourceUrl,
    })

    return { success: true }
  } catch (error) {
    console.error('[WebCanvas] Image download error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ========== Message Handlers ==========

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

// ========== Extension Installation Handler ==========

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[WebCanvas] Extension installed:', details.reason)
})
