import { useState, useCallback, useRef, useEffect } from 'react'
import { db, updateTextNode } from '../../services/db'

interface TextCardProps {
  id: number
  text: string
  originalText?: string
  sourceUrl?: string
  sourceIcon?: string
  onDelete: () => void
}

export default function TextCard({
  id,
  text,
  originalText,
  sourceUrl,
  sourceIcon,
  onDelete,
}: TextCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [iconError, setIconError] = useState(false)
  const [isShowingOriginal, setIsShowingOriginal] = useState(false)
  const [hasEdited, setHasEdited] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const isSavingRef = useRef(false)
  const lastSaveTimeRef = useRef(0)
  const clickCoordRef = useRef<{ x: number; y: number } | null>(null)
  
  // Fetch node data to get hasEdited status
  useEffect(() => {
    db.nodes.get(id).then((nodeData) => {
      if (nodeData) {
        // Only update state if hasEdited changed
        if (nodeData.hasEdited !== hasEdited) {
          setHasEdited(!!nodeData.hasEdited)
        }
      }
    })
  }, [id, text, hasEdited]) // Add text and hasEdited to dependencies

  const lines = text.split('\n')
  const isLongText = lines.length > 4 || text.length > 300
  
  // Update local state when prop changes
  useEffect(() => {
    if (!isEditing) {
      if (contentRef.current) {
        contentRef.current.innerText = isShowingOriginal ? (originalText || text) : text
      }
    }
  }, [text, isEditing, isShowingOriginal, originalText])

  // Focus and setup contentEditable when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      const el = contentRef.current
      el.focus()
      
      const selection = window.getSelection()
      if (selection) {
        if (clickCoordRef.current) {
          const { x, y } = clickCoordRef.current
          // @ts-ignore
          const range = document.caretRangeFromPoint(x, y)
          
          if (range) {
            selection.removeAllRanges()
            selection.addRange(range)
          }
          clickCoordRef.current = null
        } else if (selection.rangeCount === 0) {
          const range = document.createRange()
          range.selectNodeContents(el)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }, [isEditing])

  const handleEnterEdit = useCallback((e: React.MouseEvent) => {
    if (Date.now() - lastSaveTimeRef.current < 300) return
    
    clickCoordRef.current = { x: e.clientX, y: e.clientY }
    
    if (isShowingOriginal) {
      setIsShowingOriginal(false)
    }
    
    setIsEditing(true)
  }, [isShowingOriginal])
  
  const handleSave = useCallback(async () => {
    if (isSavingRef.current || !contentRef.current) return
    
    const currentContent = contentRef.current.innerText
    // 处理可能的尾部多余换行（某些浏览器 contentEditable 可能会在末尾加换行）
    const trimmed = currentContent.replace(/\n$/, '').trim() === '' ? '' : currentContent
    
    const currentText = text
    
    // 如果内容没变，直接关闭编辑
    if (trimmed === currentText) {
      setIsEditing(false)
      // 恢复显示内容（防止编辑时产生的临时换行等影响）
      if (contentRef.current) contentRef.current.innerText = currentText
      return
    }
    
    try {
      isSavingRef.current = true
      await updateTextNode(id, trimmed)
      lastSaveTimeRef.current = Date.now()
      setIsEditing(false)
    } catch (err) {
      console.error('[Cascade] Save failed:', err)     // 恢复原始内容
      if (contentRef.current) contentRef.current.innerText = text
    } finally {
      isSavingRef.current = false
    }
  }, [id, text])

  const handleInput = useCallback(() => {
    // 可以在这里做自动调整高度等操作（如果需要），但在 contentEditable div 中通常不需要
    // 我们不更新 React state 以避免 re-render 导致光标跳动
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        selection.deleteFromDocument()
        selection.getRangeAt(0).insertNode(document.createTextNode(text))
        selection.collapseToEnd()
      } else {
        document.execCommand('insertText', false, text)
      }
    }
  }, [])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // 如果相关联的焦点目标是“完成”按钮，则忽略 blur
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('[data-action="save-text"]')) {
      return
    }
    handleSave()
  }, [handleSave])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 1500)
    } catch (err) {
      console.error('[Cascade] Copy failed:', err)
    }
  }, [text])

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 group relative transition-all duration-300 ${
        isEditing ? 'border-blue-400 animate-pulse-blue' : 'border-slate-200 hover:border-blue-200'
      }`}
    >
      {/* Quadrant Grid & Buttons */}
      {!isEditing && (
      <div className="absolute inset-0 z-40 pointer-events-none">
        {/* Top Left - Restore */}
        <div
          className="absolute top-0 left-0 w-[42%] h-[42%] pointer-events-auto group/tl"
          onDoubleClick={handleEnterEdit}
        >
          {hasEdited && originalText && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsShowingOriginal(!isShowingOriginal)
              }}
              className={`
                absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4
                w-8 h-8 flex items-center justify-center rounded-full shadow-md
                transition-all duration-200 z-50
                opacity-0 group-hover/tl:opacity-100 hover:scale-110 active:scale-95
                bg-[#4385be] hover:bg-[#205ea6] text-[#fffcf0]
              `}
              title={isShowingOriginal ? "显示编辑版本" : "显示原始版本"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Top Right - Copy */}
        <div
          className="absolute top-0 right-0 w-[42%] h-[42%] pointer-events-auto group/tr"
          onDoubleClick={handleEnterEdit}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className={`
              absolute top-0 right-0 translate-x-1/4 -translate-y-1/4
              w-8 h-8 flex items-center justify-center rounded-full shadow-md
              transition-all duration-200 z-50
              opacity-0 group-hover/tr:opacity-100 hover:scale-110 active:scale-95
              bg-[#879a39] hover:bg-[#606e2c] text-[#fffcf0]
            `}
            title="复制文本"
          >
            {showCopySuccess ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Bottom Left - Empty */}
        <div
          className="absolute bottom-0 left-0 w-[42%] h-[42%] pointer-events-auto group/bl"
          onDoubleClick={handleEnterEdit}
        />

        {/* Bottom Right - Delete */}
        <div
          className="absolute bottom-0 right-0 w-[42%] h-[42%] pointer-events-auto group/br"
          onDoubleClick={handleEnterEdit}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={`
              absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4
              w-7 h-7 flex items-center justify-center rounded-full shadow-md
              transition-all duration-200 z-50
              opacity-0 group-hover/br:opacity-100 hover:scale-110 active:scale-95
              bg-[#e05f65] hover:bg-[#af3029] text-[#fffcf0]
            `}
            title="删除卡片"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* Content */}
      <div className="relative">
        {isEditing && (
          <div 
            className="absolute -inset-3 bg-blue-50/40 border border-dashed border-blue-300 rounded-md" 
            onMouseDown={(e) => {
              e.preventDefault()
              contentRef.current?.focus()
            }}
          />
        )}
        <div 
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onDoubleClick={handleEnterEdit}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          tabIndex={isEditing ? 0 : -1}
          className={`
            w-full max-w-full text-sm font-sans leading-relaxed whitespace-pre-wrap break-all 
            -mx-1 px-1 rounded-md transition-all duration-200 outline-none relative z-10
            ${!isEditing && !expanded && isLongText ? 'line-clamp-4' : ''}
            ${!isEditing && (expanded || !isLongText) ? 'hover:bg-slate-50 cursor-default' : ''}
            ${!isEditing && isShowingOriginal ? 'text-slate-500 bg-slate-50/50 italic' : 'text-slate-700'}
            ${isEditing ? 'cursor-text' : 'caret-transparent select-text'}
          `}
          style={{
            lineHeight: '1.625',
            fontSize: '0.875rem',
            margin: '0 -0.25rem',
            padding: '0 0.25rem',
            minHeight: '1.625em'
          }}
        >
          {isShowingOriginal ? originalText : text}
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between mt-2 min-h-[24px] relative z-30">
        <div>
          {isLongText && !isEditing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              {expanded ? '收起' : '展开全部'}
            </button>
          )}
        </div>

        <div className="relative group/tooltip">
          {(!isLongText || expanded || isEditing) && (
            <>
              {!isEditing && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block z-20">
                  <div className="bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in duration-200">
                    双击也可以进入编辑
                    <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}
              {isEditing ? (
                <button
                  key="save-btn"
                  data-action="save-text"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSave}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  完成
                </button>
              ) : isShowingOriginal ? (
                <button
                  disabled
                  className="text-xs px-2 py-1 rounded text-slate-300 cursor-not-allowed bg-slate-50"
                  title="无法编辑原始版本"
                >
                  编辑
                </button>
              ) : (
                <button
                  key="edit-btn"
                  onClick={handleEnterEdit}
                  className="text-xs px-2 py-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  编辑
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer with source */}
      {sourceUrl && !isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5 text-xs text-slate-400 relative z-30">
          {sourceIcon && !iconError && (
            <img
              src={sourceIcon}
              alt=""
              className="w-4 h-4 rounded-sm object-contain"
              onError={() => setIconError(true)}
            />
          )}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 truncate max-w-[180px]"
          >
            {getDomain(sourceUrl)}
          </a>
        </div>
      )}
    </div>
  )
}
