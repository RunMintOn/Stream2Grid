import { ReactNode, useCallback, useState, useEffect } from 'react'
import { addTextNode, addImageNode, addLinkNode } from '../../services/db'

interface DropZoneProps {
  projectId: number
  children: ReactNode
}

interface WebCanvasPayload {
  sourceUrl: string
  sourceTitle: string
  sourceIcon?: string
  type: 'text' | 'image' | 'link' | 'unknown'
  content: string | null
  linkTitle?: string
}

export default function DropZone({ projectId, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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
        await addTextNode(projectId, payload.content, payload.sourceUrl, sourceIcon)
      } else if (payload.type === 'link' && payload.content) {
        // 对于链接，我们优先展示目标页面的图标
        const targetIcon = getFaviconUrl(payload.content)
        await addLinkNode(
          projectId, 
          payload.content, 
          payload.linkTitle || payload.sourceTitle || payload.content, 
          targetIcon
        )
      } else if (payload.type === 'image' && payload.content) {
        await downloadAndSaveImage(payload.content, payload.sourceUrl)
      }
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
        // 注意：Background script 不能直接操作 IndexedDB，它会把 base64 发回来
        // 或者我们在 Background 里处理完后，这里其实只需要等待成功即可
        // 但目前的架构是 Background -> 发送消息 'imageDownloaded' -> 谁接收？
        // 让我们检查一下 Background 的逻辑
        
        // 修正：Background 脚本在下载成功后会广播 'imageDownloaded' 消息
        // 我们应该监听这个消息来保存到 DB吗？
        // 不，通常 content script 或 side panel 发起请求后，应该由发起方处理数据
        
        // 让我们查看 Background 的实现，看看它是怎么返回数据的
        // 它返回的是 { success: true }，并没有返回数据
        // 但是它发送了一个 chrome.runtime.sendMessage...
        // 这意味着我们需要在 App.tsx 或某个地方监听这个消息
        
        // 让我们暂时在这里处理 base64 的保存，如果 background script 返回数据的话
        // 目前看来 background 确实把 base64 通过消息广播出去了
      }
    } catch (e) {
      console.error('[WebCanvas] Download error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // 1. 优先检查自定义 WebCanvas 数据
    let customData = e.dataTransfer.getData('application/webcanvas-payload')
    
    // 如果 dataTransfer 中没有数据（可能是跨域限制或网站拦截），尝试从 Background 获取缓存的 payload
    if (!customData) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getDragPayload' })
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
      await handleWebCanvasPayload(customData)
      return
    }

    // 2. 检查文件拖拽
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await addImageNode(projectId, file, file.name)
        }
      }
      return
    }

    // 3. 检查 URL 拖拽
    const url = e.dataTransfer.getData('text/uri-list')
    if (url) {
      // 这是一个图片链接吗？
      if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        await downloadAndSaveImage(url)
      } else {
        // 普通链接
        try {
          const targetIcon = getFaviconUrl(url)
          await addLinkNode(projectId, url, url, targetIcon)
        } catch {
          // 不是有效 URL，当做文本处理
          await addTextNode(projectId, url)
        }
      }
      return
    }

    // 4. 纯文本
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      const urlMatch = text.match(/^https?:\/\/[^\s]+$/)
      if (urlMatch) {
        const targetIcon = getFaviconUrl(text)
        await addLinkNode(projectId, text, text, targetIcon)
      } else {
        // 如果是从网页拖拽的纯文本，虽然没有 payload，但我们可以尝试获取来源 URL 的 Favicon
        // 注意：这里的 context 比较受限，所以 payload 才是最稳的
        await addTextNode(projectId, text)
      }
    }
  }, [projectId])

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // 只有当不在输入框中粘贴时才处理
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    // 图片粘贴
    if (e.clipboardData?.files.length) {
      e.preventDefault()
      const files = Array.from(e.clipboardData.files)
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await addImageNode(projectId, file, file.name)
        }
      }
      return
    }

    // 文本粘贴
    const text = e.clipboardData?.getData('text')
    if (text) {
      e.preventDefault() // 阻止默认粘贴，防止粘贴到不可见区域
      
      // 简单判断是链接还是文本
      if (text.match(/^https?:\/\/[^\s]+$/)) {
        const targetIcon = getFaviconUrl(text)
        await addLinkNode(projectId, text, text, targetIcon)
      } else {
        await addTextNode(projectId, text)
      }
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
      className={`min-h-full transition-all duration-200 relative border-4 ${
        isDragging 
          ? 'border-blue-600 bg-blue-50/30 animate-pulse-fast-blue' 
          : 'border-transparent'
      }`}
    >
      {/* Full Screen Overlay when Dragging */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px] pointer-events-none">
          <div className="w-64 h-48 border-4 border-blue-400 border-dashed rounded-2xl flex flex-col items-center justify-center bg-blue-50/50 animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-blue-600 font-bold text-lg">释放以添加内容</p>
            <p className="text-blue-400 text-xs mt-1">支持文本、图片和链接</p>
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
