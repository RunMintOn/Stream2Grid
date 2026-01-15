import { ReactNode, useCallback, useState, useEffect } from 'react'
import { addTextNode, addImageNode, addLinkNode } from '../../services/db'

interface DropZoneProps {
  projectId: number
  children: ReactNode
}

interface WebCanvasPayload {
  sourceUrl: string
  sourceTitle: string
  type: 'text' | 'image' | 'link' | 'unknown'
  content: string | null
}

export default function DropZone({ projectId, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 处理内容脚本传来的自定义数据
  const handleWebCanvasPayload = async (jsonString: string) => {
    try {
      const payload: WebCanvasPayload = JSON.parse(jsonString)
      console.log('[WebCanvas] Processing payload:', payload)

      if (payload.type === 'text' && payload.content) {
        await addTextNode(projectId, payload.content, payload.sourceUrl)
      } else if (payload.type === 'link' && payload.content) {
        // 获取 Favicon
        const urlObj = new URL(payload.content)
        const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
        await addLinkNode(projectId, payload.content, payload.sourceTitle || payload.content, favicon)
      } else if (payload.type === 'image' && payload.content) {
        // 图片 URL，需要下载
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
    const customData = e.dataTransfer.getData('application/webcanvas-payload')
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
          const urlObj = new URL(url)
          const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
          await addLinkNode(projectId, url, url, favicon)
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
      await addTextNode(projectId, text)
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
      try {
        new URL(text) // 测试是否为 URL
        await addLinkNode(projectId, text, text, `https://www.google.com/s2/favicons?domain=${new URL(text).hostname}&sz=64`)
      } catch {
        await addTextNode(projectId, text)
      }
    }
  }, [projectId])

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
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`min-h-full transition-colors ${
        isDragging ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''
      }`}
    >
      {isProcessing && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden z-50">
          <div className="h-full bg-blue-500 animate-progress"></div>
        </div>
      )}
      {children}
    </div>
  )
}
