# Ctrl+V 粘贴功能说明

## 功能概述

WebCanvas 现在支持 Ctrl+V 粘贴功能，可以从剪贴板直接导入：
- ✅ 纯文本
- ✅ 图片（PNG、JPG、GIF等）
- ✅ URL链接
- ✅ HTML内容（图片/链接）

---

## 支持的粘贴类型

### 1. 纯文本
**检测方式：** `e.clipboardData.getData('text/plain')`
**处理：** 创建 Text 节点，自动记录来源页面URL
**示例：**
- 网页复制一段文字 → 粘贴到侧边栏 → 创建文本卡片

---

### 2. 图片（从剪贴板）
**检测方式：** `e.clipboardData.items` + `item.kind === 'file'` + `item.type.startsWith('image/')`
**处理：** 
- 从剪贴板获取图片Blob
- 转换为ImageFile
- 调用 `addImageNode` 存储
- 后台自动下载远程图片链接
**示例：**
- 网页截图 → 复制 → 粘贴 → 自动创建图片卡片

---

### 3. URL链接
**检测方式：** `e.clipboardData.getData('text/uri-list')` 或 `item.getAsString()`
**处理：** 创建 Link 节点，自动获取Favicon
**示例：**
- 复制URL → 粘贴到侧边栏 → 创建链接卡片

---

### 4. HTML内容（网页）
**检测方式：** `e.clipboardData.getData('text/html')`
**处理：** 解析HTML，提取 `<img>` 和 `<a>` 标签
**示例：**
- 从网页复制图片 → 粘贴 → 自动下载并创建卡片

---

## 使用方法

### 方式1：快捷键
1. 复制内容（文本/图片/URL）
2. 打开 WebCanvas 侧边栏
3. 按 `Ctrl+V`（或 `Cmd+V` on Mac）
4. 内容自动添加到当前项目

### 方式2：右键菜单（未实现）
可以添加右键粘贴按钮，更方便移动端用户

---

## 技术实现

### 关键代码

```typescript
// 监听粘贴事件
const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
  e.preventDefault()
  
  // 1. 处理纯文本
  const clipboardText = e.clipboardData.getData('text/plain')
  if (clipboardText && clipboardText.trim()) {
    await addTextNode(projectId, clipboardText.trim(), window.location.href, icon)
    return
  }

  // 2. 处理图片
  const clipboardItems = e.clipboardData.items
  if (Array.isArray(clipboardItems) && clipboardItems.length > 0) {
    for (const item of clipboardItems) {
      if (item.kind === 'file' && (item as any).type.startsWith('image/')) {
        const imageFile = item.getAsFile()
        if (imageFile && imageFile.type.startsWith('image/')) {
          const fileName = `image-${Date.now()}.${imageFile.type.split('/')[1]}`
          await addImageNode(projectId, imageFile, fileName, window.location.href)
          return
        }
      }
    }
  }

  // 3. 处理HTML（图片/链接）
  const html = clipboardItems.getData('text/html')
  if (html) {
    // 提取图片
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const images = tempDiv.querySelectorAll('img')
    
    if (images.length > 0) {
      const img = images[0] as HTMLImageElement
      chrome.runtime.sendMessage({
        action: 'downloadImage',
        url: img.src,
        projectId,
        sourceUrl: window.location.href,
      })
      return
    }

    // 提取链接
    const links = tempDiv.querySelectorAll('a')
    if (links.length > 0) {
      const link = links[0] as HTMLAnchorElement
      const url = link.href
      const title = link.textContent || link.title || ''
      const icon = getFavicon(url)
      await addLinkNode(projectId, url, title, icon)
      return
    }
  }

  // 4. 处理URL
  const urlData = clipboardItems.getData('text/uri-list')
  if (urlData && urlData.startsWith('http')) {
    const icon = getFavicon(urlData)
    await addLinkNode(projectId, urlData, undefined, icon)
    return
  }
}, [projectId])
```

---

## 限制说明

| 特性 | 说明 |
|------|------|
| 图片大小 | 理论无限制，受浏览器配额影响（Chrome约5-10GB）|
| 存储位置 | IndexedDB + Blob（持久化存储）|
| 图片类型 | 支持所有常见图片格式（PNG、JPG、GIF、WebP等）|
| 来源URL | 自动记录当前页面URL（方便溯源）|
| Favicon | 自动从URL获取Google Favicon图标|

---

## 调试方法

### 查看日志
打开浏览器开发者工具（F12）→ Console标签，查看：
```
[WebCanvas] Paste event triggered
[WebCanvas] Pasted text: 文本内容...
[WebCanvas] Pasted image: image-123.png, size: 52432
[WebCanvas] Pasted URL: https://example.com
```

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|--------|---------|
| 无法粘贴图片 | 剪贴板中不是文件类型 | 检查是否从网页复制的是图片元素 |
| 粘贴的图片不显示 | 后台下载未完成 | 等待几秒后刷新查看 |
| 粘贴URL失败 | URL格式不正确 | 确保以 http:// 或 https:// 开头 |

---

## 注意事项

1. **图片自动下载**：如果粘贴的是网页图片链接，后台会自动下载，可能需要几秒钟
2. **来源URL**：自动记录当前页面URL作为 `sourceUrl`，方便追溯来源
3. **Favicon**：自动从域名获取Favicon图标
4. **HTML解析**：支持从复制HTML内容中提取图片和链接
5. **安全性**：所有粘贴操作都经过 `e.preventDefault()` 防止浏览器默认行为

---

## 未来扩展

- [ ] 添加右键粘贴按钮
- [ ] 支持粘贴多张图片（批量）
- [ ] 粘贴后自动定位到最新节点
- [ ] 支持粘贴富文本（保留格式）
