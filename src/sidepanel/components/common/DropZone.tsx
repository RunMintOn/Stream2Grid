import { useState, useCallback, type ReactNode } from 'react'
import { addTextNode, addImageNode, addLinkNode } from '../../services/db'

interface DropZoneProps {
  projectId: number
  children: ReactNode
}

export default function DropZone({ projectId, children }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // Listen for image download completion from background
  useCallback(() => {
    const handleImageDownloaded = (message: any) => {
      if (message.action === 'imageDownloaded' && message.projectId === projectId) {
        // Convert base64 back to blob
        const byteCharacters = atob(message.base64)
        const byteArray = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([byteArray], { type: 'image/png' })

        // Add image node with source URL
        addImageNode(projectId, blob, message.fileName, message.sourceUrl)
      }
    }

    chrome.runtime.onMessage.addListener(handleImageDownloaded)

    return () => {
      chrome.runtime.onMessage.removeListener(handleImageDownloaded)
    }
  }, [projectId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // Try to get custom payload first
    const rawData = e.dataTransfer.getData('application/webcanvas-payload')

    if (rawData) {
      try {
        const payload = JSON.parse(rawData)
        const icon = getFavicon(payload.sourceUrl)

        if (payload.type === 'text' && payload.content) {
          await addTextNode(projectId, payload.content, payload.sourceUrl, icon)
        } else if (payload.type === 'link' && payload.content) {
          await addLinkNode(projectId, payload.content, payload.sourceTitle, icon)
        } else if (payload.type === 'image' && payload.content) {
          // Request background to download image
          chrome.runtime.sendMessage({
            action: 'downloadImage',
            url: payload.content,
            projectId,
            sourceUrl: payload.sourceUrl,
          })
        }
        return
      } catch (err) {
        console.error('[WebCanvas] Failed to parse payload:', err)
      }
    }

    // Fallback: Handle standard drag types
    const text = e.dataTransfer.getData('text/plain')
    const url = e.dataTransfer.getData('text/uri-list')

    // Handle files (direct file drop)
    if (e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        if (file.type.startsWith('image/')) {
          const fileName = `image-${Date.now()}.${file.type.split('/')[1]}`
          await addImageNode(projectId, file, fileName)
        }
      }
      return
    }

    // Handle URL
    if (url && url.startsWith('http')) {
      const icon = getFavicon(url)
      await addLinkNode(projectId, url, undefined, icon)
      return
    }

    // Handle plain text
    if (text) {
      await addTextNode(projectId, text)
    }
  }, [projectId])

  // ========== NEW: Paste Handler ==========
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault()

    console.log('[WebCanvas] Paste event triggered')

    // Type 1: Handle plain text from clipboard
    const clipboardText = e.clipboardData.getData('text/plain')
    if (clipboardText && clipboardText.trim()) {
      const icon = getFavicon(window.location.href)
      await addTextNode(projectId, clipboardText.trim(), window.location.href, icon)
      console.log('[WebCanvas] Pasted text:', clipboardText.substring(0, 50) + '...')
      return
    }

    // Type 2: Handle images from clipboard
    const clipboardItems = e.clipboardData.items
    if (Array.isArray(clipboardItems) && clipboardItems.length > 0) {
      for (const item of clipboardItems) {
        // Check for image types using kind property
        if (item.kind === 'file' && (item as any).type && (item as any).type.startsWith('image/')) {
          const imageFile = item.getAsFile()
          if (imageFile && imageFile.type.startsWith('image/')) {
            const fileName = `image-${Date.now()}.${imageFile.type.split('/')[1]}`
            console.log('[WebCanvas] Pasted image:', fileName, 'size:', imageFile.size)
            await addImageNode(projectId, imageFile, fileName, window.location.href)
            return
          }
        }
      }
    }

    // Type 3: Handle URLs from clipboard
    const clipboardItemsList = e.clipboardData.items
    if (Array.isArray(clipboardItemsList) && clipboardItemsList.length > 0) {
      for (const item of clipboardItemsList) {
        try {
          const url = item.getAsString()
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            const icon = getFavicon(url)
            console.log('[WebCanvas] Pasted URL:', url)
            await addLinkNode(projectId, url, undefined, icon)
            return
          }
        } catch (err) {
          // Silent fail for non-text data
        }
      }
    }

    console.log('[WebCanvas] No supported paste content detected')
  }, [projectId])

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      return undefined
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`min-h-full transition-colors ${
        isDragOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''
      }`}
    >
      {children}

      {/* Drop Indicator */}
      {isDragOver && (
        <div className="fixed bottom-4 left-4 right-4 py-3 bg-blue-600 text-white text-center text-sm font-medium rounded-lg shadow-lg">
          释放以添加到画板
        </div>
      )}
    </div>
  )
}
