import { ReactNode, useCallback, useState, useEffect } from 'react'
import { addTextNode, addImageNode, addLinkNode } from '../../services/db'

interface DropZoneProps {
  projectId: number
  children: ReactNode
  onSuccess?: () => void
  isInboxMode?: boolean
}

interface WebCanvasPayload {
  sourceUrl: string
  sourceTitle: string
  sourceIcon?: string
  type: 'text' | 'image' | 'link' | 'unknown'
  content: string | null
  linkTitle?: string
}

export default function DropZone({ projectId, children, onSuccess, isInboxMode = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Debug: Log when projectId changes
  console.log('[WebCanvas DropZone] Rendered with projectId:', projectId, 'isInboxMode:', isInboxMode)

  // Wrap db operations with onSuccess callback
  const handleSuccess = useCallback(() => {
    console.log('[WebCanvas] handleSuccess() called')
    if (onSuccess) onSuccess()
  }, [onSuccess])

  // 统一的 Favicon 获取逻辑
  const getFaviconUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname
      // 使用更可靠的 Google Favicon 服务，sz=128 获取更高清图标
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
    } catch {
      return undefined
    }
  }

  // 处理内容脚本传来的自定义数据
  const handleWebCanvasPayload = async (jsonString: string) => {
    try {
      const payload: WebCanvasPayload = JSON.parse(jsonString)
      console.log('[WebCanvas] Processing payload:', payload)

      const sourceIcon = payload.sourceIcon || getFaviconUrl(payload.sourceUrl)

      if (payload.type === 'text' && payload.content) {
        console.log('[WebCanvas] Adding text node')
        await addTextNode(projectId, payload.content, payload.sourceUrl, sourceIcon)
        console.log('[WebCanvas] Text node added successfully')
      } else if (payload.type === 'link' && payload.content) {
        // 对于链接，我们优先展示目标页面的图标
        const targetIcon = getFaviconUrl(payload.content)
        console.log('[WebCanvas] Adding link node')
        await addLinkNode(
          projectId,
          payload.content,
          payload.linkTitle || payload.sourceTitle || payload.content,
          targetIcon
        )
        console.log('[WebCanvas] Link node added successfully')
      } else if (payload.type === 'image' && payload.content) {
        console.log('[WebCanvas] Downloading and saving image')
        await downloadAndSaveImage(payload.content, payload.sourceUrl)
      }
      handleSuccess()
    } catch (e) {
      console.error('[WebCanvas] Failed to parse payload:', e)
    }
  }

  // 通过 Background Script 下载图片（解决 CORS）
  const downloadAndSaveImage = async (url: string, sourceUrl?: string) => {
    setIsProcessing(true)
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadImage',
        url,
        projectId,
        sourceUrl
      })

      if (!response.success) {
        console.error('[WebCanvas] Image download failed:', response.error)
        alert('图片下载失败: ' + response.error)
      } else {
        // Image download success
        console.log('[WebCanvas] Image download initiated')
      }
    } catch (e) {
      console.error('[WebCanvas] Download error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    console.log('[WebCanvas] ========== DROP EVENT TRIGGERED ==========')
    console.log('[WebCanvas] projectId:', projectId)

    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // 1. 优先检查自定义 WebCanvas 数据
    let customData = e.dataTransfer.getData('application/webcanvas-payload')
    console.log('[WebCanvas] customData from dataTransfer:', customData)

    // 如果 dataTransfer 中没有数据（可能是跨域限制或网站拦截），尝试从 Background 获取缓存的 payload
    if (!customData) {
      console.log('[WebCanvas] No customData, trying background cache...')
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getDragPayload' })
        console.log('[WebCanvas] Background response:', response)
        if (response?.success && response.payload) {
          console.log('[WebCanvas] Recovered payload from background:', response.payload)
          await handleWebCanvasPayload(JSON.stringify(response.payload))
          return
        }
      } catch (err) {
        console.warn('[WebCanvas] Failed to get payload from background:', err)
      }
    }

    if (customData) {
      console.log('[WebCanvas] Using customData from dataTransfer')
      await handleWebCanvasPayload(customData)
      return
    }

    // 2. 检查文件拖拽
    console.log('[WebCanvas] Files in dataTransfer:', e.dataTransfer.files.length)
    if (e.dataTransfer.files.length > 0) {
      console.log('[WebCanvas] Processing file drag...')
      const files = Array.from(e.dataTransfer.files)
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          console.log('[WebCanvas] Adding image file:', file.name)
          await addImageNode(projectId, file, file.name)
          console.log('[WebCanvas] Image file added successfully')
        }
      }
      handleSuccess()
      return
    }

    // 3. 检查 URL 拖拽
    const url = e.dataTransfer.getData('text/uri-list')
    console.log('[WebCanvas] URL from text/uri-list:', url)
    if (url) {
      // 这是一个图片链接吗？
      if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        console.log('[WebCanvas] Detected image URL, downloading...')
        await downloadAndSaveImage(url)
        // Image download is async and handled separately, but we can trigger success for UI
        handleSuccess()
      } else {
        // 普通链接
        console.log('[WebCanvas] Adding link from URL')
        try {
          const targetIcon = getFaviconUrl(url)
          console.log('[WebCanvas] Calling addLinkNode')
          await addLinkNode(projectId, url, url, targetIcon)
          console.log('[WebCanvas] Link added successfully')
          handleSuccess()
        } catch (err) {
          console.error('[WebCanvas] Failed to add link:', err)
          // 不是有效 URL，当做文本处理
          console.log('[WebCanvas] Falling back to text')
          await addTextNode(projectId, url)
          handleSuccess()
        }
      }
      return
    }

    // 4. 纯文本
    const text = e.dataTransfer.getData('text/plain')
    console.log('[WebCanvas] Text from text/plain:', text)
    if (text) {
      const urlMatch = text.match(/^https?:\/\/[^\s]+$/)
      if (urlMatch) {
        console.log('[WebCanvas] Text looks like URL, adding as link')
        const targetIcon = getFaviconUrl(text)
        await addLinkNode(projectId, text, text, targetIcon)
        console.log('[WebCanvas] Link from text added successfully')
      } else {
        // 如果是从网页拖拽的纯文本，虽然没有 payload，但我们可以尝试获取来源 URL 的 Favicon
        // 注意：这里的 context 比较受限，所以 payload 才是最稳的
        console.log('[WebCanvas] Adding as plain text')
        await addTextNode(projectId, text)
        console.log('[WebCanvas] Plain text added successfully')
      }
      handleSuccess()
    } else {
      console.log('[WebCanvas] No text data found!')
    }
  }, [projectId])

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    console.log('[WebCanvas] PASTE EVENT TRIGGERED')

    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable
    ) {
      return
    }

    // 图片粘贴
    if (e.clipboardData?.files.length) {
      e.preventDefault()
      console.log('[WebCanvas] Processing image paste...')
      const files = Array.from(e.clipboardData.files)
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await addImageNode(projectId, file, file.name)
          console.log('[WebCanvas] Image pasted successfully')
        }
      }
      handleSuccess()
      return
    }

    // 文本粘贴
    const text = e.clipboardData?.getData('text')
    console.log('[WebCanvas] Text from clipboard:', text)
    if (text) {
      e.preventDefault() // 阻止默认粘贴，防止粘贴到不可见区域

      // 简单判断是链接还是文本
      if (text.match(/^https?:\/\/[^\s]+$/)) {
        console.log('[WebCanvas] Pasting as link')
        const targetIcon = getFaviconUrl(text)
        await addLinkNode(projectId, text, text, targetIcon)
        console.log('[WebCanvas] Link pasted successfully')
      } else {
        console.log('[WebCanvas] Pasting as plain text')
        await addTextNode(projectId, text)
        console.log('[WebCanvas] Text pasted successfully')
      }
      handleSuccess()
    }
  }, [projectId, getFaviconUrl])

  // 设置全局粘贴监听
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  // 监听来自 Background 的图片下载完成消息
  useEffect(() => {
    const messageListener = async (request: any) => {
      if (request.action === 'imageDownloaded' && request.projectId === projectId) {
        console.log('[WebCanvas] Received downloaded image:', request.fileName)

        // base64 -> Blob
        const res = await fetch(request.base64)
        const blob = await res.blob()

        await addImageNode(projectId, blob, request.fileName, request.sourceUrl)
        console.log('[WebCanvas] Downloaded image saved successfully')
        handleSuccess()
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [projectId])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        // 使用计数器或状态来避免子元素触发 dragLeave 导致的闪烁
        // 这里简化处理：只要是 dragOver，就认为是拖拽中
        if (!isDragging) setIsDragging(true)
      }}
      onDragLeave={(e) => {
        // 只有当鼠标真正离开当前容器时（relatedTarget 不在容器内），才取消拖拽状态
        const currentTarget = e.currentTarget
        const relatedTarget = e.relatedTarget as Node
        if (currentTarget.contains(relatedTarget)) return

        setIsDragging(false)
      }}
      onDrop={handleDrop}
      className={`flex-1 transition-all duration-300 relative border border-transparent flex flex-col overflow-hidden`}
    >
      {/* Glow Effect Overlay (Top Layer) */}
      {isDragging && (
        <div className={`absolute inset-0 z-[100] pointer-events-none rounded-lg ${
          isInboxMode ? 'animate-neon-breathe-green' : 'animate-neon-breathe'
        }`}></div>
      )}

      {/* Full Screen Overlay Content */}
      {isDragging && (
        <div className="fixed inset-0 z-[101] flex flex-col justify-end items-center pb-8 pointer-events-none">
          {/* Subtle bottom gradient to ensure text readability */}
          <div className={`fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t pointer-events-none ${
            isInboxMode ? 'from-green-900/40' : 'from-blue-900/40'
          } to-transparent`}></div>

          {/* Minimalist Bottom Pill Prompt */}
          <div className={`relative z-10 flex items-center gap-3 px-6 py-3 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-4 duration-300 border ${
            isInboxMode
              ? 'bg-green-600/90 shadow-green-500/30 border-green-400/30'
              : 'bg-blue-600/90 shadow-blue-500/30 border-blue-400/30'
          }`}>
            <div className="w-5 h-5 rounded-full border-2 border-white/80 flex items-center justify-center animate-bounce">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-white font-medium tracking-wide text-sm drop-shadow-sm">
              {isInboxMode ? '释放保存到收集箱' : '释放以添加内容'}
            </span>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden z-50">
          <div className="h-full bg-blue-500 animate-progress"></div>
        </div>
      )}
      {children}
    </div>
  )
}
