// ========== Cascade Content Script - Drag Listener ==========

console.log('[Cascade] Content script loaded on:', window.location.href)

/**
 * 提取当前页面的 Favicon
 */
function getPageFavicon() {
  try {
    const icon = (document.querySelector('link[rel~="icon"]') as HTMLLinkElement)?.href || 
                 (document.querySelector('link[rel~="apple-touch-icon"]') as HTMLLinkElement)?.href ||
                 `${window.location.origin}/favicon.ico`
    return icon
  } catch {
    return `${window.location.origin}/favicon.ico`
  }
}

// 使用 capture 阶段确保在网站自有逻辑之前执行，提高成功率
document.addEventListener('dragstart', (event) => {
  const target = event.target as HTMLElement
  if (!target) return

  // 基础信息
  const payload = {
    sourceUrl: window.location.href,
    sourceTitle: document.title,
    sourceIcon: getPageFavicon(),
    type: 'unknown' as 'text' | 'image' | 'link' | 'unknown',
    content: null as string | null,
    linkTitle: null as string | null,
  }

  // 1. 优先判断是否拖拽的是链接 (A 标签或其子元素)
  const anchor = target.tagName === 'A' ? target : (target instanceof Element ? target.closest('a') : null)
  
  // 2. 判断是否拖拽的是图片
  const isImage = target.tagName === 'IMG'

  // 3. 获取当前选中的文本
  const selection = window.getSelection()?.toString().trim()

  if (isImage) {
    const img = target as HTMLImageElement
    payload.type = 'image'
    payload.content = img.src
  } else if (anchor) {
    // 如果拖拽的是链接
    // 如果拖拽时已经选中了文本，且选中文本就在这个链接里，或者拖拽的就是一段文本
    // 这种情况下，如果选中文本不为空，我们可能还是想当做文本处理？
    // 但通常拖拽链接就是想要链接。为了稳定，我们保持原逻辑，优先识别链接。
    payload.type = 'link'
    payload.content = (anchor as HTMLAnchorElement).href
    payload.linkTitle = (anchor as HTMLElement).innerText.trim() || (anchor as HTMLAnchorElement).title || null
  } else if (selection) {
    // 纯文本选择
    payload.type = 'text'
    payload.content = selection
  }

  // 如果识别到了内容，注入自定义数据
  if (payload.type !== 'unknown' && payload.content) {
    try {
      // 同时设置文本和自定义数据，增加兼容性
      event.dataTransfer?.setData(
        'application/webcanvas-payload',
        JSON.stringify(payload)
      )
      
      // 额外的保险：将 payload 发送给 Background Script 缓存
      // 这解决了部分网站（如 GitHub）可能存在的 dataTransfer 限制或跨域丢失问题
      try {
        // 防御性检查：确保扩展上下文仍然有效
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({
            action: 'setDragPayload',
            payload: payload
          }).catch((err) => {
            // 忽略 "Extension context invalidated" 错误
            const msg = err?.message || '';
            if (msg.includes('Extension context invalidated')) {
              console.log('[Cascade] Extension context invalidated (reload page to fix)')
            }
          })
        } else {
          console.log('[Cascade] Extension context invalid, skipping background message')
        }
      } catch (e) {
         // 捕获所有可能的错误（包括访问 chrome.runtime 抛出的错误）
         console.warn('[Cascade] Runtime message failed:', e)
      }

      console.log('[Cascade] Drag detected:', payload.type, payload.sourceTitle)
    } catch (e) {
      console.warn('[Cascade] Could not set custom drag data:', e)
    }
  }
}, true); // Use capture phase
